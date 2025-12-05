import { useState, DragEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Clock, Volume2, VolumeX, GripVertical, Play, CheckCircle, PackageCheck } from 'lucide-react';
import { useKitchenOrders, KitchenOrder } from '@/hooks/useKitchenOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

type OrderStatus = 'pending' | 'cooking' | 'ready' | 'completed';

interface ColumnConfig {
  status: OrderStatus;
  title: string;
  borderColor: string;
  bgColor: string;
  headerBg: string;
  headerText: string;
}

const columns: ColumnConfig[] = [
  { 
    status: 'pending', 
    title: 'PENDING', 
    borderColor: 'border-red-500',
    bgColor: 'bg-red-500/5',
    headerBg: 'bg-red-500',
    headerText: 'text-white'
  },
  { 
    status: 'cooking', 
    title: 'COOKING', 
    borderColor: 'border-yellow-500',
    bgColor: 'bg-yellow-500/5',
    headerBg: 'bg-yellow-500',
    headerText: 'text-black'
  },
  { 
    status: 'ready', 
    title: 'READY', 
    borderColor: 'border-green-500',
    bgColor: 'bg-green-500/5',
    headerBg: 'bg-green-500',
    headerText: 'text-white'
  }
];

// Webhook URL for status notifications
const STATUS_WEBHOOK_URL = 'https://kyle2000.app.n8n.cloud/webhook-test/street-eatz-status';

interface OrderCardProps {
  order: KitchenOrder;
  onDragStart: (e: DragEvent, order: KitchenOrder) => void;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  currentStatus: OrderStatus;
}

function OrderCard({ order, onDragStart, onStatusChange, currentStatus }: OrderCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  
  const timeAgo = order.created_at 
    ? formatDistanceToNow(new Date(order.created_at), { addSuffix: true })
    : 'Unknown';

  // Extract modifier info from order items
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

  // Check if modifier indicates removal or allergy
  const isHighlightedModifier = (mod: string): boolean => {
    const lowered = mod.toLowerCase();
    return lowered.startsWith('no ') || 
           lowered.includes('allergy') || 
           lowered.includes('allergies') ||
           lowered.includes('gluten') ||
           lowered.includes('dairy');
  };

  const handleAction = async () => {
    setIsUpdating(true);
    let newStatus: OrderStatus;
    
    switch (currentStatus) {
      case 'pending':
        newStatus = 'cooking';
        break;
      case 'cooking':
        newStatus = 'ready';
        break;
      case 'ready':
        newStatus = 'completed';
        break;
      default:
        return;
    }
    
    await onStatusChange(order.id, newStatus);
    setIsUpdating(false);
  };

  const getActionButton = () => {
    switch (currentStatus) {
      case 'pending':
        return (
          <Button 
            size="sm" 
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
            onClick={handleAction}
            disabled={isUpdating}
          >
            <Play className="w-4 h-4 mr-1" />
            Start Cooking
          </Button>
        );
      case 'cooking':
        return (
          <Button 
            size="sm" 
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold"
            onClick={handleAction}
            disabled={isUpdating}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Mark Ready
          </Button>
        );
      case 'ready':
        return (
          <Button 
            size="sm" 
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold"
            onClick={handleAction}
            disabled={isUpdating}
          >
            <PackageCheck className="w-4 h-4 mr-1" />
            Complete / Pickup
          </Button>
        );
      default:
        return null;
    }
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
            <p className="text-sm font-medium text-primary mb-2">
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
                    <span className="font-semibold text-sm bg-primary/20 px-1.5 rounded">
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

          {/* Action Button */}
          <div className="mt-3">
            {getActionButton()}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface KanbanColumnProps {
  config: ColumnConfig;
  orders: KitchenOrder[];
  onDrop: (e: DragEvent, status: OrderStatus) => void;
  onDragOver: (e: DragEvent) => void;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
}

function KanbanColumn({ config, orders, onDrop, onDragOver, onStatusChange }: KanbanColumnProps) {
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
      className={`flex flex-col rounded-lg border-2 ${config.borderColor} ${config.bgColor} transition-all min-h-[300px] ${
        isDragOver ? 'ring-2 ring-primary scale-[1.01]' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className={`px-4 py-3 ${config.headerBg} ${config.headerText} rounded-t-md`}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm tracking-wide">{config.title}</h3>
          <span className="bg-black/20 px-2 py-0.5 rounded-full text-xs font-bold">
            {orders.length}
          </span>
        </div>
      </div>

      {/* Orders */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[500px]">
        <AnimatePresence mode="popLayout">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              currentStatus={config.status}
              onStatusChange={onStatusChange}
              onDragStart={(e, o) => {
                e.dataTransfer.setData('orderId', o.id);
                e.dataTransfer.setData('currentStatus', o.status || 'pending');
              }}
            />
          ))}
        </AnimatePresence>
        
        {orders.length === 0 && (
          <div className="flex items-center justify-center h-24 text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg">
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

  // Find full order data by ID
  const findOrderById = (orderId: string): KitchenOrder | undefined => {
    return [...ordersByStatus.pending, ...ordersByStatus.cooking, ...ordersByStatus.ready]
      .find(order => order.id === orderId);
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      // FETCH-THEN-SEND: Get fresh order data directly from database
      const { data: freshOrder, error: fetchError } = await supabase
        .from('orders')
        .select('id, customer_name, customer_phone')
        .eq('id', orderId)
        .maybeSingle();

      if (fetchError) {
        console.error('Failed to fetch fresh order data:', fetchError);
      }

      // Construct webhook payload with fresh data (fallback to Guest if missing)
      const payload = {
        type: 'status_update',
        status: newStatus,
        order_id: orderId,
        customer: {
          name: freshOrder?.customer_name || 'Guest',
          phone: freshOrder?.customer_phone || ''
        }
      };

      // Fire webhook in background (don't block status update)
      fetch(STATUS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(() => console.log(`Status notification (${newStatus}) sent for order:`, orderId))
        .catch((err) => console.error('Webhook failed:', err));

      // Update status in database
      await updateOrderStatus.mutateAsync({ 
        orderId, 
        status: newStatus as 'pending' | 'cooking' | 'ready' | 'completed' 
      });
      
      const statusLabels: Record<OrderStatus, string> = {
        pending: 'Pending',
        cooking: 'Cooking',
        ready: 'Ready',
        completed: 'Completed'
      };
      
      toast.success(`Order moved to ${statusLabels[newStatus]}`);
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: DragEvent, newStatus: OrderStatus) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData('orderId');
    const currentStatus = e.dataTransfer.getData('currentStatus');

    if (orderId && currentStatus !== newStatus) {
      await handleStatusChange(orderId, newStatus);
    }
  };

  const totalOrders = 
    ordersByStatus.pending.length + 
    ordersByStatus.cooking.length + 
    ordersByStatus.ready.length;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
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
                <span className="hidden sm:inline">Sound On</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4" />
                <span className="hidden sm:inline">Sound Off</span>
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                onStatusChange={handleStatusChange}
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
