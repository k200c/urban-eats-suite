import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

const PaymentSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Trigger confetti celebration
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
  }, []);

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
