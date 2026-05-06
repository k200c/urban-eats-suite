import { useEffect } from 'react';
import { useCartStore } from '@/stores/cartStore';
import { useAuthContext } from '@/contexts/AuthContext';

/**
 * Hook to sync cart state with authentication.
 * - Loads guest cart from localStorage for unauthenticated users
 * - Merges guest cart and loads from Supabase on login
 * - Clears and loads guest cart on logout
 */
export const useCartSync = () => {
  const syncWithUser = useCartStore((state) => state.syncWithUser);
  const { user, loading } = useAuthContext();

  useEffect(() => {
    if (loading) return;
    syncWithUser(user?.id ?? null).catch((error) => {
      console.error('[CartSync] syncWithUser failed:', error);
    });
  }, [user?.id, loading, syncWithUser]);
};
