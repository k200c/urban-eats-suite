import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { User, Mail, Phone, ArrowRight, Loader2, CheckCircle, Lock } from 'lucide-react';
import { z } from 'zod';
import streetEatzLogo from '@/assets/street-eatz-logo-new.jpeg';

// Validation schemas
const emailSchema = z.string().trim().email('Please enter a valid email').max(255, 'Email too long');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password too long');
const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Name is required').max(100, 'Name too long'),
  phone: z.string().trim().min(10, 'Please enter a valid phone number').max(20, 'Phone too long'),
});

type AuthStep = 'credentials' | 'profile' | 'success';

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    user, role, loading, profileLoading, profile, 
    signIn, signUp, updateProfile 
  } = useAuth();
  
  const [step, setStep] = useState<AuthStep>('credentials');
  
  // Sign In / Sign Up state
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Profile completion state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [submitting, setSubmitting] = useState(false);

  // Get the intended destination from location state
  const from = (location.state as { from?: Location })?.from?.pathname || '/menu';

  // Pre-populate profile form from user metadata (fallback if profile not loaded yet)
  useEffect(() => {
    if (user && step === 'profile') {
      const metadata = user.user_metadata;
      if (metadata?.full_name && !fullName) {
        setFullName(metadata.full_name);
      }
      if (metadata?.phone && !phone) {
        setPhone(metadata.phone);
      }
    }
  }, [user, step, fullName, phone]);

  // Redirect based on role once authenticated - NO profile gating
  useEffect(() => {
    if (loading || profileLoading) return;
    
    if (user) {
      // REMOVED: Profile completion check - never block app access
      // Users can complete profile later via Settings or at checkout
      
      // Redirect based on role immediately
      if (role === 'admin') {
        navigate('/admin/pos', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    }
  }, [user, role, loading, profileLoading, navigate, from]);

  // Handle Email/Password Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const emailValidation = emailSchema.safeParse(email);
      if (!emailValidation.success) {
        toast.error(emailValidation.error.errors[0].message);
        setSubmitting(false);
        return;
      }

      const passwordValidation = passwordSchema.safeParse(password);
      if (!passwordValidation.success) {
        toast.error(passwordValidation.error.errors[0].message);
        setSubmitting(false);
        return;
      }

      const { error } = await signIn(email.trim(), password);
      if (error) throw error;

      toast.success('Signed in successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Email/Password Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const emailValidation = emailSchema.safeParse(email);
      if (!emailValidation.success) {
        toast.error(emailValidation.error.errors[0].message);
        setSubmitting(false);
        return;
      }

      const passwordValidation = passwordSchema.safeParse(password);
      if (!passwordValidation.success) {
        toast.error(passwordValidation.error.errors[0].message);
        setSubmitting(false);
        return;
      }

      if (password !== confirmPassword) {
        toast.error('Passwords do not match');
        setSubmitting(false);
        return;
      }

      const { error } = await signUp(email.trim(), password, fullName.trim() || undefined, phone.trim() || undefined);
      if (error) throw error;

      toast.success('Account created! Check your email to confirm.');
      setIsSignUp(false);
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      if (error.message?.includes('already registered')) {
        toast.error('An account with this email already exists. Please sign in.');
      } else {
        toast.error(error.message || 'Failed to create account');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle skip profile - navigate without saving
  const handleSkipProfile = () => {
    toast.info('You can complete your profile later in Settings');
    if (role === 'admin') {
      navigate('/admin/pos', { replace: true });
    } else {
      navigate(from, { replace: true });
    }
  };

  // Handle Profile Completion with timeout protection
  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const validation = profileSchema.safeParse({ fullName, phone });
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return; // finally will still run
      }

      // Add 10-second timeout to prevent infinite spinner
      const savePromise = updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
      });
      
      const timeoutPromise = new Promise<{ error: Error }>((resolve) =>
        setTimeout(() => resolve({ error: new Error('Save timed out') }), 10000)
      );

      const { error } = await Promise.race([savePromise, timeoutPromise]);

      if (error) {
        toast.error(error.message || 'Failed to update profile. You can try again in Settings.');
        // Still navigate - don't block the user
        setTimeout(() => {
          if (role === 'admin') {
            navigate('/admin/pos', { replace: true });
          } else {
            navigate(from, { replace: true });
          }
        }, 1500);
        return;
      }

      setStep('success');
      toast.success('Profile complete!');
      
      // Redirect after brief success animation
      setTimeout(() => {
        if (role === 'admin') {
          navigate('/admin/pos', { replace: true });
        } else {
          navigate(from, { replace: true });
        }
      }, 1500);
    } catch (error: any) {
      toast.error('Failed to update profile. You can try again later.');
      // Navigate anyway after error
      setTimeout(() => {
        if (role === 'admin') {
          navigate('/admin/pos', { replace: true });
        } else {
          navigate(from, { replace: true });
        }
      }, 1500);
    } finally {
      // CRITICAL: Always clear loading state
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-center">
        <img 
          src={streetEatzLogo} 
          alt="Street Eatz" 
          className="h-12 w-auto"
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
            <AnimatePresence mode="wait">
              {/* Step 1: Credentials (Email/Password Only) */}
              {step === 'credentials' && (
                <motion.div
                  key="credentials"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="font-heading text-2xl text-foreground">
                      {isSignUp ? 'CREATE ACCOUNT' : 'WELCOME BACK'}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                      {isSignUp ? 'Join Street Eatz for faster checkout' : 'Sign in with your email and password'}
                    </p>
                  </div>

                  <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
                    {isSignUp && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="signupName">Full Name</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="signupName"
                              autoComplete="name"
                              placeholder="John Doe"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              className="h-12 pl-10 bg-secondary"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="signupPhone">Phone Number</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="signupPhone"
                              type="tel"
                              autoComplete="tel"
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
                          autoComplete="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          autoFocus={!isSignUp}
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
                          autoComplete={isSignUp ? "new-password" : "current-password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="h-12 pl-10 bg-secondary"
                        />
                      </div>
                    </div>

                    {isSignUp && (
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="h-12 pl-10 bg-secondary"
                          />
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="glow"
                      size="lg"
                      className="w-full h-12"
                      disabled={submitting || !email.trim() || !password}
                    >
                      {submitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          {isSignUp ? 'Create Account' : 'Sign In'}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSignUp(!isSignUp);
                          setPassword('');
                          setConfirmPassword('');
                        }}
                        className="text-primary text-sm hover:underline"
                      >
                        {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Step 2: Profile Completion */}
              {step === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <User className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="font-heading text-2xl text-foreground">COMPLETE YOUR PROFILE</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                      We'll use this to notify you about your orders
                    </p>
                  </div>

                  <form onSubmit={handleCompleteProfile} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="profileFullName">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="profileFullName"
                          placeholder="John Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          autoFocus
                          className="h-12 pl-10 bg-secondary"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profilePhone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="profilePhone"
                          type="tel"
                          placeholder="+353 85 123 4567"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                          className="h-12 pl-10 bg-secondary"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      variant="glow"
                      size="lg"
                      className="w-full h-12"
                      disabled={submitting || !fullName.trim() || !phone.trim()}
                    >
                      {submitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          Complete Profile
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>

                    <button
                      type="button"
                      onClick={handleSkipProfile}
                      className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
                      disabled={submitting}
                    >
                      Skip for now
                    </button>
                  </form>
                </motion.div>
              )}

              {/* Step 3: Success */}
              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.1 }}
                    className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircle className="w-10 h-10 text-green-500" />
                  </motion.div>
                  <h1 className="font-heading text-2xl text-foreground">YOU'RE ALL SET!</h1>
                  <p className="text-muted-foreground text-sm mt-1">
                    Redirecting you now...
                  </p>
                  <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mt-4" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
