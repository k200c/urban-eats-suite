import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, ShoppingCart, ChefHat, Volume2, VolumeX, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStoreStatus } from '@/hooks/useStoreStatus';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StaffPOSContent } from '@/components/staff/StaffPOSContent';
import { OperationsContent } from '@/components/staff/OperationsContent';
import { useState } from 'react';

export default function StaffDashboard() {
  const navigate = useNavigate();
  const { isAdmin, loading, signOut } = useAuth();
  const { isStoreOpen } = useStoreStatus();
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/auth', { replace: true });
    }
  }, [loading, isAdmin, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden staff-pos">
      {/* Low-Chrome Header */}
      <header className="flex-shrink-0 bg-black/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Left: Store Status */}
          <div className={`px-4 py-2 rounded-full text-sm font-bold ${
            isStoreOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {isStoreOpen ? '● STORE OPEN' : '○ STORE CLOSED'}
          </div>
          
          {/* Center: COMMAND CENTER Button */}
          <Button 
            size="lg"
            className="h-14 px-8 text-lg font-black bg-primary hover:bg-primary/90 shadow-glow hover:shadow-glow-lg transform hover:scale-105 transition-all"
            onClick={() => navigate('/admin/dashboard')}
          >
            <Settings className="w-6 h-6 mr-2" />
            COMMAND CENTER
          </Button>
          
          {/* Right: Sound + Logout */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-muted-foreground hover:text-foreground"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content with Two Tabs */}
      <Tabs defaultValue="pos" className="flex-1 flex flex-col min-h-0">
        <div className="flex-shrink-0 bg-card/50 border-b border-border px-4 py-2">
          <TabsList className="h-14 grid grid-cols-2 max-w-md mx-auto bg-secondary/50">
            <TabsTrigger 
              value="pos" 
              className="h-12 text-lg font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <ShoppingCart className="w-5 h-5" />
              POS / CHECKOUT
            </TabsTrigger>
            <TabsTrigger 
              value="operations" 
              className="h-12 text-lg font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <ChefHat className="w-5 h-5" />
              OPERATIONS
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: POS */}
        <TabsContent value="pos" className="flex-1 m-0 min-h-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <StaffPOSContent />
          </motion.div>
        </TabsContent>

        {/* Tab 2: Operations (KDS + Stock) */}
        <TabsContent value="operations" className="flex-1 m-0 min-h-0 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <OperationsContent />
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
