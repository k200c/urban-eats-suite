import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product, ProductCategory } from '@/types/database';
import { useEffect } from 'react';

export function useProducts(category?: ProductCategory | 'All') {
  const queryClient = useQueryClient();

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('products-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
        },
        () => {
          // Invalidate all product queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['products'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['products', category],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_available', true)
        .eq('is_visible', true) // Only show visible + available products on customer menus
        .order('is_featured', { ascending: false })
        .order('name');

      if (category && category !== 'All') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase products fetch error:', error.message, error);
        throw error;
      }
      
      return data as Product[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    // Resilience: Retry on failure and keep previous data while refetching
    retry: 2,
    retryDelay: 1000,
    placeholderData: (previousData) => previousData,
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
        .eq('is_sold_out', false)
        .order('name');

      if (error) throw error;
      return data as Product[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

// Hook for Staff Stock Manager - returns ALL products including hidden ones
export function useAllProducts(category?: ProductCategory | 'All') {
  const queryClient = useQueryClient();

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('all-products-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['all-products'] });
          queryClient.invalidateQueries({ queryKey: ['products'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['all-products', category],
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

      if (error) {
        console.error('Supabase all products fetch error:', error.message, error);
        throw error;
      }
      
      return data as Product[];
    },
    staleTime: 1000 * 60 * 5,
    retry: 2,
    retryDelay: 1000,
    placeholderData: (previousData) => previousData,
  });
}

// Hook to validate cart items availability
export function useValidateCartItems(productIds: string[]) {
  return useQuery({
    queryKey: ['products-availability', productIds],
    queryFn: async () => {
      if (productIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('id, name, is_available')
        .in('id', productIds);

      if (error) throw error;
      return data;
    },
    enabled: productIds.length > 0,
  });
}
