import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product, ProductCategory } from '@/types/database';

export function useProductsByCategory(category: ProductCategory | null) {
  return useQuery({
    queryKey: ['products-by-category', category],
    queryFn: async () => {
      if (!category) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', category)
        .eq('is_available', true)
        .order('price');
      
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!category,
    staleTime: 1000 * 60 * 5,
  });
}

// Fetch loaded fries (Fries category with price >= 6.00)
export function useLoadedFries() {
  return useQuery({
    queryKey: ['loaded-fries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'Fries')
        .eq('is_available', true)
        .gte('price', 6.00)
        .order('price');
      
      if (error) throw error;
      return data as Product[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

// Fetch drinks
export function useDrinks() {
  return useQuery({
    queryKey: ['drinks-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'Drinks')
        .eq('is_available', true)
        .order('price');
      
      if (error) throw error;
      return data as Product[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

// Fetch sauces
export function useSauces() {
  return useQuery({
    queryKey: ['sauces-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'Sauces')
        .eq('is_available', true)
        .order('price');
      
      if (error) throw error;
      return data as Product[];
    },
    staleTime: 1000 * 60 * 5,
  });
}
