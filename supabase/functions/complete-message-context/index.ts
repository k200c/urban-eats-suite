import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    if (!contextId) {
      return new Response(JSON.stringify({ ok: false, error: "Missing required field: context_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data, error } = await supabaseAdmin
      .from("customer_message_contexts")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", contextId)
      .select("id, status")
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: "Database error", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!data) {
      return new Response(JSON.stringify({ ok: false, error: "Context not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, context_id: data.id, status: data.status }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    return new Response(JSON.stringify({ ok: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
