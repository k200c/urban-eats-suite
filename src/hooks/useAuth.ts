import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

type AppRole = 'admin' | 'staff' | 'customer';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  profile: {
    full_name: string | null;
    phone: string | null;
  } | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    loading: true,
    profile: null,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
        }));

        // Fetch role and profile after auth state change
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setState(prev => ({
            ...prev,
            role: null,
            profile: null,
            loading: false,
          }));
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
      }));

      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      console.log('[Auth] Fetching user data for:', userId);
      
      const [staffCheck, adminCheck, profileResult] = await Promise.all([
        supabase.rpc('has_role', { _user_id: userId, _role: 'staff' }),
        supabase.rpc('has_role', { _user_id: userId, _role: 'admin' }),
        supabase.from('profiles').select('full_name, phone').eq('id', userId).single(),
      ]);

      console.log('[Auth] Staff check:', staffCheck.data, staffCheck.error);
      console.log('[Auth] Admin check:', adminCheck.data, adminCheck.error);

      let role: AppRole = 'customer';
      if (adminCheck.error) {
        console.error('[Auth] Admin role check error:', adminCheck.error);
      } else if (adminCheck.data === true) {
        role = 'admin';
      }
      
      if (staffCheck.error) {
        console.error('[Auth] Staff role check error:', staffCheck.error);
      } else if (role !== 'admin' && staffCheck.data === true) {
        role = 'staff';
      }

      console.log('[Auth] Determined role:', role);

      setState(prev => ({
        ...prev,
        role,
        profile: profileResult.data,
        loading: false,
      }));
    } catch (error) {
      console.error('[Auth] Error fetching user data:', error);
      setState(prev => ({
        ...prev,
        role: 'customer',
        loading: false,
      }));
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string, phone?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: fullName,
          phone: phone,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isStaff = state.role === 'staff' || state.role === 'admin';
  const isAdmin = state.role === 'admin';

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    isStaff,
    isAdmin,
  };
}
