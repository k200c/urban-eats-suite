import { useState } from 'react';
import { useCartStore } from '@/stores/cartStore';
import { Button } from '@/components/ui/button';
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { CustomerCheckoutModal } from '@/components/checkout/CustomerCheckoutModal';
import { OrderSuccessModal } from '@/components/checkout/OrderSuccessModal';
import { useAppSettings } from '@/hooks/useAppSettings';
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
  const { items, removeItem, updateQuantity, clearCart, getTotal } = useCartStore();
  const total = getTotal();
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState<number>(0);

  const { data: appSettings } = useAppSettings();
  const isStoreOpen = appSettings?.is_store_open ?? true;

  const handleCheckoutClick = () => {
    if (!isStoreOpen) {
      toast.error("We are currently closed!", {
        description: "You can browse, but ordering opens Thu 12pm.",
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

  if (items.length === 0) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="pt-20 px-4 flex flex-col items-center justify-center min-h-[60vh]">
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
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-20 px-4 max-w-lg mx-auto pb-32">
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
            
            return (
              <div key={index} className="street-card p-4 flex gap-4">
                <img
                  src={imageUrl}
                  alt={item.product.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading text-base text-foreground">
                    {item.product.name}
                  </h3>
                  
                  {/* Customizations */}
                  <div className="mt-1 space-y-0.5">
                    {/* Removed Ingredients - Red */}
                    {hasRemovedIngredients && (
                      <p className="text-xs text-destructive">
                        {item.removedIngredients.map((ing) => `No ${ing.name}`).join(', ')}
                      </p>
                    )}
                    
                    {/* Added Extras - Green */}
                    {hasExtras && (
                      <p className="text-xs text-success">
                        {item.selectedModifiers.map((m) => `+ ${m.name}`).join(', ')}
                      </p>
                    )}
                  </div>
                  
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
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-black via-black/95 to-transparent">
          <div className="max-w-lg mx-auto">
            <Button
              className={`w-full h-16 md:h-14 text-lg md:text-base font-bold tracking-wider ${
                isStoreOpen ? 'btn-glow' : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
              onClick={handleCheckoutClick}
              disabled={!isStoreOpen}
            >
              {isStoreOpen 
                ? `CHECKOUT - €${total.toFixed(2)}`
                : "STORE CLOSED (Opens Thu 12pm)"
              }
            </Button>
          </div>
        </div>

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