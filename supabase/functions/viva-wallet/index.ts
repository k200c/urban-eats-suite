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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const VIVA_API_KEY = Deno.env.get('VIVA_WALLET_API_KEY');
    const MERCHANT_ID = Deno.env.get('VIVA_WALLET_MERCHANT_ID');
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
        if (!VIVA_API_KEY || !MERCHANT_ID) {
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

        // Production: Create Viva Wallet checkout session
        try {
          const vivaResponse = await fetch('https://api.vivapayments.com/checkout/v2/orders', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${VIVA_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              amount: Math.round(amount * 100), // Amount in cents
              customerTrns: `StreetEatz Order`,
              customer: {
                email: customerEmail || undefined,
                phone: customerPhone || undefined,
              },
              merchantTrns: orderId,
              sourceCode: MERCHANT_ID,
              disableExactAmount: false,
              disableCash: true,
              disableWallet: false,
            }),
          });

          if (!vivaResponse.ok) {
            const errorText = await vivaResponse.text();
            console.error('Viva Wallet API error:', vivaResponse.status, errorText);
            throw new Error(`Viva Wallet API error: ${vivaResponse.status}`);
          }

          const vivaOrder: VivaOrderResponse = await vivaResponse.json();
          const vivaOrderCode = vivaOrder.orderCode.toString();
          const paymentUrl = `https://www.vivapayments.com/web/checkout?ref=${vivaOrderCode}`;

          console.log(`Viva order created: ${vivaOrderCode}`);

          // Update order with Viva order code
          const { error: updateError } = await supabase
            .from('orders')
            .update({ 
              payment_status: 'processing',
              viva_order_code: vivaOrderCode
            })
            .eq('id', orderId);

          if (updateError) {
            console.error('Error updating order with Viva code:', updateError);
          }

          return new Response(
            JSON.stringify({ 
              paymentUrl, 
              orderId,
              vivaOrderCode 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );

        } catch (vivaError) {
          console.error('Viva Wallet API call failed:', vivaError);
          
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
