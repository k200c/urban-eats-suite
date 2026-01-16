import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STATUS_MESSAGES: Record<string, string> = {
  'pending': 'Your order has been received',
  'cooking': 'Your order is being prepared in the kitchen',
  'ready': 'Your order is ready for pickup!',
  'completed': 'This order has been collected',
  'pending_payment': 'Awaiting payment confirmation'
};

function normalizePhone(phone: string): string {
  // Remove all non-digit characters except +
  let normalized = phone.replace(/[^\d+]/g, '');
  
  // If starts with 0, convert to +353 format
  if (normalized.startsWith('0')) {
    normalized = '+353' + normalized.slice(1);
  }
  
  // If no + prefix, assume Irish number
  if (!normalized.startsWith('+')) {
    normalized = '+353' + normalized;
  }
  
  return normalized;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Parse request body
    let phoneNumber: string | undefined;
    let customerName: string | undefined;
    
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      phoneNumber = body.phone_number;
      customerName = body.customer_name;
    } else if (req.method === 'GET') {
      const url = new URL(req.url);
      phoneNumber = url.searchParams.get('phone_number') || undefined;
      customerName = url.searchParams.get('customer_name') || undefined;
    }

    console.log('[get-order-status] Request received:', { phoneNumber: phoneNumber ? '***' : undefined, customerName });

    // Validate input
    if (!phoneNumber && !customerName) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Please provide either phone_number or customer_name'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Build query for most recent order
    let query = supabase
      .from('orders')
      .select('display_id, status, created_at, customer_name, customer_phone')
      .order('created_at', { ascending: false })
      .limit(1);

    if (phoneNumber) {
      const normalizedPhone = normalizePhone(phoneNumber);
      console.log('[get-order-status] Searching by phone:', normalizedPhone);
      query = query.eq('customer_phone', normalizedPhone);
    } else if (customerName) {
      console.log('[get-order-status] Searching by name:', customerName);
      query = query.ilike('customer_name', `%${customerName}%`);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('[get-order-status] Database error:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch order status' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!orders || orders.length === 0) {
      console.log('[get-order-status] No orders found');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No orders found for the provided details'
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const order = orders[0];
    const status = order.status || 'pending';
    const statusMessage = STATUS_MESSAGES[status] || 'Order status unknown';

    console.log('[get-order-status] Found order:', { display_id: order.display_id, status });

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          display_id: order.display_id,
          status: status,
          status_message: statusMessage,
          created_at: order.created_at,
          customer_name: order.customer_name
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[get-order-status] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
