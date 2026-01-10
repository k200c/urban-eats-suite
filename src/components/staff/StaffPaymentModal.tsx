import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Banknote, Check, Loader2, Smartphone, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// n8n Webhook URLs
const N8N_POS_WEBHOOK = "https://kyle2000.app.n8n.cloud/webhook/street-eatz-payment";

interface StaffPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  displayId: number;
  total: number;
  onSuccess: () => void;
}

export function StaffPaymentModal({
  open,
  onOpenChange,
  orderId,
  displayId,
  total,
  onSuccess,
}: StaffPaymentModalProps) {
  const [amountTendered, setAmountTendered] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingType, setProcessingType] = useState<"cash" | "terminal" | null>(null);

  const tenderedValue = parseFloat(amountTendered) || 0;
  const changeDue = tenderedValue - total;
  const canPayCash = tenderedValue >= total && total > 0;

  const handleCashPayment = async () => {
    if (!canPayCash || isProcessing) return;
    setIsProcessing(true);
    setProcessingType("cash");

    try {
      // Send to n8n webhook
      await fetch(N8N_POS_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "POSCash",
          orderId,
          displayId,
          total,
          amountTendered: tenderedValue,
          changeDue,
        }),
      });

      // Update order status to 'pending' (ready for kitchen)
      const { error } = await supabase
        .from("orders")
        .update({
          status: "pending",
          payment_method: "cash",
          payment_status: "paid",
          cash_tendered: tenderedValue,
          change_due: changeDue,
        })
        .eq("id", orderId);

      if (error) throw error;

      toast.success(`Order #${String(displayId).padStart(4, "0")} paid with cash!`);
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Cash payment error:", error);
      toast.error("Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
      setProcessingType(null);
    }
  };

  const handleTerminalPayment = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setProcessingType("terminal");

    try {
      // Send to n8n webhook for terminal
      await fetch(N8N_POS_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "terminal",
          orderId,
          displayId,
          total,
          amountInCents: Math.round(total * 100),
        }),
      });

      toast.info("Waiting for Pax Terminal...");

      // The actual payment completion would come from the terminal callback
      // For now, we'll simulate success after a short delay
      // In production, this would be handled by a webhook from the terminal

      // Update order status
      const { error } = await supabase
        .from("orders")
        .update({
          status: "pending",
          payment_method: "card",
          payment_status: "paid",
        })
        .eq("id", orderId);

      if (error) throw error;

      toast.success(`Order #${String(displayId).padStart(4, "0")} paid via terminal!`);
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Terminal payment error:", error);
      toast.error("Terminal payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
      setProcessingType(null);
    }
  };

  const resetForm = () => {
    setAmountTendered("");
    setProcessingType(null);
  };

  const quickAmounts = [5, 10, 20, 50];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <AnimatePresence mode="wait">
          {isProcessing && processingType === "terminal" ? (
            <motion.div
              key="terminal-waiting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-12"
            >
              <div className="text-center space-y-6">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto"
                >
                  <Smartphone className="w-12 h-12 text-primary" />
                </motion.div>
                <div>
                  <p className="font-heading text-2xl text-foreground">WAITING FOR PAX TERMINAL...</p>
                  <p className="text-muted-foreground text-sm mt-2">Present card to the terminal</p>
                </div>
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              </div>
            </motion.div>
          ) : isProcessing && processingType === "cash" ? (
            <motion.div
              key="cash-processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-12"
            >
              <div className="text-center space-y-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto"
                >
                  <ChefHat className="w-10 h-10 text-green-500" />
                </motion.div>
                <div>
                  <p className="font-heading text-2xl text-foreground">SENDING TO KITCHEN...</p>
                </div>
                <Loader2 className="w-8 h-8 animate-spin text-green-500 mx-auto" />
              </div>
            </motion.div>
          ) : (
            <motion.div key="payment-options" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl text-center">
                  TAKE PAYMENT - #{String(displayId).padStart(4, "0")}
                </DialogTitle>
              </DialogHeader>

              <div className="mt-6 space-y-6">
                {/* Order Total */}
                <div className="text-center p-6 bg-secondary rounded-lg">
                  <p className="text-muted-foreground text-sm uppercase tracking-wider">Total Due</p>
                  <p className="font-heading text-5xl text-primary mt-2">€{total.toFixed(2)}</p>
                </div>

                {/* Large Payment Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-32 flex-col gap-3 text-xl border-2 hover:border-primary hover:bg-primary/10"
                    onClick={handleTerminalPayment}
                    disabled={isProcessing}
                  >
                    <Smartphone className="w-12 h-12" />
                    TERMINAL
                  </Button>

                  <Button
                    size="lg"
                    variant="outline"
                    className="h-32 flex-col gap-3 text-xl border-2 hover:border-green-500 hover:bg-green-500/10"
                    onClick={() => {
                      // Show cash input section
                      if (!amountTendered) {
                        setAmountTendered(total.toFixed(2));
                      }
                    }}
                    disabled={isProcessing}
                  >
                    <Banknote className="w-12 h-12" />
                    CASH
                  </Button>
                </div>

                {/* Cash Amount Section */}
                {amountTendered !== "" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-4 border-t border-border pt-4"
                  >
                    <div>
                      <label className="text-sm text-muted-foreground uppercase tracking-wider">Amount Tendered</label>
                      <div className="relative mt-2">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground">
                          €
                        </span>
                        <Input
                          type="number"
                          value={amountTendered}
                          onChange={(e) => setAmountTendered(e.target.value)}
                          placeholder="0.00"
                          className="h-16 text-3xl font-heading text-center pl-10 pr-4"
                          step="0.01"
                          min="0"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="grid grid-cols-4 gap-2">
                      {quickAmounts.map((amount) => (
                        <Button
                          key={amount}
                          variant="secondary"
                          className="h-12"
                          onClick={() => setAmountTendered(amount.toString())}
                        >
                          €{amount}
                        </Button>
                      ))}
                    </div>

                    {/* Change Display */}
                    {tenderedValue > 0 && (
                      <div className={`p-4 rounded-lg text-center ${canPayCash ? "bg-green-500/20" : "bg-secondary"}`}>
                        {canPayCash ? (
                          <>
                            <p className="text-sm text-muted-foreground uppercase">Change Due</p>
                            <p className="font-heading text-4xl text-green-500 mt-1">€{changeDue.toFixed(2)}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-muted-foreground uppercase">Remaining</p>
                            <p className="font-heading text-2xl text-muted-foreground mt-1">
                              €{(total - tenderedValue).toFixed(2)}
                            </p>
                          </>
                        )}
                      </div>
                    )}

                    {/* Complete Cash Button */}
                    <Button
                      className="w-full h-16 text-lg"
                      variant={canPayCash ? "glow" : "secondary"}
                      onClick={handleCashPayment}
                      disabled={!canPayCash || isProcessing}
                    >
                      <Check className="w-6 h-6 mr-2" />
                      COMPLETE CASH PAYMENT
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
