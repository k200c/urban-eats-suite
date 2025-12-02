import { useState, useEffect } from 'react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { LoyaltyCard } from '@/components/customer/LoyaltyCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { User, LogOut, Settings, Receipt, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

export default function Account() {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        toast.success('Account created successfully!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success('Welcome back!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Signed out successfully');
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="p-4 flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </CustomerLayout>
    );
  }

  if (!user) {
    return (
      <CustomerLayout>
        <div className="p-4 space-y-6">
          <header className="text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10 text-primary" />
            </div>
            <h1 className="font-heading text-3xl text-foreground">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isSignUp ? 'Join Street Eats for rewards' : 'Sign in to track your orders'}
            </p>
          </header>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 bg-secondary"
              />
            </div>
            <Button
              type="submit"
              variant="glow"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          <div className="text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary font-medium hover:underline"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="p-4 space-y-6">
        {/* Profile Header */}
        <header className="glass-card p-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
            <span className="font-heading text-2xl text-primary-foreground">
              {user.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading text-xl text-foreground truncate">
              {user.email}
            </h2>
            <p className="text-sm text-muted-foreground">Member since 2024</p>
          </div>
        </header>

        {/* Loyalty Card */}
        <LoyaltyCard points={4} />

        {/* Menu Items */}
        <div className="glass-card overflow-hidden divide-y divide-border">
          <button className="w-full p-4 flex items-center gap-3 hover:bg-secondary/50 transition-colors">
            <Receipt className="w-5 h-5 text-muted-foreground" />
            <span className="text-foreground">Order History</span>
          </button>
          <button className="w-full p-4 flex items-center gap-3 hover:bg-secondary/50 transition-colors">
            <Gift className="w-5 h-5 text-muted-foreground" />
            <span className="text-foreground">Rewards</span>
          </button>
          <button className="w-full p-4 flex items-center gap-3 hover:bg-secondary/50 transition-colors">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <span className="text-foreground">Settings</span>
          </button>
          <button
            onClick={handleSignOut}
            className="w-full p-4 flex items-center gap-3 hover:bg-secondary/50 transition-colors text-destructive"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Staff/Admin Link */}
        <div className="text-center">
          <button
            onClick={() => navigate('/staff')}
            className="text-muted-foreground text-sm hover:text-primary transition-colors"
          >
            Staff Portal →
          </button>
        </div>
      </div>
    </CustomerLayout>
  );
}
