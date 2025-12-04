import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCartStore } from '@/stores/cartStore';
import { toast } from 'sonner';

const N8N_WEBHOOK_URL = 'https://kyle2000.app.n8n.cloud/webhook/street-eatz-order';

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

      // Create the order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          total,
          payment_method: data.paymentMethod,
          cash_tendered: data.paymentMethod === 'cash' ? data.amountTendered : null,
          change_due: changeDue,
          customer_name: data.customerName || null,
          customer_phone: data.customerPhone || null,
          status: 'pending',
        })
        .select('id, created_at')
        .single();

      if (orderError) throw orderError;

      // Create order items with product name snapshots
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
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

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Generate order number from timestamp (last 3 digits of epoch seconds)
      const orderNumber = Math.floor(new Date(order.created_at).getTime() / 1000) % 1000;

      clearCart();
      
      return {
        orderId: order.id,
        orderNumber,
        createdAt: order.created_at,
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
  const sendToKitchen = async (
    orderResult: { orderId: string; orderNumber: number; createdAt: string },
    customerData: { name: string; phone: string; email: string }
  ): Promise<boolean> => {
    setIsSendingToKitchen(true);
    
    try {
      // Fetch current wait time from app_settings
      const { data: settings } = await supabase
        .from('app_settings')
        .select('current_wait_time')
        .eq('id', 1)
        .single();

      const waitTime = settings?.current_wait_time || '20 mins';

      // Build the payload
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
          subtotal: getTotal(),
          total: getTotal(),
        },
        items: items.map(item => {
          const modifiers: string[] = [];
          
          // Add removed ingredients
          item.removedIngredients.forEach(ing => {
            modifiers.push(`No ${ing.name}`);
          });
          
          // Add selected modifiers
          item.selectedModifiers.forEach(mod => {
            modifiers.push(mod.name);
          });
          
          return {
            name: item.product.name,
            quantity: item.quantity,
            modifiers,
          };
        }),
        store_meta: {
          wait_time: waitTime,
        },
      };

      console.log('Sending order to n8n webhook:', payload);

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
      console.error('Failed to send order to kitchen:', error);
      // Don't fail the order if webhook fails, just log it
      toast.error('Order placed but notification failed. Kitchen will see it in the system.');
      return false;
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
