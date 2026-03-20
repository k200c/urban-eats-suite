import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Auth: shared secret
    const authHeader = req.headers.get("Authorization");
    const expectedSecret = Deno.env.get("N8N_WEBHOOK_SECRET");

    if (!expectedSecret) {
      console.error("N8N_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();

    const provider = typeof body.provider === "string" ? body.provider.trim() : "";
    const transaction_id = typeof body.transaction_id === "string" ? body.transaction_id.trim() : "";
    const order_code = typeof body.order_code === "string" ? body.order_code.trim() : null;
    const order_id = typeof body.order_id === "string" ? body.order_id.trim() : null;
    const branch = typeof body.branch === "string" ? body.branch.trim() : null;
    const retry_count = typeof body.retry_count === "number" ? body.retry_count : 0;

    if (!provider || !transaction_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: provider, transaction_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Attempt insert — unique constraint on (provider, transaction_id) guards duplicates
    const { error: insertError } = await supabaseAdmin
      .from("payment_ingestion_locks")
      .insert({
        provider,
        transaction_id,
        order_code,
        order_id,
        branch,
        retry_count,
        status: "started",
        updated_at: new Date().toISOString(),
      });

    // No error → first time
    if (!insertError) {
      console.log(`✅ Lock created: ${provider}/${transaction_id}`);
      return new Response(
        JSON.stringify({ success: true, duplicate: false, message: "Lock created, safe to continue" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Unique constraint violation (23505) → duplicate
    if (insertError.code === "23505") {
      // Bump retry_count + updated_at
      await supabaseAdmin
        .from("payment_ingestion_locks")
        .update({ retry_count, updated_at: new Date().toISOString() })
        .eq("provider", provider)
        .eq("transaction_id", transaction_id);

      console.log(`⚠️ Duplicate suppressed: ${provider}/${transaction_id}`);
      return new Response(
        JSON.stringify({ success: true, duplicate: true, message: "Duplicate payment ingestion suppressed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Any other DB error
    console.error("❌ Insert error:", insertError);
    return new Response(
      JSON.stringify({ error: "Database error", details: insertError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
