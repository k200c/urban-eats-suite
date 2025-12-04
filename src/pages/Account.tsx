import { useNavigate } from 'react-router-dom';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { LoyaltyCard } from '@/components/customer/LoyaltyCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { User, LogOut, Settings, Receipt, Gift } from 'lucide-react';
import { toast } from 'sonner';

export default function Account() {
  const navigate = useNavigate();
  const { user, profile, loading, signOut, isStaff } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/');
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
    // Redirect to auth page
    navigate('/auth');
    return null;
  }

  return (
    <CustomerLayout>
      <div className="p-4 space-y-6">
        {/* Profile Header */}
        <header className="glass-card p-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
            <span className="font-heading text-2xl text-primary-foreground">
              {profile?.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading text-xl text-foreground truncate">
              {profile?.full_name || user.email}
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
        {isStaff && (
          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => navigate('/staff/pos')}
              className="text-primary"
            >
              Open Staff POS →
            </Button>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
