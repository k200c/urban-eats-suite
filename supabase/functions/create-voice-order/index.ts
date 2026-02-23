import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Alias map: voice terms → canonical product names (lowercase keys)
const ALIAS_MAP: Record<string, string> = {
  fries: "handcut chips",
  chips: "handcut chips",
  "hand cut chips": "handcut chips",
  coke: "coke",
  "coca cola": "coke",
  "coca-cola": "coke",
  "coke zero": "coke zero",
  "diet coke": "coke zero",
  fanta: "fanta orange",
  "fanta orange": "fanta orange",
  water: "water",
  "still water": "water",
  "capri sun": "capri sun",
  caprisun: "capri sun",
};

// Payment method normalization
const PAYMENT_ALIASES: Record<string, "cash" | "card" | "split"> = {
  cash: "cash",
  notes: "cash",
  coins: "cash",
  card: "card",
  debit: "card",
  credit: "card",
  contactless: "card",
  tap: "card",
  split: "split",
};

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9+]/g, "");
  if (cleaned.startsWith("00353")) {
    cleaned = "+353" + cleaned.slice(5);
  } else if (cleaned.startsWith("0")) {
    cleaned = "+353" + cleaned.slice(1);
  } else if (!cleaned.startsWith("+")) {
    cleaned = "+353" + cleaned;
  }
  return cleaned;
}

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

interface VoiceItem {
  spoken_name: string;
  qty?: number;
}

interface VoiceOrderRequest {
  customer_name: string;
  customer_phone: string;
  payment_method: string;
  items: (string | VoiceItem)[];
  special_notes?: string;
  call_id?: string;
  transcript?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let body: VoiceOrderRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[voice-order] Received:", JSON.stringify(body));

    // --- Validation ---
    if (!body.customer_name || typeof body.customer_name !== "string" || !body.customer_name.trim()) {
      return new Response(
        JSON.stringify({ error: "customer_name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!body.customer_phone || typeof body.customer_phone !== "string" || !body.customer_phone.trim()) {
      return new Response(
        JSON.stringify({ error: "customer_phone is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!body.payment_method || typeof body.payment_method !== "string") {
      return new Response(
        JSON.stringify({ error: "payment_method is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return new Response(
        JSON.stringify({ error: "items array is required and must not be empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize payment method
    const pmNorm = normalizeText(body.payment_method);
    const paymentMethod = PAYMENT_ALIASES[pmNorm];
    if (!paymentMethod) {
      return new Response(
        JSON.stringify({
          error: `Invalid payment_method: '${body.payment_method}'. Accepted: cash, card, split, debit, credit, contactless, tap, notes, coins`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerPhone = normalizePhone(body.customer_phone.trim());
    const customerName = body.customer_name.trim();

    // --- Parse items ---
    const parsedItems: { spoken: string; qty: number }[] = [];
    for (const item of body.items) {
      if (typeof item === "string") {
        parsedItems.push({ spoken: item, qty: 1 });
      } else if (item && typeof item === "object" && typeof item.spoken_name === "string") {
        parsedItems.push({ spoken: item.spoken_name, qty: item.qty && item.qty > 0 ? item.qty : 1 });
      } else {
        return new Response(
          JSON.stringify({ error: "Each item must be a string or { spoken_name, qty }" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // --- Resolve each item to a product ---
    const resolvedItems: { product_id: string; product_name: string; quantity: number; unit_price: number }[] = [];

    for (const { spoken, qty } of parsedItems) {
      const normalized = normalizeText(spoken);
      const aliased = ALIAS_MAP[normalized] || normalized;

      console.log(`[voice-order] Resolving: "${spoken}" → normalized: "${normalized}" → aliased: "${aliased}"`);

      // 1) Exact case-insensitive match
      const { data: exactMatches, error: exactErr } = await supabase
        .from("products")
        .select("id, name, price, is_available, is_sold_out")
        .ilike("name", aliased);

      if (exactErr) {
        console.error("[voice-order] DB error (exact):", exactErr);
        return new Response(
          JSON.stringify({ error: "Database error resolving item" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let matches = exactMatches || [];

      // 2) Fallback: ILIKE contains
      if (matches.length === 0) {
        const { data: fuzzyMatches, error: fuzzyErr } = await supabase
          .from("products")
          .select("id, name, price, is_available, is_sold_out")
          .ilike("name", `%${aliased}%`);

        if (fuzzyErr) {
          console.error("[voice-order] DB error (fuzzy):", fuzzyErr);
          return new Response(
            JSON.stringify({ error: "Database error resolving item" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        matches = fuzzyMatches || [];
      }

      // No matches
      if (matches.length === 0) {
        console.warn(`[voice-order] No match for "${spoken}"`);
        return new Response(
          JSON.stringify({ error: `No product found for '${spoken}'`, spoken_name: spoken }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Ambiguous
      if (matches.length > 1) {
        console.warn(`[voice-order] Ambiguous match for "${spoken}": ${matches.length} results`);
        return new Response(
          JSON.stringify({
            error: `Ambiguous match for '${spoken}'`,
            spoken_name: spoken,
            candidates: matches.slice(0, 3).map((m) => ({ id: m.id, name: m.name, price: m.price })),
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const product = matches[0];

      // Check availability
      if (product.is_available === false) {
        return new Response(
          JSON.stringify({ error: `'${product.name}' is currently unavailable`, spoken_name: spoken }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (product.is_sold_out === true) {
        return new Response(
          JSON.stringify({ error: `'${product.name}' is sold out`, spoken_name: spoken }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      resolvedItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: qty,
        unit_price: product.price,
      });
    }

    // --- Compute total ---
    const total = Math.round(resolvedItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0) * 100) / 100;

    // --- Build special_notes with voice metadata ---
    const notesParts: string[] = [];
    if (body.special_notes) notesParts.push(body.special_notes);
    if (body.call_id) notesParts.push(`[call_id: ${body.call_id}]`);
    if (body.transcript) notesParts.push(`[transcript: ${body.transcript}]`);
    const specialNotes = notesParts.length > 0 ? notesParts.join(" | ") : null;

    // --- Insert order ---
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        status: "pending",
        payment_method: paymentMethod,
        payment_status: paymentMethod === "card" ? "pending" : "unpaid",
        total,
        customer_name: customerName,
        customer_phone: customerPhone,
        special_notes: specialNotes,
        order_channel: "voice",
      })
      .select("id, display_id, created_at")
      .single();

    if (orderError) {
      console.error("[voice-order] Order insert error:", orderError);
      return new Response(
        JSON.stringify({ error: "Failed to create order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Insert order items ---
    const orderItems = resolvedItems.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      selected_modifiers: [],
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

    if (itemsError) {
      console.error("[voice-order] Order items insert error:", itemsError);
      await supabase.from("orders").delete().eq("id", order.id);
      return new Response(
        JSON.stringify({ error: "Failed to create order items" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[voice-order] ✅ Order created: ${order.id} (display #${order.display_id}), total: €${total}`);

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        display_id: order.display_id,
        total,
        source: "voice",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[voice-order] Unexpected error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
