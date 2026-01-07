import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerOrder {
  id: string;
  display_id: number;
  created_at: string;
  total: number;
  status: string;
  payment_method: string | null;
}

export function useCustomerOrders(customerPhone: string) {
  return useQuery({
    queryKey: ['customer-orders', customerPhone],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, display_id, created_at, total, status, payment_method')
        .eq('customer_phone', customerPhone)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CustomerOrder[];
    },
    enabled: !!customerPhone,
  });
}
