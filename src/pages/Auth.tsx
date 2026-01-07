import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { User, Mail, Lock, Phone, ArrowRight } from 'lucide-react';
import { z } from 'zod';

// Validation schemas
const signInSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255, 'Email too long'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128, 'Password too long'),
});

const signUpSchema = signInSchema.extend({
  fullName: z.string().trim().max(100, 'Name too long').optional(),
  phone: z.string().trim().max(20, 'Phone number too long').optional(),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, role, loading, signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect based on role once authenticated
  useEffect(() => {
    if (!loading && user && role) {
      console.log('[Auth] Redirecting user with role:', role);
      if (role === 'staff' || role === 'admin') {
        navigate('/staff/pos', { replace: true });
      } else {
        navigate('/menu', { replace: true });
      }
    }
    
    // Fallback: if user is authenticated but role is still null after 3 seconds, redirect to menu
    if (!loading && user && !role) {
      const timeout = setTimeout(() => {
        console.log('[Auth] Role not set after timeout, redirecting to menu');
        navigate('/menu', { replace: true });
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [user, role, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate with Zod
      const schema = isSignUp ? signUpSchema : signInSchema;
      const validationResult = schema.safeParse({
        email,
        password,
        ...(isSignUp && { fullName, phone }),
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast.error(firstError.message);
        setSubmitting(false);
        return;
      }

      if (isSignUp) {
        const { error } = await signUp(email, password, fullName, phone);
        if (error) throw error;
        toast.success('Account created! Check your email to confirm.');
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success('Welcome back!');
      }
    } catch (error: any) {
      if (error.message?.includes('User already registered')) {
        toast.error('This email is already registered. Try signing in instead.');
      } else if (error.message?.includes('Invalid login credentials')) {
        toast.error('Invalid email or password.');
      } else {
        toast.error(error.message || 'Authentication failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-center">
        <img 
          src="/lovable-uploads/street-eatz-logo.png" 
          alt="Street Eatz" 
          className="h-12 w-auto"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="glass-card p-6 space-y-6">
            {/* Header */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-primary" />
              </div>
              <h1 className="font-heading text-2xl text-foreground">
                {isSignUp ? 'CREATE ACCOUNT' : 'WELCOME BACK'}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {isSignUp ? 'Join Street Eatz for exclusive rewards' : 'Sign in to track your orders'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-12 pl-10 bg-secondary"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+353 85 123 4567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="h-12 pl-10 bg-secondary"
                      />
                    </div>
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 pl-10 bg-secondary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-12 pl-10 bg-secondary"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="glow"
                size="lg"
                className="w-full h-12"
                disabled={submitting}
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {isSignUp ? 'Create Account' : 'Sign In'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Toggle */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary font-medium hover:underline text-sm"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </div>

          {/* Continue as Guest */}
          <div className="text-center mt-4">
            <button
              onClick={() => navigate('/menu')}
              className="text-muted-foreground text-sm hover:text-foreground transition-colors"
            >
              Continue as guest →
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
