import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCartStore } from '@/stores/cartStore';
import { toast } from 'sonner';

interface CheckoutData {
  paymentMethod: 'card' | 'cash';
  amountTendered?: number;
  customerName?: string;
  customerPhone?: string;
}

interface OrderResult {
  orderId: string;
  orderNumber: number;
}

export function useCheckout() {
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      };
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to place order. Please try again.');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitOrder,
    isSubmitting,
    total: getTotal(),
    itemCount: items.length,
  };
}
