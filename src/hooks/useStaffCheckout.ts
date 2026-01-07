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

// n8n Webhook URL for POS orders
const N8N_POS_WEBHOOK = "https://kyle2000.app.n8n.cloud/webhook/street-eatz-order";

export function useStaffCheckout() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingToKitchen, setIsSendingToKitchen] = useState(false);
  const { items, getTotal, clearCart } = useStaffCartStore();

  /**
   * Submit a staff POS order
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

      // Build order items for the Edge Function
      const orderItems = items.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.totalPrice / item.quantity,
        selected_modifiers: {
          modifiers: item.selectedModifiers.map((m) => ({
            name: m.name,
            price_adjustment: m.price_adjustment,
          })),
          removedIngredients: item.removedIngredients.map((i) => ({
            name: i.name,
          })),
        },
      }));

      // Use the secure Edge Function for order creation
      const { data: result, error } = await supabase.functions.invoke("create-order", {
        body: {
          items: orderItems,
          total,
          payment_method: data.paymentMethod,
          customer_name: data.customerName || null,
          customer_phone: data.customerPhone || null,
          cash_tendered: data.paymentMethod === "cash" ? data.amountTendered : null,
          change_due: changeDue,
        },
      });

      if (error) throw error;
      if (result.error) throw new Error(result.error);

      return {
        orderId: result.order_id,
        displayId: result.display_id || Math.floor(new Date(result.created_at).getTime() / 1000) % 10000,
        createdAt: result.created_at,
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

      const payload = {
        order_id: orderResult.orderId,
        display_id: orderResult.displayId,
        created_at: orderResult.createdAt,
        status: "pending",
        payment_method: "cash",
        order_source: "staff",
        customer: {
          name: customerData.name || "",
          phone: customerData.phone || "",
          email: "",
        },
        totals: {
          subtotal: totalAmount,
          total: totalAmount,
        },
        items: items.map((item) => {
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
        }),
        store_meta: {
          wait_time: waitTime,
        },
      };

      console.log("📦 Staff POS: Sending to kitchen:", payload);

      const response = await fetch(N8N_POS_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log("✅ Staff POS: Order sent to kitchen");
        return true;
      } else {
        console.error("❌ Staff POS: Kitchen webhook failed:", response.status);
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
