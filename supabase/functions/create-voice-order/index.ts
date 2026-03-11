import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Types ────────────────────────────────────────────────────────

interface NormalizedAddon {
  name: string;
  quantity: number;
  unit_price: number;
}

interface NormalizedItem {
  spoken_name: string;
  product_name: string;
  quantity: number;
  addons: NormalizedAddon[];
  notes: string;
}

interface ReceiptAddon {
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface ReceiptLine {
  product_name: string;
  quantity: number;
  unit_price: number;
  line_base_total: number;
  addons: ReceiptAddon[];
  line_addons_total: number;
  line_total: number;
  notes: string;
}

// ── Payment aliases ──────────────────────────────────────────────

const PAYMENT_ALIASES: Record<string, "cash" | "card" | "split"> = {
  cash: "cash", notes: "cash", coins: "cash",
  card: "card", debit: "card", credit: "card", contactless: "card", tap: "card",
  split: "split",
};

// ── Helpers ──────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9+]/g, "");
  if (cleaned.startsWith("00353")) cleaned = "+353" + cleaned.slice(5);
  else if (cleaned.startsWith("0")) cleaned = "+353" + cleaned.slice(1);
  else if (!cleaned.startsWith("+")) cleaned = "+353" + cleaned;
  return cleaned;
}

function parseQuantity(val: unknown, label: string): number {
  if (val === undefined || val === null) return 1;
  const n = typeof val === "string" ? parseInt(val, 10) : Number(val);
  if (!Number.isFinite(n) || n < 1) {
    throw new ValidationError(`Invalid quantity for item '${label}': ${JSON.stringify(val)}`);
  }
  return Math.floor(n);
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Item normalizer ──────────────────────────────────────────────

function normalizeItems(rawItems: unknown[]): NormalizedItem[] {
  return rawItems.map((item, idx) => {
    // Case 1: plain string
    if (typeof item === "string") {
      const name = item.trim();
      if (!name) throw new ValidationError(`Empty string item at index ${idx}`);
      return { spoken_name: name, product_name: name, quantity: 1, addons: [], notes: "" };
    }

    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw new ValidationError(`Unsupported item format at index ${idx}`);
    }

    const obj = item as Record<string, unknown>;

    // Case 3: new structured format (product_name)
    if (typeof obj.product_name === "string" && obj.product_name.trim()) {
      const productName = obj.product_name.trim();
      const quantity = parseQuantity(obj.quantity, productName);
      const notes = typeof obj.notes === "string" ? obj.notes.trim() : "";
      const addons = normalizeAddons(obj.addons, productName);
      return {
        spoken_name: typeof obj.spoken_name === "string" ? obj.spoken_name.trim() : productName,
        product_name: productName,
        quantity,
        addons,
        notes,
      };
    }

    // Case 2: legacy format (spoken_name)
    if (typeof obj.spoken_name === "string" && obj.spoken_name.trim()) {
      const spokenName = obj.spoken_name.trim();
      const quantity = parseQuantity(obj.qty ?? obj.quantity, spokenName);
      return { spoken_name: spokenName, product_name: spokenName, quantity, addons: [], notes: "" };
    }

    throw new ValidationError(`Unsupported item format at index ${idx}: missing product_name or spoken_name`);
  });
}

function normalizeAddons(raw: unknown, parentName: string): NormalizedAddon[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((a, i) => {
    if (!a || typeof a !== "object") {
      throw new ValidationError(`Invalid addon at index ${i} for '${parentName}'`);
    }
    const addon = a as Record<string, unknown>;
    const name = typeof addon.name === "string" ? addon.name.trim() : "";
    if (!name) throw new ValidationError(`Addon missing name at index ${i} for '${parentName}'`);
    return {
      name,
      quantity: parseQuantity(addon.quantity, `addon '${name}'`),
      unit_price: typeof addon.unit_price === "number" ? addon.unit_price : 0,
    };
  });
}

// ── Receipt builder ──────────────────────────────────────────────

function buildReceiptLines(
  items: NormalizedItem[],
  priceMap: Map<string, { id: string; price: number }>
): { lines: ReceiptLine[]; subtotal: number; addons_total: number; total: number } {
  let subtotal = 0;
  let addonsTotal = 0;

  const lines: ReceiptLine[] = items.map((item) => {
    const product = priceMap.get(item.product_name.toLowerCase());
    if (!product) throw new ValidationError(`Product not found: '${item.product_name}'`);

    const unitPrice = product.price;
    const lineBaseTotal = round2(unitPrice * item.quantity);

    const receiptAddons: ReceiptAddon[] = item.addons.map((a) => {
      const lt = round2(a.unit_price * a.quantity);
      return { name: a.name, quantity: a.quantity, unit_price: a.unit_price, line_total: lt };
    });

    const lineAddonsTotal = round2(receiptAddons.reduce((s, a) => s + a.line_total, 0));
    const lineTotal = round2(lineBaseTotal + lineAddonsTotal);

    subtotal += lineBaseTotal;
    addonsTotal += lineAddonsTotal;

    return {
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: unitPrice,
      line_base_total: lineBaseTotal,
      addons: receiptAddons,
      line_addons_total: lineAddonsTotal,
      line_total: lineTotal,
      notes: item.notes,
    };
  });

  return { lines, subtotal: round2(subtotal), addons_total: round2(addonsTotal), total: round2(subtotal + addonsTotal) };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Main handler ─────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    console.log("[voice-order] Received:", JSON.stringify(body));

    // ── Validate top-level fields ──
    const customerName = typeof body.customer_name === "string" ? body.customer_name.trim() : "";
    if (!customerName) return jsonResponse({ error: "customer_name is required" }, 400);

    const customerPhoneRaw = typeof body.customer_phone === "string" ? body.customer_phone.trim() : "";
    if (!customerPhoneRaw) return jsonResponse({ error: "customer_phone is required" }, 400);
    const customerPhone = normalizePhone(customerPhoneRaw);

    const pmRaw = typeof body.payment_method === "string" ? body.payment_method.trim().toLowerCase() : "";
    if (!pmRaw) return jsonResponse({ error: "payment_method is required" }, 400);
    const paymentMethod = PAYMENT_ALIASES[pmRaw];
    if (!paymentMethod) {
      return jsonResponse({ error: `Invalid payment_method: '${body.payment_method}'. Accepted: cash, card, split, debit, credit, contactless, tap, notes, coins` }, 400);
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return jsonResponse({ error: "items must be a non-empty array" }, 400);
    }

    // ── Normalize items ──
    let normalizedItems: NormalizedItem[];
    try {
      normalizedItems = normalizeItems(body.items);
    } catch (e) {
      if (e instanceof ValidationError) return jsonResponse({ error: e.message }, 400);
      throw e;
    }

    // ── Fetch products by exact name ──
    const uniqueNames = [...new Set(normalizedItems.map((i) => i.product_name))];
    const { data: products, error: dbErr } = await supabase
      .from("products")
      .select("id, name, price, is_available, is_sold_out")
      .in("name", uniqueNames);

    if (dbErr) {
      console.error("[voice-order] DB error:", dbErr);
      return jsonResponse({ error: "Database error resolving products" }, 500);
    }

    // Build lookup map (lowercase name → product)
    const priceMap = new Map<string, { id: string; price: number }>();
    for (const p of products || []) {
      priceMap.set(p.name.toLowerCase(), { id: p.id, price: p.price });
    }

    // Validate all products exist and are available
    for (const item of normalizedItems) {
      const key = item.product_name.toLowerCase();
      const found = (products || []).find((p) => p.name.toLowerCase() === key);
      if (!found) return jsonResponse({ error: `Product not found: '${item.product_name}'` }, 404);
      if (found.is_available === false) return jsonResponse({ error: `'${found.name}' is currently unavailable` }, 409);
      if (found.is_sold_out === true) return jsonResponse({ error: `'${found.name}' is sold out` }, 409);
    }

    // ── Build receipt ──
    let receipt: ReturnType<typeof buildReceiptLines> extends Promise<infer R> ? R : ReturnType<typeof buildReceiptLines>;
    try {
      receipt = buildReceiptLines(normalizedItems, priceMap);
    } catch (e) {
      if (e instanceof ValidationError) return jsonResponse({ error: e.message }, 400);
      throw e;
    }

    // ── Build special_notes ──
    const notesParts: string[] = [];
    if (typeof body.special_notes === "string" && body.special_notes.trim()) notesParts.push(body.special_notes.trim());
    // Collect per-item notes
    const itemNotes = normalizedItems.filter((i) => i.notes).map((i) => `${i.product_name}: ${i.notes}`);
    if (itemNotes.length) notesParts.push(itemNotes.join("; "));
    if (typeof body.call_id === "string") notesParts.push(`[call_id: ${body.call_id}]`);
    if (typeof body.transcript === "string") notesParts.push(`[transcript: ${body.transcript}]`);
    const specialNotes = notesParts.length > 0 ? notesParts.join(" | ") : null;

    // ── Insert order ──
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        status: "pending",
        payment_method: paymentMethod,
        payment_status: paymentMethod === "card" ? "pending" : "unpaid",
        total: receipt.total,
        customer_name: customerName,
        customer_phone: customerPhone,
        special_notes: specialNotes,
        order_channel: "voice",
      })
      .select("id, display_id, created_at")
      .single();

    if (orderError) {
      console.error("[voice-order] Order insert error:", orderError);
      return jsonResponse({ error: "Failed to create order" }, 500);
    }

    // ── Insert order items (with addons as selected_modifiers) ──
    const orderItems = normalizedItems.map((item) => {
      const product = priceMap.get(item.product_name.toLowerCase())!;
      const addonModifiers = item.addons.map((a) => ({
        id: crypto.randomUUID(),
        name: a.name,
        price_adjustment: a.unit_price,
        modifier_type: "extra" as const,
        quantity: a.quantity,
      }));

      return {
        order_id: order.id,
        product_id: product.id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: product.price,
        selected_modifiers: addonModifiers,
      };
    });

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

    if (itemsError) {
      console.error("[voice-order] Order items insert error:", itemsError);
      await supabase.from("orders").delete().eq("id", order.id);
      return jsonResponse({ error: "Failed to create order items" }, 500);
    }

    console.log(`[voice-order] ✅ Order created: ${order.id} (#${order.display_id}), total: €${receipt.total}`);

    return jsonResponse({
      ok: true,
      order_id: order.id,
      display_id: order.display_id,
      customer_name: customerName,
      customer_phone: customerPhone,
      created_at: order.created_at,
      subtotal: receipt.subtotal,
      addons_total: receipt.addons_total,
      total: receipt.total,
      receipt_lines: receipt.lines,
      source: "voice",
    });
  } catch (error: unknown) {
    console.error("[voice-order] Unexpected error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
