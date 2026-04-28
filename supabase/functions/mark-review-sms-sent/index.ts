import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizePhone(input: string): string {
  if (!input) return "";
  let p = input.replace(/[\s\-()]/g, "");
  if (p.startsWith("+")) return p;
  if (p.startsWith("00")) return "+" + p.slice(2);
  if (p.startsWith("0")) return "+353" + p.slice(1);
  if (/^\d+$/.test(p)) return "+353" + p;
  return p;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const expectedSecret = Deno.env.get("N8N_WEBHOOK_SECRET");
    const authHeader = req.headers.get("Authorization");
    if (!expectedSecret) {
      return new Response(JSON.stringify({ ok: false, error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const orderId = typeof body.order_id === "string" ? body.order_id.trim() : "";
    const reviewSmsSid = typeof body.review_sms_sid === "string" ? body.review_sms_sid.trim() : null;
    const customerPhoneRaw = typeof body.customer_phone === "string" ? body.customer_phone.trim() : "";
    const contextType = typeof body.context_type === "string" && body.context_type.trim()
      ? body.context_type.trim() : "google_review_rating";
    const expiresHoursRaw = body.expires_hours;
    const expiresHours = typeof expiresHoursRaw === "number" && expiresHoursRaw > 0
      ? expiresHoursRaw
      : (typeof expiresHoursRaw === "string" && Number(expiresHoursRaw) > 0 ? Number(expiresHoursRaw) : 24);

    if (!orderId) {
      return new Response(JSON.stringify({ ok: false, error: "Missing required field: order_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Fetch order (also fall back to its phone if not supplied)
    const { data: order, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("id, review_sms_sent, customer_phone")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      const notFound = fetchError?.code === "PGRST116";
      return new Response(JSON.stringify({
        ok: false, error: notFound ? "Order not found" : "Database error", details: fetchError?.message,
      }), { status: notFound ? 404 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const phoneE164 = normalizePhone(customerPhoneRaw || order.customer_phone || "");

    // Mark order as review SMS sent (idempotent — only if still false)
    if (order.review_sms_sent !== true) {
      const updateData: Record<string, unknown> = {
        review_sms_sent: true,
        review_sms_sent_at: new Date().toISOString(),
      };
      if (reviewSmsSid) updateData.review_sms_sid = reviewSmsSid;

      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update(updateData)
        .eq("id", orderId)
        .eq("review_sms_sent", false);

      if (updateError) {
        console.error("❌ Update error:", updateError);
        return new Response(JSON.stringify({ ok: false, error: "Failed to update order", details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } else {
      console.log(`ℹ️ Order ${orderId} already marked review SMS sent`);
    }

    const expiresAt = new Date(Date.now() + expiresHours * 3600 * 1000).toISOString();
    const metadata: Record<string, unknown> = {};
    if (reviewSmsSid) metadata.review_sms_sid = reviewSmsSid;

    let contextRow: { id: string; expires_at: string } | null = null;

    if (phoneE164) {
      // Idempotency: look for existing active context for same order+type
      const { data: existing } = await supabaseAdmin
        .from("customer_message_contexts")
        .select("id")
        .eq("order_id", orderId)
        .eq("context_type", contextType)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        const { data: updated, error: ctxUpdErr } = await supabaseAdmin
          .from("customer_message_contexts")
          .update({
            phone_e164: phoneE164,
            context_id: orderId,
            expires_at: expiresAt,
            metadata,
          })
          .eq("id", existing.id)
          .select("id, expires_at")
          .single();
        if (ctxUpdErr) {
          console.error("❌ Context update error:", ctxUpdErr);
        } else {
          contextRow = updated;
        }
      } else {
        const { data: inserted, error: ctxInsErr } = await supabaseAdmin
          .from("customer_message_contexts")
          .insert({
            phone_e164: phoneE164,
            context_type: contextType,
            context_id: orderId,
            order_id: orderId,
            status: "active",
            expires_at: expiresAt,
            metadata,
          })
          .select("id, expires_at")
          .single();
        if (ctxInsErr) {
          console.error("❌ Context insert error:", ctxInsErr);
        } else {
          contextRow = inserted;
        }
      }
    } else {
      console.warn(`⚠️ No phone available for order ${orderId} — skipping context creation`);
    }

    return new Response(JSON.stringify({
      ok: true,
      order_id: orderId,
      context_id: contextRow?.id ?? null,
      expires_at: contextRow?.expires_at ?? expiresAt,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    return new Response(JSON.stringify({ ok: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
