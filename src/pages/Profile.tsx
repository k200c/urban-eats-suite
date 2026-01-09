import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { LoyaltyStampCard } from '@/components/profile/LoyaltyStampCard';
import { ActiveOrderCard } from '@/components/profile/ActiveOrderCard';
import { OrderHistoryCard } from '@/components/profile/OrderHistoryCard';
import { ProfileSettings } from '@/components/profile/ProfileSettings';
import { ProfileSkeleton } from '@/components/profile/ProfileSkeleton';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUserOrders } from '@/hooks/useUserOrders';
import { User, LogOut, Settings, ChevronRight, History, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, signOut, isAdmin } = useAuth();
  const { activeOrders, completedOrders, completedOrderCount, isLoading: ordersLoading, refetch } = useUserOrders();
  const [showSettings, setShowSettings] = useState(false);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [authLoading, user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/');
  };

  const handleSettingsSaved = () => {
    // Trigger auth refresh to get updated profile
    window.location.reload();
  };

  // Show loading skeleton
  if (authLoading || !user) {
    return (
      <CustomerLayout>
        <ProfileSkeleton />
      </CustomerLayout>
    );
  }

  const isLoading = ordersLoading;
  const displayName = profile?.full_name || user.email?.split('@')[0] || 'Guest';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <CustomerLayout>
      <div className="p-4 space-y-6 pb-24">
        {/* Profile Header */}
        <motion.header 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 flex items-center gap-4"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-glow">
            <span className="font-heading text-2xl text-primary-foreground">
              {initials}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading text-xl text-foreground truncate">
              {displayName}
            </h2>
            <p className="text-sm text-muted-foreground">
              {completedOrderCount} order{completedOrderCount !== 1 ? 's' : ''} completed
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </motion.header>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <ProfileSettings
                userId={user.id}
                initialName={profile?.full_name || null}
                initialPhone={profile?.phone || null}
                onClose={() => setShowSettings(false)}
                onSave={handleSettingsSaved}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Order Tracker */}
        {activeOrders.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="font-heading text-sm text-muted-foreground uppercase tracking-wider mb-3">
              Live Orders
            </h3>
            <div className="space-y-3">
              {activeOrders.map(order => (
                <ActiveOrderCard key={order.id} order={order} />
              ))}
            </div>
          </motion.section>
        )}

        {/* Loyalty Stamp Card */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {isLoading ? (
            <div className="glass-card p-5 animate-pulse">
              <div className="h-24 bg-secondary/50 rounded-lg" />
            </div>
          ) : (
            <LoyaltyStampCard completedOrders={completedOrderCount} />
          )}
        </motion.section>

        {/* Order History */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4" />
              Recent Orders
            </h3>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card p-4 animate-pulse">
                  <div className="h-16 bg-secondary/50 rounded-lg" />
                </div>
              ))}
            </div>
          ) : completedOrders.length > 0 ? (
            <div className="space-y-3">
              {completedOrders.slice(0, 5).map(order => (
                <OrderHistoryCard key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <div className="glass-card p-8 text-center">
              <p className="text-muted-foreground">No completed orders yet</p>
              <Button
                variant="link"
                onClick={() => navigate('/menu')}
                className="text-primary mt-2"
              >
                Browse Menu →
              </Button>
            </div>
          )}
        </motion.section>

        {/* Menu Items */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card overflow-hidden divide-y divide-border"
        >
          {isAdmin && (
            <button 
              onClick={() => navigate('/admin/pos')}
              className="w-full p-4 flex items-center gap-3 hover:bg-secondary/50 transition-colors"
            >
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span className="text-foreground flex-1 text-left">Admin Dashboard</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          <button
            onClick={handleSignOut}
            className="w-full p-4 flex items-center gap-3 hover:bg-secondary/50 transition-colors text-destructive"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </motion.div>
      </div>
    </CustomerLayout>
  );
}
