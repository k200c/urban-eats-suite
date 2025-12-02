import { useState } from 'react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { CategoryNav } from '@/components/customer/CategoryNav';
import { ProductCard } from '@/components/customer/ProductCard';
import { ProductSheet } from '@/components/customer/ProductSheet';
import { useProducts } from '@/hooks/useProducts';
import { Product, ProductCategory } from '@/types/database';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

export default function Menu() {
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'All'>('All');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: products, isLoading } = useProducts(selectedCategory);

  const filteredProducts = products?.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <CustomerLayout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <header>
          <h1 className="font-heading text-3xl text-foreground mb-4">Menu</h1>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-secondary border-border"
            />
          </div>
        </header>

        {/* Category Navigation */}
        <CategoryNav 
          selected={selectedCategory} 
          onSelect={setSelectedCategory} 
        />

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-card overflow-hidden">
                <Skeleton className="h-32 w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-6 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts && filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => setSelectedProduct(product)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? 'No items match your search' : 'No items available'}
            </p>
          </div>
        )}
      </div>

      {/* Product Sheet */}
      <ProductSheet
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </CustomerLayout>
  );
}
