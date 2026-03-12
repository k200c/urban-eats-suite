import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProducts } from '@/hooks/useProducts';
import { useStaffCartStore } from '@/stores/staffCartStore';
import { Product, ProductCategory, CartItem } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Minus, Plus, ShoppingCart, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { StaffProductSheet } from '@/components/staff/StaffProductSheet';
import { StaffCheckoutModal } from '@/components/checkout/StaffCheckoutModal';
import { cn } from '@/lib/utils';

const categories: ProductCategory[] = ['Burgers', 'Flatbreads', 'Fries', 'Kids Menu', 'Drinks', 'Sauces', 'Specials'];

interface StaffPOSContentProps {
  onOrderComplete?: (orderNumber: number) => void;
}

export function StaffPOSContent({ onOrderComplete }: StaffPOSContentProps) {
  const [activeCategory, setActiveCategory] = useState<ProductCategory>('Burgers');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState<number | null>(null);
  
  // Edit mode state
  const [editingItem, setEditingItem] = useState<{ index: number; item: CartItem } | null>(null);
  
  // Checkout safeguard - delay before checkout becomes ready after cart changes
  const [checkoutReady, setCheckoutReady] = useState(true);

  const { data: products = [], isLoading } = useProducts(activeCategory);
  
  // Use isolated staff cart store - completely separate from customer cart
  const { items, addItem, removeItem, updateQuantity, clearCart, getTotal, getItemCount } = useStaffCartStore();

  const total = getTotal();
  const itemCount = getItemCount();

  // Checkout safeguard: brief delay after cart changes to prevent accidental taps
  useEffect(() => {
    if (items.length > 0) {
      setCheckoutReady(false);
      const timer = setTimeout(() => setCheckoutReady(true), 300);
      return () => clearTimeout(timer);
    } else {
      setCheckoutReady(true);
    }
  }, [items.length]);

  // One-tap add to cart
  const handleQuickAdd = useCallback((product: Product) => {
    addItem(product, 1, [], []);
    toast.success(`${product.name} added`, { duration: 1000 });
  }, [addItem]);

  // Long press to customize
  const handleCustomize = useCallback((product: Product) => {
    setSelectedProduct(product);
    setEditingItem(null); // Clear any edit mode
  }, []);

  // Handle edit item
  const handleEditItem = useCallback((index: number, item: CartItem) => {
    setEditingItem({ index, item });
    setSelectedProduct(item.product);
  }, []);

  // Handle successful checkout - auto-reset for next customer
  const handleCheckoutSuccess = (orderNumber: number) => {
    setLastOrderNumber(orderNumber);
    toast.success(`Order #${orderNumber} complete!`, { duration: 2000 });
    onOrderComplete?.(orderNumber);
  };

  // Close sheet handler
  const handleCloseSheet = useCallback(() => {
    setSelectedProduct(null);
    setEditingItem(null);
  }, []);

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left Side - Product Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Category Tabs */}
        <div className="flex-shrink-0 bg-card/50 border-b border-border relative">
          {/* Right fade indicator for scroll overflow */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card/80 to-transparent pointer-events-none z-10" />
          <div className="flex p-2 gap-2 overflow-x-auto overflow-y-hidden no-scrollbar">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={activeCategory === cat ? 'default' : 'ghost'}
                className={cn(
                  'flex-shrink-0 h-14 px-8 text-base font-heading pos-control whitespace-nowrap',
                  activeCategory === cat ? 'bg-primary text-primary-foreground' : ''
                )}
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
              products.filter(p => p.is_available).map((product) => {
                const isSoldOut = product.is_sold_out;
                
                return (
                  <motion.button
                    key={product.id}
                    whileTap={{ scale: isSoldOut ? 1 : 0.95 }}
                    className={cn(
                      'relative h-28 bg-card border border-border rounded-lg p-3 flex flex-col justify-between text-left transition-colors group',
                      isSoldOut 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:border-primary/50'
                    )}
                    onClick={() => !isSoldOut && handleQuickAdd(product)}
                    disabled={isSoldOut}
                  >
                    {isSoldOut && (
                      <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-lg z-10">
                        <span className="bg-destructive/80 px-2 py-0.5 rounded text-destructive-foreground font-bold text-[10px]">
                          SOLD OUT
                        </span>
                      </div>
                    )}
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
                          if (!isSoldOut) handleCustomize(product);
                        }}
                        className={cn(
                          'p-2.5 rounded bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors',
                          isSoldOut && 'pointer-events-none opacity-50'
                        )}
                        title="Customize"
                        disabled={isSoldOut}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.button>
                );
              })
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
              {items.map((item, index) => {
                const hasCustomizations = item.selectedModifiers.length > 0 || item.removedIngredients.length > 0;
                
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={`bg-secondary rounded-lg p-3 ${
                      hasCustomizations ? 'ring-1 ring-primary/30' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-heading text-sm truncate">{item.product.name}</p>
                          {hasCustomizations && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary text-primary shrink-0">
                              CUSTOM
                            </Badge>
                          )}
                        </div>
                        {/* Additions in GREEN with price */}
                        {item.selectedModifiers.length > 0 && (
                          <div className="text-xs text-green-400 mt-0.5">
                            {item.selectedModifiers.map((m, i) => (
                              <span key={m.id || i}>
                                +{m.name}
                                {m.price_adjustment > 0 && (
                                  <span className="opacity-75"> (+€{m.price_adjustment.toFixed(2)})</span>
                                )}
                                {i < item.selectedModifiers.length - 1 && ', '}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Removals in RED */}
                        {item.removedIngredients.length > 0 && (
                          <p className="text-xs text-red-400 mt-0.5 truncate">
                            No {item.removedIngredients.map(i => i.name).join(', ')}
                          </p>
                        )}
                      </div>
                      <span className="text-primary font-bold text-sm ml-2">
                        €{item.totalPrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      {/* Edit Button */}
                      <button
                        onClick={() => handleEditItem(index, item)}
                        className="p-2.5 min-w-[36px] min-h-[36px] rounded bg-background hover:bg-primary hover:text-primary-foreground transition-colors"
                        title="Edit item"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => item.quantity === 1 ? removeItem(index) : updateQuantity(index, item.quantity - 1)}
                          className="w-9 h-9 rounded-full bg-background flex items-center justify-center"
                        >
                          {item.quantity === 1 ? <Trash2 className="w-4 h-4 text-destructive" /> : <Minus className="w-4 h-4" />}
                        </button>
                        <span className="w-8 text-center text-base font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                          className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {items.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Tap products to add</p>
                {lastOrderNumber && (
                  <p className="mt-2 text-xs text-primary">Last order: #{lastOrderNumber}</p>
                )}
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

          {/* Checkout Button with safeguard */}
          {items.length > 0 && (
            <Button
              className={cn(
                "w-full h-16 text-xl pos-control",
                checkoutReady ? "btn-glow" : "bg-primary/70"
              )}
              onClick={() => setShowCheckout(true)}
              disabled={!checkoutReady}
            >
              CHECKOUT
            </Button>
          )}
        </div>
      </div>

      {/* Staff Product Customization Sheet */}
      <StaffProductSheet
        product={selectedProduct}
        onClose={handleCloseSheet}
        editMode={editingItem !== null}
        editIndex={editingItem?.index}
        initialItem={editingItem ? {
          quantity: editingItem.item.quantity,
          selectedModifiers: editingItem.item.selectedModifiers,
          removedIngredients: editingItem.item.removedIngredients,
        } : undefined}
      />

      {/* Staff Checkout Modal */}
      <StaffCheckoutModal
        open={showCheckout}
        onOpenChange={setShowCheckout}
        onSuccess={handleCheckoutSuccess}
      />
    </div>
  );
}
