import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  type: 'online';           // Required: identifies this as an online card payment
  orderId: string;          // Required: UUID from orders table
  amount: number;           // Required: Amount in CENTS (e.g., 1650 for €16.50)
  customerEmail: string;    // Required: Customer's email
  customerPhone: string;    // Required: Customer's phone with country code
  customerName: string;     // Required: Customer's full name
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

function safeJsonParse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
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

    // Handle direct online payment requests (new format with type: "online")
    if (data.type === 'online') {
      const { orderId, amount, customerEmail, customerPhone, customerName } = data as PaymentRequest;
      
      console.log(`Online payment request - Order: ${orderId}, Amount: ${amount} cents, Customer: ${customerName}`);

      // Validate required fields
      if (!orderId) {
        return new Response(
          JSON.stringify({ error: 'Missing orderId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!amount || amount <= 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid amount - must be positive cents value' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!customerEmail) {
        return new Response(
          JSON.stringify({ error: 'Missing customerEmail' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!customerPhone) {
        return new Response(
          JSON.stringify({ error: 'Missing customerPhone' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!customerName) {
        return new Response(
          JSON.stringify({ error: 'Missing customerName' }),
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
            success: true,
            paymentUrl: demoUrl, 
            orderId,
            orderCode: `DEMO-${Date.now()}`,
            amount,
            demo: true 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Send payment request to n8n webhook with EXACT structure required
      try {
        console.log('Sending payment request to n8n webhook...');
        
        const webhookPayload = {
          type: 'online',
          orderId,
          amount, // Already in cents from frontend
          customerName,
          customerPhone,
          customerEmail,
        };
        
        console.log('Webhook payload:', JSON.stringify(webhookPayload));
        
        const webhookResponse = await fetch('https://kyle2000.app.n8n.cloud/webhook/street-eatz-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload),
        });

        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text();
          console.error('n8n webhook error:', webhookResponse.status, errorText);
          throw new Error(`Payment webhook error: ${webhookResponse.status}`);
        }

        const webhookText = await webhookResponse.text();
        console.log('Raw n8n response:', webhookText);
        
        const parsed = safeJsonParse(webhookText);

        if (!parsed || typeof parsed !== 'object') {
          console.error('n8n webhook returned non-JSON or empty body:', webhookText);
          throw new Error('Payment webhook returned an invalid response');
        }

        const webhookData = parsed as Record<string, unknown>;
        console.log('n8n webhook response parsed:', webhookData);

        const paymentUrl =
          typeof webhookData.paymentUrl === 'string'
            ? webhookData.paymentUrl
            : typeof webhookData.url === 'string'
              ? webhookData.url
              : null;

        if (!paymentUrl) {
          console.error('n8n webhook response missing paymentUrl/url:', webhookData);
          throw new Error('Payment webhook did not return paymentUrl');
        }

        const orderCodeRaw = webhookData.orderCode;
        const orderCode =
          typeof orderCodeRaw === 'string' || typeof orderCodeRaw === 'number'
            ? String(orderCodeRaw)
            : `N8N-${Date.now()}`;

        // Update order with payment info from n8n
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            payment_status: 'processing',
            viva_order_code: orderCode,
          })
          .eq('id', orderId);

        if (updateError) {
          console.error('Error updating order:', updateError);
        }

        return new Response(
          JSON.stringify({
            success: true,
            paymentUrl,
            orderId,
            orderCode,
            amount,
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
          JSON.stringify({ 
            error: 'Payment service unavailable',
            details: webhookError instanceof Error ? webhookError.message : 'Unknown error'
          }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Legacy action-based routing (for backwards compatibility)
    switch (action) {
      case 'create-checkout': {
        const { orderId, amount, customerEmail, customerPhone } = data;
        const customerName = data.customerName || 'Customer';

        console.log(`Legacy checkout for order ${orderId}, amount: €${amount}`);

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
          
          const webhookResponse = await fetch('https://kyle2000.app.n8n.cloud/webhook/street-eatz-payment', {
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

          const webhookText = await webhookResponse.text();
          const parsed = safeJsonParse(webhookText);

          if (!parsed || typeof parsed !== 'object') {
            console.error('n8n webhook returned non-JSON or empty body:', webhookText);
            throw new Error('Payment webhook returned an invalid response');
          }

          const webhookData = parsed as Record<string, unknown>;
          console.log('n8n webhook response:', webhookData);

          const paymentUrl =
            typeof webhookData.paymentUrl === 'string'
              ? webhookData.paymentUrl
              : typeof webhookData.url === 'string'
                ? webhookData.url
                : null;

          if (!paymentUrl) {
            console.error('n8n webhook response missing paymentUrl/url:', webhookData);
            throw new Error('Payment webhook did not return paymentUrl');
          }

          const orderCodeRaw = webhookData.orderCode;
          const orderCode =
            typeof orderCodeRaw === 'string' || typeof orderCodeRaw === 'number'
              ? String(orderCodeRaw)
              : `N8N-${Date.now()}`;

          // Update order with payment info from n8n
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              payment_status: 'processing',
              viva_order_code: orderCode,
            })
            .eq('id', orderId);

          if (updateError) {
            console.error('Error updating order:', updateError);
          }

          return new Response(
            JSON.stringify({
              paymentUrl,
              orderId,
              orderCode,
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
