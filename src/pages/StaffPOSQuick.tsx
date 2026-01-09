import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useProducts } from '@/hooks/useProducts';
import { useStaffCartStore } from '@/stores/staffCartStore';
import { useAuth } from '@/hooks/useAuth';
import { Product, ProductCategory } from '@/types/database';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Minus, Plus, ShoppingCart, Edit2, LogOut, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { ProductSheet } from '@/components/customer/ProductSheet';
import { StaffCheckoutModal } from '@/components/checkout/StaffCheckoutModal';

const categories: ProductCategory[] = ['Burgers', 'Flatbreads', 'Fries', 'Drinks', 'Specials'];

export default function StaffPOSQuick() {
  const navigate = useNavigate();
  const { user, isAdmin, loading, signOut } = useAuth();
  const [activeCategory, setActiveCategory] = useState<ProductCategory>('Burgers');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState<number | null>(null);

  const { data: products = [], isLoading } = useProducts(activeCategory);
  
  // Use isolated staff cart store - completely separate from customer cart
  const { items, addItem, removeItem, updateQuantity, clearCart, getTotal, getItemCount } = useStaffCartStore();

  const total = getTotal();
  const itemCount = getItemCount();

  // Redirect non-admin users
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      toast.error('Access denied. Admin only.');
      navigate('/auth', { replace: true });
    }
  }, [user, isAdmin, loading, navigate]);

  // One-tap add to cart
  const handleQuickAdd = useCallback((product: Product) => {
    addItem(product, 1, [], []);
    toast.success(`${product.name} added`, { duration: 1000 });
  }, [addItem]);

  // Long press to customize
  const handleCustomize = useCallback((product: Product) => {
    setSelectedProduct(product);
  }, []);

  // Handle successful checkout - auto-reset for next customer
  const handleCheckoutSuccess = (orderNumber: number) => {
    setLastOrderNumber(orderNumber);
    toast.success(`Order #${orderNumber} complete!`, { duration: 2000 });
    // Grid is already reset since cart is cleared by checkout
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Left Side - Product Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Category Tabs */}
        <div className="flex-shrink-0 bg-card border-b border-border">
          <div className="flex items-center justify-between pr-2">
            <ScrollArea className="flex-1">
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
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/admin/dashboard')}
                className="flex-shrink-0"
                title="Command Center"
              >
                <Settings className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="flex-shrink-0"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
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

          {/* Checkout Button */}
          {items.length > 0 && (
            <Button
              className="w-full h-14 btn-glow text-lg"
              onClick={() => setShowCheckout(true)}
            >
              CHECKOUT
            </Button>
          )}
        </div>
      </div>

      {/* Product Customization Sheet */}
      <ProductSheet
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
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
