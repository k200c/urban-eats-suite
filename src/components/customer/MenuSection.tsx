import { useState, useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { useProducts } from '@/hooks/useProducts';
import { useProductModifiers } from '@/hooks/useProductModifiers';
import { useProductIngredients } from '@/hooks/useProductIngredients';
import { ProductCardHorizontal } from './ProductCardHorizontal';
import { ProductSheet } from './ProductSheet';
import { Product, ProductCategory } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const categories: (ProductCategory | 'All')[] = ['All', 'Burgers', 'Flatbreads', 'Fries', 'Drinks', 'Specials'];

// Animated Product Card wrapper with parallax
function AnimatedProductCard({ 
  product, 
  hasModifiers, 
  onClick, 
  index 
}: { 
  product: Product; 
  hasModifiers: boolean; 
  onClick: () => void; 
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30, y: 20 }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ 
        duration: 0.5, 
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
    >
      <ProductCardHorizontal
        product={product}
        hasModifiers={hasModifiers}
        onClick={onClick}
      />
    </motion.div>
  );
}

// Animated Category Section with parallax
function AnimatedCategorySection({ 
  category, 
  products, 
  categoryRef,
  hasModifiers,
  onProductClick
}: { 
  category: ProductCategory;
  products: Product[];
  categoryRef: (el: HTMLDivElement | null) => void;
  hasModifiers: (id: string) => boolean;
  onProductClick: (product: Product) => void;
}) {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });
  
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.3, 1, 1, 0.3]);

  return (
    <motion.div
      ref={(el) => {
        (sectionRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        categoryRef(el);
      }}
      className="scroll-mt-32 relative"
      style={{ opacity }}
    >
      {/* Subtle parallax background glow */}
      <motion.div
        className="absolute -inset-4 rounded-2xl pointer-events-none"
        style={{ 
          y: backgroundY,
          background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.03) 0%, transparent 70%)',
        }}
      />
      
      <motion.h3
        className="font-heading text-xl font-bold text-primary mb-4 uppercase tracking-wider relative"
        initial={{ opacity: 0, x: -20 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        {category}
      </motion.h3>
      
      <div className="space-y-4 relative">
        {products.map((product, index) => (
          <AnimatedProductCard
            key={product.id}
            product={product}
            hasModifiers={hasModifiers(product.id)}
            onClick={() => onProductClick(product)}
            index={index}
          />
        ))}
      </div>
    </motion.div>
  );
}

export function MenuSection() {
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'All'>('All');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const isHeaderInView = useInView(headerRef, { once: true });

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "start start"]
  });

  const headerScale = useTransform(scrollYProgress, [0, 0.5], [0.8, 1]);
  const headerOpacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);
  const headerY = useTransform(scrollYProgress, [0, 0.5], [60, 0]);

  const { data: products, isLoading, isError, refetch } = useProducts(selectedCategory);
  const { data: modifierGroups } = useProductModifiers(selectedProduct?.id);
  const { data: ingredients } = useProductIngredients(selectedProduct?.id);

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
    const product = products?.find(p => p.id === productId);
    return product?.category === 'Burgers' || product?.category === 'Flatbreads';
  };

  return (
    <section ref={sectionRef} id="menu" className="px-4 py-12 max-w-4xl mx-auto scroll-mt-20 relative">
      {/* Animated Section Header */}
      <motion.div 
        ref={headerRef}
        className="text-center mb-8"
        style={{ 
          scale: headerScale, 
          opacity: headerOpacity,
          y: headerY
        }}
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

      {/* Sticky Category Bar with entrance animation */}
      <motion.div 
        className="sticky top-16 z-30 bg-black/90 backdrop-blur-md py-4 -mx-4 px-4 mb-8 border-y border-white/5"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {categories.map((category, index) => (
            <motion.button
              key={category}
              onClick={() => handleCategoryClick(category)}
              className={cn(
                'category-pill whitespace-nowrap flex-shrink-0',
                selectedCategory === category && 'active'
              )}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {category}
            </motion.button>
          ))}
        </div>
      </motion.div>

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
            />
          ))}
        </div>
      ) : products && products.length > 0 ? (
        <div className="space-y-4">
          {products.map((product, index) => (
            <AnimatedProductCard
              key={product.id}
              product={product}
              hasModifiers={hasModifiers(product.id)}
              onClick={() => setSelectedProduct(product)}
              index={index}
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
  );
}
