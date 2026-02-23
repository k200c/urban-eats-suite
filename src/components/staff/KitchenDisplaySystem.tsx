import React, { useState, DragEvent, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Clock, Volume2, VolumeX, GripVertical, Play, CheckCircle, PackageCheck, RefreshCw, Bug, ShoppingBag, Filter } from 'lucide-react';
import { useKitchenOrders, KitchenOrder } from '@/hooks/useKitchenOrders';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { PickupOrderCard } from './PickupOrderCard';
import { StaffPaymentModal } from './StaffPaymentModal';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { StaffCheckoutModal } from './StaffCheckoutModal';

type OrderStatus = 'pending' | 'cooking' | 'ready' | 'completed' | 'pending_payment';

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


interface OrderCardProps {
  order: KitchenOrder;
  onDragStart: (e: DragEvent, order: KitchenOrder) => void;
  onStatusChange: (orderId: string, newStatus: OrderStatus, skipWebhook?: boolean) => void;
  currentStatus: OrderStatus;
  onQuickPay?: (order: KitchenOrder) => void;
}

const OrderCard = forwardRef<HTMLDivElement, OrderCardProps>(
  ({ order, onDragStart, onStatusChange, currentStatus, onQuickPay }, ref) => {
    const [isUpdating, setIsUpdating] = useState(false);
    
    const timeAgo = order.created_at 
      ? formatDistanceToNow(new Date(order.created_at), { addSuffix: true })
      : 'Unknown';

    // Format display_id as 4-digit number
    const displayNumber = order.display_id 
      ? String(order.display_id).padStart(4, '0')
      : order.id.slice(-4).toUpperCase();

    const isUnpaid = order.payment_status !== 'paid';

    // Parse modifiers from the structured payload
    interface ParsedModifiers {
      regularModifiers: Array<{ name: string; price_adjustment?: number }>;
      removedIngredients: string[];
      addedExtras: string[];
    }

    const parseModifiers = (modifiers: unknown): ParsedModifiers => {
      const result: ParsedModifiers = {
        regularModifiers: [],
        removedIngredients: [],
        addedExtras: [],
      };

      if (!modifiers) return result;

      // Handle structured object format
      if (typeof modifiers === 'object' && !Array.isArray(modifiers)) {
        const mod = modifiers as Record<string, unknown>;
        
        // Extract regular modifiers
        if (Array.isArray(mod.modifiers)) {
          result.regularModifiers = mod.modifiers.map((m: unknown) => {
            if (typeof m === 'string') return { name: m };
            if (m && typeof m === 'object' && 'name' in m) {
              const modObj = m as { name: string; price_adjustment?: number };
              return { name: modObj.name, price_adjustment: modObj.price_adjustment };
            }
            return { name: '' };
          }).filter(m => m.name);
        }

        // Extract removed ingredients
        if (Array.isArray(mod.removed_ingredients)) {
          result.removedIngredients = mod.removed_ingredients.filter((i): i is string => typeof i === 'string');
        }
        // Also check legacy format
        if (Array.isArray(mod.removedIngredients)) {
          const legacy = mod.removedIngredients.map((i: unknown) => {
            if (typeof i === 'string') return i;
            if (i && typeof i === 'object' && 'name' in i) return (i as { name: string }).name;
            return '';
          }).filter(Boolean);
          result.removedIngredients = [...result.removedIngredients, ...legacy];
        }

        // Extract added extras
        if (Array.isArray(mod.added_extras)) {
          result.addedExtras = mod.added_extras.filter((i): i is string => typeof i === 'string');
        }
      }

      // Handle legacy array format
      if (Array.isArray(modifiers)) {
        modifiers.forEach((m: unknown) => {
          if (typeof m === 'string') {
            if (m.toLowerCase().startsWith('no ')) {
              result.removedIngredients.push(m.replace(/^no /i, ''));
            } else if (m.toLowerCase().startsWith('extra ')) {
              result.addedExtras.push(m.replace(/^extra /i, ''));
            } else {
              result.regularModifiers.push({ name: m });
            }
          } else if (m && typeof m === 'object' && 'name' in m) {
            const modObj = m as { name: string; price_adjustment?: number };
            result.regularModifiers.push(modObj);
          }
        });
      }

      return result;
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
      
      // Only "Mark Ready" triggers webhook (cooking -> ready)
      const skipWebhook = currentStatus !== 'cooking';
      await onStatusChange(order.id, newStatus, skipWebhook);
      setIsUpdating(false);
    };

    // Quick complete: directly mark as completed without webhook
    const handleQuickComplete = async () => {
      setIsUpdating(true);
      await onStatusChange(order.id, 'completed', true); // Skip webhook
      setIsUpdating(false);
    };

    const getActionButtons = () => {
      switch (currentStatus) {
        case 'pending':
          return (
            <div className="flex gap-2">
              <Button 
                size="sm" 
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                onClick={handleAction}
                disabled={isUpdating}
              >
                <Play className="w-4 h-4 mr-1" />
                Start Cooking
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="px-2 border-muted-foreground/30 hover:bg-muted"
                onClick={handleQuickComplete}
                disabled={isUpdating}
                title="Archive - Skip to Completed (No SMS)"
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
            </div>
          );
        case 'cooking':
          return (
            <div className="flex gap-2">
              <Button 
                size="sm" 
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold"
                onClick={handleAction}
                disabled={isUpdating}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Mark Ready
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="px-2 border-muted-foreground/30 hover:bg-muted"
                onClick={handleQuickComplete}
                disabled={isUpdating}
                title="Archive - Skip to Completed (No SMS)"
              >
                <PackageCheck className="w-4 h-4" />
              </Button>
            </div>
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
        ref={ref}
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
                  #{displayNumber}
                </span>
                {(order as any).order_channel === 'voice' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-600 text-white font-bold uppercase">
                    VOICE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <PaymentStatusBadge 
                  paymentStatus={order.payment_status}
                  size="sm"
                  onClick={isUnpaid && onQuickPay ? () => onQuickPay(order) : undefined}
                />
                <div className="flex items-center gap-1 text-muted-foreground text-xs">
                  <Clock className="w-3 h-3" />
                  {timeAgo}
                </div>
              </div>
            </div>

            {/* UNPAID Alert for Kitchen */}
            {isUnpaid && (
              <PaymentStatusBadge 
                paymentStatus={order.payment_status}
                showAlert={true}
                onClick={onQuickPay ? () => onQuickPay(order) : undefined}
              />
            )}

            {/* Customer Name */}
            {order.customer_name && (
              <p className="text-sm font-medium text-primary mb-2 mt-2">
                {order.customer_name}
              </p>
            )}

            {/* Order Items */}
            <div className="space-y-2">
              {order.order_items.map((item, idx) => {
                const parsed = parseModifiers(item.selected_modifiers);
                const hasCustomizations = parsed.removedIngredients.length > 0 || 
                                          parsed.addedExtras.length > 0 || 
                                          parsed.regularModifiers.length > 0;
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
                    {hasCustomizations && (
                      <div className="flex flex-col gap-1 mt-1 ml-2">
                        {/* Removed Ingredients - Red/Strikethrough */}
                        {parsed.removedIngredients.map((ing, i) => (
                          <span
                            key={`removed-${i}`}
                            className="text-xs px-1.5 py-0.5 rounded bg-red-500/30 text-red-300 font-bold line-through"
                          >
                            NO {ing.toUpperCase()}
                          </span>
                        ))}
                        {/* Added Extras - Green/Bold */}
                        {parsed.addedExtras.map((extra, i) => (
                          <span
                            key={`extra-${i}`}
                            className="text-xs px-1.5 py-0.5 rounded bg-green-500/30 text-green-300 font-bold"
                          >
                            + EXTRA {extra.toUpperCase()}
                          </span>
                        ))}
                        {/* Regular Modifiers - with special styling for flatbread */}
                        {parsed.regularModifiers.map((mod, i) => {
                          const isBreadSwap = mod.name?.toLowerCase().includes('flatbread');
                          const qty = (mod as any).quantity || 1;
                          const displayName = qty > 1 ? `${mod.name} x${qty}` : mod.name;
                          return (
                            <span
                              key={`mod-${i}`}
                              className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                                isBreadSwap
                                  ? 'bg-amber-500/40 text-amber-200'
                                  : 'bg-secondary text-muted-foreground'
                              }`}
                            >
                              {isBreadSwap ? `BREAD: ${displayName.toUpperCase()}` : displayName}
                              {mod.price_adjustment && mod.price_adjustment > 0 && ` (+€${(mod.price_adjustment * qty).toFixed(2)})`}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Special Notes */}
            {order.special_notes && (
              <div className="mt-3 p-2 bg-yellow-500/20 border border-yellow-500/40 rounded">
                <p className="text-xs font-bold text-yellow-300 uppercase mb-1">Special Request:</p>
                <p className="text-sm text-yellow-100">{order.special_notes}</p>
              </div>
            )}

            {/* Total */}
            <div className="mt-3 pt-2 border-t border-border flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-bold text-primary">€{Number(order.total).toFixed(2)}</span>
            </div>

            {/* Action Buttons */}
            <div className="mt-3">
              {getActionButtons()}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }
);

OrderCard.displayName = "OrderCard";

interface KanbanColumnProps {
  config: ColumnConfig;
  orders: KitchenOrder[];
  onDrop: (e: DragEvent, status: OrderStatus) => void;
  onDragOver: (e: DragEvent) => void;
  onStatusChange: (orderId: string, newStatus: OrderStatus, skipWebhook?: boolean) => void;
  onQuickPay: (order: KitchenOrder) => void;
}

function KanbanColumn({ config, orders, onDrop, onDragOver, onStatusChange, onQuickPay }: KanbanColumnProps) {
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
              onQuickPay={onQuickPay}
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
    setSoundEnabled,
    forceRefresh,
    debugInfo
  } = useKitchenOrders();
  
  const [showDebug, setShowDebug] = useState(false);
  const [activeTab, setActiveTab] = useState<'kitchen' | 'pickup'>('kitchen');
  const [selectedPickupOrder, setSelectedPickupOrder] = useState<KitchenOrder | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [checkoutOrder, setCheckoutOrder] = useState<KitchenOrder | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);

  // Find full order data by ID
  const findOrderById = (orderId: string): KitchenOrder | undefined => {
    return [...ordersByStatus.pending, ...ordersByStatus.cooking, ...ordersByStatus.ready, ...ordersByStatus.pending_payment]
      .find(order => order.id === orderId);
  };

  // Filter orders based on unpaid toggle
  const filterOrders = (orders: KitchenOrder[]) => {
    if (!showUnpaidOnly) return orders;
    return orders.filter(order => order.payment_status !== 'paid');
  };

  const filteredOrdersByStatus = {
    pending: filterOrders(ordersByStatus.pending),
    cooking: filterOrders(ordersByStatus.cooking),
    ready: filterOrders(ordersByStatus.ready),
    pending_payment: ordersByStatus.pending_payment
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus, skipWebhook = false) => {
    try {
      // Only send webhook for "Mark Ready" action (cooking -> ready)
      if (!skipWebhook && newStatus === 'ready') {
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

        // Route through authenticated Edge Function (not direct to n8n)
        console.log("🔒 Sending status update via Edge Function...", payload);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.error("No session for status update");
        } else {
          supabase.functions.invoke('update-order-status', {
            body: payload,
          })
            .then(({ data, error }) => {
              if (error) {
                console.error(`❌ Edge Function Error:`, error);
              } else {
                console.log("✅ Status notification sent via Edge Function for order:", orderId);
              }
            })
            .catch((err) => {
              console.error("🚨 Network Error (Edge Function):", err);
            });
        }
      }

      // Update status in database (exclude pending_payment from the mutation type)
      const validStatus = newStatus === 'pending_payment' ? 'pending' : newStatus;
      await updateOrderStatus.mutateAsync({ 
        orderId, 
        status: validStatus as 'pending' | 'cooking' | 'ready' | 'completed' 
      });
      
      const statusLabels: Record<string, string> = {
        pending: 'Pending',
        cooking: 'Cooking',
        ready: 'Ready',
        completed: 'Completed',
        pending_payment: 'Awaiting Payment'
      };
      
      const label = skipWebhook && newStatus === 'completed' ? 'Archived' : statusLabels[newStatus];
      toast.success(`Order ${label}`);
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

  const handleTakePayment = (order: KitchenOrder) => {
    setSelectedPickupOrder(order);
    setPaymentModalOpen(true);
  };

  const handleCheckout = (order: KitchenOrder) => {
    setCheckoutOrder(order);
    setCheckoutModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    setSelectedPickupOrder(null);
    forceRefresh();
  };

  const handleCheckoutSuccess = () => {
    setCheckoutOrder(null);
    forceRefresh();
  };

  const totalOrders = 
    ordersByStatus.pending.length + 
    ordersByStatus.cooking.length + 
    ordersByStatus.ready.length;

  const unpaidCount = [
    ...ordersByStatus.pending,
    ...ordersByStatus.cooking,
    ...ordersByStatus.ready
  ].filter(o => o.payment_status !== 'paid').length;

  const pickupCount = ordersByStatus.pending_payment.length;

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
          <div className="flex items-center gap-2">
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
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'kitchen' | 'pickup')}>
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <TabsList>
              <TabsTrigger value="kitchen" className="gap-2">
                <ChefHat className="w-4 h-4" />
                Kitchen
                {totalOrders > 0 && (
                  <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-xs">
                    {totalOrders}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="pickup" className="gap-2">
                <ShoppingBag className="w-4 h-4" />
                Pending Pickup
                {pickupCount > 0 && (
                  <span className="bg-orange-500/20 text-orange-500 px-1.5 py-0.5 rounded-full text-xs font-bold">
                    {pickupCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Unpaid Filter Toggle */}
            {activeTab === 'kitchen' && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="unpaid-filter" className="text-sm cursor-pointer flex items-center gap-2">
                  Show Unpaid Only
                  {unpaidCount > 0 && (
                    <span className="bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded-full text-xs font-bold">
                      {unpaidCount}
                    </span>
                  )}
                </Label>
                <Switch
                  id="unpaid-filter"
                  checked={showUnpaidOnly}
                  onCheckedChange={setShowUnpaidOnly}
                />
              </div>
            )}
          </div>

          {/* Kitchen Tab - Kanban Board */}
          <TabsContent value="kitchen" className="mt-0">
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
                    orders={filteredOrdersByStatus[column.status]}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onStatusChange={handleStatusChange}
                    onQuickPay={handleCheckout}
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
          </TabsContent>

          {/* Pending Pickup Tab */}
          <TabsContent value="pickup">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-64 bg-secondary/30 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : pickupCount > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {ordersByStatus.pending_payment.map((order) => (
                    <PickupOrderCard
                      key={order.id}
                      order={order}
                      onTakePayment={handleTakePayment}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-lg">No orders awaiting payment</p>
                <p className="text-sm mt-1">Pay-on-collection orders will appear here</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {/* Debug Footer */}
      <CardFooter className="border-t border-border pt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            <strong>Fetched:</strong> {debugInfo.totalFetched} orders
          </span>
          <span>
            <strong>Last Refresh:</strong> {format(debugInfo.lastRefetch, 'HH:mm:ss')}
          </span>
          {showDebug && (
            <span className="text-yellow-500">
              P:{debugInfo.byStatus.pending} | C:{debugInfo.byStatus.cooking} | R:{debugInfo.byStatus.ready}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDebug(!showDebug)}
            className="gap-1 text-xs"
          >
            <Bug className="w-3 h-3" />
            {showDebug ? 'Hide' : 'Debug'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              forceRefresh();
              toast.success('Orders refreshed');
            }}
            className="gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </CardFooter>

      {/* Payment Modal for Pickup Tab */}
      {selectedPickupOrder && (
        <StaffPaymentModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          orderId={selectedPickupOrder.id}
          displayId={selectedPickupOrder.display_id || 0}
          total={Number(selectedPickupOrder.total)}
          items={selectedPickupOrder.order_items}
          customerName={selectedPickupOrder.customer_name}
          customerPhone={selectedPickupOrder.customer_phone}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Staff Checkout Modal for Unpaid Orders */}
      <StaffCheckoutModal
        open={checkoutModalOpen}
        onOpenChange={setCheckoutModalOpen}
        order={checkoutOrder}
        onSuccess={handleCheckoutSuccess}
      />
    </Card>
  );
}
