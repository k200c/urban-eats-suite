import { useState, useMemo } from 'react';
import { Package, Search, Eye, EyeOff, Pencil, Filter, X } from 'lucide-react';
import { useAllProducts } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddProductDialog } from '@/components/staff/AddProductDialog';
import { EditProductDialog } from '@/components/staff/EditProductDialog';
import { toast } from 'sonner';
import { Product, ProductCategory } from '@/types/database';

const ALL_CATEGORIES: ProductCategory[] = ['Burgers', 'Flatbreads', 'Fries', 'Drinks', 'Specials', 'Sauces', 'Kids Menu'];

type StatusFilter = 'all' | 'visible' | 'hidden' | 'available' | 'unavailable';

export function QuickStockManager() {
  const { data: products, isLoading, refetch } = useAllProducts();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['all-products'] });
  };

  const filtered = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (statusFilter === 'visible' && !(p as any).is_visible) return false;
      if (statusFilter === 'hidden' && (p as any).is_visible !== false) return false;
      if (statusFilter === 'available' && !p.is_available) return false;
      if (statusFilter === 'unavailable' && p.is_available) return false;
      return true;
    });
  }, [products, search, categoryFilter, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    if (!products) return { total: 0, visible: 0, hidden: 0, unavailable: 0 };
    return {
      total: products.length,
      visible: products.filter((p) => (p as any).is_visible !== false).length,
      hidden: products.filter((p) => (p as any).is_visible === false).length,
      unavailable: products.filter((p) => !p.is_available).length,
    };
  }, [products]);

  const handleToggleAvailability = async (productId: string, isAvailable: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_available: isAvailable })
        .eq('id', productId);
      if (error) throw error;
      invalidateAll();
      toast.success(isAvailable ? 'Item is now available' : 'Item marked unavailable');
    } catch {
      toast.error('Failed to update availability');
    }
  };

  const handleToggleVisibility = async (productId: string, isVisible: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_visible: isVisible } as any)
        .eq('id', productId);
      if (error) throw error;
      invalidateAll();
      toast.success(isVisible ? 'Item is now visible on menu' : 'Item hidden from menu');
    } catch {
      toast.error('Failed to update visibility');
    }
  };

  const handleCategoryChange = async (productId: string, newCategory: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ category: newCategory } as any)
        .eq('id', productId);
      if (error) throw error;
      invalidateAll();
      toast.success(`Category changed to ${newCategory}`);
    } catch {
      toast.error('Failed to update category');
    }
  };

  const hasActiveFilters = search || categoryFilter !== 'all' || statusFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setStatusFilter('all');
  };

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="w-5 h-5 text-primary" />
              Menu Operations
            </CardTitle>
            <AddProductDialog onProductAdded={() => { refetch(); invalidateAll(); }} />
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            <button onClick={() => setStatusFilter('all')} className={`text-center p-2 rounded-lg transition-colors ${statusFilter === 'all' ? 'bg-primary/20 ring-1 ring-primary' : 'bg-secondary/30 hover:bg-secondary/50'}`}>
              <p className="text-lg font-bold text-foreground">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
            </button>
            <button onClick={() => setStatusFilter('visible')} className={`text-center p-2 rounded-lg transition-colors ${statusFilter === 'visible' ? 'bg-green-500/20 ring-1 ring-green-500' : 'bg-secondary/30 hover:bg-secondary/50'}`}>
              <p className="text-lg font-bold text-green-400">{stats.visible}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Visible</p>
            </button>
            <button onClick={() => setStatusFilter('hidden')} className={`text-center p-2 rounded-lg transition-colors ${statusFilter === 'hidden' ? 'bg-orange-500/20 ring-1 ring-orange-500' : 'bg-secondary/30 hover:bg-secondary/50'}`}>
              <p className="text-lg font-bold text-orange-400">{stats.hidden}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Hidden</p>
            </button>
            <button onClick={() => setStatusFilter('unavailable')} className={`text-center p-2 rounded-lg transition-colors ${statusFilter === 'unavailable' ? 'bg-red-500/20 ring-1 ring-red-500' : 'bg-secondary/30 hover:bg-secondary/50'}`}>
              <p className="text-lg font-bold text-red-400">{stats.unavailable}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Out</p>
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Search + Filters */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search all items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-secondary/30 border-border h-9 text-sm"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-8 text-xs bg-secondary/30 border-border flex-1">
                  <Filter className="w-3 h-3 mr-1" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">All Categories</SelectItem>
                  {ALL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs px-2 text-muted-foreground">
                  <X className="w-3 h-3 mr-1" />Clear
                </Button>
              )}
            </div>
          </div>

          {/* Product List */}
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-secondary/30 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">{hasActiveFilters ? 'No items match filters' : 'No products found'}</p>
              {hasActiveFilters && (
                <Button variant="link" size="sm" onClick={clearFilters} className="mt-1 text-xs">
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {filtered.map((product) => {
                const isVisible = (product as any).is_visible !== false;
                const isHidden = !isVisible;

                return (
                  <div
                    key={product.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      isHidden
                        ? 'bg-orange-500/5 border-orange-500/20 opacity-75'
                        : !product.is_available
                        ? 'bg-red-500/5 border-red-500/20'
                        : 'bg-secondary/20 border-border'
                    }`}
                  >
                    {/* Row 1: Name + Badges + Edit */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`font-medium text-sm truncate ${isHidden ? 'text-muted-foreground' : ''} ${!product.is_available ? 'line-through text-muted-foreground' : ''}`}>
                            {product.name}
                          </p>
                          {isHidden && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-500/40 text-orange-400 bg-orange-500/10">
                              <EyeOff className="w-2.5 h-2.5 mr-0.5" />Hidden
                            </Badge>
                          )}
                          {!product.is_available && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-500/40 text-red-400 bg-red-500/10">
                              Out
                            </Badge>
                          )}
                          {product.is_featured && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary bg-primary/10">
                              🔥
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-primary font-medium">€{product.price.toFixed(2)}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => { setEditingProduct(product); setShowEditDialog(true); }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Row 2: Category selector + Toggles */}
                    <div className="flex items-center justify-between mt-2 gap-2">
                      <Select
                        value={product.category}
                        onValueChange={(val) => handleCategoryChange(product.id, val)}
                      >
                        <SelectTrigger className="h-7 text-[11px] bg-secondary/40 border-border w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {ALL_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex items-center gap-3">
                        {/* Visibility Toggle */}
                        <div className="flex items-center gap-1.5">
                          {isVisible ? (
                            <Eye className="w-3.5 h-3.5 text-green-400" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-orange-400" />
                          )}
                          <Switch
                            checked={isVisible}
                            onCheckedChange={(checked) => handleToggleVisibility(product.id, checked)}
                            className="scale-75 data-[state=checked]:bg-green-500"
                          />
                        </div>

                        {/* Availability Toggle */}
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-medium ${product.is_available ? 'text-green-400' : 'text-red-400'}`}>
                            {product.is_available ? 'In Stock' : 'Out'}
                          </span>
                          <Switch
                            checked={product.is_available ?? true}
                            onCheckedChange={(checked) => handleToggleAvailability(product.id, checked)}
                            className="scale-75"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground text-center pt-1">
            {filtered.length} of {stats.total} items shown
          </p>
        </CardContent>
      </Card>

      <EditProductDialog
        product={editingProduct}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onProductUpdated={() => { refetch(); invalidateAll(); }}
      />
    </>
  );
}
