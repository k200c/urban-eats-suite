import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfWeek, endOfWeek, format, getHours, getDay } from 'date-fns';

export interface HeatmapData {
  hour: number;
  day: number;
  count: number;
}

export interface ItemLeaderboardEntry {
  name: string;
  count: number;
  revenue: number;
}

export interface RevenueKPIs {
  totalRevenue: number;
  weekOverWeekChange: number;
  averageOrderValue: number;
  totalCustomers: number;
  returningCustomerRate: number;
}

export function useOrdersHeatmap() {
  return useQuery({
    queryKey: ['orders-heatmap'],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      
      const { data: orders, error } = await supabase
        .from('orders')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo)
        .eq('status', 'completed');

      if (error) throw error;

      // Initialize heatmap grid (24 hours x 7 days)
      const heatmap: HeatmapData[] = [];
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          heatmap.push({ hour, day, count: 0 });
        }
      }

      // Count orders by hour and day
      orders?.forEach(order => {
        const date = new Date(order.created_at);
        const hour = getHours(date);
        const day = getDay(date); // 0 = Sunday
        const index = day * 24 + hour;
        if (heatmap[index]) {
          heatmap[index].count++;
        }
      });

      return heatmap;
    },
  });
}

export function useItemLeaderboard(mealPeriod: 'all' | 'lunch' | 'dinner' = 'all') {
  return useQuery({
    queryKey: ['item-leaderboard', mealPeriod],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, created_at')
        .gte('created_at', thirtyDaysAgo)
        .eq('status', 'completed');

      if (ordersError) throw ordersError;

      // Filter by meal period
      let filteredOrderIds = orders?.map(o => o.id) || [];
      
      if (mealPeriod !== 'all' && orders) {
        filteredOrderIds = orders
          .filter(order => {
            const hour = getHours(new Date(order.created_at));
            if (mealPeriod === 'lunch') return hour >= 11 && hour < 15;
            if (mealPeriod === 'dinner') return hour >= 17 && hour < 22;
            return true;
          })
          .map(o => o.id);
      }

      if (filteredOrderIds.length === 0) return [];

      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('product_name, quantity, unit_price')
        .in('order_id', filteredOrderIds);

      if (itemsError) throw itemsError;

      // Aggregate by product
      const aggregated: Record<string, { count: number; revenue: number }> = {};
      items?.forEach(item => {
        const name = item.product_name || 'Unknown';
        if (!aggregated[name]) {
          aggregated[name] = { count: 0, revenue: 0 };
        }
        aggregated[name].count += item.quantity || 1;
        aggregated[name].revenue += (item.unit_price || 0) * (item.quantity || 1);
      });

      const leaderboard: ItemLeaderboardEntry[] = Object.entries(aggregated)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return leaderboard;
    },
  });
}

export function useRevenueKPIs() {
  return useQuery({
    queryKey: ['revenue-kpis'],
    queryFn: async () => {
      const now = new Date();
      const thisWeekStart = startOfWeek(now);
      const lastWeekStart = startOfWeek(subDays(now, 7));
      const lastWeekEnd = endOfWeek(subDays(now, 7));

      // Get this week's orders
      const { data: thisWeekOrders, error: thisWeekError } = await supabase
        .from('orders')
        .select('total, customer_phone')
        .gte('created_at', thisWeekStart.toISOString())
        .eq('status', 'completed');

      if (thisWeekError) throw thisWeekError;

      // Get last week's orders
      const { data: lastWeekOrders, error: lastWeekError } = await supabase
        .from('orders')
        .select('total')
        .gte('created_at', lastWeekStart.toISOString())
        .lte('created_at', lastWeekEnd.toISOString())
        .eq('status', 'completed');

      if (lastWeekError) throw lastWeekError;

      // Get all customers
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('phone_number, visit_count');

      if (customersError) throw customersError;

      const thisWeekRevenue = thisWeekOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
      const lastWeekRevenue = lastWeekOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
      
      const weekOverWeekChange = lastWeekRevenue > 0 
        ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 
        : 0;

      const totalOrders = thisWeekOrders?.length || 0;
      const aov = totalOrders > 0 ? thisWeekRevenue / totalOrders : 0;

      const totalCustomers = customers?.length || 0;
      const returningCustomers = customers?.filter(c => c.visit_count > 1).length || 0;
      const returningRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;

      return {
        totalRevenue: thisWeekRevenue,
        weekOverWeekChange,
        averageOrderValue: aov,
        totalCustomers,
        returningCustomerRate: returningRate,
      } as RevenueKPIs;
    },
  });
}
