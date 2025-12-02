import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product, ProductCategory } from '@/types/database';

export function useProducts(category?: ProductCategory | 'All') {
  return useQuery({
    queryKey: ['products', category],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('name');

      if (category && category !== 'All') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Product[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: ['products', 'featured'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_featured', true)
        .eq('is_available', true)
        .order('name');

      if (error) throw error;
      return data as Product[];
    },
    staleTime: 1000 * 60 * 5,
  });
}
