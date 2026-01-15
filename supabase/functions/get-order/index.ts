import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GetOrderPayload {
  order_id?: string;
  viva_order_code?: string;
  display_id?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("📦 Get Order request received");

    // Authenticate using N8N_WEBHOOK_SECRET
    const authHeader = req.headers.get("Authorization");
    const expectedSecret = Deno.env.get("N8N_WEBHOOK_SECRET");

    if (!expectedSecret) {
      console.error("❌ N8N_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("❌ Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - Missing Bearer token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const providedSecret = authHeader.replace("Bearer ", "").trim();
    if (providedSecret !== expectedSecret) {
      console.error("❌ Invalid webhook secret provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid secret" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Authentication successful");

    // Parse request body
    const payload: GetOrderPayload = await req.json();
    console.log("📥 Payload:", JSON.stringify(payload, null, 2));

    // Validate at least one identifier is provided
    if (!payload.order_id && !payload.viva_order_code && !payload.display_id) {
      console.error("❌ No order identifier provided");
      return new Response(
        JSON.stringify({ 
          error: "Missing order identifier",
          hint: "Provide one of: order_id, viva_order_code, or display_id"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with Service Role Key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build query - fetch order with items
    let query = supabase
      .from("orders")
      .select(`
        id,
        display_id,
        status,
        payment_status,
        payment_method,
        total,
        customer_name,
        customer_phone,
        special_notes,
        viva_order_code,
        viva_transaction_id,
        cash_tendered,
        change_due,
        created_at,
        updated_at,
        order_items (
          id,
          product_id,
          product_name,
          quantity,
          unit_price,
          selected_modifiers
        )
      `);

    // Apply filter based on provided identifier
    if (payload.order_id) {
      console.log(`🔍 Searching by order_id: ${payload.order_id}`);
      query = query.eq("id", payload.order_id);
    } else if (payload.viva_order_code) {
      console.log(`🔍 Searching by viva_order_code: ${payload.viva_order_code}`);
      query = query.eq("viva_order_code", payload.viva_order_code);
    } else if (payload.display_id) {
      console.log(`🔍 Searching by display_id: ${payload.display_id}`);
      query = query.eq("display_id", payload.display_id);
    }

    const { data: order, error } = await query.single();

    if (error) {
      console.error("❌ Database query error:", error);
      
      if (error.code === "PGRST116") {
        return new Response(
          JSON.stringify({ 
            error: "Order not found",
            searched_by: payload.order_id ? "order_id" : payload.viva_order_code ? "viva_order_code" : "display_id",
            value: payload.order_id || payload.viva_order_code || payload.display_id
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Database error", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ Order found: ${order.id} (Display #${order.display_id})`);
    console.log(`📋 Items count: ${order.order_items?.length || 0}`);

    // Transform response - rename order_items to items for cleaner API
    const response = {
      success: true,
      order: {
        ...order,
        items: order.order_items,
        order_items: undefined // Remove the original key
      }
    };

    // Clean up undefined key
    delete response.order.order_items;

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("❌ Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
