import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { useCartStore } from '@/stores/cartStore';
import { Button } from '@/components/ui/button';
import { Trash2, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    toast.success('Order placed successfully!');
    clearCart();
    navigate('/');
  };

  if (items.length === 0) {
    return (
      <CustomerLayout>
        <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-4">
            <ShoppingBag className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="font-heading text-2xl text-foreground mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-6">Add some delicious items to get started</p>
          <Button variant="glow" onClick={() => navigate('/menu')}>
            Browse Menu
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="p-4 space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="font-heading text-3xl text-foreground">Your Cart</h1>
          <button
            onClick={clearCart}
            className="text-destructive text-sm font-medium hover:underline"
          >
            Clear All
          </button>
        </header>

        {/* Cart Items */}
        <div className="space-y-3">
          {items.map((item, index) => {
            const imageUrl = item.product.image_url || categoryImages[item.product.category] || heroBurger;
            
            return (
              <div key={index} className="glass-card p-3 flex gap-3">
                <img
                  src={imageUrl}
                  alt={item.product.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading text-base text-foreground truncate">
                    {item.product.name}
                  </h3>
                  {item.selectedModifiers.length > 0 && (
                    <p className="text-xs text-muted-foreground truncate">
                      {item.selectedModifiers.map((m) => m.name).join(', ')}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-primary font-bold">
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
                        className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
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
                        className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
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
        <div className="glass-card p-4 space-y-3">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>€{total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Service Fee</span>
            <span>€0.00</span>
          </div>
          <div className="border-t border-border pt-3 flex justify-between">
            <span className="font-heading text-lg text-foreground">Total</span>
            <span className="font-heading text-xl text-primary">€{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Checkout Button */}
        <div className="fixed bottom-20 left-4 right-4 max-w-lg mx-auto">
          <Button
            variant="glow"
            size="xl"
            className="w-full"
            onClick={handleCheckout}
          >
            Checkout • €{total.toFixed(2)}
          </Button>
        </div>
      </div>
    </CustomerLayout>
  );
}
