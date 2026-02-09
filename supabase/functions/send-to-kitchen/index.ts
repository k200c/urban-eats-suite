import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const N8N_ORDER_WEBHOOK_URL = Deno.env.get("N8N_ORDER_WEBHOOK_URL");
    if (!N8N_ORDER_WEBHOOK_URL) {
      console.error("N8N_ORDER_WEBHOOK_URL secret not configured");
      return new Response(
        JSON.stringify({ error: "Kitchen webhook not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = await req.json();

    // Validate required fields
    if (!payload.order_id || !payload.items || !Array.isArray(payload.items)) {
      return new Response(
        JSON.stringify({ error: "Invalid payload: missing order_id or items" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify order exists in database
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select("id")
      .eq("id", payload.order_id)
      .maybeSingle();

    if (orderError || !order) {
      console.error("Order validation failed:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Forwarding order ${payload.order_id} to kitchen`);

    // Forward to n8n webhook
    const response = await fetch(N8N_ORDER_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`N8N kitchen webhook failed with status: ${response.status}`);
      return new Response(
        JSON.stringify({ success: true, warning: "Webhook delivery failed but order is saved" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Order sent to kitchen successfully:", payload.order_id);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-to-kitchen:", error);
    return new Response(
      JSON.stringify({ success: true, warning: "Error processing webhook but order is saved" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
