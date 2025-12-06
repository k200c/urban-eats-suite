import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatusUpdatePayload {
  type: "status_update";
  status: string;
  order_id: string;
  customer: {
    name: string;
    phone: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const N8N_WEBHOOK_URL = Deno.env.get("N8N_STATUS_WEBHOOK_URL");
    if (!N8N_WEBHOOK_URL) {
      console.error("N8N_STATUS_WEBHOOK_URL secret not configured");
      return new Response(
        JSON.stringify({ error: "Webhook not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get auth header for validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client to verify user is staff/admin
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has staff or admin role
    const { data: hasStaffRole } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "staff"
    });
    const { data: hasAdminRole } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin"
    });

    if (!hasStaffRole && !hasAdminRole) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Staff access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: StatusUpdatePayload = await req.json();

    // Validate required fields
    if (!payload.order_id || !payload.status) {
      return new Response(
        JSON.stringify({ error: "Invalid payload: missing order_id or status" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Forwarding status update (${payload.status}) for order:`, payload.order_id);

    // Forward to n8n webhook
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`N8N webhook failed with status: ${response.status}`);
      return new Response(
        JSON.stringify({ success: true, warning: "Webhook delivery failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Status notification sent successfully for order:", payload.order_id);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in update-order-status:", error);
    return new Response(
      JSON.stringify({ success: true, warning: "Error processing webhook" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
