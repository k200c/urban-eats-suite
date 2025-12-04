import { useState, DragEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Clock, Volume2, VolumeX, GripVertical } from 'lucide-react';
import { useKitchenOrders, KitchenOrder } from '@/hooks/useKitchenOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

type OrderStatus = 'pending' | 'cooking' | 'ready';

interface ColumnConfig {
  status: OrderStatus;
  title: string;
  borderColor: string;
  bgColor: string;
  headerBg: string;
}

const columns: ColumnConfig[] = [
  { 
    status: 'pending', 
    title: 'NEW ORDERS', 
    borderColor: 'border-red-500',
    bgColor: 'bg-red-500/5',
    headerBg: 'bg-red-500/20'
  },
  { 
    status: 'cooking', 
    title: 'COOKING', 
    borderColor: 'border-yellow-500',
    bgColor: 'bg-yellow-500/5',
    headerBg: 'bg-yellow-500/20'
  },
  { 
    status: 'ready', 
    title: 'READY', 
    borderColor: 'border-green-500',
    bgColor: 'bg-green-500/5',
    headerBg: 'bg-green-500/20'
  }
];

function OrderCard({ order, onDragStart }: { order: KitchenOrder; onDragStart: (e: DragEvent, order: KitchenOrder) => void }) {
  const timeAgo = order.created_at 
    ? formatDistanceToNow(new Date(order.created_at), { addSuffix: true })
    : 'Unknown';

  // Extract modifier info from order items
  const parseModifiers = (modifiers: unknown): string[] => {
    if (!modifiers) return [];
    if (Array.isArray(modifiers)) {
      return modifiers.map((m: any) => {
        if (typeof m === 'string') return m;
        if (m && typeof m === 'object' && m.name) return m.name;
        return '';
      }).filter(Boolean);
    }
    return [];
  };

  // Check if modifier indicates removal (e.g., "No Onions") or allergy
  const isHighlightedModifier = (mod: string): boolean => {
    const lowered = mod.toLowerCase();
    return lowered.startsWith('no ') || 
           lowered.includes('allergy') || 
           lowered.includes('allergies') ||
           lowered.includes('gluten') ||
           lowered.includes('dairy');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      draggable
      onDragStart={(e) => onDragStart(e as unknown as DragEvent, order)}
      className="cursor-grab active:cursor-grabbing"
    >
      <Card className="bg-card border-2 border-border hover:border-primary/50 transition-colors">
        <CardContent className="p-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <span className="font-bold text-lg">
                #{order.id.slice(-6).toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <Clock className="w-3 h-3" />
              {timeAgo}
            </div>
          </div>

          {/* Customer Name */}
          {order.customer_name && (
            <p className="text-sm text-muted-foreground mb-2">
              {order.customer_name}
            </p>
          )}

          {/* Order Items */}
          <div className="space-y-2">
            {order.order_items.map((item, idx) => {
              const modifiers = parseModifiers(item.selected_modifiers);
              return (
                <div key={item.id || idx} className="border-l-2 border-primary/30 pl-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      {item.quantity}x
                    </span>
                    <span className="font-medium">
                      {item.product_name || 'Unknown Item'}
                    </span>
                  </div>
                  {modifiers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {modifiers.map((mod, modIdx) => (
                        <span
                          key={modIdx}
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            isHighlightedModifier(mod)
                              ? 'bg-red-500/30 text-red-300 font-bold'
                              : 'bg-secondary text-muted-foreground'
                          }`}
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
          <div className="mt-3 pt-2 border-t border-border flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-bold text-primary">€{Number(order.total).toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function KanbanColumn({ 
  config, 
  orders, 
  onDrop,
  onDragOver 
}: { 
  config: ColumnConfig; 
  orders: KitchenOrder[];
  onDrop: (e: DragEvent, status: OrderStatus) => void;
  onDragOver: (e: DragEvent) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
    onDragOver(e);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    setIsDragOver(false);
    onDrop(e, config.status);
  };

  return (
    <div 
      className={`flex flex-col rounded-lg border-2 ${config.borderColor} ${config.bgColor} transition-all ${
        isDragOver ? 'ring-2 ring-primary scale-[1.02]' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className={`px-4 py-3 ${config.headerBg} rounded-t-md`}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm tracking-wide">{config.title}</h3>
          <span className="bg-background/50 px-2 py-0.5 rounded-full text-xs font-bold">
            {orders.length}
          </span>
        </div>
      </div>

      {/* Orders */}
      <div className="flex-1 p-2 space-y-2 min-h-[200px] overflow-y-auto max-h-[500px]">
        <AnimatePresence mode="popLayout">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onDragStart={(e, o) => {
                e.dataTransfer.setData('orderId', o.id);
                e.dataTransfer.setData('currentStatus', o.status || 'pending');
              }}
            />
          ))}
        </AnimatePresence>
        
        {orders.length === 0 && (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            No orders
          </div>
        )}
      </div>
    </div>
  );
}

export function KitchenDisplaySystem() {
  const { 
    ordersByStatus, 
    isLoading, 
    updateOrderStatus, 
    soundEnabled, 
    setSoundEnabled 
  } = useKitchenOrders();

  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: DragEvent, newStatus: OrderStatus) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData('orderId');
    const currentStatus = e.dataTransfer.getData('currentStatus');

    if (orderId && currentStatus !== newStatus) {
      try {
        await updateOrderStatus.mutateAsync({ orderId, status: newStatus as 'pending' | 'cooking' | 'ready' | 'completed' });
        toast.success(`Order moved to ${newStatus.toUpperCase()}`);
      } catch (error) {
        toast.error('Failed to update order status');
      }
    }
    setDraggedOrderId(null);
  };

  const totalOrders = 
    ordersByStatus.pending.length + 
    ordersByStatus.cooking.length + 
    ordersByStatus.ready.length;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ChefHat className="w-5 h-5 text-primary" />
            Kitchen Display System
            {totalOrders > 0 && (
              <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs font-bold">
                {totalOrders} active
              </span>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="gap-2"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4" />
                Sound On
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4" />
                Sound Off
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-secondary/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {columns.map((column) => (
              <KanbanColumn
                key={column.status}
                config={column}
                orders={ordersByStatus[column.status]}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              />
            ))}
          </div>
        )}

        {!isLoading && totalOrders === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <ChefHat className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No active orders. New orders will appear here in real-time.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
