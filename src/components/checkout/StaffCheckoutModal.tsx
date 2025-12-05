import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Banknote, Check, Loader2, Smartphone, ChefHat } from 'lucide-react';
import { useCheckout } from '@/hooks/useCheckout';

interface StaffCheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (orderNumber: number) => void;
}

export function StaffCheckoutModal({ open, onOpenChange, onSuccess }: StaffCheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  const [amountTendered, setAmountTendered] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSendingToKitchen, setIsSendingToKitchen] = useState(false);
  const { submitOrder, sendToKitchen, isSubmitting, total, items } = useCheckout();

  const tenderedValue = parseFloat(amountTendered) || 0;
  const remaining = total - tenderedValue;
  const changeDue = tenderedValue - total;
  const canPayCash = tenderedValue >= total && total > 0;

  const handleCardPayment = async () => {
    // Card payments DO NOT trigger the n8n webhook
    triggerTapToPhone();
    
    const result = await submitOrder({
      paymentMethod: 'card',
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
    });

    if (result) {
      resetForm();
      onOpenChange(false);
      onSuccess(result.orderNumber);
    }
  };

  const resetForm = () => {
    setAmountTendered('');
    setCustomerName('');
    setCustomerPhone('');
  };

  const handleCashPayment = async () => {
    // IMPORTANT: Save cart data BEFORE submitOrder clears the cart
    const cartSnapshot = [...items];
    const totalSnapshot = total;

    // Show "Sending to Kitchen" state
    setIsSendingToKitchen(true);

    const result = await submitOrder({
      paymentMethod: 'cash',
      amountTendered: tenderedValue,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
    });

    if (result) {
      // Send to n8n webhook for cash payments (marked as staff order)
      // Pass the saved cart data since cart is now cleared
      await sendToKitchen(
        result,
        { name: customerName, phone: customerPhone, email: '' },
        cartSnapshot,
        totalSnapshot,
        'staff'
      );

      resetForm();
      setIsSendingToKitchen(false);
      onOpenChange(false);
      onSuccess(result.orderNumber);
    } else {
      setIsSendingToKitchen(false);
    }
  };

  // Placeholder for Tap to Phone integration
  const triggerTapToPhone = () => {
    // TODO: Integrate with Viva Wallet Tap to Phone SDK
    // This would trigger the NFC payment on the device
    console.log('Tap to Phone triggered - waiting for card tap...');
  };

  const quickAmounts = [5, 10, 20, 50];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <AnimatePresence mode="wait">
          {/* Sending to Kitchen State */}
          {isSendingToKitchen ? (
            <motion.div
              key="sending"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-12"
            >
              <div className="text-center space-y-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto"
                >
                  <ChefHat className="w-10 h-10 text-primary" />
                </motion.div>

                <div>
                  <p className="font-heading text-2xl text-foreground">SENDING TO KITCHEN...</p>
                  <p className="text-muted-foreground text-sm mt-2">
                    Your order is being prepared
                  </p>
                </div>

                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="checkout"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl text-center">STAFF CHECKOUT</DialogTitle>
              </DialogHeader>

              <div className="mt-4">
                {/* Order Total */}
                <div className="text-center mb-4 p-4 bg-secondary rounded-lg">
                  <p className="text-muted-foreground text-sm uppercase tracking-wider">Order Total</p>
                  <p className="font-heading text-4xl text-primary mt-1">€{total.toFixed(2)}</p>
                </div>

                {/* Optional Customer Info (for SMS notifications) */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <Input
                    placeholder="Customer Name (optional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-10 text-sm"
                  />
                  <Input
                    placeholder="Phone (optional)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>

                {/* Payment Method Tabs */}
                <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'card' | 'cash')}>
                  <TabsList className="grid w-full grid-cols-2 h-14">
                    <TabsTrigger value="card" className="h-12 gap-2 text-base">
                      <Smartphone className="w-5 h-5" />
                      TERMINAL
                    </TabsTrigger>
                    <TabsTrigger value="cash" className="h-12 gap-2 text-base">
                      <Banknote className="w-5 h-5" />
                      CASH
                    </TabsTrigger>
                  </TabsList>

                  {/* Card Terminal Payment (NO webhook) */}
                  <TabsContent value="card" className="mt-6">
                    <div className="text-center p-4 bg-primary/10 rounded-lg mb-4">
                      <Smartphone className="w-12 h-12 text-primary mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Tap to Phone ready. Customer can tap card when prompted.
                      </p>
                    </div>
                    <Button
                      className="w-full h-16 text-lg btn-glow"
                      onClick={handleCardPayment}
                      disabled={isSubmitting || total === 0}
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <>
                          <CreditCard className="w-6 h-6 mr-2" />
                          CHARGE €{total.toFixed(2)}
                        </>
                      )}
                    </Button>
                  </TabsContent>

                  {/* Cash Payment with Calculator (TRIGGERS webhook) */}
                  <TabsContent value="cash" className="mt-6 space-y-4">
                    {/* Amount Tendered Input */}
                    <div>
                      <label className="text-sm text-muted-foreground uppercase tracking-wider">
                        Amount Tendered
                      </label>
                      <div className="relative mt-2">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground">€</span>
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

                    {/* Exact Amount Button */}
                    <Button
                      variant="outline"
                      className="w-full h-12"
                      onClick={() => setAmountTendered(total.toFixed(2))}
                    >
                      Exact Amount (€{total.toFixed(2)})
                    </Button>

                    {/* Change/Remaining Display */}
                    <AnimatePresence mode="wait">
                      {amountTendered && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={`p-4 rounded-lg text-center ${
                            canPayCash ? 'bg-success/20' : 'bg-secondary'
                          }`}
                        >
                          {canPayCash ? (
                            <>
                              <p className="text-sm text-muted-foreground uppercase">Change Due</p>
                              <p className="font-heading text-5xl text-destructive mt-1">
                                €{changeDue.toFixed(2)}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-muted-foreground uppercase">Remaining</p>
                              <p className="font-heading text-2xl text-muted-foreground mt-1">
                                €{remaining.toFixed(2)}
                              </p>
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Pay Button */}
                    <Button
                      className="w-full h-16 text-lg"
                      variant={canPayCash ? 'glow' : 'secondary'}
                      onClick={handleCashPayment}
                      disabled={!canPayCash || isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : canPayCash ? (
                        <>
                          <Check className="w-6 h-6 mr-2" />
                          COMPLETE
                        </>
                      ) : (
                        'ENTER AMOUNT'
                      )}
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}