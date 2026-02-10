import { useState, useEffect } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/hooks/useAuth';
import { Product, ProductCategory, CartItem, SelectedModifier } from '@/types/database';
import { Button } from '@/components/ui/button';
import { 
  Trash2, 
  Minus, 
  Plus, 
  CreditCard, 
  Banknote, 
  Split, 
  Zap,
  WifiOff,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

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

const categories: ProductCategory[] = ['Burgers', 'Flatbreads', 'Fries', 'Drinks', 'Specials'];

// Common combo bundles
const bundles = [
  { name: 'Burger Combo', items: ['Burger', 'Fries', 'Drink'], price: 12.99 },
  { name: 'Family Deal', items: ['2x Burgers', '2x Fries', '2x Drinks'], price: 24.99 },
];

export default function StaffPOS() {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  
  // ALL hooks must be called before any conditional returns
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('Burgers');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'split' | null>(null);
  const [cashTendered, setCashTendered] = useState('');
  const [isOffline, setIsOffline] = useState(false);

  const { data: products, isLoading } = useProducts(selectedCategory);

  // Redirect non-admin users
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      toast.error('Access denied. Admin only.');
      navigate('/auth', { replace: true });
    }
  }, [user, isAdmin, loading, navigate]);

  // Derived values
  const total = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const changeDue = paymentMethod === 'cash' && cashTendered 
    ? parseFloat(cashTendered) - total 
    : 0;

  // Show loading while checking auth
  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.product.id === product.id && item.selectedModifiers.length === 0
      );
      
      if (existing) {
        return prev.map((item) =>
          item === existing
            ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.product.price }
            : item
        );
      }
      
      return [
        ...prev,
        {
          product,
          quantity: 1,
          selectedModifiers: [],
          removedIngredients: [],
          totalPrice: product.price,
        },
      ];
    });
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item, i) => {
          if (i !== index) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          return {
            ...item,
            quantity: newQty,
            totalPrice: newQty * item.product.price,
          };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => {
    setCart([]);
    setShowPayment(false);
    setPaymentMethod(null);
    setCashTendered('');
  };

  const handlePayment = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (isOffline) {
      // Save to local storage for later sync
      const pendingOrders = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
      pendingOrders.push({
        items: cart,
        total,
        paymentMethod,
        cashTendered: paymentMethod === 'cash' ? parseFloat(cashTendered) : null,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('pendingOrders', JSON.stringify(pendingOrders));
      toast.success('Order saved for sync');
    } else {
      toast.success('Order completed!');
    }
    
    clearCart();
  };

  const handleCashInput = (value: string) => {
    if (value === 'clear') {
      setCashTendered('');
    } else if (value === 'backspace') {
      setCashTendered((prev) => prev.slice(0, -1));
    } else {
      setCashTendered((prev) => prev + value);
    }
  };

  return (
    <div className="min-h-screen bg-background flex staff-pos">
      {/* Left Side - Menu Grid (70%) */}
      <div className="w-[70%] p-4 border-r border-border flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-heading text-2xl text-primary">Speed POS</h1>
          </div>
          <div className="flex items-center gap-2">
            {isOffline && (
              <div className="flex items-center gap-2 px-3 py-1 bg-warning/20 text-warning rounded-full text-sm">
                <WifiOff className="w-4 h-4" />
                <span>Sync Pending</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOffline(!isOffline)}
            >
              {isOffline ? 'Go Online' : 'Simulate Offline'}
            </Button>
          </div>
        </div>

        {/* Quick Bundles */}
        <div className="flex gap-2 mb-4">
          {bundles.map((bundle) => (
            <Button
              key={bundle.name}
              variant="secondary"
              className="flex items-center gap-2"
              onClick={() => toast.info(`${bundle.name} - Coming soon!`)}
            >
              <Zap className="w-4 h-4 text-primary" />
              <span>{bundle.name}</span>
              <span className="text-primary font-bold">€{bundle.price}</span>
            </Button>
          ))}
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-6 py-3 text-base rounded-lg font-medium transition-colors whitespace-nowrap pos-control',
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="grid grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-32 bg-secondary rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {products?.map((product) => {
                const imageUrl = product.image_url || categoryImages[product.category] || heroBurger;
                
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={!product.is_available}
                    className={cn(
                      'glass-card p-0 overflow-hidden text-left transition-all hover:scale-[1.02] active:scale-95',
                      !product.is_available && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className="h-20 relative">
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                      {!product.is_available && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                          <span className="text-xs font-bold text-destructive">OUT</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="font-semibold text-sm truncate">{product.name}</p>
                      <p className="text-primary font-bold">€{product.price.toFixed(2)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Cart (30%) */}
      <div className="w-[30%] flex flex-col bg-card">
        {showPayment ? (
          /* Payment View */
          <div className="flex-1 flex flex-col p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl">Payment</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowPayment(false)}>
                Back
              </Button>
            </div>

            <div className="text-center mb-6">
              <p className="text-muted-foreground">Total</p>
              <p className="font-heading text-4xl text-primary">€{total.toFixed(2)}</p>
            </div>

            {/* Payment Method */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { method: 'card', icon: CreditCard, label: 'Card' },
                { method: 'cash', icon: Banknote, label: 'Cash' },
                { method: 'split', icon: Split, label: 'Split' },
              ].map(({ method, icon: Icon, label }) => (
                <Button
                  key={method}
                  variant={paymentMethod === method ? 'default' : 'secondary'}
                  className="flex flex-col items-center gap-1 h-20"
                  onClick={() => setPaymentMethod(method as typeof paymentMethod)}
                >
                  <Icon className="w-6 h-6" />
                  <span>{label}</span>
                </Button>
              ))}
            </div>

            {/* Cash Input */}
            {paymentMethod === 'cash' && (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Amount Tendered</p>
                  <p className="font-heading text-3xl">
                    €{cashTendered || '0.00'}
                  </p>
                </div>

                {changeDue > 0 && (
                  <div className="text-center py-4 bg-destructive/10 rounded-xl">
                    <p className="text-sm text-muted-foreground mb-1">Change Due</p>
                    <p className="cash-display">€{changeDue.toFixed(2)}</p>
                  </div>
                )}

                {/* Number Pad */}
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map((key) => (
                    <Button
                      key={key}
                      variant="secondary"
                      className="h-14 text-xl"
                      onClick={() => handleCashInput(key)}
                    >
                      {key === 'backspace' ? '←' : key}
                    </Button>
                  ))}
                </div>

                {/* Quick Cash Amounts */}
                <div className="grid grid-cols-4 gap-2">
                  {[10, 20, 50, 100].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      onClick={() => setCashTendered(amount.toString())}
                    >
                      €{amount}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-auto">
              <Button
                variant="glow"
                size="xl"
                className="w-full"
                onClick={handlePayment}
                disabled={!paymentMethod || (paymentMethod === 'cash' && changeDue < 0)}
              >
                Complete Order
              </Button>
            </div>
          </div>
        ) : (
          /* Cart View */
          <>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-heading text-xl">Current Order</h2>
              {cart.length > 0 && (
                <button onClick={clearCart} className="text-destructive text-sm hover:underline">
                  Clear
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No items yet</p>
                  <p className="text-sm">Tap items to add</p>
                </div>
              ) : (
                cart.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-secondary rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{item.product.name}</p>
                      <p className="text-primary font-bold">€{item.totalPrice.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(index, -1)}
                        className="w-10 h-10 rounded-full bg-background flex items-center justify-center"
                      >
                        {item.quantity === 1 ? (
                          <Trash2 className="w-4 h-4 text-destructive" />
                        ) : (
                          <Minus className="w-4 h-4" />
                        )}
                      </button>
                      <span className="w-8 text-center font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(index, 1)}
                        className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer */}
            <div className="p-4 border-t border-border space-y-3">
              <div className="flex justify-between text-lg">
                <span className="font-heading">Total</span>
                <span className="font-heading text-primary">€{total.toFixed(2)}</span>
              </div>
              <Button
                variant="glow"
                size="xl"
                className="w-full"
                onClick={() => setShowPayment(true)}
                disabled={cart.length === 0}
              >
                Charge €{total.toFixed(2)}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
