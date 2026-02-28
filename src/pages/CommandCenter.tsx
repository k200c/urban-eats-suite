import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, Clock, Package, ArrowLeft, Users, Share2, Bug, BarChart3, Megaphone, Pencil } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAppSettings, useUpdateAppSettings } from '@/hooks/useAppSettings';
import { useStoreStatus } from '@/hooks/useStoreStatus';
import { useProducts } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SocialMediaManager } from '@/components/staff/SocialMediaManager';
import { CRMDashboard } from '@/components/staff/CRMDashboard';
import { MarketingHub } from '@/components/staff/MarketingHub';
import { AnalyticsDashboard } from '@/components/staff/AnalyticsDashboard';
import { AddProductDialog } from '@/components/staff/AddProductDialog';
import { EditProductDialog } from '@/components/staff/EditProductDialog';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { IngredientPriceManager } from '@/components/staff/IngredientPriceManager';
import { toast } from 'sonner';
import { Product } from '@/types/database';

const waitTimeOptions = ['10 mins', '20 mins', '30 mins', '45 mins', '60 mins'];

export default function CommandCenter() {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAuth();
  const { data: settings, isLoading: settingsLoading } = useAppSettings();
  const { devModeEnabled, toggleDevMode, dbStoreOpen } = useStoreStatus();
  const { data: products, isLoading: productsLoading, refetch: refetchProducts } = useProducts();
  const updateSettings = useUpdateAppSettings();

  // State for edit dialog
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/auth', { replace: true });
    }
  }, [loading, isAdmin, navigate]);

  const handleStoreToggle = async (isOpen: boolean) => {
    try {
      await updateSettings.mutateAsync({ is_store_open: isOpen });
      toast.success(isOpen ? 'Store is now OPEN' : 'Store is now CLOSED');
    } catch (error) {
      toast.error('Failed to update store status');
    }
  };

  const handleWaitTimeChange = async (waitTime: string) => {
    try {
      await updateSettings.mutateAsync({ current_wait_time: waitTime });
      toast.success(`Wait time updated to ${waitTime}`);
    } catch (error) {
      toast.error('Failed to update wait time');
    }
  };

  const handleProductAvailability = async (productId: string, isAvailable: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_available: isAvailable })
        .eq('id', productId);

      if (error) throw error;
      refetchProducts();
      toast.success(isAvailable ? 'Item is now available' : 'Item marked as sold out');
    } catch (error) {
      toast.error('Failed to update product availability');
    }
  };

  if (loading || settingsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  // Use effective store status (considers dev mode bypass)
  const isStoreOpen = devModeEnabled ? true : (settings?.is_store_open ?? true);

  const handleDevModeToggle = () => {
    const newValue = toggleDevMode();
    toast.success(newValue ? '🔧 Dev Mode ENABLED - Store always open' : '🔧 Dev Mode DISABLED');
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowEditDialog(true);
  };

  // Quick Stock Manager Component
  const QuickStockManager = () => (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="w-5 h-5 text-primary" />
              Quick Stock Manager
            </CardTitle>
            <AddProductDialog onProductAdded={refetchProducts} />
          </div>
        </CardHeader>
        <CardContent>
          {productsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-secondary/30 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {products?.map((product) => (
                <div
                  key={product.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    product.is_available
                      ? 'bg-secondary/20 border-border'
                      : 'bg-red-500/10 border-red-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${!product.is_available && 'text-muted-foreground line-through'}`}>
                        {product.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{product.category}</span>
                        <span>•</span>
                        <span className="text-primary font-medium">€{product.price.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditProduct(product)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <span className={`text-xs font-medium min-w-[60px] text-right ${product.is_available ? 'text-green-400' : 'text-red-400'}`}>
                        {product.is_available ? 'In Stock' : 'Sold Out'}
                      </span>
                      <Switch
                        checked={product.is_available ?? true}
                        onCheckedChange={(checked) => handleProductAvailability(product.id, checked)}
                      />
                    </div>
                  </div>
                  {/* Description preview */}
                  {product.description ? (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {product.description}
                    </p>
                  ) : (
                    <p className="text-xs text-yellow-500/80 mt-1 italic">
                      ⚠️ No description - click edit to add one
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EditProductDialog
        product={editingProduct}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onProductUpdated={refetchProducts}
      />
    </>
  );

  return (
    <div className="min-h-screen bg-background staff-pos">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-heading text-xl font-bold">COMMAND CENTER</h1>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${isStoreOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {isStoreOpen ? 'STORE OPEN' : 'STORE CLOSED'}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <Tabs defaultValue="operations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 max-w-3xl overflow-x-auto">
            <TabsTrigger value="operations" className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              <span className="hidden sm:inline">Store</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">CRM</span>
            </TabsTrigger>
            <TabsTrigger value="marketing" className="flex items-center gap-2">
              <Megaphone className="w-4 h-4" />
              <span className="hidden sm:inline">Marketing</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="social" className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Social</span>
            </TabsTrigger>
          </TabsList>

          {/* Operations Tab */}
          <TabsContent value="operations" className="space-y-6">
            {/* Store Status Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-card border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Store className="w-5 h-5 text-primary" />
                    Store Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Toggle store open/closed</p>
                      <p className="text-2xl font-bold">
                        {isStoreOpen ? (
                          <span className="text-green-400">OPEN</span>
                        ) : (
                          <span className="text-red-400">CLOSED</span>
                        )}
                      </p>
                    </div>
                    {/* Traffic Light Toggle */}
                    <button
                      onClick={() => handleStoreToggle(!isStoreOpen)}
                      disabled={updateSettings.isPending}
                      className={`relative w-24 h-24 rounded-full transition-all duration-300 ${
                        isStoreOpen 
                          ? 'bg-green-500 shadow-[0_0_40px_rgba(34,197,94,0.5)]' 
                          : 'bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.5)]'
                      } ${updateSettings.isPending ? 'opacity-50' : 'hover:scale-105 active:scale-95'}`}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                        {isStoreOpen ? 'OPEN' : 'CLOSED'}
                      </span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Wait Time Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card className="bg-card border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="w-5 h-5 text-primary" />
                    Wait Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Current estimated wait</p>
                      <p className="text-2xl font-bold text-primary">{settings?.current_wait_time || '20 mins'}</p>
                    </div>
                    <Select
                      value={settings?.current_wait_time || '20 mins'}
                      onValueChange={handleWaitTimeChange}
                      disabled={updateSettings.isPending}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {waitTimeOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Dev Mode Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card className={`border ${devModeEnabled ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-border bg-card'}`}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Bug className={`w-5 h-5 ${devModeEnabled ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                    Developer Mode
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Bypass store hours for testing</p>
                      <p className={`text-sm font-medium ${devModeEnabled ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                        {devModeEnabled ? '⚠️ Store forced OPEN (24/7 testing)' : 'Normal hours apply'}
                      </p>
                    </div>
                    <Switch
                      checked={devModeEnabled}
                      onCheckedChange={handleDevModeToggle}
                      className={devModeEnabled ? 'data-[state=checked]:bg-yellow-500' : ''}
                    />
                  </div>
                  {devModeEnabled && (
                    <p className="mt-3 text-xs text-yellow-500/80 bg-yellow-500/10 px-3 py-2 rounded">
                      Dev mode active. Cart and checkout enabled regardless of actual store hours.
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Stock Manager */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <QuickStockManager />
              <IngredientPriceManager />
            </motion.div>
          </TabsContent>

          {/* CRM Tab */}
          <TabsContent value="customers">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ErrorBoundary>
                <CRMDashboard />
              </ErrorBoundary>
            </motion.div>
          </TabsContent>

          {/* Marketing Tab */}
          <TabsContent value="marketing">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ErrorBoundary>
                <MarketingHub />
              </ErrorBoundary>
            </motion.div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ErrorBoundary>
                <AnalyticsDashboard />
              </ErrorBoundary>
            </motion.div>
          </TabsContent>

          {/* Social Tab */}
          <TabsContent value="social">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ErrorBoundary>
                <SocialMediaManager />
              </ErrorBoundary>
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
