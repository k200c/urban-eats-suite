import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth: require N8N_WEBHOOK_SECRET
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const secret = Deno.env.get("N8N_WEBHOOK_SECRET");

    if (!secret || token !== secret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find orders completed 60+ minutes ago, not yet sent review SMS, with a phone number
    const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, customer_name, customer_phone, completed_at")
      .eq("status", "completed")
      .eq("review_sms_sent", false)
      .not("customer_phone", "is", null)
      .not("completed_at", "is", null)
      .lte("completed_at", sixtyMinutesAgo)
      .order("completed_at", { ascending: true })
      .limit(50);

    if (error) {
      console.error("Query error:", error.message);
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const reviewLink = "https://g.page/r/streeteatz/review";

    const result = (orders ?? []).map((o) => ({
      order_id: o.id,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      review_link: reviewLink,
    }));

    console.log(`✅ Found ${result.length} orders pending review SMS`);

    return new Response(
      JSON.stringify({ ok: true, count: result.length, orders: result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
