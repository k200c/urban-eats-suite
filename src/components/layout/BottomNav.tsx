import { Home, UtensilsCrossed, ShoppingCart, User } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useCartStore } from '@/stores/cartStore';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/menu', icon: UtensilsCrossed, label: 'Menu' },
  { to: '/cart', icon: ShoppingCart, label: 'Cart' },
  { to: '/account', icon: User, label: 'Account' },
];

export function BottomNav() {
  const itemCount = useCartStore((state) => state.getItemCount());

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-lg border-t border-border safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className="flex flex-col items-center justify-center gap-1 w-16 h-full text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            <div className="relative">
              <Icon className="w-6 h-6" />
              {label === 'Cart' && itemCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </div>
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
