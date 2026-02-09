import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStaffCartStore } from "@/stores/staffCartStore";
import { toast } from "sonner";

interface StaffCheckoutData {
  paymentMethod: "card" | "cash";
  amountTendered?: number;
  customerName?: string;
  customerPhone?: string;
}

interface StaffOrderResult {
  orderId: string;
  displayId: number;
  createdAt: string;
}

// Kitchen webhook is now routed through authenticated Edge Function

export function useStaffCheckout() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingToKitchen, setIsSendingToKitchen] = useState(false);
  const { items, getTotal, clearCart } = useStaffCartStore();

  /**
   * Submit a staff POS order via DIRECT Supabase insert (bypasses Edge Function)
   */
  const submitOrder = async (data: StaffCheckoutData): Promise<StaffOrderResult | null> => {
    if (items.length === 0) {
      toast.error("Cart is empty");
      return null;
    }

    setIsSubmitting(true);
    const total = getTotal();

    try {
      // Calculate change due for cash payments
      const changeDue = data.paymentMethod === "cash" && data.amountTendered 
        ? data.amountTendered - total 
        : null;

      // Determine payment status based on method
      const paymentStatus = data.paymentMethod === "cash" ? "paid" : "pending";

      // Step 1: Insert order directly (BYPASS Edge Function)
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          status: "pending",
          payment_method: data.paymentMethod,
          payment_status: paymentStatus,
          total,
          customer_name: data.customerName || null,
          customer_phone: data.customerPhone || null,
          cash_tendered: data.paymentMethod === "cash" ? data.amountTendered : null,
          change_due: changeDue,
        })
        .select("id, display_id, created_at")
        .single();

      if (orderError) {
        console.error("Order insert error:", orderError);
        throw orderError;
      }

      // Step 2: Build and insert order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.totalPrice / item.quantity,
        selected_modifiers: {
          modifiers: item.selectedModifiers.map((m) => ({
            name: m.name,
            price_adjustment: m.price_adjustment,
          })),
          removed_ingredients: item.removedIngredients.map((i) => i.name),
        },
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error("Order items insert error:", itemsError);
        // Cleanup: delete the order if items failed
        await supabase.from("orders").delete().eq("id", order.id);
        throw itemsError;
      }

      console.log("✅ Staff order created directly via Supabase:", order.id);

      return {
        orderId: order.id,
        displayId: order.display_id,
        createdAt: order.created_at,
      };
    } catch (error) {
      console.error("Staff checkout error:", error);
      toast.error("Failed to place order. Please try again.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Send order to kitchen via n8n webhook (for cash/collection payments)
   */
  const sendToKitchen = async (
    orderResult: StaffOrderResult,
    customerData: { name: string; phone: string }
  ): Promise<boolean> => {
    if (items.length === 0) {
      console.error("No items to send to kitchen");
      return false;
    }

    setIsSendingToKitchen(true);

    try {
      // Fetch current wait time
      const { data: settings } = await supabase
        .from("app_settings")
        .select("current_wait_time")
        .eq("id", 1)
        .maybeSingle();

      const waitTime = settings?.current_wait_time || "20 mins";
      const totalAmount = getTotal();

      // Build formatted items
      const formattedItems = items.map((item) => {
        const modifiers: string[] = [];
        
        if (item.removedIngredients?.length) {
          item.removedIngredients.forEach((ing) => {
            if (ing?.name) modifiers.push(`No ${ing.name}`);
          });
        }
        
        if (item.selectedModifiers?.length) {
          item.selectedModifiers.forEach((mod) => {
            if (mod?.name) modifiers.push(mod.name);
          });
        }

        return {
          name: item.product?.name || "Unknown Item",
          quantity: item.quantity || 1,
          price: item.totalPrice / item.quantity,
          modifiers,
        };
      });

      // Build STANDARDIZED payload for POSCash
      const payload = {
        order_id: orderResult.orderId,
        display_id: orderResult.displayId,
        total_amount: totalAmount,
        payment_method: "cash",
        paymenttype: "POSCash",           // Triggers 'POSCash' branch in n8n
        payment_status: "paid",           // Cash is immediate
        customer_name: customerData.name || "",
        customer_phone: customerData.phone || "",
        items: formattedItems,
        timestamp: new Date().toISOString(),
        order_source: "staff",
        store_meta: {
          wait_time: waitTime,
        },
      };

      console.log("📦 Staff POS: Sending to kitchen via Edge Function:", payload);

      const { data, error: fnError } = await supabase.functions.invoke('send-to-kitchen', {
        body: payload,
      });

      if (!fnError) {
        console.log("✅ Staff POS: Order sent to kitchen");
        return true;
      } else {
        console.error("❌ Staff POS: Kitchen edge function error:", fnError);
        return true; // Still return true - order is saved in DB
      }
    } catch (error) {
      console.error("❌ Staff POS: Kitchen error:", error);
      return true; // Still proceed - order is saved
    } finally {
      setIsSendingToKitchen(false);
    }
  };

  return {
    submitOrder,
    sendToKitchen,
    clearCart,
    isSubmitting,
    isSendingToKitchen,
    total: getTotal(),
    itemCount: items.length,
    items,
  };
}
