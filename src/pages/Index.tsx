import { useState } from 'react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { HeroCarousel } from '@/components/customer/HeroCarousel';
import { CategoryNav } from '@/components/customer/CategoryNav';
import { ProductCard } from '@/components/customer/ProductCard';
import { ProductSheet } from '@/components/customer/ProductSheet';
import { LoyaltyCard } from '@/components/customer/LoyaltyCard';
import { useProducts, useFeaturedProducts } from '@/hooks/useProducts';
import { Product, ProductCategory } from '@/types/database';
import { MapPin, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Index() {
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'All'>('All');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const { data: products, isLoading } = useProducts(selectedCategory);
  const { data: featuredProducts } = useFeaturedProducts();

  return (
    <CustomerLayout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl text-primary">Street Eats</h1>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <MapPin className="w-4 h-4" />
              <span>Waterford City</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-success text-sm">
            <Clock className="w-4 h-4" />
            <span className="font-medium">Open Now</span>
          </div>
        </header>

        {/* Hero Carousel */}
        <HeroCarousel 
          products={featuredProducts || []} 
          onProductClick={setSelectedProduct}
        />

        {/* Loyalty Card */}
        <LoyaltyCard points={4} />

        {/* Category Navigation */}
        <CategoryNav 
          selected={selectedCategory} 
          onSelect={setSelectedCategory} 
        />

        {/* Products Grid */}
        <section>
          <h2 className="font-heading text-xl text-foreground mb-4">
            {selectedCategory === 'All' ? 'Our Menu' : selectedCategory}
          </h2>
          
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
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
          ) : products && products.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => setSelectedProduct(product)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No items available in this category</p>
            </div>
          )}
        </section>
      </div>

      {/* Product Sheet */}
      <ProductSheet
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </CustomerLayout>
  );
}
