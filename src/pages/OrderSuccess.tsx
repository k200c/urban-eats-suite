import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Home, User, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
import { SiteFooter } from "@/components/layout/SiteFooter";

interface OrderDetails {
  display_id: number;
  total: number;
  customer_name: string | null;
  status: string | null;
}

const OrderSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState(30);

  const orderCode = searchParams.get("s");

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderCode) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("orders")
          .select("display_id, total, customer_name, status")
          .eq("viva_order_code", orderCode)
          .single();

        if (error) {
          console.error("Error fetching order:", error);
        } else if (data) {
          setOrder(data);
          triggerConfetti();
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderCode]);

  // Auto-redirect countdown
  useEffect(() => {
    if (!order) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/profile");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [order, navigate]);

  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#FF6B35", "#FFD700", "#4CAF50"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#FF6B35", "#FFD700", "#4CAF50"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  };

  const formatOrderNumber = (displayId: number) => {
    return `#${String(displayId).padStart(4, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col gradient-bg">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="flex flex-col items-center text-center max-w-md"
        >
          {/* Success icon with glow */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="relative mb-6"
          >
            <div className="absolute inset-0 bg-success/30 rounded-full blur-xl animate-pulse" />
            <div className="relative w-24 h-24 bg-success/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-14 h-14 text-success" />
            </div>
          </motion.div>

          {/* Party popper */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-2 mb-4"
          >
            <PartyPopper className="w-6 h-6 text-primary" />
            <span className="text-primary font-heading text-lg">BOOM!</span>
            <PartyPopper className="w-6 h-6 text-primary" />
          </motion.div>

          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl md:text-4xl font-heading text-foreground mb-2"
          >
            ORDER CONFIRMED!
          </motion.h1>

          {/* Order number */}
          {order && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-primary/20 border border-primary/30 rounded-xl px-8 py-4 mb-6"
            >
              <p className="text-sm text-muted-foreground mb-1">Your Order Number</p>
              <p className="text-4xl font-heading text-primary">
                {formatOrderNumber(order.display_id)}
              </p>
            </motion.div>
          )}

          {/* Waterford messaging */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-lg text-foreground mb-2"
          >
            Fresh off the griddle, coming your way! 🔥
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-muted-foreground text-sm mb-8"
          >
            We'll have your order ready in no time at Crystal Sports Centre
          </motion.p>

          {/* Order details */}
          {order && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="w-full bg-card/50 border border-border rounded-lg p-4 mb-8"
            >
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Paid</span>
                <span className="text-xl font-heading text-primary">
                  €{order.total.toFixed(2)}
                </span>
              </div>
              {order.customer_name && (
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
                  <span className="text-muted-foreground">Name</span>
                  <span className="text-foreground">{order.customer_name}</span>
                </div>
              )}
            </motion.div>
          )}

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="flex flex-col sm:flex-row gap-3 w-full"
          >
            <Button
              onClick={() => navigate("/profile")}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-heading"
            >
              <User className="w-4 h-4 mr-2" />
              View My Orders
            </Button>
            <Button
              onClick={() => navigate("/menu")}
              variant="outline"
              className="flex-1 border-primary/30 hover:bg-primary/10 font-heading"
            >
              <Home className="w-4 h-4 mr-2" />
              Return to Menu
            </Button>
          </motion.div>

          {/* Auto-redirect notice */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-xs text-muted-foreground mt-6"
          >
            Redirecting to your orders in {countdown}s...
          </motion.p>

          {/* Waterford pride */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="text-xs text-muted-foreground mt-4"
          >
            Made with ❤️ in Waterford, Ireland 🇮🇪
          </motion.p>
        </motion.div>
      </div>

      <SiteFooter />
    </div>
  );
};

export default OrderSuccess;
