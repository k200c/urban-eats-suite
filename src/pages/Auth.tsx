import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { User, Mail, Phone, ArrowRight, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { z } from 'zod';
import streetEatzLogo from '@/assets/street-eatz-logo.png';

// Validation schemas
const emailSchema = z.string().trim().email('Please enter a valid email').max(255, 'Email too long');
const otpSchema = z.string().length(6, 'Please enter the 6-digit code');
const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Name is required').max(100, 'Name too long'),
  phone: z.string().trim().min(10, 'Please enter a valid phone number').max(20, 'Phone too long'),
});

type AuthStep = 'email' | 'otp' | 'profile' | 'success';

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, loading, profileLoading, profile, signInWithOtp, verifyOtp, updateProfile } = useAuth();
  
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Get the intended destination from location state
  const from = (location.state as { from?: Location })?.from?.pathname || '/menu';

  // Redirect based on role once authenticated and profile is loaded
  useEffect(() => {
    if (loading || profileLoading) return;
    
    if (user) {
      // Check if profile needs completion (new OTP user)
      if (!profile?.full_name || !profile?.phone) {
        setStep('profile');
        return;
      }
      
      // Redirect based on role
      if (role === 'admin') {
        navigate('/admin/pos', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    }
  }, [user, role, loading, profileLoading, profile, navigate, from]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const validation = emailSchema.safeParse(email);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setSubmitting(false);
        return;
      }

      const { error } = await signInWithOtp(email.trim());
      if (error) throw error;

      toast.success('Check your email for the sign-in code!');
      setStep('otp');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send code');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const validation = otpSchema.safeParse(otp);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setSubmitting(false);
        return;
      }

      const { error } = await verifyOtp(email.trim(), otp);
      if (error) throw error;

      toast.success('Signed in successfully!');
      // Profile check will happen in useEffect
    } catch (error: any) {
      if (error.message?.includes('Token has expired')) {
        toast.error('Code expired. Please request a new one.');
        setStep('email');
        setOtp('');
      } else {
        toast.error(error.message || 'Invalid code');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const validation = profileSchema.safeParse({ fullName, phone });
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setSubmitting(false);
        return;
      }

      const { error } = await updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
      });

      if (error) throw error;

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
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setSubmitting(true);
    try {
      const { error } = await signInWithOtp(email.trim());
      if (error) throw error;
      toast.success('New code sent!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend code');
    } finally {
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
              {/* Step 1: Email Entry */}
              {step === 'email' && (
                <motion.div
                  key="email"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="font-heading text-2xl text-foreground">SIGN IN</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                      We'll send you a one-time code
                    </p>
                  </div>

                  <form onSubmit={handleSendOtp} className="space-y-4">
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
                          autoFocus
                          className="h-12 pl-10 bg-secondary"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      variant="glow"
                      size="lg"
                      className="w-full h-12"
                      disabled={submitting || !email.trim()}
                    >
                      {submitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          Continue
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </form>
                </motion.div>
              )}

              {/* Step 2: OTP Verification */}
              {step === 'otp' && (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="font-heading text-2xl text-foreground">CHECK YOUR EMAIL</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                      We sent a code to <span className="text-foreground">{email}</span>
                    </p>
                  </div>

                  <form onSubmit={handleVerifyOtp} className="space-y-6">
                    <div className="flex justify-center">
                      <InputOTP
                        value={otp}
                        onChange={setOtp}
                        maxLength={6}
                        className="gap-2"
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} className="w-12 h-14 text-xl" />
                          <InputOTPSlot index={1} className="w-12 h-14 text-xl" />
                          <InputOTPSlot index={2} className="w-12 h-14 text-xl" />
                          <InputOTPSlot index={3} className="w-12 h-14 text-xl" />
                          <InputOTPSlot index={4} className="w-12 h-14 text-xl" />
                          <InputOTPSlot index={5} className="w-12 h-14 text-xl" />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    <Button
                      type="submit"
                      variant="glow"
                      size="lg"
                      className="w-full h-12"
                      disabled={submitting || otp.length !== 6}
                    >
                      {submitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          Verify Code
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>

                    <div className="flex items-center justify-between text-sm">
                      <button
                        type="button"
                        onClick={() => {
                          setStep('email');
                          setOtp('');
                        }}
                        className="text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Change email
                      </button>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={submitting}
                        className="text-primary hover:underline"
                      >
                        Resend code
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Step 3: Profile Completion */}
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
                      <Label htmlFor="fullName">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="fullName"
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
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="phone"
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
                  </form>
                </motion.div>
              )}

              {/* Step 4: Success */}
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

          {/* Browse as Guest (only on email step) */}
          {step === 'email' && (
            <div className="text-center mt-4">
              <button
                onClick={() => navigate('/menu')}
                className="text-muted-foreground text-sm hover:text-foreground transition-colors"
              >
                Browse menu as guest →
              </button>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}