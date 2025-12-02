import { useState } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { Product, SelectedModifier, Modifier, ModifierGroup } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useCartStore } from '@/stores/cartStore';
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

interface ProductSheetProps {
  product: Product | null;
  modifierGroups?: (ModifierGroup & { modifiers: Modifier[] })[];
  onClose: () => void;
}

export function ProductSheet({ product, modifierGroups = [], onClose }: ProductSheetProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([]);
  const addItem = useCartStore((state) => state.addItem);

  if (!product) return null;

  const imageUrl = product.image_url || categoryImages[product.category] || heroBurger;

  const toggleModifier = (modifier: Modifier) => {
    setSelectedModifiers((prev) => {
      const exists = prev.find((m) => m.id === modifier.id);
      if (exists) {
        return prev.filter((m) => m.id !== modifier.id);
      }
      return [
        ...prev,
        {
          id: modifier.id,
          name: modifier.name,
          price_adjustment: modifier.price_adjustment,
        },
      ];
    });
  };

  const modifiersTotal = selectedModifiers.reduce((sum, m) => sum + m.price_adjustment, 0);
  const totalPrice = (product.price + modifiersTotal) * quantity;

  const handleAddToOrder = () => {
    addItem(product, quantity, selectedModifiers);
    onClose();
    setQuantity(1);
    setSelectedModifiers([]);
  };

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in" />
      
      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl animate-slide-up max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-secondary flex items-center justify-center z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Image */}
        <div className="h-48 relative">
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2">
          <h2 className="font-heading text-2xl text-foreground mb-2">{product.name}</h2>
          <p className="text-muted-foreground mb-4">{product.description || 'Delicious street food made fresh'}</p>

          {/* Modifiers */}
          {modifierGroups.length > 0 && (
            <div className="space-y-4 mb-6">
              {modifierGroups.map((group) => (
                <div key={group.id} className="glass-card p-4">
                  <h3 className="font-heading text-base text-foreground mb-3">
                    {group.name}
                    {group.min_selection > 0 && (
                      <span className="text-primary text-xs ml-2">Required</span>
                    )}
                  </h3>
                  <div className="space-y-2">
                    {group.modifiers.map((modifier) => {
                      const isSelected = selectedModifiers.some((m) => m.id === modifier.id);
                      return (
                        <label
                          key={modifier.id}
                          className={cn(
                            'flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors',
                            isSelected ? 'bg-primary/10 border border-primary/30' : 'bg-secondary hover:bg-secondary/80'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleModifier(modifier)}
                            />
                            <span className="text-foreground">{modifier.name}</span>
                          </div>
                          {modifier.price_adjustment > 0 && (
                            <span className="text-primary font-semibold">
                              +€{modifier.price_adjustment.toFixed(2)}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quantity */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-foreground font-semibold">Quantity</span>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-xl font-heading w-8 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-border bg-card">
          <Button
            variant="glow"
            size="xl"
            className="w-full"
            onClick={handleAddToOrder}
          >
            <span>Add to Order</span>
            <span className="ml-auto font-heading text-lg">€{totalPrice.toFixed(2)}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
