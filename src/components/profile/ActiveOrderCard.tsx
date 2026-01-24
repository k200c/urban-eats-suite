import { motion } from 'framer-motion';
import { Clock, ChefHat, CheckCircle, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ActiveOrderCardProps {
  order: {
    id: string;
    status: 'pending' | 'cooking' | 'ready' | 'completed';
    payment_status?: string | null;
    total: number;
    created_at: string;
    items: {
      product_name: string | null;
      quantity: number | null;
    }[];
  };
}

const statusConfig = {
  pending: {
    label: 'Order Received',
    icon: Clock,
    color: 'bg-yellow-500',
    textColor: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  cooking: {
    label: 'Being Prepared',
    icon: ChefHat,
    color: 'bg-orange-500',
    textColor: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  ready: {
    label: 'Ready for Pickup!',
    icon: CheckCircle,
    color: 'bg-green-500',
    textColor: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  completed: {
    label: 'Completed',
    icon: Package,
    color: 'bg-muted',
    textColor: 'text-muted-foreground',
    bgColor: 'bg-muted/10',
    borderColor: 'border-muted/30',
  },
};

export function ActiveOrderCard({ order }: ActiveOrderCardProps) {
  const config = statusConfig[order.status];
  const StatusIcon = config.icon;
  const orderNumber = order.id.slice(-4).toUpperCase();
  const timeAgo = formatDistanceToNow(new Date(order.created_at), { addSuffix: true });

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "glass-card p-4 border-2 overflow-hidden relative",
        config.borderColor
      )}
    >
      {/* Animated background for ready status */}
      {order.status === 'ready' && (
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-green-500/5 to-green-500/10"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", config.bgColor)}>
              <StatusIcon className={cn("w-5 h-5", config.textColor)} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-lg text-foreground">
                  Order #{orderNumber}
                </h3>
                {/* Payment Status Badge */}
                {order.payment_status && (
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium",
                    order.payment_status === 'completed' 
                      ? "bg-green-500/20 text-green-500" 
                      : "bg-yellow-500/20 text-yellow-500"
                  )}>
                    {order.payment_status === 'completed' ? 'PAID' : 'Payment Pending'}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{timeAgo}</p>
            </div>
          </div>
          <span className={cn(
            "px-3 py-1 rounded-full text-sm font-semibold",
            config.bgColor,
            config.textColor
          )}>
            {config.label}
          </span>
        </div>

        {/* Items preview */}
        <div className="text-sm text-muted-foreground mb-3">
          {order.items.slice(0, 3).map((item, i) => (
            <span key={i}>
              {i > 0 && ', '}
              {item.quantity}x {item.product_name}
            </span>
          ))}
          {order.items.length > 3 && (
            <span className="text-muted-foreground"> +{order.items.length - 3} more</span>
          )}
        </div>

        {/* Ready message */}
        {order.status === 'ready' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 bg-green-500/20 rounded-lg border border-green-500/30 text-center"
          >
            <p className="text-green-400 font-heading text-lg">
              🍔🔥 Your food is READY for pickup!
            </p>
          </motion.div>
        )}

        {/* Progress bar for pending/cooking */}
        {(order.status === 'pending' || order.status === 'cooking') && (
          <div className="mt-3">
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className={cn("h-full rounded-full", config.color)}
                initial={{ width: order.status === 'pending' ? '33%' : '66%' }}
                animate={{ 
                  width: order.status === 'pending' ? '33%' : '66%',
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{ 
                  opacity: { repeat: Infinity, duration: 1.5 }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
