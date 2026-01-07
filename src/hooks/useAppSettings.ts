import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface AppSettings {
  id: number;
  is_store_open: boolean;
  current_wait_time: string;
  updated_at: string;
  marketing_banner_text: string | null;
  marketing_banner_enabled: boolean;
}

export function useAppSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) throw error;
      return data as AppSettings | null;
    },
    staleTime: 0, // Always fetch fresh data
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('app-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_settings',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['app-settings'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useUpdateAppSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Pick<AppSettings, 'is_store_open' | 'current_wait_time' | 'marketing_banner_text' | 'marketing_banner_enabled'>>) => {
      const { data, error } = await supabase
        .from('app_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', 1)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    },
  });
}
