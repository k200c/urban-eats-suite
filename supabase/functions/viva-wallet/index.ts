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

    if (!VIVA_API_KEY || !MERCHANT_ID) {
      console.error('Viva Wallet credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Payment service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { action, ...data } = await req.json();

    switch (action) {
      case 'create-checkout': {
        // Create a Viva Wallet Smart Checkout session
        const { orderId, amount, customerEmail, customerPhone } = data as PaymentRequest;

        console.log(`Creating checkout for order ${orderId}, amount: €${amount}`);

        // TODO: Implement actual Viva Wallet API call
        // Reference: https://developer.vivawallet.com/smart-checkout/
        
        /*
        const response = await fetch('https://api.vivapayments.com/checkout/v2/orders', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${VIVA_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: Math.round(amount * 100), // Amount in cents
            customerTrns: `Order #${orderId}`,
            customer: {
              email: customerEmail,
              phone: customerPhone,
            },
            merchantTrns: orderId,
            sourceCode: MERCHANT_ID,
          }),
        });

        const vivaOrder = await response.json();
        const checkoutUrl = `https://www.vivapayments.com/web/checkout?ref=${vivaOrder.orderCode}`;
        */

        // Placeholder response until API keys are provided
        const checkoutUrl = `https://demo.vivapayments.com/web/checkout?demo=true&order=${orderId}`;

        return new Response(
          JSON.stringify({ checkoutUrl, orderId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'webhook': {
        // Handle Viva Wallet webhook for payment confirmation
        const { orderCode, transactionId, statusId } = data;

        console.log(`Webhook received: orderCode=${orderCode}, status=${statusId}`);

        // Status 'F' = completed successfully
        if (statusId === 'F') {
          // Update order status in database
          const { error } = await supabase
            .from('orders')
            .update({ status: 'pending', payment_method: 'card' })
            .eq('id', orderCode);

          if (error) {
            console.error('Error updating order:', error);
          }
        }

        return new Response(
          JSON.stringify({ success: true }),
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
