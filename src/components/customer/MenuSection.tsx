import { useState, useRef, useEffect } from 'react';
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

const categories: (ProductCategory | 'All')[] = ['All', 'Burgers', 'Flatbreads', 'Fries', 'Kids Menu', 'Drinks', 'Sauces', 'Specials'];

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
  variant: 'compact' | 'vertical' | 'mobile-vertical' | 'mobile-grid';
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
      <h3 className="font-heading text-sm sm:text-lg md:text-xl font-bold text-primary mb-2 sm:mb-3 md:mb-4 uppercase tracking-wider">
        {category}
      </h3>
      
      <div className="overflow-hidden w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2 md:gap-4">
          {products.map((product, index) => (
            <AnimatedProductCard
              key={product.id}
              product={product}
              hasModifiers={hasModifiers(product.id)}
              onClick={() => onProductClick(product)}
              index={index}
              variant={isMobile ? 'mobile-grid' : 'vertical'}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function MenuSection() {
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'All'>('All');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(true);
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef(null);

  const { data: products, isLoading, isError, refetch } = useProducts(selectedCategory);
  const { data: modifierGroups } = useProductModifiers(selectedProduct?.id);
  const { data: ingredients } = useProductIngredients(selectedProduct?.id);
  const { isStoreOpen, currentWaitTime } = useStoreStatus();
  const isMobile = useIsMobile();

  const waitTime = currentWaitTime;

  // Handle category scroll to show/hide gradients
  const handleCategoryScroll = () => {
    if (!categoryScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = categoryScrollRef.current;
    setShowLeftGradient(scrollLeft > 10);
    setShowRightGradient(scrollLeft < scrollWidth - clientWidth - 10);
  };

  // Check gradients on mount and resize
  useEffect(() => {
    handleCategoryScroll();
    window.addEventListener('resize', handleCategoryScroll);
    return () => window.removeEventListener('resize', handleCategoryScroll);
  }, []);

  // Group products by category
  const productsByCategory = products?.reduce((acc, product) => {
    const cat = product.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {} as Record<ProductCategory, Product[]>);

  const handleCategoryClick = (category: ProductCategory | 'All') => {
    setSelectedCategory(category);
    
    // Auto-scroll the clicked category button into view
    const button = categoryScrollRef.current?.querySelector(`[data-category="${category}"]`) as HTMLElement;
    if (button) {
      button.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
    
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
      
      <section ref={sectionRef} id="menu" className="w-full px-2 sm:px-4 py-1 sm:py-12 pb-28 max-w-3xl mx-auto scroll-mt-20 relative overflow-hidden">
        {/* Section Header — no entrance animation to prevent CLS */}
        <div className="text-center mb-1 sm:mb-4">
          <h2 className="font-heading text-xl sm:text-2xl md:text-4xl font-bold text-foreground mb-0.5 sm:mb-1">
            OUR <span className="text-primary">MENU</span>
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Crafted with passion, served with pride
          </p>
        </div>

        {/* Sticky Category Bar with Scroll Snap and Gradients */}
        <div className="sticky z-30 bg-black/90 backdrop-blur-md py-0.5 sm:py-2 md:py-4 -mx-2 sm:-mx-4 px-2 sm:px-4 mb-1 sm:mb-4 md:mb-8 border-y border-white/5 overflow-hidden" style={{ top: 'var(--header-offset)' }}>
          <div className="relative">
            {/* Left gradient indicator */}
            <div 
              className={cn(
                "absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/90 to-transparent pointer-events-none z-10 transition-opacity duration-200",
                showLeftGradient ? "opacity-100" : "opacity-0"
              )}
            />
            
            {/* Scrollable category container */}
            <div 
              ref={categoryScrollRef}
              onScroll={handleCategoryScroll}
              className="flex gap-2 overflow-x-auto no-scrollbar category-scroll px-1"
            >
              {categories.map((category) => (
                <button
                  key={category}
                  data-category={category}
                  onClick={() => handleCategoryClick(category)}
                  className={cn(
                    'category-pill whitespace-nowrap flex-shrink-0 transition-transform',
                    'hover:scale-105 active:scale-95',
                    selectedCategory === category && 'active'
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
            
            {/* Right gradient indicator */}
            <div 
              className={cn(
                "absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/90 to-transparent pointer-events-none z-10 transition-opacity duration-200",
                showRightGradient ? "opacity-100" : "opacity-0"
              )}
            />
          </div>
        </div>

        {/* Products */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2 md:gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="street-card overflow-hidden">
                <Skeleton className="w-full aspect-square bg-secondary/50" />
                <div className="p-2 space-y-1.5">
                  <Skeleton className="h-4 w-3/4 bg-secondary/50" />
                  <Skeleton className="h-3 w-1/2 bg-secondary/50" />
                  <Skeleton className="h-6 w-16 bg-secondary/50" />
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
          // Show grouped by category with parallax
          <div className="space-y-6 sm:space-y-10">
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
          <div className="overflow-hidden w-full">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2 md:gap-4">
              {products.map((product, index) => (
                <AnimatedProductCard
                  key={product.id}
                  product={product}
                  hasModifiers={hasModifiers(product.id)}
                  onClick={() => setSelectedProduct(product)}
                  index={index}
                  variant={isMobile ? 'mobile-grid' : 'vertical'}
                />
              ))}
            </div>
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
          ingredients={ingredients}
          onClose={() => setSelectedProduct(null)}
        />
      </section>
    </>
  );
}
