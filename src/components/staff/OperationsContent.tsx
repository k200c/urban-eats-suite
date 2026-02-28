import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Package, Pencil, Search, X, Eye, EyeOff, AlertTriangle, Trash2 } from 'lucide-react';
import { useAllProducts } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { KitchenDisplaySystem } from '@/components/staff/KitchenDisplaySystem';
import { AddProductDialog } from '@/components/staff/AddProductDialog';
import { EditProductDialog } from '@/components/staff/EditProductDialog';
import { toast } from 'sonner';
import { Product, ProductCategory } from '@/types/database';
import { cn } from '@/lib/utils';
import { IngredientPriceManager } from '@/components/staff/IngredientPriceManager';

const allCategories: ProductCategory[] = [
  'Burgers', 'Flatbreads', 'Fries', 'Kids Menu', 'Drinks', 'Specials', 'Sauces'
];

export function OperationsContent() {
  const { data: products, isLoading: productsLoading, refetch: refetchProducts } = useAllProducts();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | 'All'>('All');

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || product.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, categoryFilter]);

  // Toggle sold out status (visible but grayed out)
  const handleSoldOutToggle = async (productId: string, isSoldOut: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_sold_out: isSoldOut })
        .eq('id', productId);

      if (error) throw error;
      refetchProducts();
      toast.success(isSoldOut ? 'Marked as sold out' : 'Back in stock');
    } catch (error) {
      toast.error('Failed to update sold out status');
    }
  };

  // Toggle visibility (completely hidden from menus)
  const handleVisibilityToggle = async (productId: string, isAvailable: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_available: isAvailable })
        .eq('id', productId);

      if (error) throw error;
      refetchProducts();
      toast.success(isAvailable ? 'Now visible on menu' : 'Hidden from menu');
    } catch (error) {
      toast.error('Failed to update visibility');
    }
  };

  const handleCategoryChange = async (productId: string, newCategory: ProductCategory) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ category: newCategory, updated_at: new Date().toISOString() })
        .eq('id', productId);

      if (error) throw error;
      refetchProducts();
      toast.success('Category updated');
    } catch (error) {
      toast.error('Failed to update category');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowEditDialog(true);
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      refetchProducts();
      toast.success(`"${productName}" deleted`);
    } catch (error: any) {
      console.error('Failed to delete product:', {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
      });
      toast.error(error?.message || 'Failed to delete product');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('All');
  };

  const hasActiveFilters = searchQuery || categoryFilter !== 'All';

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

            {/* Search & Filter Bar */}
            <div className="px-4 pb-3 space-y-2 flex-shrink-0">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 bg-secondary/30 border-border/50 text-sm"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                  </button>
                )}
              </div>
              
              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as ProductCategory | 'All')}>
                <SelectTrigger className="h-9 bg-secondary/30 border-border/50 text-sm">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="All">All Categories</SelectItem>
                  {allCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Results Count */}
            <div className="px-4 pb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{filteredProducts.length} items</span>
              {hasActiveFilters && (
                <button 
                  onClick={clearFilters}
                  className="text-primary hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>

            <CardContent className="flex-1 overflow-auto pb-4">
              {productsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-secondary/30 rounded animate-pulse" />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {hasActiveFilters ? 'No items match your filters' : 'No products found'}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredProducts.map((product) => {
                    const isHidden = !product.is_available;
                    const isSoldOut = product.is_sold_out;
                    
                    return (
                      <div
                        key={product.id}
                        className={cn(
                          'p-2 rounded-lg border transition-colors',
                          isHidden
                            ? 'bg-muted/30 border-muted'
                            : isSoldOut
                              ? 'bg-amber-500/10 border-amber-500/30'
                              : 'bg-secondary/20 border-border hover:border-primary/30'
                        )}
                      >
                        {/* Product Info Row */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={cn(
                                'font-medium text-sm truncate',
                                isHidden && 'text-muted-foreground'
                              )}>
                                {product.name}
                              </p>
                              {isHidden && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-muted-foreground/50 text-muted-foreground">
                                  HIDDEN
                                </Badge>
                              )}
                              {!isHidden && isSoldOut && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500 text-amber-500">
                                  SOLD OUT
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-primary font-bold text-xs">€{product.price.toFixed(2)}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleEditProduct(product)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete "{product.name}"?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently remove this product from the menu. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => handleDeleteProduct(product.id, product.name)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>

                        {/* Category Dropdown */}
                        <div className="mb-2">
                          <Select
                            value={product.category}
                            onValueChange={(value) => handleCategoryChange(product.id, value as ProductCategory)}
                          >
                            <SelectTrigger className="h-6 w-auto text-[11px] px-2 bg-secondary/40 border-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                              {allCategories.map((cat) => (
                                <SelectItem key={cat} value={cat} className="text-xs">
                                  {cat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Dual Toggle Row */}
                        <div className="flex items-center gap-3 pt-1 border-t border-border/50">
                          {/* Sold Out Toggle */}
                          <div className="flex items-center gap-1.5 flex-1">
                            <AlertTriangle className={cn(
                              'w-3 h-3',
                              isSoldOut ? 'text-amber-500' : 'text-muted-foreground/50'
                            )} />
                            <span className={cn(
                              'text-[10px] font-medium uppercase',
                              isSoldOut ? 'text-amber-500' : 'text-muted-foreground'
                            )}>
                              Sold Out
                            </span>
                            <Switch
                              checked={isSoldOut}
                              onCheckedChange={(checked) => handleSoldOutToggle(product.id, checked)}
                              className="scale-75 data-[state=checked]:bg-amber-500"
                              disabled={isHidden}
                            />
                          </div>
                          
                          {/* Visibility Toggle */}
                          <div className="flex items-center gap-1.5 flex-1">
                            {product.is_available ? (
                              <Eye className="w-3 h-3 text-green-500" />
                            ) : (
                              <EyeOff className="w-3 h-3 text-muted-foreground/50" />
                            )}
                            <span className={cn(
                              'text-[10px] font-medium uppercase',
                              product.is_available ? 'text-green-500' : 'text-muted-foreground'
                            )}>
                              Visible
                            </span>
                            <Switch
                              checked={product.is_available ?? true}
                              onCheckedChange={(checked) => handleVisibilityToggle(product.id, checked)}
                              className="scale-75 data-[state=checked]:bg-green-500"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
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

        <IngredientPriceManager />
      </div>
    </div>
  );
}
