import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProducts } from '@/hooks/useProducts';
import { useCartStore } from '@/stores/cartStore';
import { Product, ProductCategory } from '@/types/database';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Minus, Plus, ShoppingCart, CreditCard, Banknote, Check, Loader2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { ProductSheet } from '@/components/customer/ProductSheet';
import { useCheckout } from '@/hooks/useCheckout';
import { OrderSuccessModal } from '@/components/checkout/OrderSuccessModal';
import { Input } from '@/components/ui/input';

const categories: ProductCategory[] = ['Burgers', 'Flatbreads', 'Fries', 'Drinks', 'Specials'];

export default function StaffPOSQuick() {
  const [activeCategory, setActiveCategory] = useState<ProductCategory>('Burgers');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [paymentMode, setPaymentMode] = useState<'card' | 'cash' | null>(null);
  const [amountTendered, setAmountTendered] = useState('');
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const { data: products = [], isLoading } = useProducts(activeCategory);
  const { items, addItem, removeItem, updateQuantity, clearCart, getTotal, getItemCount } = useCartStore();
  const { submitOrder, isSubmitting } = useCheckout();

  const total = getTotal();
  const itemCount = getItemCount();
  const tenderedValue = parseFloat(amountTendered) || 0;
  const changeDue = tenderedValue - total;
  const canPayCash = tenderedValue >= total && total > 0;

  // One-tap add to cart
  const handleQuickAdd = useCallback((product: Product) => {
    addItem(product, 1, [], []);
    toast.success(`${product.name} added`, { duration: 1000 });
  }, [addItem]);

  // Long press to customize
  const handleCustomize = useCallback((product: Product) => {
    setSelectedProduct(product);
  }, []);

  // Handle payment
  const handlePayment = async () => {
    const result = await submitOrder({
      paymentMethod: paymentMode!,
      amountTendered: paymentMode === 'cash' ? tenderedValue : undefined,
    });

    if (result) {
      setOrderNumber(result.orderNumber);
      setShowSuccess(true);
      setPaymentMode(null);
      setAmountTendered('');
    }
  };

  // Reset for next order
  const handleSuccessContinue = () => {
    setShowSuccess(false);
    setOrderNumber(null);
  };

  const quickAmounts = [5, 10, 20, 50];

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Left Side - Product Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Category Tabs */}
        <div className="flex-shrink-0 bg-card border-b border-border">
          <ScrollArea className="w-full">
            <div className="flex p-2 gap-2">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={activeCategory === cat ? 'default' : 'ghost'}
                  className={`flex-shrink-0 h-12 px-6 font-heading ${
                    activeCategory === cat ? 'bg-primary text-primary-foreground' : ''
                  }`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat.toUpperCase()}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Product Grid - High Density */}
        <ScrollArea className="flex-1">
          <div className="p-3 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {isLoading ? (
              Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-24 bg-secondary rounded-lg animate-pulse" />
              ))
            ) : (
              products.map((product) => (
                <motion.button
                  key={product.id}
                  whileTap={{ scale: 0.95 }}
                  className="relative h-24 bg-card border border-border rounded-lg p-3 flex flex-col justify-between text-left hover:border-primary/50 transition-colors group"
                  onClick={() => handleQuickAdd(product)}
                >
                  <span className="font-heading text-sm text-foreground line-clamp-2 leading-tight">
                    {product.name}
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-primary font-bold text-sm">
                      €{product.price.toFixed(2)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCustomize(product);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded bg-secondary hover:bg-secondary/80"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Side - Cart & Payment */}
      <div className="w-80 lg:w-96 flex flex-col bg-card border-l border-border">
        {/* Cart Header */}
        <div className="flex-shrink-0 p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <span className="font-heading text-lg">ORDER</span>
            {itemCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                {itemCount}
              </span>
            )}
          </div>
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={clearCart}
            >
              Clear
            </Button>
          )}
        </div>

        {/* Cart Items */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            <AnimatePresence>
              {items.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-secondary rounded-lg p-3"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-heading text-sm truncate">{item.product.name}</p>
                      {item.selectedModifiers.length > 0 && (
                        <p className="text-xs text-success truncate">
                          +{item.selectedModifiers.map(m => m.name).join(', ')}
                        </p>
                      )}
                      {item.removedIngredients.length > 0 && (
                        <p className="text-xs text-destructive truncate">
                          No {item.removedIngredients.map(i => i.name).join(', ')}
                        </p>
                      )}
                    </div>
                    <span className="text-primary font-bold text-sm ml-2">
                      €{item.totalPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => item.quantity === 1 ? removeItem(index) : updateQuantity(index, item.quantity - 1)}
                      className="w-7 h-7 rounded-full bg-background flex items-center justify-center"
                    >
                      {item.quantity === 1 ? <Trash2 className="w-3 h-3 text-destructive" /> : <Minus className="w-3 h-3" />}
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(index, item.quantity + 1)}
                      className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {items.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Tap products to add</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Payment Section */}
        <div className="flex-shrink-0 border-t border-border p-4 space-y-3">
          {/* Total */}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Total</span>
            <span className="font-heading text-2xl text-primary">€{total.toFixed(2)}</span>
          </div>

          {/* Payment Mode Selection */}
          {!paymentMode && items.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="h-14"
                variant="outline"
                onClick={() => setPaymentMode('card')}
              >
                <CreditCard className="w-5 h-5 mr-2" />
                CARD
              </Button>
              <Button
                className="h-14"
                variant="outline"
                onClick={() => setPaymentMode('cash')}
              >
                <Banknote className="w-5 h-5 mr-2" />
                CASH
              </Button>
            </div>
          )}

          {/* Card Payment */}
          {paymentMode === 'card' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Button
                className="w-full h-14 btn-glow"
                onClick={handlePayment}
                disabled={isSubmitting || total === 0}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-5 h-5 mr-2" />
                    PAY €{total.toFixed(2)}
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                className="w-full mt-2"
                onClick={() => setPaymentMode(null)}
              >
                Back
              </Button>
            </motion.div>
          )}

          {/* Cash Payment */}
          {paymentMode === 'cash' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              {/* Amount Input */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">€</span>
                <Input
                  type="number"
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                  placeholder="0.00"
                  className="h-12 text-xl font-heading pl-8"
                  autoFocus
                />
              </div>

              {/* Quick Amounts */}
              <div className="grid grid-cols-4 gap-1">
                {quickAmounts.map((amt) => (
                  <Button
                    key={amt}
                    variant="secondary"
                    size="sm"
                    className="h-9"
                    onClick={() => setAmountTendered(amt.toString())}
                  >
                    €{amt}
                  </Button>
                ))}
              </div>

              {/* Change Display */}
              {amountTendered && (
                <div className={`p-3 rounded-lg text-center ${canPayCash ? 'bg-success/20' : 'bg-secondary'}`}>
                  {canPayCash ? (
                    <>
                      <p className="text-xs text-muted-foreground uppercase">Change Due</p>
                      <p className="font-heading text-3xl text-destructive">€{changeDue.toFixed(2)}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground uppercase">Remaining</p>
                      <p className="font-heading text-xl text-muted-foreground">€{(total - tenderedValue).toFixed(2)}</p>
                    </>
                  )}
                </div>
              )}

              {/* Pay Button */}
              <Button
                className="w-full h-14"
                variant={canPayCash ? 'glow' : 'secondary'}
                onClick={handlePayment}
                disabled={!canPayCash || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : canPayCash ? (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    COMPLETE
                  </>
                ) : (
                  'ENTER AMOUNT'
                )}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => { setPaymentMode(null); setAmountTendered(''); }}
              >
                Back
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Product Customization Sheet */}
      <ProductSheet
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      {/* Success Modal */}
      <OrderSuccessModal
        open={showSuccess}
        onOpenChange={setShowSuccess}
        orderNumber={orderNumber || 0}
        onContinue={handleSuccessContinue}
      />
    </div>
  );
}
