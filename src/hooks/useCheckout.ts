import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";

interface CheckoutData {
  paymentMethod: "card" | "cash";
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
  order_source: "staff" | "web";
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

  /**
   * Submit order WITHOUT clearing the cart.
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
      // Calculate change due for cash payments
      const changeDue = data.paymentMethod === "cash" && data.amountTendered ? data.amountTendered - total : null;

      // Build order items for the Edge Function
      const orderItems = items.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.totalPrice / item.quantity, // Use calculated price with modifiers
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

      // Generate order number from timestamp (last 3 digits of epoch seconds)
      const orderNumber = Math.floor(new Date(result.created_at).getTime() / 1000) % 1000;

      // Only clear cart if explicitly requested (cash payments after kitchen confirmation)
      if (shouldClearCart) {
        clearCart();
      }

      return {
        orderId: result.order_id,
        orderNumber,
        createdAt: result.created_at,
      };
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to place order. Please try again.");
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
    orderTotal: number,
    orderSource: "staff" | "web" = "web",
  ): Promise<boolean> => {
    // Step 1: Validate data before sending
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

      // Use the passed total (cart is already cleared at this point)
      const totalAmount = Number(orderTotal) || 0;

      // Build the payload with strict typing
      // IMPORTANT: order_id must be the actual UUID for database validation
      const payload: WebhookPayload = {
        order_id: orderResult.orderId,
        created_at: orderResult.createdAt,
        status: "pending",
        payment_method: "cash",
        order_source: orderSource,
        customer: {
          name: customerData.name || "",
          phone: customerData.phone || "",
          email: customerData.email || "",
        },
        totals: {
          subtotal: totalAmount,
          total: totalAmount,
        },
        items: cartItems.map((item) => {
          // Ensure modifiers is strictly an array of strings, default to []
          const modifiers: string[] = [];

          // Add removed ingredients
          if (item.removedIngredients && Array.isArray(item.removedIngredients)) {
            item.removedIngredients.forEach((ing) => {
              if (ing?.name) modifiers.push(`No ${ing.name}`);
            });
          }

          // Add selected modifiers
          if (item.selectedModifiers && Array.isArray(item.selectedModifiers)) {
            item.selectedModifiers.forEach((mod) => {
              if (mod?.name) modifiers.push(mod.name);
            });
          }

          // Calculate item price (base + modifiers)
          const itemPrice = item.totalPrice / item.quantity;

          return {
            name: item.product?.name || "Unknown Item",
            quantity: item.quantity || 1,
            price: itemPrice,
            modifiers: modifiers,
          };
        }),
        store_meta: {
          wait_time: waitTime,
        },
      };

      // HARDCODED PRODUCTION WEBHOOK URL FOR DEBUGGING
      const webhookUrl = "https://kyle2000.app.n8n.cloud/webhook/street-eatz-order";
      
      // 🔥 VERSION MARKER - If you see this, the new code is running!
      console.log("🔥🔥🔥 sendToKitchen v3.0 - DIRECT FETCH ONLY - " + new Date().toISOString());
      console.log("🔥 NO EDGE FUNCTION - This build: 2024-DEC-06");
      
      // LOUD DEBUGGING - visible on mobile console
      console.log("🚀 Attempting to submit order to:", webhookUrl);
      console.log("📦 Payload:", JSON.stringify(payload, null, 2));
      
      // Verify payload structure before sending
      if (!Array.isArray(payload.items)) {
        console.error("❌ PAYLOAD ERROR: items is not an array!", typeof payload.items);
        toast.error("Order Failed: Invalid items format");
        return false;
      }
      if (typeof payload.totals !== 'object') {
        console.error("❌ PAYLOAD ERROR: totals is not an object!", typeof payload.totals);
        toast.error("Order Failed: Invalid totals format");
        return false;
      }
      
      console.log("✅ Payload validation passed. Sending to n8n...");

      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        console.log("📡 Response status:", response.status);
        
        if (response.status === 200) {
          const responseData = await response.text();
          console.log("✅ Order sent to kitchen successfully! Response:", responseData);
          toast.success("Order sent to Kitchen! 👨‍🍳");
          return true;
        } else {
          const errorText = await response.text();
          console.error("❌ Webhook response error:", response.status, errorText);
          toast.error(`Network Error: ${response.status}. Please show staff this screen.`);
          // Still return true - order is saved in DB, don't lose it
          return true;
        }
      } catch (fetchError) {
        const errorMessage = fetchError instanceof Error ? fetchError.message : "Unknown fetch error";
        console.error("❌ Fetch error:", errorMessage);
        toast.error(`Network Error: Connection failed. Please show staff this screen.`);
        console.log("📋 Full error details:", fetchError);
        // Still return true so user proceeds - order is saved in DB
        return true;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("❌ N8N Error:", errorMessage);
      toast.error(`Kitchen Alert Failed: ${errorMessage}`);
      // Still proceed - don't lose the order
      return true;
    } finally {
      setIsSendingToKitchen(false);
    }
  };

  return {
    submitOrder,
    sendToKitchen,
    clearCart, // Expose for explicit clearing after success
    isSubmitting,
    isSendingToKitchen,
    total: getTotal(),
    itemCount: items.length,
    items, // Expose items for the webhook payload
  };
}
