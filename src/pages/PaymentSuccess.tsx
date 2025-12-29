import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Utensils, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cartStore";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";

interface OrderDetails {
  id: string;
  status: string;
  total: number;
  customer_name: string | null;
  created_at: string;
  payment_status: string | null;
}

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clearCart = useCartStore((state) => state.clearCart);
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get the order code from URL (?s=ORDER_CODE)
  const orderCode = searchParams.get("s");

  useEffect(() => {
    const verifyAndClearCart = async () => {
      // If no order code, show error
      if (!orderCode) {
        setError("No order code found");
        setIsVerifying(false);
        return;
      }

      try {
        // Fetch order by viva_order_code to verify payment
        const { data: orderData, error: fetchError } = await supabase
          .from("orders")
          .select("id, status, total, customer_name, created_at, payment_status")
          .eq("viva_order_code", orderCode)
          .maybeSingle();

        if (fetchError) {
          console.error("Error fetching order:", fetchError);
          setError("Could not verify order");
          setIsVerifying(false);
          return;
        }

        if (!orderData) {
          // Order not found yet - might still be processing
          console.log("Order not found for code:", orderCode);
          setError("Order not found. It may still be processing.");
          setIsVerifying(false);
          return;
        }

        // Order found - clear the cart!
        console.log("Order verified, clearing cart:", orderData.id);
        clearCart();
        setOrder(orderData);
        setIsVerifying(false);

        // Trigger confetti celebration
        triggerConfetti();
      } catch (err) {
        console.error("Verification error:", err);
        setError("Verification failed");
        setIsVerifying(false);
      }
    };

    verifyAndClearCart();
  }, [orderCode, clearCart]);

  // Subscribe to realtime updates for this order
  useEffect(() => {
    if (!order?.id) return;

    const channel = supabase
      .channel(`order-${order.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          console.log("Order updated:", payload.new);
          setOrder((prev) => prev ? { ...prev, ...payload.new } : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id]);

  const triggerConfetti = () => {
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#FF6B00", "#FFB366", "#FFD699"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#FF6B00", "#FFB366", "#FFD699"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  };

  // Loading state while verifying
  if (isVerifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gradient-bg">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center text-center"
        >
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl scale-150" />
            <div className="relative w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/30">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
          </div>
          <h1 className="text-2xl font-heading text-foreground mb-3">
            Verifying Payment...
          </h1>
          <p className="text-muted-foreground">Please wait</p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gradient-bg">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center max-w-sm"
        >
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-destructive/20 rounded-full blur-2xl scale-150" />
            <div className="relative w-28 h-28 rounded-full bg-destructive/10 flex items-center justify-center border-2 border-destructive/30">
              <AlertCircle className="w-14 h-14 text-destructive" />
            </div>
          </div>
          <h1 className="text-2xl font-heading text-foreground mb-3">
            {error || "Something went wrong"}
          </h1>
          <p className="text-muted-foreground mb-6">
            If you completed payment, your order is still being processed.
          </p>
          <div className="w-full space-y-3">
            <Button
              onClick={() => navigate("/profile")}
              className="w-full"
              size="lg"
            >
              Check My Orders
            </Button>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Back to Menu
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gradient-bg">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
        className="flex flex-col items-center text-center max-w-sm"
      >
        {/* Success checkmark with glow */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
          className="relative mb-8"
        >
          <div className="absolute inset-0 bg-success/30 rounded-full blur-2xl scale-150" />
          <div className="relative w-28 h-28 rounded-full bg-success/20 flex items-center justify-center border-2 border-success">
            <CheckCircle2 className="w-16 h-16 text-success" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-heading text-foreground mb-3"
        >
          Payment Successful!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground mb-2"
        >
          Your order is being prepared
        </motion.p>

        {/* Order summary */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="w-full p-4 bg-secondary rounded-lg mb-4"
        >
          {order.customer_name && (
            <p className="text-sm text-muted-foreground">
              Thank you, <span className="text-foreground font-medium">{order.customer_name}</span>
            </p>
          )}
          <p className="text-2xl font-heading text-primary mt-1">
            €{Number(order.total).toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">
            Status: <span className="text-foreground">{order.status}</span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-2 text-primary mb-8"
        >
          <Utensils className="w-5 h-5" />
          <span className="text-sm font-medium">Fresh & Hot, Coming Soon!</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="w-full space-y-3"
        >
          <Button
            onClick={() => navigate("/profile")}
            className="w-full btn-glow"
            size="lg"
          >
            View My Order
          </Button>

          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Back to Menu
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PaymentSuccess;
