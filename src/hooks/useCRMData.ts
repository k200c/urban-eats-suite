import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';

export interface CustomerWithStats {
  phone_number: string;
  name: string | null;
  total_spend: number;
  last_order_date: string | null;
  visit_count: number;
  dietary_notes?: string | null;
  favorite_item?: string | null;
  loyalty_tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  tier_progress: number;
  is_vip: boolean;
  is_lapsed: boolean;
  is_new: boolean;
}

// Loyalty tier thresholds
const TIER_THRESHOLDS = {
  Bronze: { min: 0, max: 50 },
  Silver: { min: 50, max: 150 },
  Gold: { min: 150, max: 300 },
  Platinum: { min: 300, max: Infinity },
};

function calculateLoyaltyTier(totalSpend: number): { tier: CustomerWithStats['loyalty_tier']; progress: number } {
  if (totalSpend >= 300) return { tier: 'Platinum', progress: 100 };
  if (totalSpend >= 150) return { tier: 'Gold', progress: ((totalSpend - 150) / 150) * 100 };
  if (totalSpend >= 50) return { tier: 'Silver', progress: ((totalSpend - 50) / 100) * 100 };
  return { tier: 'Bronze', progress: (totalSpend / 50) * 100 };
}

export function useCRMCustomers() {
  return useQuery({
    queryKey: ['crm-customers'],
    queryFn: async () => {
      // Fetch customers
      const { data: customers, error } = await supabase
        .from('customers')
        .select('*')
        .order('total_spend', { ascending: false });

      if (error) throw error;

      // Fetch dietary notes
      const { data: notes } = await supabase
        .from('customer_notes')
        .select('*');

      const notesMap = new Map(notes?.map(n => [n.customer_phone, n.dietary_notes]) || []);

      // Calculate VIP threshold (top 10%)
      const sortedBySpend = [...(customers || [])].sort((a, b) => b.total_spend - a.total_spend);
      const vipThresholdIndex = Math.ceil(sortedBySpend.length * 0.1);
      const vipThreshold = sortedBySpend[vipThresholdIndex]?.total_spend || Infinity;

      const thirtyDaysAgo = subDays(new Date(), 30);
      const sevenDaysAgo = subDays(new Date(), 7);

      const enrichedCustomers: CustomerWithStats[] = (customers || []).map(customer => {
        const { tier, progress } = calculateLoyaltyTier(customer.total_spend);
        const lastOrderDate = customer.last_order_date ? new Date(customer.last_order_date) : null;
        
        return {
          phone_number: customer.phone_number,
          name: customer.name,
          total_spend: customer.total_spend,
          last_order_date: customer.last_order_date,
          visit_count: customer.visit_count,
          dietary_notes: notesMap.get(customer.phone_number) || null,
          loyalty_tier: tier,
          tier_progress: progress,
          is_vip: customer.total_spend >= vipThreshold,
          is_lapsed: lastOrderDate ? lastOrderDate < thirtyDaysAgo : false,
          is_new: lastOrderDate ? lastOrderDate >= sevenDaysAgo && customer.visit_count === 1 : false,
        };
      });

      return enrichedCustomers;
    },
  });
}

export function useCustomerFavoriteItem(customerPhone: string) {
  return useQuery({
    queryKey: ['customer-favorite', customerPhone],
    queryFn: async () => {
      // Get all orders for this customer
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id')
        .eq('customer_phone', customerPhone);

      if (error || !orders?.length) return null;

      // Get order items
      const orderIds = orders.map(o => o.id);
      const { data: items } = await supabase
        .from('order_items')
        .select('product_name, quantity')
        .in('order_id', orderIds);

      if (!items?.length) return null;

      // Count by product
      const counts: Record<string, number> = {};
      items.forEach(item => {
        if (item.product_name) {
          counts[item.product_name] = (counts[item.product_name] || 0) + (item.quantity || 1);
        }
      });

      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      return sorted[0]?.[0] || null;
    },
    enabled: !!customerPhone,
  });
}

export function useUpdateDietaryNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ phone, notes }: { phone: string; notes: string }) => {
      const { error } = await supabase
        .from('customer_notes')
        .upsert({ customer_phone: phone, dietary_notes: notes }, { onConflict: 'customer_phone' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-customers'] });
    },
  });
}
