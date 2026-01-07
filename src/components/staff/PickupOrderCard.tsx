import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CreditCard } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { KitchenOrder } from '@/hooks/useKitchenOrders';

interface PickupOrderCardProps {
  order: KitchenOrder;
  onTakePayment: (order: KitchenOrder) => void;
}

export function PickupOrderCard({ order, onTakePayment }: PickupOrderCardProps) {
  const timeAgo = order.created_at 
    ? formatDistanceToNow(new Date(order.created_at), { addSuffix: true })
    : 'Unknown';

  // Format display_id as 4-digit number
  const displayNumber = order.display_id 
    ? String(order.display_id).padStart(4, '0')
    : order.id.slice(-4).toUpperCase();

  // Parse modifiers for display
  const parseModifiers = (modifiers: unknown): string[] => {
    if (!modifiers) return [];
    if (Array.isArray(modifiers)) {
      return modifiers.map((m: unknown) => {
        if (typeof m === 'string') return m;
        if (m && typeof m === 'object' && 'name' in m) return (m as { name: string }).name;
        return '';
      }).filter(Boolean);
    }
    return [];
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <Card className="bg-card border-2 border-orange-500/50 hover:border-orange-500 transition-colors">
        <CardContent className="p-4">
          {/* Header with large order number */}
          <div className="flex items-center justify-between mb-3">
            <span className="font-heading text-3xl text-orange-500">
              #{displayNumber}
            </span>
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <Clock className="w-3 h-3" />
              {timeAgo}
            </div>
          </div>

          {/* Customer Name */}
          {order.customer_name && (
            <p className="text-lg font-medium text-foreground mb-3">
              {order.customer_name}
            </p>
          )}

          {/* Order Items */}
          <div className="space-y-2 mb-4">
            {order.order_items.map((item, idx) => {
              const modifiers = parseModifiers(item.selected_modifiers);
              return (
                <div key={item.id || idx} className="border-l-2 border-orange-500/30 pl-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm bg-orange-500/20 text-orange-500 px-1.5 rounded">
                      {item.quantity}x
                    </span>
                    <span className="font-medium text-foreground">
                      {item.product_name || 'Unknown Item'}
                    </span>
                  </div>
                  {modifiers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {modifiers.map((mod, modIdx) => (
                        <span
                          key={modIdx}
                          className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground"
                        >
                          {mod}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="pt-3 border-t border-border flex justify-between items-center mb-4">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-heading text-2xl text-orange-500">
              €{Number(order.total).toFixed(2)}
            </span>
          </div>

          {/* Take Payment Button */}
          <Button 
            size="lg"
            className="w-full h-14 text-lg bg-orange-500 hover:bg-orange-600 text-white font-bold"
            onClick={() => onTakePayment(order)}
          >
            <CreditCard className="w-5 h-5 mr-2" />
            TAKE PAYMENT
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
