import { Product } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Plus, Settings2 } from 'lucide-react';
import { useCartStore } from '@/stores/cartStore';
import { toast } from 'sonner';

import heroBurger from '@/assets/hero-burger.jpg';
import loadedFries from '@/assets/loaded-fries.jpg';
import flatbread from '@/assets/flatbread.jpg';
import drinks from '@/assets/drinks.jpg';

const categoryImages: Record<string, string> = {
  Burgers: heroBurger,
  Fries: loadedFries,
  Flatbreads: flatbread,
  Drinks: drinks,
  Specials: heroBurger,
};

interface ProductCardHorizontalProps {
  product: Product;
  hasModifiers: boolean;
  onClick: () => void;
}

export function ProductCardHorizontal({ product, hasModifiers, onClick }: ProductCardHorizontalProps) {
  const addItem = useCartStore((state) => state.addItem);
  const imageUrl = product.image_url || categoryImages[product.category] || heroBurger;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(product, 1, [], []);
    toast.success('Added to Cart', {
      description: `${product.name} has been added to your order`,
    });
  };

  return (
    <div
      className="product-card-horizontal flex gap-4 group"
      onClick={onClick}
    >
      {/* Image */}
      <div className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 rounded-lg overflow-hidden">
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between py-1">
        <div>
          <h4 className="font-heading text-base sm:text-lg font-bold text-foreground line-clamp-1">
            {product.name}
          </h4>
          {product.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {product.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          {/* Price Badge */}
          <span className="price-badge text-sm">
            €{product.price.toFixed(2)}
          </span>

          {/* Action Button */}
          {hasModifiers ? (
            <Button
              size="sm"
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground text-xs font-semibold tracking-wider"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              <Settings2 className="w-3 h-3 mr-1" />
              CUSTOMIZE
            </Button>
          ) : (
            <Button
              size="sm"
              className="text-xs font-semibold tracking-wider"
              onClick={handleQuickAdd}
              disabled={!product.is_available}
            >
              <Plus className="w-3 h-3 mr-1" />
              ADD
            </Button>
          )}
        </div>
      </div>

      {/* Out of Stock Overlay */}
      {!product.is_available && (
        <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center">
          <span className="text-muted-foreground font-semibold uppercase tracking-wider text-sm">
            Sold Out
          </span>
        </div>
      )}
    </div>
  );
}
