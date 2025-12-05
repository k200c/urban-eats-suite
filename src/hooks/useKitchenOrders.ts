import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Order = Tables<'orders'>;
type OrderItem = Tables<'order_items'>;

export interface KitchenOrder extends Order {
  order_items: OrderItem[];
}

export function useKitchenOrders() {
  const queryClient = useQueryClient();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVJERmKpy9rWhGY/RFdwnL/PzI1uW0xHXYalv8LHwqdtUEJGXIGmtLm5s6mDZEtCRGSCmKmwsp+NdllOQ0ZegZSgrKmegHRkUUxJXXaIlaGonYt5bVhNTVV1hJScn5aJeGtaU1BYeISSmZ2YjoZ2aVtUUV17hZOYnJiPiHptYVhWXH6IlJqclpGJf3NmXVhegYuWm56ZlI2CdmpiX2KEjpebnpyYk4qAdWhhYGWIkpmdn5yalY2Df3RsZmBnho+YnJ6bnJiUjoN8dW9qZmOCjJSYmpqZl5WRin97dnBsaGR/ipGVl5eXlpSSjYV/enRwbGh+iJCUlpaWlZSSj4qEfnl0cW5qfIeNkZOTk5KRkI6Kh4J9eXRxb3t/hoyQkpKSkZCPjouIhIB8eHVydHl9g4mNj5CQj46NjIqIhYJ/fHl2dHZ5fYGGioyNjY2MjIuKiIaEgX99e3l4eHl7foKFh4mKioqKiomIh4WDgX9+fHt7e3x9f4GDhYaHh4eHh4aGhYSCgYB/fn19fX5+f4CBgoOEhISEhIODg4KBgYCAf39/f39/gIGBgYKCgoKCgoKCgoGBgYCAf4CAgICAgYGBgYGBgYGBgYGAgYCAgICAgICAgIGAgYGBgYGBgIGAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIB/f4CAgICAgICAgICAgICAgICAgICAgICAgICAf3+AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIA=');
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

  // Fetch orders with items
  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['kitchen-orders'],
    queryFn: async () => {
      // Fetch orders that are not completed (pending, cooking, ready)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['pending', 'cooking', 'ready'])
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;

      // Fetch order items for all orders
      const orderIds = ordersData?.map(o => o.id) || [];
      if (orderIds.length === 0) return [];

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      // Combine orders with their items
      const ordersWithItems: KitchenOrder[] = ordersData.map(order => ({
        ...order,
        order_items: itemsData?.filter(item => item.order_id === order.id) || []
      }));

      return ordersWithItems;
    }
  });

  // Update order status mutation
  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: 'pending' | 'cooking' | 'ready' | 'completed' }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .select('id, status')
        .single();

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
          console.log('New order received:', payload);
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
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, playNotificationSound]);

  // Group orders by status
  const ordersByStatus = {
    pending: orders?.filter(o => o.status === 'pending') || [],
    cooking: orders?.filter(o => o.status === 'cooking') || [],
    ready: orders?.filter(o => o.status === 'ready') || []
  };

  return {
    orders,
    ordersByStatus,
    isLoading,
    updateOrderStatus,
    soundEnabled,
    setSoundEnabled,
    refetch
  };
}
