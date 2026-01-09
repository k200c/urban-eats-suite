import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  Banknote, 
  CreditCard, 
  Loader2, 
  ChefHat, 
  Send, 
  Receipt,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { KitchenOrder } from '@/hooks/useKitchenOrders';
import { useAuth } from '@/hooks/useAuth';

// n8n Webhook URL for payment processing
const N8N_PAYMENT_WEBHOOK = 'https://kyle2000.app.n8n.cloud/webhook/street-eatz-payment';

interface StaffCheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: KitchenOrder | null;
  onSuccess: () => void;
}

interface ParsedModifiers {
  regularModifiers: Array<{ name: string; price_adjustment?: number }>;
  removedIngredients: string[];
  addedExtras: string[];
}

export function StaffCheckoutModal({ 
  open, 
  onOpenChange, 
  order,
  onSuccess 
}: StaffCheckoutModalProps) {
  const { user } = useAuth();
  const [amountTendered, setAmountTendered] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingType, setProcessingType] = useState<'cash' | 'card' | 'link' | null>(null);
  const [showCashInput, setShowCashInput] = useState(false);

  if (!order) return null;

  const total = Number(order.total);
  const displayId = order.display_id;
  const displayNumber = String(displayId).padStart(4, '0');
  
  const tenderedValue = parseFloat(amountTendered) || 0;
  const changeDue = tenderedValue - total;
  const canPayCash = tenderedValue >= total && total > 0;

  // Parse modifiers from the structured payload
  const parseModifiers = (modifiers: unknown): ParsedModifiers => {
    const result: ParsedModifiers = {
      regularModifiers: [],
      removedIngredients: [],
      addedExtras: [],
    };

    if (!modifiers) return result;

    // Handle structured object format
    if (typeof modifiers === 'object' && !Array.isArray(modifiers)) {
      const mod = modifiers as Record<string, unknown>;
      
      // Extract regular modifiers
      if (Array.isArray(mod.modifiers)) {
        result.regularModifiers = mod.modifiers.map((m: unknown) => {
          if (typeof m === 'string') return { name: m };
          if (m && typeof m === 'object' && 'name' in m) {
            const modObj = m as { name: string; price_adjustment?: number };
            return { name: modObj.name, price_adjustment: modObj.price_adjustment };
          }
          return { name: '' };
        }).filter(m => m.name);
      }

      // Extract removed ingredients
      if (Array.isArray(mod.removed_ingredients)) {
        result.removedIngredients = mod.removed_ingredients.filter((i): i is string => typeof i === 'string');
      }
      if (Array.isArray(mod.removedIngredients)) {
        const legacy = mod.removedIngredients.map((i: unknown) => {
          if (typeof i === 'string') return i;
          if (i && typeof i === 'object' && 'name' in i) return (i as { name: string }).name;
          return '';
        }).filter(Boolean);
        result.removedIngredients = [...result.removedIngredients, ...legacy];
      }

      // Extract added extras
      if (Array.isArray(mod.added_extras)) {
        result.addedExtras = mod.added_extras.filter((i): i is string => typeof i === 'string');
      }
    }

    // Handle legacy array format
    if (Array.isArray(modifiers)) {
      modifiers.forEach((m: unknown) => {
        if (typeof m === 'string') {
          if (m.toLowerCase().startsWith('no ')) {
            result.removedIngredients.push(m.replace(/^no /i, ''));
          } else if (m.toLowerCase().startsWith('extra ')) {
            result.addedExtras.push(m.replace(/^extra /i, ''));
          } else {
            result.regularModifiers.push({ name: m });
          }
        } else if (m && typeof m === 'object' && 'name' in m) {
          const modObj = m as { name: string; price_adjustment?: number };
          result.regularModifiers.push(modObj);
        }
      });
    }

    return result;
  };

  // Build formatted items array with modifications
  const buildItemsPayload = () => {
    return order.order_items.map(item => {
      const parsed = parseModifiers(item.selected_modifiers);
      const modifications: string[] = [];
      
      parsed.removedIngredients.forEach(ing => modifications.push(`No ${ing}`));
      parsed.addedExtras.forEach(extra => modifications.push(`Extra ${extra}`));
      parsed.regularModifiers.forEach(mod => modifications.push(mod.name));
      
      const itemName = modifications.length > 0 
        ? `${item.product_name} - ${modifications.join(', ')}`
        : item.product_name || 'Unknown Item';
      
      return {
        name: itemName,
        quantity: item.quantity || 1,
        unit_price: item.unit_price,
        modifiers: modifications
      };
    });
  };

  const handleCashPayment = async () => {
    if (!canPayCash || isProcessing) return;
    setIsProcessing(true);
    setProcessingType('cash');

    try {
      // Build the n8n webhook payload
      const webhookPayload = {
        order_id: order.id,
        payment_method: 'cash',
        total_amount: total,
        staff_id: user?.id || 'unknown',
        items: buildItemsPayload(),
        timestamp: new Date().toISOString(),
        display_id: displayId,
        amount_tendered: tenderedValue,
        change_due: changeDue,
        customer_name: order.customer_name || null,
        customer_phone: order.customer_phone || null,
      };

      // Send to n8n webhook for payment processing
      const response = await fetch(N8N_PAYMENT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }

      // Update order status in database
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'pending',
          payment_method: 'cash',
          payment_status: 'paid',
          cash_tendered: tenderedValue,
          change_due: changeDue,
        })
        .eq('id', order.id);

      if (error) throw error;

      toast.success('Payment Recorded', {
        description: `Order #${displayNumber} paid with cash. Change: €${changeDue.toFixed(2)}`
      });
      
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Cash payment error:', error);
      toast.error('Error sending to server', {
        description: 'Please retry the payment'
      });
    } finally {
      setIsProcessing(false);
      setProcessingType(null);
    }
  };

  const handleCardPayment = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setProcessingType('card');

    try {
      // Build the n8n webhook payload
      const webhookPayload = {
        order_id: order.id,
        payment_method: 'card',
        total_amount: total,
        staff_id: user?.id || 'unknown',
        items: buildItemsPayload(),
        timestamp: new Date().toISOString(),
        display_id: displayId,
        customer_name: order.customer_name || null,
        customer_phone: order.customer_phone || null,
      };

      // Send to n8n webhook for payment processing
      const response = await fetch(N8N_PAYMENT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }

      // Update order status in database
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'pending',
          payment_method: 'card',
          payment_status: 'paid',
        })
        .eq('id', order.id);

      if (error) throw error;

      toast.success('Payment Recorded', {
        description: `Order #${displayNumber} paid via card`
      });
      
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Card payment error:', error);
      toast.error('Error sending to server', {
        description: 'Please retry the payment'
      });
    } finally {
      setIsProcessing(false);
      setProcessingType(null);
    }
  };

  const handleResendLink = async () => {
    if (isProcessing || !order.customer_phone) return;
    setIsProcessing(true);
    setProcessingType('link');

    try {
      // Send to n8n webhook to resend payment link
      const response = await fetch(N8N_PAYMENT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          payment_method: 'resend_link',
          total_amount: total,
          staff_id: user?.id || 'unknown',
          items: buildItemsPayload(),
          timestamp: new Date().toISOString(),
          display_id: displayId,
          customer_phone: order.customer_phone,
          customer_name: order.customer_name
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }

      toast.success(`Payment link sent to ${order.customer_phone}!`);
    } catch (error) {
      console.error('Resend link error:', error);
      toast.error('Failed to send payment link.');
    } finally {
      setIsProcessing(false);
      setProcessingType(null);
    }
  };

  const resetForm = () => {
    setAmountTendered('');
    setProcessingType(null);
    setShowCashInput(false);
  };

  const quickAmounts = [10, 20, 50];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-12"
            >
              <div className="text-center space-y-6">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto"
                >
                  {processingType === 'link' ? (
                    <Send className="w-10 h-10 text-primary" />
                  ) : (
                    <ChefHat className="w-10 h-10 text-green-500" />
                  )}
                </motion.div>
                <div>
                  <p className="font-heading text-2xl text-foreground">
                    {processingType === 'link' ? 'SENDING LINK...' : 'PROCESSING PAYMENT...'}
                  </p>
                </div>
                <Loader2 className="w-8 h-8 animate-spin text-green-500 mx-auto" />
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
                <DialogTitle className="font-heading text-2xl text-center flex items-center justify-center gap-2">
                  <Receipt className="w-6 h-6" />
                  CHECKOUT #{displayNumber}
                </DialogTitle>
              </DialogHeader>

              <div className="mt-4 space-y-4">
                {/* Unpaid Alert */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/50">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-sm font-bold text-red-500 uppercase tracking-wider">
                    Payment Required
                  </span>
                </div>

                {/* Customer Info */}
                {order.customer_name && (
                  <div className="px-3 py-2 bg-secondary rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase">Customer</p>
                    <p className="font-medium">{order.customer_name}</p>
                    {order.customer_phone && (
                      <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                    )}
                  </div>
                )}

                {/* Order Items Summary */}
                <div className="space-y-2 bg-secondary/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground uppercase font-bold">Order Items</p>
                  {order.order_items.map((item, idx) => {
                    const parsed = parseModifiers(item.selected_modifiers);
                    const hasCustomizations = parsed.removedIngredients.length > 0 || 
                                              parsed.addedExtras.length > 0 || 
                                              parsed.regularModifiers.length > 0;
                    return (
                      <div key={item.id || idx} className="border-l-2 border-primary/30 pl-2 py-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm bg-primary/20 px-1.5 rounded">
                              {item.quantity}x
                            </span>
                            <span className="font-medium text-sm">
                              {item.product_name || 'Unknown Item'}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            €{(Number(item.unit_price) * (item.quantity || 1)).toFixed(2)}
                          </span>
                        </div>
                        {hasCustomizations && (
                          <div className="flex flex-wrap gap-1 mt-1 ml-2">
                            {parsed.removedIngredients.map((ing, i) => (
                              <span
                                key={`removed-${i}`}
                                className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium"
                              >
                                No {ing}
                              </span>
                            ))}
                            {parsed.addedExtras.map((extra, i) => (
                              <span
                                key={`extra-${i}`}
                                className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-medium"
                              >
                                + {extra}
                              </span>
                            ))}
                            {parsed.regularModifiers.map((mod, i) => (
                              <span
                                key={`mod-${i}`}
                                className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground"
                              >
                                {mod.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <Separator />

                {/* Order Total */}
                <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/30">
                  <p className="text-muted-foreground text-sm uppercase tracking-wider">Total Due</p>
                  <p className="font-heading text-4xl text-primary mt-1">€{total.toFixed(2)}</p>
                </div>

                {/* Payment Method Buttons */}
                {!showCashInput ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        size="lg"
                        variant="outline"
                        className="h-20 flex-col gap-2 text-base border-2 hover:border-primary hover:bg-primary/10"
                        onClick={handleCardPayment}
                        disabled={isProcessing}
                      >
                        <CreditCard className="w-8 h-8" />
                        CARD
                      </Button>
                      
                      <Button
                        size="lg"
                        variant="outline"
                        className="h-20 flex-col gap-2 text-base border-2 hover:border-green-500 hover:bg-green-500/10"
                        onClick={() => {
                          setShowCashInput(true);
                          setAmountTendered(total.toFixed(2));
                        }}
                        disabled={isProcessing}
                      >
                        <Banknote className="w-8 h-8" />
                        CASH
                      </Button>
                    </div>

                    {/* Resend Payment Link */}
                    {order.customer_phone && (
                      <Button
                        size="lg"
                        variant="secondary"
                        className="w-full h-12 gap-2"
                        onClick={handleResendLink}
                        disabled={isProcessing}
                      >
                        <Send className="w-5 h-5" />
                        Resend Payment Link
                      </Button>
                    )}
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4"
                  >
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
                          className="h-14 text-2xl font-heading text-center pl-10 pr-4"
                          step="0.01"
                          min="0"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="grid grid-cols-3 gap-2">
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
                      <div className={`p-4 rounded-lg text-center ${
                        canPayCash ? 'bg-green-500/20 border border-green-500/30' : 'bg-secondary'
                      }`}>
                        {canPayCash ? (
                          <>
                            <p className="text-sm text-muted-foreground uppercase">Change Due</p>
                            <p className="font-heading text-3xl text-green-500 mt-1">
                              €{changeDue.toFixed(2)}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-muted-foreground uppercase">Remaining</p>
                            <p className="font-heading text-xl text-muted-foreground mt-1">
                              €{(total - tenderedValue).toFixed(2)}
                            </p>
                          </>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="h-12"
                        onClick={() => {
                          setShowCashInput(false);
                          setAmountTendered('');
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        className="h-12"
                        variant={canPayCash ? 'glow' : 'secondary'}
                        onClick={handleCashPayment}
                        disabled={!canPayCash || isProcessing}
                      >
                        <Banknote className="w-5 h-5 mr-2" />
                        COMPLETE
                      </Button>
                    </div>
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
