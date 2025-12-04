import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Minus, Plus, X } from 'lucide-react';
import { Product, Modifier, SelectedModifier, RemovedIngredient } from '@/types/database';
import { ModifierGroupWithModifiers } from '@/hooks/useProductModifiers';
import { ProductIngredientWithDetails } from '@/hooks/useProductIngredients';
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

interface ProductSheetProps {
  product: Product | null;
  modifierGroups?: ModifierGroupWithModifiers[];
  ingredients?: ProductIngredientWithDetails[];
  onClose: () => void;
}

export function ProductSheet({ product, modifierGroups, ingredients, onClose }: ProductSheetProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([]);
  const [includedIngredients, setIncludedIngredients] = useState<Record<string, boolean>>({});
  const addItem = useCartStore((state) => state.addItem);

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setQuantity(1);
      setSelectedModifiers([]);
      // Initialize all default ingredients as included
      const initialIngredients: Record<string, boolean> = {};
      ingredients?.forEach((ing) => {
        if (ing.is_default) {
          initialIngredients[ing.id] = true;
        }
      });
      setIncludedIngredients(initialIngredients);
    }
  }, [product?.id, ingredients]);

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
          price_adjustment: modifier.price_adjustment || 0,
        },
      ];
    });
  };

  const toggleIngredient = (ingredientId: string) => {
    setIncludedIngredients((prev) => ({
      ...prev,
      [ingredientId]: !prev[ingredientId],
    }));
  };

  // Calculate total price in real-time (ingredients don't affect price)
  const modifiersTotal = selectedModifiers.reduce((sum, m) => sum + m.price_adjustment, 0);
  const totalPrice = (product.price + modifiersTotal) * quantity;

  // Get removed ingredients for cart
  const getRemovedIngredients = (): RemovedIngredient[] => {
    return (ingredients || [])
      .filter((ing) => ing.is_default && !includedIngredients[ing.id])
      .map((ing) => ({ id: ing.id, name: ing.name }));
  };

  const handleAddToOrder = () => {
    const removedIngredients = getRemovedIngredients();
    addItem(product, quantity, selectedModifiers, removedIngredients);
    toast.success('Added to Cart', {
      description: `${quantity}x ${product.name} added to your order`,
    });
    onClose();
  };

  const defaultIngredients = ingredients?.filter((ing) => ing.is_default) || [];
  const hasIngredients = defaultIngredients.length > 0;
  const hasModifiers = modifierGroups && modifierGroups.length > 0;

  return (
    <Sheet open={!!product} onOpenChange={() => onClose()}>
      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-3xl bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A] border-t border-white/10 p-0 overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Scrollable Content */}
        <div className="h-full overflow-y-auto pb-32">
          {/* Product Image */}
          <div className="relative h-56 sm:h-64">
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] to-transparent" />
            
            {/* Base Price Badge */}
            <div className="absolute bottom-4 left-4">
              <span className="price-badge text-lg">
                €{product.price.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Product Info */}
          <div className="p-6">
            <SheetHeader className="text-left mb-6">
              <SheetTitle className="font-heading text-2xl text-foreground">
                {product.name}
              </SheetTitle>
              {product.description && (
                <p className="text-muted-foreground mt-2">{product.description}</p>
              )}
            </SheetHeader>

            {/* SECTION 1: What's Inside (Removable Ingredients) */}
            {hasIngredients && (
              <div className="mb-8">
                <h4 className="font-heading text-sm uppercase tracking-wider text-foreground mb-4">
                  What's Inside
                </h4>
                <div className="space-y-2">
                  {defaultIngredients.map((ingredient) => {
                    const isIncluded = includedIngredients[ingredient.id] ?? true;
                    return (
                      <div
                        key={ingredient.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                          isIncluded
                            ? 'border-white/10 bg-transparent'
                            : 'border-destructive/30 bg-destructive/5'
                        }`}
                      >
                        <span className={`${isIncluded ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                          {ingredient.name}
                        </span>
                        <Switch
                          checked={isIncluded}
                          onCheckedChange={() => toggleIngredient(ingredient.id)}
                          className="data-[state=checked]:bg-success data-[state=unchecked]:bg-muted"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION 2: Make it Epic (Paid Extras) */}
            {hasModifiers && (
              <div className="space-y-6">
                <h4 className="font-heading text-sm uppercase tracking-wider text-foreground">
                  Make it Epic
                </h4>
                {modifierGroups.map((group) => (
                  <div key={group.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm text-muted-foreground">
                        {group.name}
                      </h5>
                      {group.min_selection && group.min_selection > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Required
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {group.modifiers.map((modifier) => {
                        const isSelected = selectedModifiers.some((m) => m.id === modifier.id);
                        return (
                          <label
                            key={modifier.id}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/10'
                                : 'border-white/10 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleModifier(modifier)}
                                className="border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                              <span className="text-foreground">{modifier.name}</span>
                            </div>
                            {modifier.price_adjustment && modifier.price_adjustment > 0 && (
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

            {/* Quantity Selector */}
            <div className="mt-8">
              <h4 className="font-heading text-sm uppercase tracking-wider text-foreground mb-3">
                Quantity
              </h4>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="border-white/20"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-2xl font-bold text-foreground w-12 text-center">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                  className="border-white/20"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Add to Order Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent pt-8">
          <Button
            onClick={handleAddToOrder}
            disabled={!product.is_available}
            className="w-full h-14 btn-glow text-lg font-semibold tracking-wider"
          >
            ADD TO ORDER - €{totalPrice.toFixed(2)}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
