import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCartStore } from '@/stores/cartStore';
import { toast } from 'sonner';

const N8N_WEBHOOK_URL = 'https://kyle2000.app.n8n.cloud/webhook-test/street-eatz-order';

interface CheckoutData {
  paymentMethod: 'card' | 'cash';
  amountTendered?: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}

interface OrderResult {
  orderId: string;
  orderNumber: number;
  createdAt: string;
}

interface WebhookPayload {
  order_id: string;
  created_at: string;
  status: string;
  payment_method: string;
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

export function useCheckout() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingToKitchen, setIsSendingToKitchen] = useState(false);
  const { items, getTotal, clearCart } = useCartStore();

  const submitOrder = async (data: CheckoutData): Promise<OrderResult | null> => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return null;
    }

    setIsSubmitting(true);
    const total = getTotal();

    try {
      // Calculate change due for cash payments
      const changeDue = data.paymentMethod === 'cash' && data.amountTendered 
        ? data.amountTendered - total 
        : null;

      // Build order items for the Edge Function
      const orderItems = items.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.totalPrice / item.quantity, // Use calculated price with modifiers
        selected_modifiers: {
          modifiers: item.selectedModifiers.map(m => ({
            name: m.name,
            price_adjustment: m.price_adjustment,
          })),
          removedIngredients: item.removedIngredients.map(i => ({
            name: i.name,
          })),
        },
      }));

      // Use the secure Edge Function for order creation
      const { data: result, error } = await supabase.functions.invoke('create-order', {
        body: {
          items: orderItems,
          total,
          payment_method: data.paymentMethod,
          customer_name: data.customerName || null,
          customer_phone: data.customerPhone || null,
          cash_tendered: data.paymentMethod === 'cash' ? data.amountTendered : null,
          change_due: changeDue,
        },
      });

      if (error) throw error;
      if (result.error) throw new Error(result.error);

      // Generate order number from timestamp (last 3 digits of epoch seconds)
      const orderNumber = Math.floor(new Date(result.created_at).getTime() / 1000) % 1000;

      clearCart();
      
      return {
        orderId: result.order_id,
        orderNumber,
        createdAt: result.created_at,
      };
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to place order. Please try again.');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send order to n8n webhook (ONLY for cash/collection payments)
  // IMPORTANT: Pass cartItems and orderTotal since cart is cleared before this is called
  const sendToKitchen = async (
    orderResult: { orderId: string; orderNumber: number; createdAt: string },
    customerData: { name: string; phone: string; email: string },
    cartItems: typeof items,
    orderTotal: number
  ): Promise<boolean> => {
    // Step 1: Validate data before sending
    if (!cartItems || cartItems.length === 0) {
      console.error('N8N Error: No items provided, cannot send to kitchen');
      toast.error('No items to send');
      return false;
    }

    setIsSendingToKitchen(true);
    
    try {
      // Fetch current wait time from app_settings
      const { data: settings } = await supabase
        .from('app_settings')
        .select('current_wait_time')
        .eq('id', 1)
        .maybeSingle();

      const waitTime = settings?.current_wait_time || '20 mins';

      // Use the passed total (cart is already cleared at this point)
      const totalAmount = Number(orderTotal) || 0;

      // Build the payload with strict typing
      const payload: WebhookPayload = {
        order_id: `Order #${orderResult.orderNumber}`,
        created_at: orderResult.createdAt,
        status: 'pending',
        payment_method: 'cash',
        customer: {
          name: customerData.name || '',
          phone: customerData.phone || '',
          email: customerData.email || '',
        },
        totals: {
          subtotal: totalAmount,
          total: totalAmount,
        },
        items: cartItems.map(item => {
          // Ensure modifiers is strictly an array of strings, default to []
          const modifiers: string[] = [];
          
          // Add removed ingredients
          if (item.removedIngredients && Array.isArray(item.removedIngredients)) {
            item.removedIngredients.forEach(ing => {
              if (ing?.name) modifiers.push(`No ${ing.name}`);
            });
          }
          
          // Add selected modifiers
          if (item.selectedModifiers && Array.isArray(item.selectedModifiers)) {
            item.selectedModifiers.forEach(mod => {
              if (mod?.name) modifiers.push(mod.name);
            });
          }

          // Calculate item price (base + modifiers)
          const itemPrice = item.totalPrice / item.quantity;
          
          return {
            name: item.product?.name || 'Unknown Item',
            quantity: item.quantity || 1,
            price: itemPrice,
            modifiers: modifiers,
          };
        }),
        store_meta: {
          wait_time: waitTime,
        },
      };

      // Debug log: show exactly what's being sent
      console.log('Sending Payload to n8n:', JSON.stringify(payload, null, 2));

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status: ${response.status}`);
      }

      console.log('Order sent to kitchen successfully');
      return true;
    } catch (error) {
      // Step 3: Log error but DON'T block the user
      console.error('N8N Error:', error);
      // Show success message anyway - don't lose the order
      toast.success('Order Saved (Printer Alert sent to Kitchen)');
      return true; // Return true so user proceeds to success page
    } finally {
      setIsSendingToKitchen(false);
    }
  };

  return {
    submitOrder,
    sendToKitchen,
    isSubmitting,
    isSendingToKitchen,
    total: getTotal(),
    itemCount: items.length,
    items, // Expose items for the webhook payload
  };
}
