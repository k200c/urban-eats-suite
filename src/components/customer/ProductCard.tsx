import { Product } from '@/types/database';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const imageUrl = product.image_url || categoryImages[product.category] || heroBurger;

  return (
    <div
      onClick={onClick}
      className={cn(
        'product-card group',
        !product.is_available && 'opacity-50 pointer-events-none'
      )}
    >
      <div className="relative h-32 overflow-hidden">
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        {!product.is_available && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <span className="text-muted-foreground font-semibold">Sold Out</span>
          </div>
        )}
        {product.is_featured && product.is_available && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
            HOT
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-heading text-base text-foreground mb-1 line-clamp-1">
          {product.name}
        </h3>
        <p className="text-muted-foreground text-xs mb-2 line-clamp-2 min-h-[2rem]">
          {product.description || 'Delicious street food'}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-primary font-bold">€{product.price.toFixed(2)}</span>
          <button className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-110 transition-transform">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
