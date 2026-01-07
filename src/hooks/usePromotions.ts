import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Promotion {
  id: string;
  code: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  is_active: boolean;
  expiry_date: string | null;
  usage_count: number;
  max_uses: number | null;
  min_order_value: number;
  created_at: string;
  updated_at: string;
}

export function usePromotions() {
  return useQuery({
    queryKey: ['promotions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Promotion[];
    },
  });
}

export function useCreatePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (promotion: {
      code: string;
      discount_type: 'percentage' | 'flat';
      discount_value: number;
      expiry_date?: string;
      max_uses?: number;
      min_order_value?: number;
    }) => {
      const { data, error } = await supabase
        .from('promotions')
        .insert({
          code: promotion.code.toUpperCase(),
          discount_type: promotion.discount_type,
          discount_value: promotion.discount_value,
          expiry_date: promotion.expiry_date || null,
          max_uses: promotion.max_uses || null,
          min_order_value: promotion.min_order_value || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Coupon created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create coupon');
    },
  });
}

export function useUpdatePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Promotion> & { id: string }) => {
      const { data, error } = await supabase
        .from('promotions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Coupon updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update coupon');
    },
  });
}

export function useDeletePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Coupon deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete coupon');
    },
  });
}
