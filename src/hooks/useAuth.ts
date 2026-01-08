import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

type AppRole = 'admin' | 'staff' | 'customer';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  profileLoading: boolean; // Separate loading state for profile data
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
    profileLoading: false,
    profile: null,
  });

  const fetchUserData = useCallback(async (userId: string) => {
    // Set profile loading but don't block main auth loading
    setState(prev => ({ ...prev, profileLoading: true }));
    
    try {
      // Fetch role and profile in parallel - don't block the UI
      const [staffCheck, adminCheck, profileResult] = await Promise.all([
        supabase.rpc('has_role', { _user_id: userId, _role: 'staff' }),
        supabase.rpc('has_role', { _user_id: userId, _role: 'admin' }),
        supabase.from('profiles').select('full_name, phone').eq('id', userId).maybeSingle(),
      ]);

      let role: AppRole = 'customer';
      if (!adminCheck.error && adminCheck.data === true) {
        role = 'admin';
      } else if (!staffCheck.error && staffCheck.data === true) {
        role = 'staff';
      }

      setState(prev => ({
        ...prev,
        role,
        profile: profileResult.data,
        profileLoading: false,
      }));
    } catch (error) {
      console.error('[Auth] Error fetching user data:', error);
      setState(prev => ({
        ...prev,
        role: 'customer',
        profileLoading: false,
      }));
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Update session immediately - don't wait for profile
        setState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          loading: false, // Auth is resolved as soon as we have session state
        }));

        // Fetch profile data in background (non-blocking)
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setState(prev => ({
            ...prev,
            role: null,
            profile: null,
            profileLoading: false,
          }));
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false, // Auth resolved immediately
      }));

      if (session?.user) {
        fetchUserData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

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
  
  // isAuthenticated is true as soon as we have a session - don't wait for profile
  const isAuthenticated = !!state.session;

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    isStaff,
    isAdmin,
    isAuthenticated,
  };
}
