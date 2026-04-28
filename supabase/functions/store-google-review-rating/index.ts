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
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
    const contextId = typeof body.context_id === "string" ? body.context_id.trim() : "";
    const orderId = typeof body.order_id === "string" ? body.order_id.trim() : "";
    const phoneRaw = typeof body.phone === "string" ? body.phone.trim() : "";
    const ratingNum = typeof body.rating === "number" ? body.rating : Number(body.rating);
    const rawBody = typeof body.raw_body === "string" ? body.raw_body : null;
    const twilioSid = typeof body.twilio_message_sid === "string" ? body.twilio_message_sid : null;

    if (!contextId || !orderId || !phoneRaw) {
      return new Response(JSON.stringify({ ok: false, error: "Missing required fields: context_id, order_id, phone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid rating: must be integer 1-5" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const phoneE164 = normalizePhone(phoneRaw);
    const nowIso = new Date().toISOString();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Verify context is active + unexpired
    const { data: ctx, error: ctxErr } = await supabaseAdmin
      .from("customer_message_contexts")
      .select("id, status, expires_at, order_id, context_type")
      .eq("id", contextId)
      .maybeSingle();

    if (ctxErr) {
      return new Response(JSON.stringify({ ok: false, error: "Database error", details: ctxErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!ctx) {
      return new Response(JSON.stringify({ ok: false, error: "Context not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (ctx.status !== "active" || new Date(ctx.expires_at).getTime() <= Date.now()) {
      return new Response(JSON.stringify({ ok: false, error: "Context not active or expired" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Idempotent upsert: one rating row per order_id (unique index)
    const { data: existing } = await supabaseAdmin
      .from("google_review_ratings")
      .select("id")
      .eq("order_id", orderId)
      .maybeSingle();

    if (existing?.id) {
      const { error: updErr } = await supabaseAdmin
        .from("google_review_ratings")
        .update({
          context_id: contextId,
          phone_e164: phoneE164,
          rating: ratingNum,
          raw_body: rawBody,
          twilio_message_sid: twilioSid,
        })
        .eq("id", existing.id);
      if (updErr) {
        return new Response(JSON.stringify({ ok: false, error: "Failed to update rating", details: updErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } else {
      const { error: insErr } = await supabaseAdmin
        .from("google_review_ratings")
        .insert({
          order_id: orderId,
          context_id: contextId,
          phone_e164: phoneE164,
          rating: ratingNum,
          raw_body: rawBody,
          twilio_message_sid: twilioSid,
        });
      if (insErr) {
        return new Response(JSON.stringify({ ok: false, error: "Failed to store rating", details: insErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({
      ok: true, rating: ratingNum, order_id: orderId, context_id: contextId,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    return new Response(JSON.stringify({ ok: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
