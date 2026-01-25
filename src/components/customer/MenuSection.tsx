import { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useProducts } from '@/hooks/useProducts';
import { useProductModifiers } from '@/hooks/useProductModifiers';
import { useProductIngredients } from '@/hooks/useProductIngredients';
import { useStoreStatus } from '@/hooks/useStoreStatus';
import { useIsMobile } from '@/hooks/use-mobile';
import { ProductCardHorizontal } from './ProductCardHorizontal';
import { ProductSheet } from './ProductSheet';

import { WaitTimeBanner } from './WaitTimeBanner';
import { Product, ProductCategory } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const categories: (ProductCategory | 'All')[] = ['All', 'Burgers', 'Flatbreads', 'Fries', 'Drinks', 'Specials'];

// Simple Product Card wrapper
function AnimatedProductCard({ 
  product, 
  hasModifiers, 
  onClick, 
  index,
  variant
}: { 
  product: Product; 
  hasModifiers: boolean; 
  onClick: () => void; 
  index: number;
  variant: 'compact' | 'vertical';
}) {
  return (
    <div className="opacity-100">
      <ProductCardHorizontal
        product={product}
        hasModifiers={hasModifiers}
        onClick={onClick}
        variant={variant}
      />
    </div>
  );
}

// Simple Category Section
function AnimatedCategorySection({ 
  category, 
  products, 
  categoryRef,
  hasModifiers,
  onProductClick,
  isMobile
}: { 
  category: ProductCategory;
  products: Product[];
  categoryRef: (el: HTMLDivElement | null) => void;
  hasModifiers: (id: string) => boolean;
  onProductClick: (product: Product) => void;
  isMobile: boolean;
}) {
  return (
    <div
      ref={categoryRef}
      className="scroll-mt-32"
    >
      <h3 className="font-heading text-xl font-bold text-primary mb-4 uppercase tracking-wider">
        {category}
      </h3>
      
      <div className={cn(
        "gap-3",
        isMobile ? "flex flex-col" : "grid grid-cols-2 lg:grid-cols-3 gap-4"
      )}>
        {products.map((product, index) => (
          <AnimatedProductCard
            key={product.id}
            product={product}
            hasModifiers={hasModifiers(product.id)}
            onClick={() => onProductClick(product)}
            index={index}
            variant={isMobile ? 'compact' : 'vertical'}
          />
        ))}
      </div>
    </div>
  );
}

export function MenuSection() {
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'All'>('All');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const isHeaderInView = useInView(headerRef, { once: true });

  // Removed scroll-based header transforms that caused invisible content on load

  const { data: products, isLoading, isError, refetch } = useProducts(selectedCategory);
  const { data: modifierGroups } = useProductModifiers(selectedProduct?.id);
  const { data: ingredients } = useProductIngredients(selectedProduct?.id);
  const { isStoreOpen, currentWaitTime } = useStoreStatus();
  const isMobile = useIsMobile();

  const waitTime = currentWaitTime;

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

  // All products can now be customized
  const hasModifiers = (productId: string) => {
    return true;
  };

  return (
    <>
      {/* Wait Time Banner - only show when store is open */}
      {isStoreOpen && waitTime && <WaitTimeBanner waitTime={waitTime} />}
      
      <section ref={sectionRef} id="menu" className="px-4 py-12 max-w-4xl mx-auto scroll-mt-20 relative">
        {/* Animated Section Header */}
      <motion.div 
        ref={headerRef}
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h2 
          className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-2"
          initial={{ opacity: 0, y: 30 }}
          animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          OUR <span className="text-primary">MENU</span>
        </motion.h2>
        <motion.p 
          className="text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={isHeaderInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          Crafted with passion, served with pride
        </motion.p>
      </motion.div>

      {/* Sticky Category Bar */}
      <div className="sticky top-16 z-30 bg-black/90 backdrop-blur-md py-4 -mx-4 px-4 mb-8 border-y border-white/5">
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryClick(category)}
              className={cn(
                'category-pill whitespace-nowrap flex-shrink-0 transition-transform hover:scale-105 active:scale-95',
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
            <motion.div 
              key={i} 
              className="street-card p-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex gap-4">
                <Skeleton className="w-24 h-24 rounded-lg flex-shrink-0 bg-secondary/50" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4 bg-secondary/50" />
                  <Skeleton className="h-4 w-full bg-secondary/50" />
                  <Skeleton className="h-8 w-20 bg-secondary/50" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : isError ? (
        <motion.div 
          className="text-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-muted-foreground mb-4">Failed to load menu items</p>
          <button
            onClick={() => refetch()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </motion.div>
      ) : selectedCategory === 'All' && productsByCategory ? (
        // Show grouped by category with parallax
        <div className="space-y-10">
          {(Object.keys(productsByCategory) as ProductCategory[]).map((category) => (
            <AnimatedCategorySection
              key={category}
              category={category}
              products={productsByCategory[category]}
              categoryRef={(el) => (categoryRefs.current[category] = el)}
              hasModifiers={hasModifiers}
              onProductClick={setSelectedProduct}
              isMobile={isMobile}
            />
          ))}
        </div>
      ) : products && products.length > 0 ? (
        <div className={cn(
          "gap-3",
          isMobile ? "flex flex-col" : "grid grid-cols-2 lg:grid-cols-3 gap-4"
        )}>
          {products.map((product, index) => (
            <AnimatedProductCard
              key={product.id}
              product={product}
              hasModifiers={hasModifiers(product.id)}
              onClick={() => setSelectedProduct(product)}
              index={index}
              variant={isMobile ? 'compact' : 'vertical'}
            />
          ))}
        </div>
      ) : (
        <motion.div 
          className="text-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-muted-foreground">Connected to database, but found 0 items.</p>
          <p className="text-xs text-muted-foreground/70 mt-2">Check Table Data in Supabase.</p>
        </motion.div>
      )}

      {/* Product Sheet */}
      <ProductSheet
        product={selectedProduct}
        modifierGroups={modifierGroups}
        ingredients={ingredients}
        onClose={() => setSelectedProduct(null)}
      />
    </section>
    </>
  );
}
