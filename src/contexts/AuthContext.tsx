import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

type AppRole = 'admin' | 'staff' | 'customer';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  profileLoading: boolean;
  profile: {
    full_name: string | null;
    phone: string | null;
  } | null;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string, phone?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isStaff: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    loading: true,
    profileLoading: false,
    profile: null,
  });

  const isMounted = useRef(true);

  const fetchUserData = useCallback(async (userId: string) => {
    if (!isMounted.current) return;
    
    setState(prev => ({ ...prev, profileLoading: true }));
    
    try {
      const [staffCheck, adminCheck, profileResult] = await Promise.all([
        supabase.rpc('has_role', { _user_id: userId, _role: 'staff' }),
        supabase.rpc('has_role', { _user_id: userId, _role: 'admin' }),
        supabase.from('profiles').select('full_name, phone').eq('id', userId).maybeSingle(),
      ]);

      if (!isMounted.current) return;

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
      if (import.meta.env.DEV) {
        console.error('[Auth] Error fetching user data:', error);
      }
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          role: 'customer',
          profileLoading: false,
        }));
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted.current) return;

        setState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          loading: false,
        }));

        if (session?.user) {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(() => {
            if (isMounted.current) {
              fetchUserData(session.user.id);
            }
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

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted.current) return;
      
      setState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false,
      }));

      if (session?.user) {
        fetchUserData(session.user.id);
      }
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
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
  const isAuthenticated = !!state.session;

  const value: AuthContextValue = {
    ...state,
    signIn,
    signUp,
    signOut,
    isStaff,
    isAdmin,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
