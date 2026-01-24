import { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Pencil } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { KitchenDisplaySystem } from '@/components/staff/KitchenDisplaySystem';
import { AddProductDialog } from '@/components/staff/AddProductDialog';
import { EditProductDialog } from '@/components/staff/EditProductDialog';
import { toast } from 'sonner';
import { Product } from '@/types/database';

export function OperationsContent() {
  const { data: products, isLoading: productsLoading, refetch: refetchProducts } = useProducts();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

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

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowEditDialog(true);
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
      {/* KDS Section - Takes up most space */}
      <div className="flex-1 min-h-0 overflow-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <KitchenDisplaySystem />
        </motion.div>
      </div>
      
      {/* Stock Manager Sidebar */}
      <div className="lg:w-80 xl:w-96 flex-shrink-0">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="bg-card border-border h-full max-h-[calc(100vh-200px)] flex flex-col">
            <CardHeader className="pb-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="w-4 h-4 text-primary" />
                  Quick Stock
                </CardTitle>
                <AddProductDialog onProductAdded={refetchProducts} />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto pb-4">
              {productsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-secondary/30 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {products?.map((product) => (
                    <div
                      key={product.id}
                      className={`p-2.5 rounded-lg border transition-colors ${
                        product.is_available
                          ? 'bg-secondary/20 border-border'
                          : 'bg-red-500/10 border-red-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm truncate ${!product.is_available && 'text-muted-foreground line-through'}`}>
                            {product.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{product.category}</span>
                            <span>•</span>
                            <span className="text-primary font-medium">€{product.price.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEditProduct(product)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Switch
                            checked={product.is_available ?? true}
                            onCheckedChange={(checked) => handleProductAvailability(product.id, checked)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <EditProductDialog
          product={editingProduct}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onProductUpdated={refetchProducts}
        />
      </div>
    </div>
  );
}
