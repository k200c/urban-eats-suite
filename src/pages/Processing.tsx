import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { UtensilsCrossed, CheckCircle2, Clock } from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/layout/SiteFooter";

const MAX_ATTEMPTS = 20;
const POLL_INTERVAL = 3000;

type UiState = "verifying" | "verified" | "timeout";

interface OrderItem {
  product_name: string;
  quantity: number;
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
  const [attempts, setAttempts] = useState(0);
  const [uiState, setUiState] = useState<UiState>("verifying");
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const confettiTriggeredRef = useRef(false);

  const orderCode = searchParams.get("s");

  // Confetti burst function
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
        colors: ["#f97316", "#fbbf24", "#22c55e", "#ffffff"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ["#f97316", "#fbbf24", "#22c55e", "#ffffff"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  // Fetch order details from Supabase
  const fetchOrderDetails = useCallback(async () => {
    if (!orderCode) return;

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
        console.error("Error fetching order details:", error);
        return;
      }

      if (data && mountedRef.current) {
        setOrderData({
          display_id: data.display_id,
          total: data.total,
          customer_name: data.customer_name,
          items: data.order_items || [],
        });
      }
    } catch (error) {
      console.error("Error fetching order:", error);
    }
  }, [orderCode]);

  // Poll payment status
  const checkPaymentStatus = useCallback(async () => {
    if (!mountedRef.current || !orderCode) return;

    try {
      const response = await fetch(
        `https://kyle2000.app.n8n.cloud/webhook/check-payment-status?orderCode=${orderCode}`
      );

      if (!response.ok) {
        console.error("Payment status check failed:", response.status);
        return;
      }

      const data = await response.json();

      if (!mountedRef.current) return;

      // payment_status is our source of truth
      if (data.payment_status === "completed") {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setUiState("verified");
        // Refetch order details to ensure we have latest data
        fetchOrderDetails();
        return;
      }

      if (data.status === "failed" || data.payment_status === "failed") {
        if (pollingRef.current) clearInterval(pollingRef.current);
        navigate("/order-failed?reason=declined", { replace: true });
        return;
      }

      // Continue polling
      setAttempts((prev) => {
        const next = prev + 1;
        if (next >= MAX_ATTEMPTS) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setUiState("timeout");
        }
        return next;
      });
    } catch (error) {
      console.error("Error checking payment status:", error);
    }
  }, [orderCode, navigate, fetchOrderDetails]);

  // Initialize on mount
  useEffect(() => {
    if (!orderCode) {
      navigate("/order-failed?reason=invalid", { replace: true });
      return;
    }

    mountedRef.current = true;

    // Optimistic confetti immediately!
    triggerConfetti();

    // Start parallel operations
    fetchOrderDetails();
    checkPaymentStatus();
    pollingRef.current = setInterval(checkPaymentStatus, POLL_INTERVAL);

    return () => {
      mountedRef.current = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [orderCode, navigate, triggerConfetti, fetchOrderDetails, checkPaymentStatus]);

  const formatOrderNumber = (displayId: number) => {
    return `#${String(displayId).padStart(4, "0")}`;
  };

  const formatPrice = (price: number) => {
    return `€${price.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen flex flex-col gradient-bg">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center max-w-md w-full"
        >
          {/* Optimistic Header - Always show "ORDER CONFIRMED!" */}
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-heading text-primary mb-6"
          >
            ORDER CONFIRMED! 🎉
          </motion.h1>

          {/* Animated Icon Container */}
          <div className="relative mb-8">
            <AnimatePresence mode="wait">
              {uiState === "verifying" && (
                <motion.div
                  key="verifying"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center"
                >
                  {/* Pulsing spinner icon */}
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      boxShadow: [
                        "0 0 20px hsl(var(--primary) / 0.3)",
                        "0 0 40px hsl(var(--primary) / 0.5)",
                        "0 0 20px hsl(var(--primary) / 0.3)",
                      ],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-4"
                  >
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <UtensilsCrossed className="w-12 h-12 text-primary" />
                    </motion.div>
                  </motion.div>

                  {/* Spinner ring */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-12 h-12 rounded-full border-4 border-muted border-t-primary mb-4"
                  />

                  <p className="text-muted-foreground text-sm">
                    Verifying your order... 🍔
                  </p>

                  {/* Progress indicator */}
                  <div className="w-48 mt-4">
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: "0%" }}
                        animate={{ width: `${(attempts / MAX_ATTEMPTS) * 100}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Confirming payment with Viva Wallet...
                    </p>
                  </div>
                </motion.div>
              )}

              {uiState === "verified" && (
                <motion.div
                  key="verified"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", damping: 15, stiffness: 200 }}
                  className="flex flex-col items-center"
                >
                  {/* Large green checkmark */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 10, stiffness: 200, delay: 0.1 }}
                    className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mb-4"
                  >
                    <CheckCircle2 className="w-14 h-14 text-green-500" />
                  </motion.div>

                  {/* Payment verified badge */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-2 text-green-500 font-semibold"
                  >
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Payment Verified
                  </motion.div>
                </motion.div>
              )}

              {uiState === "timeout" && (
                <motion.div
                  key="timeout"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4">
                    <Clock className="w-10 h-10 text-yellow-500" />
                  </div>
                  <h2 className="text-xl font-heading text-foreground mb-2">
                    Order Received!
                  </h2>
                  <p className="text-muted-foreground text-sm text-center max-w-xs">
                    We're just waiting for the final bank confirm. You'll see your 'Paid' receipt in your email shortly.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Order Number - Show when we have data */}
          <AnimatePresence>
            {orderData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="w-full"
              >
                {/* Order Number Card */}
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="bg-card border border-border rounded-xl p-6 mb-4"
                >
                  <p className="text-sm text-muted-foreground mb-1">Your Order Number</p>
                  <p className="text-4xl font-heading text-primary">
                    {formatOrderNumber(orderData.display_id)}
                  </p>
                </motion.div>

                {/* Order Summary - Show when verified */}
                {uiState === "verified" && orderData.items.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-card border border-border rounded-xl p-4 mb-6"
                  >
                    <h3 className="font-heading text-foreground mb-3">Order Summary</h3>
                    <div className="space-y-2">
                      {orderData.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <div>
                            <span className="text-muted-foreground">{item.quantity}x </span>
                            <span className="text-foreground">{item.product_name}</span>
                            {item.selected_modifiers && Object.keys(item.selected_modifiers).length > 0 && (
                              <p className="text-xs text-muted-foreground ml-4">
                                {Object.values(item.selected_modifiers).flat().join(", ")}
                              </p>
                            )}
                          </div>
                          <span className="text-foreground">
                            {formatPrice(item.unit_price * item.quantity)}
                          </span>
                        </div>
                      ))}
                      <div className="border-t border-border pt-2 mt-2 flex justify-between font-semibold">
                        <span>Total</span>
                        <span className="text-primary">{formatPrice(orderData.total)}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Action Buttons */}
                {(uiState === "verified" || uiState === "timeout") && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-col gap-3"
                  >
                    <Button
                      onClick={() => navigate("/profile")}
                      className="w-full"
                      size="lg"
                    >
                      View My Orders
                    </Button>
                    <Button
                      onClick={() => navigate("/")}
                      variant="outline"
                      className="w-full"
                      size="lg"
                    >
                      Return to Menu
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Waterford vibes */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-xs text-muted-foreground mt-8"
          >
            Made with ❤️ in Waterford 🇮🇪
          </motion.p>
        </motion.div>
      </div>

      <SiteFooter />
    </div>
  );
};

export default Processing;
