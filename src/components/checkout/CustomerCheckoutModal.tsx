import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, ShoppingBag, Loader2, ArrowRight, User, Phone, Mail, Clock, ChefHat, Shield } from 'lucide-react';
import { useCheckout } from '@/hooks/useCheckout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CustomerCheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (orderNumber: number) => void;
}

type Step = 'details' | 'payment' | 'connecting' | 'sending' | 'pending';

export function CustomerCheckoutModal({ open, onOpenChange, onSuccess }: CustomerCheckoutModalProps) {
  const { user, profile } = useAuth();
  const { submitOrder, sendToKitchen, clearCart, isSubmitting, isSendingToKitchen, total, items } = useCheckout();
  
  const [step, setStep] = useState<Step>('details');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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
        setIsProcessingPayment(false);
      }, 300);
    }
  }, [open]);

  const canProceed = customerName.trim() && customerPhone.trim();
  const isButtonDisabled = isSubmitting || isProcessingPayment;
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Helper function to format phone with country code
  const formatPhoneWithCountryCode = (phone: string): string => {
    if (!phone) return '';
    
    // Remove all spaces, dashes, and parentheses
    const cleaned = phone.replace(/[\s\-()]/g, '');
    
    // If starts with 0, replace with +353 (Irish format)
    if (cleaned.startsWith('0')) {
      return '+353' + cleaned.substring(1);
    }
    
    // If already has country code
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    
    // If starts with 353 without +
    if (cleaned.startsWith('353')) {
      return '+' + cleaned;
    }
    
    // Default: add +353
    return '+353' + cleaned;
  };

  // Validate email format
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handlePayCard = async () => {
    // Prevent duplicate submissions
    if (isProcessingPayment) return;
    
    // Clear previous errors
    setPaymentError(null);

    // Validation before attempting payment
    const trimmedName = customerName.trim();
    const trimmedPhone = customerPhone.trim();
    const trimmedEmail = customerEmail.trim();

    if (!trimmedName) {
      setPaymentError('Please enter your name');
      return;
    }
    if (!trimmedPhone) {
      setPaymentError('Please enter your phone number');
      return;
    }
    if (!trimmedEmail) {
      setPaymentError('Email is required for card payments');
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setPaymentError('Please enter a valid email address');
      return;
    }
    if (total <= 0) {
      setPaymentError('Invalid order total');
      return;
    }

    setIsProcessingPayment(true);

    try {
      // Step 1: Show connecting spinner
      setStep('connecting');

      // Step 2: Create the order first
      const orderResult = await submitOrder({
        paymentMethod: 'card',
        customerName: trimmedName,
        customerPhone: trimmedPhone,
        customerEmail: trimmedEmail,
      });

      if (!orderResult) {
        throw new Error('Failed to create order');
      }

      // Step 3: Prepare payload with EXACT structure required by edge function
      const formattedPhone = formatPhoneWithCountryCode(trimmedPhone);
      const amountInCents = Math.round(total * 100); // Convert to cents, avoid floating point issues

      const paymentPayload = {
        type: 'online' as const,              // CRITICAL: Must include this
        orderId: orderResult.orderId,         // UUID from orders table
        amount: amountInCents,                // Amount in CENTS
        customerEmail: trimmedEmail,
        customerPhone: formattedPhone,
        customerName: trimmedName,
      };

      console.log('Sending payment payload:', paymentPayload);

      // Step 4: Call Viva Wallet edge function to get payment URL
      const { data, error } = await supabase.functions.invoke('viva-wallet', {
        body: paymentPayload,
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Payment service error');
      }

      if (!data?.paymentUrl) {
        console.error('Response missing paymentUrl:', data);
        throw new Error('No payment URL received');
      }

      // Step 5: Store the order code for tracking (if returned)
      if (data.orderCode) {
        console.log('Order code received:', data.orderCode);
      }

      // Step 6: Redirect to Viva Wallet payment page
      console.log('Redirecting to Viva Wallet:', data.paymentUrl);
      window.location.href = data.paymentUrl;

    } catch (error) {
      console.error('Payment initiation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      setPaymentError(errorMessage);
      toast.error('Payment Error: ' + errorMessage);
      setStep('payment');
      setIsProcessingPayment(false);
    }
  };

  const handlePayOnCollection = async () => {
    // Prevent duplicate submissions
    if (isProcessingPayment) return;
    setIsProcessingPayment(true);

    try {
      // IMPORTANT: Save cart data BEFORE submitOrder (cart won't be cleared now, but snapshot for safety)
      const cartSnapshot = [...items];
      const totalSnapshot = total;

      // Show "Sending to Kitchen" spinner
      setStep('sending');

      const result = await submitOrder({
        paymentMethod: 'cash',
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
      });

      if (result) {
        // Send to n8n webhook for cash/collection payments (marked as web order)
        const kitchenSuccess = await sendToKitchen(
          result,
          {
            name: customerName.trim(),
            phone: customerPhone.trim(),
            email: customerEmail.trim(),
          },
          cartSnapshot,
          totalSnapshot,
          'web'
        );

        // Only clear cart AFTER kitchen confirmation
        if (kitchenSuccess) {
          clearCart();
        }

        setOrderNumber(result.orderNumber);
        setStep('pending');
      } else {
        throw new Error('Order submission failed');
      }
    } catch (error) {
      console.error('Collection payment error:', error);
      toast.error('Payment Error: Please try again or use cash.');
      setStep('payment');
    } finally {
      setIsProcessingPayment(false);
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
                {/* Payment Error Display */}
                {paymentError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-destructive text-sm">{paymentError}</p>
                  </div>
                )}

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
                  {customerEmail && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Email</span>
                      <span className="truncate max-w-[180px]">{customerEmail}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-2 mt-2 flex justify-between">
                    <span className="font-heading">Total</span>
                    <span className="font-heading text-xl text-primary">€{total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Email required notice for card payments */}
                {!customerEmail.trim() && (
                  <p className="text-xs text-muted-foreground text-center">
                    💳 Email is required for card payments
                  </p>
                )}

                {/* Pay Card - Viva Wallet */}
                <Button
                  variant="glow"
                  size="lg"
                  className="w-full h-16"
                  onClick={handlePayCard}
                  disabled={isButtonDisabled}
                >
                  {isButtonDisabled ? (
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
                  disabled={isButtonDisabled}
                >
                  {isButtonDisabled ? (
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
                  disabled={isButtonDisabled}
                >
                  Back
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2.5a: Connecting to Secure Payment */}
          {step === 'connecting' && (
            <motion.div
              key="connecting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-12"
            >
              <div className="text-center space-y-6">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto"
                >
                  <Shield className="w-10 h-10 text-primary" />
                </motion.div>

                <div>
                  <p className="font-heading text-2xl text-foreground">CONNECTING TO SECURE PAYMENT...</p>
                  <p className="text-muted-foreground text-sm mt-2">
                    You'll be redirected to our payment partner
                  </p>
                </div>

                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              </div>
            </motion.div>
          )}

          {/* Step 2.5b: Sending to Kitchen (only for cash/collection) */}
          {step === 'sending' && (
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
