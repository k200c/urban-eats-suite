import { useState, useEffect } from 'react';
import { useCartStore } from '@/stores/cartStore';
import { Button } from '@/components/ui/button';
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft, AlertTriangle, Edit2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { CustomerCheckoutModal } from '@/components/checkout/CustomerCheckoutModal';
import { OrderSuccessModal } from '@/components/checkout/OrderSuccessModal';
import { useStoreStatus } from '@/hooks/useStoreStatus';
import { useValidateCartItems } from '@/hooks/useProducts';
import { useProductModifiers } from '@/hooks/useProductModifiers';
import { useProductIngredients } from '@/hooks/useProductIngredients';
import { ProductSheet } from '@/components/customer/ProductSheet';
import { CartItem } from '@/types/database';
import { toast } from 'sonner';

import heroBurger from '@/assets/hero-burger.jpg';
import loadedFries from '@/assets/loaded-fries.jpg';
import flatbread from '@/assets/flatbread.jpg';
import drinks from '@/assets/drinks.jpg';

const categoryImages: Record<string, string> = {
  Burgers: heroBurger,
  Flatbreads: flatbread,
  Fries: loadedFries,
  Drinks: drinks,
  Specials: heroBurger,
};

export default function Cart() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { items, removeItem, updateQuantity, clearCart, getTotal } = useCartStore();
  const total = getTotal();
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState<number>(0);
  
  // Edit item state
  const [editingItem, setEditingItem] = useState<{ index: number; item: CartItem } | null>(null);

  const { isStoreOpen, devModeEnabled } = useStoreStatus();
  
  // Fetch modifiers and ingredients for the product being edited
  const { data: editModifierGroups } = useProductModifiers(editingItem?.item.product.id);
  const { data: editIngredients } = useProductIngredients(editingItem?.item.product.id);

  // Auto-open checkout if returning from payment error
  useEffect(() => {
    if (searchParams.get('checkout') === 'true' && items.length > 0) {
      setShowCheckout(true);
      // Clean up URL
      window.history.replaceState({}, '', '/cart');
    }
  }, [searchParams, items.length]);

  // Get product IDs from cart items
  const productIds = items.map(item => item.product.id);
  const { data: productAvailability } = useValidateCartItems(productIds);

  // Check for unavailable items
  const unavailableItems = productAvailability?.filter(p => !p.is_available) || [];
  const hasUnavailableItems = unavailableItems.length > 0;

  // Show toast when items become unavailable
  useEffect(() => {
    if (unavailableItems.length > 0) {
      unavailableItems.forEach(item => {
        toast.error(`Sorry, ${item.name} just sold out!`, {
          description: 'Please remove it from your cart to continue.',
          duration: 5000,
        });
      });
    }
  }, [unavailableItems.map(i => i.id).join(',')]);

  const handleCheckoutClick = () => {
    if (!isStoreOpen) {
      toast.error("We are currently closed!", {
        description: "You can browse, but ordering opens Thu 12pm.",
      });
      return;
    }
    
    if (hasUnavailableItems) {
      toast.error("Some items are no longer available", {
        description: "Please remove sold out items before checking out.",
      });
      return;
    }
    
    setShowCheckout(true);
  };

  const handleCheckoutSuccess = (num: number) => {
    setOrderNumber(num);
    setShowSuccess(true);
  };

  const handleSuccessContinue = () => {
    setShowSuccess(false);
    navigate('/');
  };

  const handleEditItem = (index: number, item: CartItem) => {
    setEditingItem({ index, item });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[100dvh]">
        <Navbar />
        <div className="pt-[var(--header-offset)] px-4 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-4">
            <ShoppingBag className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="font-heading text-2xl text-foreground mb-2">YOUR CART IS EMPTY</h2>
          <p className="text-muted-foreground mb-6">Add some delicious items to get started</p>
          <Button className="btn-glow" onClick={() => navigate('/')}>
            BROWSE MENU
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh]">
      <Navbar />
      <div className="pt-[var(--header-offset)] px-4 max-w-lg mx-auto pb-40">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-heading text-2xl text-foreground">YOUR ORDER</h1>
          </div>
          <button
            onClick={clearCart}
            className="text-destructive text-sm font-medium hover:underline uppercase tracking-wider"
          >
            Clear
          </button>
        </header>

        {/* Cart Items */}
        <div className="space-y-3 mb-6">
          {items.map((item, index) => {
            const imageUrl = item.product.image_url || categoryImages[item.product.category] || heroBurger;
            const hasRemovedIngredients = item.removedIngredients && item.removedIngredients.length > 0;
            const hasExtras = item.selectedModifiers.length > 0;
            const isUnavailable = unavailableItems.some(u => u.id === item.product.id);
            
            return (
              <div key={index} className={`street-card p-4 flex gap-4 ${isUnavailable ? 'border-destructive bg-destructive/10' : ''}`}>
                {isUnavailable && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 text-destructive text-xs font-medium">
                    <AlertTriangle className="w-3 h-3" />
                    SOLD OUT
                  </div>
                )}
                <img
                  src={imageUrl}
                  alt={item.product.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h3 className="font-heading text-base text-foreground">
                      {item.product.name}
                    </h3>
                    {/* Edit Button */}
                    <button
                      onClick={() => handleEditItem(index, item)}
                      className="p-1.5 rounded bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors"
                      title="Edit item"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  {/* Customizations - Clear Summary */}
                  {(hasRemovedIngredients || hasExtras) && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {/* Removed Ingredients - Red badges */}
                      {item.removedIngredients.map((ing) => (
                        <span 
                          key={ing.id} 
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-destructive/20 text-destructive border border-destructive/30"
                        >
                          - {ing.name}
                        </span>
                      ))}
                      
                      {/* Added Extras - Green badges, Bread swaps - Amber badges */}
                      {item.selectedModifiers.map((m) => {
                        const isBreadSwap = m.modifier_type === 'bread_swap';
                        const qty = m.quantity || 1;
                        const totalAdj = m.price_adjustment * qty;
                        const displayName = qty > 1 ? `${m.name} x${qty}` : m.name;
                        return (
                          <span 
                            key={m.id} 
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isBreadSwap 
                                ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                                : 'bg-green-500/20 text-green-400 border border-green-500/30'
                            }`}
                          >
                            {isBreadSwap ? displayName : `+ ${displayName}`}
                            {totalAdj > 0 && ` (+€${totalAdj.toFixed(2)})`}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="price-badge">
                      €{item.totalPrice.toFixed(2)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (item.quantity === 1) {
                            removeItem(index);
                          } else {
                            updateQuantity(index, item.quantity - 1);
                          }
                        }}
                        className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
                      >
                        {item.quantity === 1 ? (
                          <Trash2 className="w-4 h-4 text-destructive" />
                        ) : (
                          <Minus className="w-4 h-4" />
                        )}
                      </button>
                      <span className="w-6 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(index, item.quantity + 1)}
                        className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="street-card p-4 space-y-3">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>€{total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Service Fee</span>
            <span className="text-success">FREE</span>
          </div>
          <div className="border-t border-white/10 pt-3 flex justify-between">
            <span className="font-heading text-lg text-foreground">TOTAL</span>
            <span className="font-heading text-xl text-primary">€{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Checkout Button - Thumb-Friendly */}
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 safe-area-pb bg-gradient-to-t from-black via-black/95 to-transparent">
          <div className="max-w-lg mx-auto">
            {hasUnavailableItems && (
              <div className="mb-3 p-3 bg-destructive/20 border border-destructive/30 rounded-lg flex items-center gap-2 text-destructive text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Remove sold out items to continue</span>
              </div>
            )}
            <Button
              className={`w-full h-16 md:h-14 text-lg md:text-base font-bold tracking-wider ${
                isStoreOpen && !hasUnavailableItems ? 'btn-glow' : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
              onClick={handleCheckoutClick}
              disabled={!isStoreOpen || hasUnavailableItems}
            >
              {!isStoreOpen 
                ? "STORE CLOSED (Opens Thu 12pm)"
                : hasUnavailableItems
                ? "REMOVE SOLD OUT ITEMS"
                : `CHECKOUT - €${total.toFixed(2)}`
              }
            </Button>
          </div>
        </div>

        {/* Edit Item ProductSheet */}
        {editingItem && (
          <ProductSheet
            product={editingItem.item.product}
            modifierGroups={editModifierGroups}
            ingredients={editIngredients}
            onClose={() => setEditingItem(null)}
            editMode={true}
            editIndex={editingItem.index}
            initialItem={{
              quantity: editingItem.item.quantity,
              selectedModifiers: editingItem.item.selectedModifiers,
              removedIngredients: editingItem.item.removedIngredients,
            }}
          />
        )}

        {/* Checkout Modal */}
        <CustomerCheckoutModal
          open={showCheckout}
          onOpenChange={setShowCheckout}
          onSuccess={handleCheckoutSuccess}
        />

        {/* Order Success Modal */}
        <OrderSuccessModal
          open={showSuccess}
          onOpenChange={setShowSuccess}
          orderNumber={orderNumber}
          onContinue={handleSuccessContinue}
        />
      </div>
    </div>
  );
}
