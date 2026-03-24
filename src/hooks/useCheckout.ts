import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore } from "@/stores/cartStore";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface CheckoutData {
  paymentMethod: "card" | "cash";
  amountTendered?: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  specialNotes?: string;
}

interface OrderResult {
  orderId: string;
  orderNumber: number;
  displayId: number;
  createdAt: string;
}

// Kitchen webhook is now routed through authenticated Edge Function

export function useCheckout() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingToKitchen, setIsSendingToKitchen] = useState(false);
  const { items, getTotal, clearCart } = useCartStore();
  const { user } = useAuth();

  /**
   * Submit order via DIRECT Supabase insert (bypasses Edge Function)
   * For card payments: cart stays until PaymentSuccess confirms via ?s= param
   * For cash payments: caller must explicitly call clearCart after sendToKitchen succeeds
   */
  const submitOrder = async (data: CheckoutData, shouldClearCart = false): Promise<OrderResult | null> => {
    if (items.length === 0) {
      toast.error("Cart is empty");
      return null;
    }

    setIsSubmitting(true);
    const total = getTotal();

    try {
      // Verify session before attempting insert (prevents 403 RLS errors)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        console.error("Session verification failed:", sessionError);
        toast.error("Session expired. Please log in again.");
        return null;
      }

      // Calculate change due for cash payments
      const changeDue = data.paymentMethod === "cash" && data.amountTendered 
        ? data.amountTendered - total 
        : null;

      // Determine payment status based on method
      const paymentStatus = data.paymentMethod === "card" ? "pending" : "unpaid";

      // Step 1: Insert order directly (BYPASS Edge Function)
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: session.user.id, // Required for RLS policy
          status: "pending",
          payment_method: data.paymentMethod,
          payment_status: paymentStatus,
          total,
          customer_name: data.customerName || null,
          customer_phone: data.customerPhone || null,
          special_notes: data.specialNotes || null,
          cash_tendered: data.paymentMethod === "cash" ? data.amountTendered : null,
          change_due: changeDue,
        })
        .select("id, display_id, created_at")
        .single();

      if (orderError) {
        console.error("Order insert error:", orderError);
        // Handle 403/RLS errors specifically
        if (orderError.code === '42501' || orderError.message?.includes('row-level security')) {
          toast.error("Session expired. Please log in again.");
        } else {
          toast.error("Failed to create order. Please try again.");
        }
        throw orderError;
      }

      // Step 2: Build and insert order items
      const orderItems = items.map((item) => {
        // Separate regular modifiers from "Extra X" items
        const regularModifiers = item.selectedModifiers.filter(
          (m) => !m.name.startsWith("Extra ")
        );
        const addedExtras = item.selectedModifiers
          .filter((m) => m.name.startsWith("Extra "))
          .map((m) => m.name.replace("Extra ", ""));
        const removedIngredients = item.removedIngredients.map((i) => i.name);

        return {
          order_id: order.id,
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.totalPrice / item.quantity,
          selected_modifiers: {
            modifiers: regularModifiers.map((m) => ({
              name: m.name,
              price_adjustment: m.price_adjustment,
            })),
            removed_ingredients: removedIngredients,
            added_extras: addedExtras,
          },
        };
      });

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error("Order items insert error:", itemsError);
        // Cleanup: delete the order if items failed
        await supabase.from("orders").delete().eq("id", order.id);
        throw itemsError;
      }

      console.log("✅ Order created directly via Supabase:", order.id);

      // Only clear cart if explicitly requested (cash payments after kitchen confirmation)
      if (shouldClearCart) {
        clearCart();
      }

      return {
        orderId: order.id,
        orderNumber: order.display_id,
        displayId: order.display_id,
        createdAt: order.created_at,
      };
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to place order. Please try again.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Send order to n8n webhook for collection payments
   * Uses standardized payload with paymenttype: 'collection'
   */
  const sendToKitchen = async (
    orderResult: { orderId: string; orderNumber: number; createdAt: string },
    customerData: { name: string; phone: string; email: string; specialNotes?: string },
    cartItems: typeof items,
    orderTotal: number,
    orderSource: "staff" | "web" = "web",
  ): Promise<boolean> => {
    if (!cartItems || cartItems.length === 0) {
      console.error("N8N Error: No items provided, cannot send to kitchen");
      toast.error("No items to send");
      return false;
    }

    setIsSendingToKitchen(true);

    try {
      // Fetch current wait time from app_settings
      const { data: settings } = await supabase
        .from("app_settings")
        .select("current_wait_time")
        .eq("id", 1)
        .maybeSingle();

      const waitTime = settings?.current_wait_time || "20 mins";
      const totalAmount = Number(orderTotal) || 0;

      // Build formatted items array
      const formattedItems = cartItems.map((item) => {
        const modifiers: string[] = [];

        if (item.removedIngredients && Array.isArray(item.removedIngredients)) {
          item.removedIngredients.forEach((ing) => {
            if (ing?.name) modifiers.push(`No ${ing.name}`);
          });
        }

        if (item.selectedModifiers && Array.isArray(item.selectedModifiers)) {
          item.selectedModifiers.forEach((mod) => {
            if (mod?.name) modifiers.push(mod.name);
          });
        }

        return {
          name: item.product?.name || "Unknown Item",
          quantity: item.quantity || 1,
          price: item.totalPrice / item.quantity,
          modifiers: modifiers,
        };
      });

      // Build STANDARDIZED payload for collection payments
      const payload = {
        order_id: orderResult.orderId,
        display_id: orderResult.orderNumber,
        total_amount: totalAmount,
        user_id: user?.id || null,             // Supabase auth.uid() for customer tracking
        payment_method: "cash",
        paymenttype: "collection",             // Triggers 'Collection' branch in n8n
        payment_status: "unpaid",              // Customer pays on pickup
        customer_name: customerData.name || "",
        customer_phone: customerData.phone || "",
        customer_email: customerData.email || "",
        items: formattedItems,
        timestamp: new Date().toISOString(),
        order_source: orderSource,
        special_notes: customerData.specialNotes || '',
        store_meta: {
          wait_time: waitTime,
        },
      };

      console.log("🚀 Sending collection order to kitchen via Edge Function:", JSON.stringify(payload, null, 2));

      const { data, error: fnError } = await supabase.functions.invoke('send-to-kitchen', {
        body: payload,
      });

      if (!fnError) {
        console.log("✅ Order sent to kitchen successfully!");
        toast.success("Order sent to Kitchen! 👨‍🍳");
        return true;
      } else {
        console.error("❌ Kitchen edge function error:", fnError);
        toast.error("Network Error. Please show staff this screen.");
        return true; // Still return true - order is saved in DB
      }
    } catch (error) {
      console.error("❌ Kitchen error:", error);
      toast.error("Network Error: Connection failed. Please show staff this screen.");
      return true; // Still proceed - order is saved in DB
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
