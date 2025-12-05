import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Order = Tables<'orders'>;
type OrderItem = Tables<'order_items'>;

export interface KitchenOrder extends Order {
  order_items: OrderItem[];
}

// Map any "new order" status variants to 'pending' for display
const PENDING_STATUSES = ['pending', 'received', 'created'];
const ACTIVE_STATUSES = ['pending', 'received', 'created', 'cooking', 'ready'];

export function useKitchenOrders() {
  const queryClient = useQueryClient();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastRefetch, setLastRefetch] = useState<Date>(new Date());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVJERmKpy9rWhGY/RFdwnL/PzI1uW0xHXYalv8LHwqdtUEJGXIGmtLm5s6mDZEtCRGSCmKmwsp+NdllOQ0ZegZSgrKmegHRkUUxJXXaIlaGonYt5bVhNTVV1hJScn5aJeGtaU1BYeISSmZ2YjoZ2aVtUUV17hZOYnJiPiHptYVhWXH6IlJqclpGJf3NmXVhegYuWm56ZlI2CdmpiX2KEjpebnpyYk4qAdWhhYGWIkpmdn5yalY2Df3RsZmBnho+YnJ6bnJiUjoN8dW9qZmOCjJSYmpqZl5WRin97dnBsaGR/ipGVl5eXlpSSjYV/enRwbGh+iJCUlpaWlZSSj4qEfnl0cW5qfIeNkZOTk5KRkI6Kh4J9eXRxb3t/hoyQkpKSkZCPjouIhIB8eHVydHl9g4mNj5CQj46NjIqIhYJ/fHl2dHZ5fYGGioyNjY2MjIuKiIaEgX99e3l4eHl7foKFh4mKioqKiomIh4WDgX9+fHt7e3x9f4GDhYaHh4eHh4aGhYSCgYB/fn19fX5+f4CBgoOEhISEhIODg4KBgYCAf39/f39/gIGBgYKCgoKCgoKCgoGBgYCAf4CAgICAgYGBgYGBgYGBgYGAgYCAgICAgICAgIGAgYGBgYGBgIGAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIB/f4CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgH9/gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIA=');
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignore autoplay restrictions
      });
    }
  }, [soundEnabled]);

  // Fetch ALL active orders (Safety First - no date filter, wide status filter)
  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['kitchen-orders'],
    queryFn: async () => {
      console.log('[KDS] Fetching active orders...');
      
      // SAFETY FIRST: Fetch ALL non-completed/cancelled orders regardless of date
      // This catches any status variants like 'received', 'created', etc.
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .not('status', 'eq', 'completed')
        .not('status', 'eq', 'cancelled')
        .order('created_at', { ascending: true });

      if (ordersError) {
        console.error('[KDS] Orders fetch error:', ordersError);
        throw ordersError;
      }

      console.log('[KDS] Raw orders fetched:', ordersData?.length || 0);

      // Fetch order items for all orders
      const orderIds = ordersData?.map(o => o.id) || [];
      if (orderIds.length === 0) {
        console.log('[KDS] No active orders found');
        return [];
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds);

      if (itemsError) {
        console.error('[KDS] Order items fetch error:', itemsError);
        throw itemsError;
      }

      // Combine orders with their items
      const ordersWithItems: KitchenOrder[] = ordersData.map(order => ({
        ...order,
        order_items: itemsData?.filter(item => item.order_id === order.id) || []
      }));

      console.log('[KDS] Orders with items:', ordersWithItems.length);
      return ordersWithItems;
    },
    // SAFETY: Aggressive polling every 5 seconds
    refetchInterval: 5000,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Track last refetch time
  useEffect(() => {
    if (!isLoading) {
      setLastRefetch(new Date());
    }
  }, [orders, isLoading]);

  // Update order status mutation
  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: 'pending' | 'cooking' | 'ready' | 'completed' }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .select('id, status')
        .maybeSingle();

      if (error) {
        console.error('Order status update error:', error);
        throw new Error(error.message || 'Failed to update order status');
      }
      
      if (!data) {
        throw new Error('Update failed - no rows affected. Check permissions.');
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate to refetch and sync UI
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
    },
    onError: (error) => {
      console.error('Mutation error:', error);
    }
  });

  // Force refresh function for manual refresh button
  const forceRefresh = useCallback(() => {
    console.log('[KDS] Force refresh triggered');
    queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
    refetch();
  }, [queryClient, refetch]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('kitchen-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('[KDS] New order received via realtime:', payload);
          playNotificationSound();
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('[KDS] Order updated via realtime:', payload);
          refetch();
        }
      )
      .subscribe((status) => {
        console.log('[KDS] Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, playNotificationSound]);

  // Group orders by status (mapping 'received'/'created' to 'pending')
  const ordersByStatus = {
    pending: orders?.filter(o => PENDING_STATUSES.includes(o.status || '')) || [],
    cooking: orders?.filter(o => o.status === 'cooking') || [],
    ready: orders?.filter(o => o.status === 'ready') || []
  };

  // Debug info
  const debugInfo = {
    totalFetched: orders?.length || 0,
    lastRefetch,
    byStatus: {
      pending: ordersByStatus.pending.length,
      cooking: ordersByStatus.cooking.length,
      ready: ordersByStatus.ready.length
    }
  };

  return {
    orders,
    ordersByStatus,
    isLoading,
    updateOrderStatus,
    soundEnabled,
    setSoundEnabled,
    refetch,
    forceRefresh,
    lastRefetch,
    debugInfo
  };
}
