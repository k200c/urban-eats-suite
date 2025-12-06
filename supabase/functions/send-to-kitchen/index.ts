import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  order_id: string;
  created_at: string;
  status: string;
  payment_method: string;
  order_source: "staff" | "web";
  customer: {
    name: string;
    phone: string;
    email: string;
  };
  totals: {
    subtotal: number;
    total: number;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    modifiers: string[];
  }>;
  store_meta: {
    wait_time: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const N8N_WEBHOOK_URL = Deno.env.get("N8N_ORDER_WEBHOOK_URL");
    if (!N8N_WEBHOOK_URL) {
      console.error("N8N_ORDER_WEBHOOK_URL secret not configured");
      return new Response(
        JSON.stringify({ error: "Webhook not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: WebhookPayload = await req.json();

    // Validate required fields
    if (!payload.order_id || !payload.items || payload.items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid payload: missing order_id or items" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Forwarding order to kitchen:", payload.order_id);

    // Forward to n8n webhook
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`N8N webhook failed with status: ${response.status}`);
      // Return success anyway - we don't want to lose orders due to webhook issues
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
    // Return success anyway - resilience over notification
    return new Response(
      JSON.stringify({ success: true, warning: "Error processing webhook" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
