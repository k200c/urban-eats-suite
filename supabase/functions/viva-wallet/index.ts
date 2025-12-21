import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  orderId: string;
  amount: number;
  customerEmail?: string;
  customerPhone?: string;
}

interface VivaOrderResponse {
  orderCode: number;
}

// Get OAuth2 access token from Viva Wallet
async function getVivaAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch('https://accounts.vivapayments.com/connect/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OAuth token error:', response.status, errorText);
    throw new Error(`Failed to get Viva access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const VIVA_CLIENT_ID = Deno.env.get('VIVA_WALLET_MERCHANT_ID'); // Client ID
    const VIVA_CLIENT_SECRET = Deno.env.get('VIVA_WALLET_API_KEY'); // Client Secret
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { action, ...data } = await req.json();
    console.log(`Viva Wallet action: ${action}`, data);

    switch (action) {
      case 'create-checkout': {
        const { orderId, amount, customerEmail, customerPhone } = data as PaymentRequest;

        console.log(`Creating checkout for order ${orderId}, amount: €${amount}`);

        // Validate inputs
        if (!orderId || !amount) {
          return new Response(
            JSON.stringify({ error: 'Missing orderId or amount' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if Viva Wallet is configured
        if (!VIVA_CLIENT_ID || !VIVA_CLIENT_SECRET) {
          console.warn('Viva Wallet credentials not configured - using demo mode');
          
          // Update order with pending payment status
          const { error: updateError } = await supabase
            .from('orders')
            .update({ 
              payment_status: 'pending',
              viva_order_code: `DEMO-${Date.now()}`
            })
            .eq('id', orderId);

          if (updateError) {
            console.error('Error updating order:', updateError);
          }

          // Return demo payment URL for testing
          const demoUrl = `https://demo.vivapayments.com/web/checkout?demo=true&order=${orderId}&amount=${amount}`;
          
          return new Response(
            JSON.stringify({ 
              paymentUrl: demoUrl, 
              orderId,
              demo: true 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Send payment request to n8n webhook
        try {
          console.log('Sending payment request to n8n webhook...');
          
          const webhookResponse = await fetch('https://kyle2000.app.n8n.cloud/webhook-test/street-eatz-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              orderId,
              amount: Math.round(amount * 100), // Convert to cents
              customerName: data.customerName,
              customerPhone,
              customerEmail,
            }),
          });

          if (!webhookResponse.ok) {
            const errorText = await webhookResponse.text();
            console.error('n8n webhook error:', webhookResponse.status, errorText);
            throw new Error(`Payment webhook error: ${webhookResponse.status}`);
          }

          const webhookData = await webhookResponse.json();
          console.log('n8n webhook response:', webhookData);

          // Update order with payment info from n8n
          const { error: updateError } = await supabase
            .from('orders')
            .update({ 
              payment_status: 'processing',
              viva_order_code: webhookData.orderCode || `N8N-${Date.now()}`
            })
            .eq('id', orderId);

          if (updateError) {
            console.error('Error updating order:', updateError);
          }

          return new Response(
            JSON.stringify({ 
              paymentUrl: webhookData.paymentUrl || webhookData.url,
              orderId,
              orderCode: webhookData.orderCode
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );

        } catch (webhookError) {
          console.error('n8n webhook call failed:', webhookError);
          
          // Update order status to failed
          await supabase
            .from('orders')
            .update({ payment_status: 'failed' })
            .eq('id', orderId);

          return new Response(
            JSON.stringify({ error: 'Payment service unavailable' }),
            { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      case 'webhook': {
        // Handle Viva Wallet webhook for payment confirmation
        const { orderCode, transactionId, statusId } = data;

        console.log(`Webhook received: orderCode=${orderCode}, transactionId=${transactionId}, status=${statusId}`);

        // Find order by viva_order_code
        const { data: order, error: findError } = await supabase
          .from('orders')
          .select('id')
          .eq('viva_order_code', orderCode)
          .single();

        if (findError || !order) {
          console.error('Order not found for viva_order_code:', orderCode);
          return new Response(
            JSON.stringify({ error: 'Order not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Status 'F' = completed successfully
        if (statusId === 'F') {
          const { error: updateError } = await supabase
            .from('orders')
            .update({ 
              status: 'pending', 
              payment_method: 'card',
              payment_status: 'completed',
              viva_transaction_id: transactionId
            })
            .eq('id', order.id);

          if (updateError) {
            console.error('Error updating order:', updateError);
            return new Response(
              JSON.stringify({ error: 'Failed to update order' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          console.log(`Order ${order.id} payment completed successfully`);
        } else if (statusId === 'E' || statusId === 'X') {
          // Payment failed or cancelled
          await supabase
            .from('orders')
            .update({ payment_status: 'failed' })
            .eq('id', order.id);

          console.log(`Order ${order.id} payment failed/cancelled`);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'verify': {
        // Verify payment status for an order
        const { orderId } = data;

        const { data: order, error } = await supabase
          .from('orders')
          .select('id, payment_status, viva_order_code, viva_transaction_id')
          .eq('id', orderId)
          .single();

        if (error || !order) {
          return new Response(
            JSON.stringify({ error: 'Order not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify(order),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: unknown) {
    console.error('Viva Wallet function error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
