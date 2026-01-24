import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, User, UtensilsCrossed, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore } from "@/stores/cartStore";
import confetti from "canvas-confetti";

interface OrderItem {
  product_name: string | null;
  quantity: number | null;
  unit_price: number;
  selected_modifiers: any;
}

interface OrderData {
  display_id: number;
  total: number;
  customer_name: string | null;
  items: OrderItem[];
}

const Processing = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderCode = searchParams.get("s");
  
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const confettiTriggeredRef = useRef(false);
  const clearCart = useCartStore((state) => state.clearCart);

  // Trigger confetti burst
  const triggerConfetti = useCallback(() => {
    if (confettiTriggeredRef.current) return;
    confettiTriggeredRef.current = true;

    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ["#FF6B35", "#22C55E", "#FBBF24", "#8B5CF6"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ["#FF6B35", "#22C55E", "#FBBF24", "#8B5CF6"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    // Big burst in the center
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#FF6B35", "#22C55E", "#FBBF24", "#8B5CF6"],
    });
  }, []);

  // Fetch order details from Supabase
  const fetchOrderDetails = useCallback(async () => {
    if (!orderCode) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          display_id,
          total,
          customer_name,
          order_items (
            product_name,
            quantity,
            unit_price,
            selected_modifiers
          )
        `)
        .eq("viva_order_code", orderCode)
        .single();

      if (error) {
        console.error("Error fetching order:", error);
      } else if (data) {
        setOrderData({
          display_id: data.display_id,
          total: data.total,
          customer_name: data.customer_name,
          items: data.order_items || [],
        });
      }
    } catch (err) {
      console.error("Failed to fetch order:", err);
    } finally {
      setIsLoading(false);
    }
  }, [orderCode]);

  // On mount: confetti, clear cart, fetch order
  useEffect(() => {
    triggerConfetti();
    clearCart();
    fetchOrderDetails();
  }, [triggerConfetti, clearCart, fetchOrderDetails]);

  // Format order number
  const formatOrderNumber = (displayId: number) => {
    return `#${String(displayId).padStart(4, "0")}`;
  };

  // Format price
  const formatPrice = (price: number) => {
    return `€${price.toFixed(2)}`;
  };

  // Format modifier display
  const formatModifiers = (modifiers: any) => {
    if (!modifiers || !Array.isArray(modifiers) || modifiers.length === 0) {
      return null;
    }
    return modifiers.map((mod: any) => mod.name || mod).join(", ");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 gradient-bg">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center text-center max-w-md w-full"
      >
        {/* Success Checkmark */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
          className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mb-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <CheckCircle2 className="w-14 h-14 text-green-500" />
          </motion.div>
        </motion.div>

        {/* Header */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-heading text-foreground mb-2"
        >
          ORDER CONFIRMED! 🍔
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground mb-6"
        >
          Thanks for your order{orderData?.customer_name ? `, ${orderData.customer_name}` : ""}!
        </motion.p>

        {/* Order Number Card */}
        {orderData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-xl p-6 mb-4 w-full"
          >
            <p className="text-sm text-muted-foreground mb-1">Your Order Number</p>
            <p className="text-4xl font-heading text-primary">
              {formatOrderNumber(orderData.display_id)}
            </p>
          </motion.div>
        )}

        {/* Order Summary */}
        {orderData && orderData.items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-card border border-border rounded-xl p-4 mb-4 w-full text-left"
          >
            <h3 className="font-heading text-sm text-muted-foreground uppercase tracking-wider mb-3">
              Order Summary
            </h3>
            <div className="space-y-2">
              {orderData.items.map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">
                      {item.quantity}x {item.product_name}
                    </span>
                    <span className="text-muted-foreground">
                      {formatPrice(item.unit_price * (item.quantity || 1))}
                    </span>
                  </div>
                  {formatModifiers(item.selected_modifiers) && (
                    <p className="text-xs text-muted-foreground ml-4">
                      + {formatModifiers(item.selected_modifiers)}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-border mt-3 pt-3 flex justify-between font-heading">
              <span className="text-foreground">Total</span>
              <span className="text-primary">{formatPrice(orderData.total)}</span>
            </div>
          </motion.div>
        )}

        {/* Fallback if order not found */}
        {!orderData && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-xl p-6 mb-4 w-full text-center"
          >
            <p className="text-muted-foreground mb-2">
              We're still processing your order...
            </p>
            <p className="text-xs text-muted-foreground">
              Head to your Profile to check your order status.
            </p>
          </motion.div>
        )}

        {/* Loading State */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card border border-border rounded-xl p-6 mb-4 w-full"
          >
            <div className="flex items-center justify-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <UtensilsCrossed className="w-5 h-5 text-primary" />
              </motion.div>
              <span className="text-muted-foreground">Loading order details...</span>
            </div>
          </motion.div>
        )}

        {/* Status Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-6 w-full"
        >
          <div className="flex items-start gap-3 text-left">
            <ChefHat className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-foreground font-medium mb-1">
                Your order has been sent to the kitchen! 🧑‍🍳
              </p>
              <p className="text-xs text-muted-foreground">
                Track your payment status and order progress in real-time within your Profile under 'Recent Orders'.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Navigation Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col gap-3 w-full"
        >
          <Button
            onClick={() => navigate("/profile")}
            className="w-full"
            size="lg"
          >
            <User className="w-4 h-4 mr-2" />
            Track Order in Profile
          </Button>
          <Button
            onClick={() => navigate("/menu")}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Return to Menu
          </Button>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-xs text-muted-foreground mt-8"
        >
          Made with ❤️ in Waterford 🇮🇪
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Processing;
