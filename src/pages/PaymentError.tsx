import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { XCircle, RefreshCcw, ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const PaymentError = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reason = searchParams.get("reason");

  const isTimeout = reason === "timeout";
  const title = isTimeout ? "Transaction Timeout" : "Payment Declined";
  const description = isTimeout
    ? "We couldn't confirm your payment in time. Your card has not been charged."
    : "Your payment could not be processed. Please try again or use a different payment method.";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gradient-bg">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center text-center max-w-sm"
      >
        {/* Error icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", bounce: 0.4 }}
          className="relative mb-8"
        >
          <div className="absolute inset-0 bg-destructive/20 rounded-full blur-2xl scale-150" />
          <div className="relative w-28 h-28 rounded-full bg-destructive/10 flex items-center justify-center border-2 border-destructive">
            {isTimeout ? (
              <Clock className="w-14 h-14 text-destructive" />
            ) : (
              <XCircle className="w-14 h-14 text-destructive" />
            )}
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-heading text-foreground mb-3"
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground mb-6"
        >
          {description}
        </motion.p>

        {isTimeout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="w-full mb-6"
          >
            <Alert className="bg-warning/10 border-warning/30">
              <Clock className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning text-sm">
                If you see a pending charge, it will be automatically refunded
                within 3-5 business days.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full space-y-3"
        >
          <Button
            onClick={() => navigate("/cart")}
            className="w-full"
            size="lg"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Try Another Payment Method
          </Button>

          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Menu
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PaymentError;
