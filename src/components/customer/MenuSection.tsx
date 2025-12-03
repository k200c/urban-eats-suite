import { useState, useRef, useEffect } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useProductModifiers } from '@/hooks/useProductModifiers';
import { ProductCardHorizontal } from './ProductCardHorizontal';
import { ProductSheet } from './ProductSheet';
import { Product, ProductCategory } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const categories: (ProductCategory | 'All')[] = ['All', 'Burgers', 'Flatbreads', 'Fries', 'Drinks', 'Specials'];

export function MenuSection() {
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'All'>('All');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const { data: products, isLoading, isError, refetch } = useProducts(selectedCategory);
  const { data: modifierGroups } = useProductModifiers(selectedProduct?.id);

  // Group products by category
  const productsByCategory = products?.reduce((acc, product) => {
    const cat = product.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {} as Record<ProductCategory, Product[]>);

  const handleCategoryClick = (category: ProductCategory | 'All') => {
    setSelectedCategory(category);
    
    if (category !== 'All' && categoryRefs.current[category]) {
      categoryRefs.current[category]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const hasModifiers = (productId: string) => {
    // For now, assume burgers and flatbreads have modifiers
    const product = products?.find(p => p.id === productId);
    return product?.category === 'Burgers' || product?.category === 'Flatbreads';
  };

  return (
    <section id="menu" className="px-4 py-12 max-w-4xl mx-auto scroll-mt-20">
      {/* Section Header */}
      <div className="text-center mb-8">
        <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-2">
          OUR <span className="text-primary">MENU</span>
        </h2>
        <p className="text-muted-foreground">Crafted with passion, served with pride</p>
      </div>

      {/* Sticky Category Bar */}
      <div className="sticky top-16 z-30 bg-black/90 backdrop-blur-md py-4 -mx-4 px-4 mb-8 border-y border-white/5">
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryClick(category)}
              className={cn(
                'category-pill whitespace-nowrap flex-shrink-0',
                selectedCategory === category && 'active'
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Products */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="street-card p-4">
              <div className="flex gap-4">
                <Skeleton className="w-24 h-24 rounded-lg flex-shrink-0 bg-secondary/50" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4 bg-secondary/50" />
                  <Skeleton className="h-4 w-full bg-secondary/50" />
                  <Skeleton className="h-8 w-20 bg-secondary/50" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Failed to load menu items</p>
          <button
            onClick={() => refetch()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : selectedCategory === 'All' && productsByCategory ? (
        // Show grouped by category
        <div className="space-y-10">
          {(Object.keys(productsByCategory) as ProductCategory[]).map((category) => (
            <div
              key={category}
              ref={(el) => (categoryRefs.current[category] = el)}
              className="scroll-mt-32"
            >
              <h3 className="font-heading text-xl font-bold text-primary mb-4 uppercase tracking-wider">
                {category}
              </h3>
              <div className="space-y-4">
                {productsByCategory[category].map((product) => (
                  <ProductCardHorizontal
                    key={product.id}
                    product={product}
                    hasModifiers={hasModifiers(product.id)}
                    onClick={() => setSelectedProduct(product)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : products && products.length > 0 ? (
        <div className="space-y-4">
          {products.map((product) => (
            <ProductCardHorizontal
              key={product.id}
              product={product}
              hasModifiers={hasModifiers(product.id)}
              onClick={() => setSelectedProduct(product)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Connected to database, but found 0 items.</p>
          <p className="text-xs text-muted-foreground/70 mt-2">Check Table Data in Supabase.</p>
        </div>
      )}

      {/* Product Sheet */}
      <ProductSheet
        product={selectedProduct}
        modifierGroups={modifierGroups}
        onClose={() => setSelectedProduct(null)}
      />
    </section>
  );
}
