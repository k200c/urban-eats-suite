import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { XCircle, AlertCircle, Clock, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SiteFooter } from "@/components/layout/SiteFooter";

const OrderFailed = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const reason = searchParams.get("reason") || "unknown";

  const getContent = () => {
    switch (reason) {
      case "declined":
        return {
          icon: XCircle,
          iconColor: "text-destructive",
          title: "Payment Declined",
          message: "Your card was declined by the bank. Don't worry, no charge was made.",
          suggestion: "Please try a different card or payment method.",
        };
      case "timeout":
        return {
          icon: Clock,
          iconColor: "text-warning",
          title: "Payment Timeout",
          message: "We couldn't confirm your payment in time. This sometimes happens with slow connections.",
          suggestion: "Your payment may still be processing. Check your bank statement before trying again.",
        };
      case "cancelled":
        return {
          icon: AlertCircle,
          iconColor: "text-muted-foreground",
          title: "Payment Cancelled",
          message: "You cancelled the payment process.",
          suggestion: "Your order is still in your cart whenever you're ready.",
        };
      case "invalid":
        return {
          icon: AlertCircle,
          iconColor: "text-destructive",
          title: "Invalid Request",
          message: "We couldn't find your order reference.",
          suggestion: "Please try placing your order again.",
        };
      default:
        return {
          icon: XCircle,
          iconColor: "text-destructive",
          title: "Something Went Wrong",
          message: "We encountered an issue processing your payment.",
          suggestion: "Please try again or contact us if the problem persists.",
        };
    }
  };

  const content = getContent();
  const Icon = content.icon;

  return (
    <div className="min-h-screen flex flex-col gradient-bg">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center max-w-md"
        >
          {/* Error icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="relative mb-6"
          >
            <div className={`absolute inset-0 ${content.iconColor}/30 rounded-full blur-xl`} />
            <div className="relative w-24 h-24 bg-card/50 border border-border rounded-full flex items-center justify-center">
              <Icon className={`w-14 h-14 ${content.iconColor}`} />
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl md:text-3xl font-heading text-foreground mb-3"
          >
            {content.title}
          </motion.h1>

          {/* Message */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground mb-4"
          >
            {content.message}
          </motion.p>

          {/* Suggestion alert */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full mb-8"
          >
            <Alert className="bg-card/50 border-border">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                {content.suggestion}
              </AlertDescription>
            </Alert>
          </motion.div>

          {/* Reassurance */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-2 text-sm text-success mb-8"
          >
            <div className="w-2 h-2 bg-success rounded-full" />
            <span>No charge was made to your account</span>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-3 w-full"
          >
            <Button
              onClick={() => navigate("/cart?checkout=true")}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-heading"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button
              onClick={() => navigate("/menu")}
              variant="outline"
              className="flex-1 border-primary/30 hover:bg-primary/10 font-heading"
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Menu
            </Button>
          </motion.div>

          {/* Support contact */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 text-center"
          >
            <p className="text-xs text-muted-foreground mb-2">
              Need help? We're here for you
            </p>
            <a
              href="tel:+353871234567"
              className="text-sm text-primary hover:underline"
            >
              📞 +353 87 123 4567
            </a>
          </motion.div>
        </motion.div>
      </div>

      <SiteFooter />
    </div>
  );
};

export default OrderFailed;
