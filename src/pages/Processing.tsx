import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { UtensilsCrossed } from "lucide-react";

const MAX_ATTEMPTS = 20;
const POLL_INTERVAL = 3000;

const Processing = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Get orderCode from ?s= query parameter (Viva Wallet format)
  const orderCode = searchParams.get("s");

  useEffect(() => {
    if (!orderCode) {
      navigate("/order-failed?reason=invalid", { replace: true });
      return;
    }

    mountedRef.current = true;

    const checkPaymentStatus = async () => {
      if (!mountedRef.current) return;

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

        // payment_status is our source of truth for the redirect
        if (data.payment_status === "completed") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          // Pass display_id if returned by n8n for faster display
          const displayId = data.display_id ? `&display_id=${data.display_id}` : "";
          navigate(`/order-success?s=${orderCode}${displayId}`, { replace: true });
          return;
        }

        if (data.status === "failed") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          navigate("/order-failed?reason=declined", { replace: true });
          return;
        }

        // status === "pending" - continue polling
        setAttempts((prev) => {
          const next = prev + 1;
          if (next >= MAX_ATTEMPTS) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            navigate("/order-failed?reason=timeout", { replace: true });
          }
          return next;
        });
      } catch (error) {
        console.error("Error checking payment status:", error);
      }
    };

    // Start polling immediately
    checkPaymentStatus();
    pollingRef.current = setInterval(checkPaymentStatus, POLL_INTERVAL);

    return () => {
      mountedRef.current = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [orderCode, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gradient-bg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center max-w-sm"
      >
        {/* Pulsing burger icon with orange glow */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            boxShadow: [
              "0 0 20px hsl(var(--primary) / 0.3)",
              "0 0 40px hsl(var(--primary) / 0.6)",
              "0 0 20px hsl(var(--primary) / 0.3)",
            ],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="w-28 h-28 rounded-full bg-primary/20 flex items-center justify-center mb-8"
        >
          <motion.div
            animate={{
              rotate: [0, 10, -10, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <UtensilsCrossed className="w-14 h-14 text-primary" />
          </motion.div>
        </motion.div>

        {/* Loading spinner ring */}
        <div className="relative mb-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
            }}
            className="w-16 h-16 rounded-full border-4 border-muted border-t-primary"
          />
        </div>

        <h1 className="text-2xl font-heading text-foreground mb-3">
          Verifying your order... 🍔
        </h1>

        <p className="text-muted-foreground text-sm mb-6">
          Hold tight, we're confirming your payment with Viva Wallet
        </p>

        {/* Progress indicator */}
        <div className="w-full max-w-xs">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: "0%" }}
              animate={{ width: `${(attempts / MAX_ATTEMPTS) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Checking payment status...
          </p>
        </div>

        {/* Waterford vibes */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3 }}
          className="text-xs text-muted-foreground mt-8"
        >
          Fresh from Waterford's finest food truck 🇮🇪
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Processing;
