import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@/stores/cartStore';

export function FloatingCartButton() {
  const navigate = useNavigate();
  const itemCount = useCartStore((state) => state.getItemCount());
  const total = useCartStore((state) => state.getTotal());

  return (
    <AnimatePresence>
      {itemCount > 0 && (
        <motion.button
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={() => navigate('/cart')}
          className="fixed left-4 right-4 z-50 mx-auto max-w-md"
          style={{ bottom: 'calc(2.75rem + var(--safe-bottom, 0px) + 0.5rem)' }}
        >
          <div className="btn-glow bg-primary text-primary-foreground rounded-2xl px-6 py-4 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingBag className="w-6 h-6" />
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-background text-foreground text-xs font-bold rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              </div>
              <span className="font-heading text-base tracking-wider">VIEW CART</span>
            </div>
            <span className="font-heading text-lg">€{total.toFixed(2)}</span>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
