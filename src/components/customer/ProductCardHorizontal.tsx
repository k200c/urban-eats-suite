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
  variant?: 'horizontal' | 'vertical' | 'compact';
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
