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
    const phoneRaw = typeof body.phone === "string" ? body.phone.trim() : "";
    if (!phoneRaw) {
      return new Response(JSON.stringify({ ok: false, error: "Missing required field: phone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const phoneE164 = normalizePhone(phoneRaw);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const nowIso = new Date().toISOString();

    // Sweep: mark this phone's overdue active contexts as expired (best-effort, ignore errors)
    await supabaseAdmin
      .from("customer_message_contexts")
      .update({ status: "expired" })
      .eq("phone_e164", phoneE164)
      .eq("status", "active")
      .lt("expires_at", nowIso);

    const { data, error } = await supabaseAdmin
      .from("customer_message_contexts")
      .select("id, context_type, context_id, order_id, phone_e164, expires_at, metadata")
      .eq("phone_e164", phoneE164)
      .eq("context_type", "google_review_rating")
      .eq("status", "active")
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("❌ Lookup error:", error);
      return new Response(JSON.stringify({ ok: false, error: "Database error", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!data) {
      return new Response(JSON.stringify({ ok: true, found: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, found: true, context: data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    return new Response(JSON.stringify({ ok: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
