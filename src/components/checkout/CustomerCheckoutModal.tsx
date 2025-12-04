import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, ShoppingBag, Loader2, ArrowRight, User, Phone, Mail, Clock } from 'lucide-react';
import { useCheckout } from '@/hooks/useCheckout';
import { useAuth } from '@/hooks/useAuth';

interface CustomerCheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (orderNumber: number) => void;
}

type Step = 'details' | 'payment' | 'pending';

export function CustomerCheckoutModal({ open, onOpenChange, onSuccess }: CustomerCheckoutModalProps) {
  const { user, profile } = useAuth();
  const { submitOrder, isSubmitting, total } = useCheckout();
  
  const [step, setStep] = useState<Step>('details');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [orderNumber, setOrderNumber] = useState<number | null>(null);

  // Auto-fill from profile if logged in
  useEffect(() => {
    if (open) {
      if (profile?.full_name) setCustomerName(profile.full_name);
      if (profile?.phone) setCustomerPhone(profile.phone);
      if (user?.email) setCustomerEmail(user.email);
    }
  }, [open, profile, user]);

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('details');
        setOrderNumber(null);
      }, 300);
    }
  }, [open]);

  const canProceed = customerName.trim() && customerPhone.trim();

  const handlePayCard = async () => {
    // Initiate Viva Wallet flow
    initiateVivaWallet();
  };

  const handlePayOnCollection = async () => {
    const result = await submitOrder({
      paymentMethod: 'cash',
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
    });

    if (result) {
      setOrderNumber(result.orderNumber);
      setStep('pending');
    }
  };

  // Placeholder for Viva Wallet integration
  const initiateVivaWallet = async () => {
    // TODO: Connect to Viva Wallet Smart Checkout API
    // This will redirect to Viva Wallet payment page
    // After successful payment, webhook will update order status
    
    const result = await submitOrder({
      paymentMethod: 'card',
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
    });

    if (result) {
      // In production, this would redirect to Viva Wallet
      // For now, simulate successful payment
      setOrderNumber(result.orderNumber);
      setStep('pending');
      
      // Placeholder: Would redirect to Viva Wallet here
      // window.location.href = `https://www.vivapayments.com/web/checkout?ref=${result.orderId}`;
    }
  };

  const handleClose = () => {
    if (step === 'pending' && orderNumber) {
      onSuccess(orderNumber);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <AnimatePresence mode="wait">
          {/* Step 1: Customer Details */}
          {step === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl text-center">YOUR DETAILS</DialogTitle>
              </DialogHeader>

              <div className="mt-6 space-y-4">
                {/* Order Total */}
                <div className="text-center p-4 bg-secondary rounded-lg">
                  <p className="text-muted-foreground text-sm uppercase tracking-wider">Order Total</p>
                  <p className="font-heading text-3xl text-primary mt-1">€{total.toFixed(2)}</p>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Your name"
                    className="h-12 bg-secondary"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+353 85 123 4567"
                    className="h-12 bg-secondary"
                  />
                </div>

                {/* Email (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email <span className="text-muted-foreground text-xs">(optional)</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-12 bg-secondary"
                  />
                </div>

                <Button
                  variant="glow"
                  size="lg"
                  className="w-full h-14 mt-4"
                  disabled={!canProceed}
                  onClick={() => setStep('payment')}
                >
                  Continue to Payment
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Payment Selection */}
          {step === 'payment' && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl text-center">PAYMENT</DialogTitle>
              </DialogHeader>

              <div className="mt-6 space-y-4">
                {/* Order Summary */}
                <div className="p-4 bg-secondary rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Name</span>
                    <span>{customerName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Phone</span>
                    <span>{customerPhone}</span>
                  </div>
                  <div className="border-t border-border pt-2 mt-2 flex justify-between">
                    <span className="font-heading">Total</span>
                    <span className="font-heading text-xl text-primary">€{total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Pay Card - Viva Wallet */}
                <Button
                  variant="glow"
                  size="lg"
                  className="w-full h-16"
                  onClick={handlePayCard}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="w-6 h-6 mr-3" />
                      PAY CARD
                    </>
                  )}
                </Button>

                {/* Pay on Collection */}
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-16"
                  onClick={handlePayOnCollection}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <ShoppingBag className="w-6 h-6 mr-3" />
                      PAY ON COLLECTION
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setStep('details')}
                >
                  Back
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Order Pending */}
          {step === 'pending' && (
            <motion.div
              key="pending"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-6"
            >
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                  className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto"
                >
                  <Clock className="w-10 h-10 text-primary" />
                </motion.div>

                <div>
                  <p className="text-muted-foreground text-sm uppercase tracking-wider">Order Number</p>
                  <p className="font-heading text-5xl text-primary mt-2">#{orderNumber}</p>
                </div>

                <div className="p-4 bg-secondary rounded-lg">
                  <p className="text-lg font-heading text-foreground">ORDER PENDING</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Estimated pickup: <span className="text-foreground font-medium">10-15 minutes</span>
                  </p>
                </div>

                <p className="text-sm text-muted-foreground">
                  We'll send a notification when your order is ready!
                </p>

                <Button
                  variant="glow"
                  size="lg"
                  className="w-full h-14 mt-4"
                  onClick={handleClose}
                >
                  Done
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
