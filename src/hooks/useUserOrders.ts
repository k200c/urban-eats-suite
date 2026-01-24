import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface OrderWithItems {
  id: string;
  status: 'pending' | 'cooking' | 'ready' | 'completed';
  payment_status: string | null;
  total: number;
  created_at: string;
  items: {
    id: string;
    product_name: string | null;
    quantity: number | null;
    unit_price: number;
    selected_modifiers: any;
  }[];
}

export function useUserOrders() {
  const { user } = useAuth();

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['user-orders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          payment_status,
          total,
          created_at,
          order_items (
            id,
            product_name,
            quantity,
            unit_price,
            selected_modifiers
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        return [];
      }

      return (data || []).map(order => ({
        ...order,
        items: order.order_items || [],
      })) as OrderWithItems[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 seconds
  });

  // Real-time subscription for order updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`user-orders-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Order updated:', payload);
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch]);

  // Active orders (pending, cooking, ready)
  const activeOrders = orders?.filter(o => 
    o.status === 'pending' || o.status === 'cooking' || o.status === 'ready'
  ) || [];

  // Completed orders
  const completedOrders = orders?.filter(o => o.status === 'completed') || [];

  // Count for loyalty (completed orders)
  const completedOrderCount = completedOrders.length;

  return {
    orders: orders || [],
    activeOrders,
    completedOrders,
    completedOrderCount,
    isLoading,
    refetch,
  };
}
