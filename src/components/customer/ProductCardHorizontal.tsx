import { useState } from 'react';
import { Product } from '@/types/database';
import { Plus, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/stores/cartStore';
import { toast } from 'sonner';

import heroBurger from '@/assets/hero-burger.jpg';
import loadedFries from '@/assets/loaded-fries.jpg';
import flatbread from '@/assets/flatbread.jpg';
import drinks from '@/assets/drinks.jpg';

const categoryImages: Record<string, string> = {
  Burgers: heroBurger,
  Flatbreads: flatbread,
  Fries: loadedFries,
  Drinks: drinks,
  Specials: heroBurger,
};

interface ProductCardHorizontalProps {
  product: Product;
  hasModifiers: boolean;
  onClick: () => void;
  variant?: 'horizontal' | 'vertical' | 'compact' | 'mobile-vertical' | 'mobile-grid';
}

export function ProductCardHorizontal({
  product,
  hasModifiers,
  onClick,
  variant = 'vertical',
}: ProductCardHorizontalProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [imgError, setImgError] = useState(false);
  const fallbackImage = categoryImages[product.category] || heroBurger;
  const imageUrl = imgError ? fallbackImage : (product.image_url || fallbackImage);
  const isSoldOut = !product.is_available;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSoldOut) return;
    
    addItem(product, 1, [], []);
    toast.success('Added to Cart', {
      description: `${product.name} added to your order`,
    });
  };

  const handleCustomize = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSoldOut) return;
    onClick();
  };

  // Ultra-compact mobile-grid variant for 2-column layout (4+ cards on screen)
  if (variant === 'mobile-grid') {
    return (
      <div
        className={cn(
          'street-card overflow-hidden flex flex-col cursor-pointer w-full min-w-0',
          'hover:border-primary/40 transition-all active:scale-[0.98]',
          isSoldOut && 'opacity-50'
        )}
        onClick={onClick}
      >
        {/* Compact image - 70px for tiny phones, 80px for larger */}
        <div className="relative h-[70px] sm:h-[80px] w-full">
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
          {isSoldOut && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <span className="bg-destructive/80 px-2 py-0.5 rounded text-destructive-foreground font-bold text-[9px]">
                SOLD OUT
              </span>
            </div>
          )}
        </div>

        {/* Minimal content section */}
        <div className="p-1.5 sm:p-2 space-y-0.5">
          <h3 className="text-[11px] sm:text-xs font-bold text-foreground font-heading line-clamp-1 w-full overflow-hidden text-ellipsis">
            {product.name}
          </h3>
          
          {/* Price and Quick Add row */}
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-primary">
              €{product.price.toFixed(2)}
            </span>
            
            <button
              onClick={handleQuickAdd}
              disabled={isSoldOut}
              className={cn(
                'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center',
                'bg-primary text-primary-foreground transition-all',
                'active:scale-95 touch-manipulation',
                isSoldOut && 'cursor-not-allowed opacity-50'
              )}
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mobile-vertical card variant - compact to fit on mobile screen
  if (variant === 'mobile-vertical') {
    return (
      <div
        className={cn(
          'street-card overflow-hidden flex flex-col cursor-pointer',
          'hover:border-primary/40 transition-all active:scale-[0.98]',
          isSoldOut && 'opacity-50'
        )}
        onClick={onClick}
      >
        {/* Compact image height for mobile */}
        <div className="relative h-[120px] w-full">
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
          {/* HOT badge for featured items */}
          {product.is_featured && !isSoldOut && (
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded-full">
              HOT
            </div>
          )}
          {/* Sold out overlay */}
          {isSoldOut && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <span className="bg-destructive/80 px-3 py-1.5 rounded-lg text-destructive-foreground font-bold text-sm">
                SOLD OUT
              </span>
            </div>
          )}
        </div>

        {/* Compact content section for mobile */}
        <div className="p-3 space-y-2">
          <h3 className="text-base font-bold text-foreground font-heading line-clamp-1">
            {product.name}
          </h3>
          
          <p className="text-sm text-muted-foreground line-clamp-2">
            {product.description || 'Delicious street food'}
          </p>
          
          {/* Price and Quick Add row */}
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-primary">
              €{product.price.toFixed(2)}
            </span>
            
            <button
              onClick={handleQuickAdd}
              disabled={isSoldOut}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                'bg-primary text-primary-foreground transition-all',
                'active:scale-95 touch-manipulation',
                isSoldOut && 'cursor-not-allowed opacity-50'
              )}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          {/* Compact Customize button */}
          <button
            onClick={handleCustomize}
            disabled={isSoldOut}
            className={cn(
              'w-full bg-primary hover:bg-primary/90 text-primary-foreground',
              'font-semibold py-2.5 rounded-lg transition-all active:scale-[0.98]',
              'touch-manipulation',
              isSoldOut && 'cursor-not-allowed opacity-50'
            )}
          >
            Customize
          </button>
        </div>
      </div>
    );
  }

  // Compact card variant for mobile - fits entirely on screen
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'street-card p-2 flex items-center gap-3 cursor-pointer hover:border-primary/40 transition-all',
          isSoldOut && 'opacity-50'
        )}
        onClick={onClick}
      >
        {/* Small Square Thumbnail */}
        <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
          {isSoldOut && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <span className="text-[10px] font-bold text-muted-foreground">SOLD OUT</span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-heading text-sm text-foreground line-clamp-1">
            {product.name}
          </h3>
          <span className="text-primary font-bold text-sm mt-0.5 block">
            €{product.price.toFixed(2)}
          </span>
        </div>

        {/* Quick Add Button - 44x44px touch target */}
        <button
          onClick={handleQuickAdd}
          disabled={isSoldOut}
          className={cn(
            'h-11 w-11 rounded-full flex items-center justify-center transition-all flex-shrink-0',
            'bg-primary text-primary-foreground active:scale-95',
            '-webkit-tap-highlight-color-transparent',
            isSoldOut && 'cursor-not-allowed opacity-50'
          )}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // Vertical card variant for grid layout
  if (variant === 'vertical') {
    return (
      <div
        className={cn(
          'street-card overflow-hidden flex flex-col cursor-pointer hover:border-primary/40 transition-all',
          isSoldOut && 'opacity-50'
        )}
        onClick={onClick}
      >
        {/* Product Image - Full Width */}
        <div className="relative h-36 sm:h-40 w-full">
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
          {isSoldOut && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <span className="text-xs font-bold text-muted-foreground">SOLD OUT</span>
            </div>
          )}
        </div>

        {/* Content Below */}
        <div className="p-3 flex flex-col flex-1">
          <h3 className="font-heading text-base text-foreground line-clamp-1">
            {product.name}
          </h3>
          <p className="text-muted-foreground text-xs line-clamp-2 mt-1 flex-1">
            {product.description || 'Delicious street food'}
          </p>
          <div className="flex items-center justify-between mt-3">
            <span className="price-badge">€{product.price.toFixed(2)}</span>
            <button
              onClick={handleQuickAdd}
              disabled={isSoldOut}
              className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center transition-all',
                'bg-primary text-primary-foreground hover:scale-110',
                isSoldOut && 'cursor-not-allowed opacity-50'
              )}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Horizontal card variant (original layout)
  return (
    <div
      className={cn(
        'street-card p-3 flex gap-3 relative overflow-hidden',
        isSoldOut && 'opacity-50'
      )}
    >
      {/* Product Image */}
      <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
        {isSoldOut && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <span className="text-xs font-bold text-muted-foreground">SOLD OUT</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <h3 className="font-heading text-base text-foreground line-clamp-1">
            {product.name}
          </h3>
          <p className="text-muted-foreground text-xs line-clamp-2 mt-0.5">
            {product.description || 'Delicious street food'}
          </p>
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="price-badge">€{product.price.toFixed(2)}</span>
          
          {/* Dual Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Customize Button */}
            <button
              onClick={handleCustomize}
              disabled={isSoldOut}
              className={cn(
                'h-8 px-3 rounded-full text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 transition-all',
                'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                isSoldOut && 'cursor-not-allowed opacity-50'
              )}
            >
              <Settings2 className="w-3.5 h-3.5" />
              Customize
            </button>
            
            {/* Quick Add Button */}
            <button
              onClick={handleQuickAdd}
              disabled={isSoldOut}
              className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center transition-all',
                'bg-primary text-primary-foreground hover:scale-110',
                isSoldOut && 'cursor-not-allowed opacity-50'
              )}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
