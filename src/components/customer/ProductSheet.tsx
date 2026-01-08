import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, X, MinusCircle, PlusCircle } from 'lucide-react';
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

// Track ingredient customization state: 'included' (default), 'removed', or 'extra'
type IngredientState = 'included' | 'removed' | 'extra';

export function ProductSheet({ product, modifierGroups, ingredients, onClose }: ProductSheetProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([]);
  const [ingredientStates, setIngredientStates] = useState<Record<string, IngredientState>>({});
  const addItem = useCartStore((state) => state.addItem);

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setQuantity(1);
      setSelectedModifiers([]);
      // Initialize all default ingredients as 'included'
      const initialStates: Record<string, IngredientState> = {};
      ingredients?.forEach((ing) => {
        if (ing.is_default) {
          initialStates[ing.id] = 'included';
        }
      });
      setIngredientStates(initialStates);
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

  const handleRemoveIngredient = (ingredientId: string, ingredientName: string) => {
    setIngredientStates((prev) => {
      const current = prev[ingredientId] || 'included';
      // Toggle between included and removed
      return {
        ...prev,
        [ingredientId]: current === 'removed' ? 'included' : 'removed',
      };
    });
  };

  const handleAddExtra = (ingredientId: string, ingredientName: string) => {
    setIngredientStates((prev) => {
      const current = prev[ingredientId] || 'included';
      // Toggle between included and extra
      return {
        ...prev,
        [ingredientId]: current === 'extra' ? 'included' : 'extra',
      };
    });
  };

  // Calculate total price in real-time (ingredients don't affect price currently)
  const modifiersTotal = selectedModifiers.reduce((sum, m) => sum + m.price_adjustment, 0);
  const totalPrice = (product.price + modifiersTotal) * quantity;

  // Get removed and extra ingredients for cart
  const getRemovedIngredients = (): RemovedIngredient[] => {
    return (ingredients || [])
      .filter((ing) => ingredientStates[ing.id] === 'removed')
      .map((ing) => ({ id: ing.id, name: ing.name }));
  };

  const getExtraIngredients = (): SelectedModifier[] => {
    return (ingredients || [])
      .filter((ing) => ingredientStates[ing.id] === 'extra')
      .map((ing) => ({ 
        id: ing.id, 
        name: `Extra ${ing.name}`,
        price_adjustment: 0 // Free for now, can add pricing later
      }));
  };

  const handleAddToOrder = () => {
    const removedIngredients = getRemovedIngredients();
    const extraIngredients = getExtraIngredients();
    // Combine paid modifiers with extra ingredient requests
    const allModifiers = [...selectedModifiers, ...extraIngredients];
    
    addItem(product, quantity, allModifiers, removedIngredients);
    toast.success('Added to Cart', {
      description: `${quantity}x ${product.name} added to your order`,
    });
    onClose();
  };

  const defaultIngredients = ingredients?.filter((ing) => ing.is_default) || [];
  const removableIngredients = defaultIngredients.filter((ing) => (ing as any).is_removable !== false);
  const addableIngredients = defaultIngredients; // All ingredients can have "Extra" option
  
  const hasIngredients = defaultIngredients.length > 0;
  const hasModifiers = modifierGroups && modifierGroups.length > 0;

  // Count customizations
  const removedCount = Object.values(ingredientStates).filter(s => s === 'removed').length;
  const extraCount = Object.values(ingredientStates).filter(s => s === 'extra').length;

  return (
    <Sheet open={!!product} onOpenChange={() => onClose()}>
      <SheetContent
        side="bottom"
        className="h-[90vh] rounded-t-3xl bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A] border-t border-white/10 p-0 overflow-hidden"
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

            {/* SECTION 1: Customize Your Order (Ingredients) */}
            {hasIngredients && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-heading text-sm uppercase tracking-wider text-foreground">
                    Customize Your Order
                  </h4>
                  {(removedCount > 0 || extraCount > 0) && (
                    <div className="flex gap-2">
                      {removedCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {removedCount} removed
                        </Badge>
                      )}
                      {extraCount > 0 && (
                        <Badge variant="default" className="text-xs bg-green-600">
                          {extraCount} extra
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  {defaultIngredients.map((ingredient) => {
                    const state = ingredientStates[ingredient.id] || 'included';
                    const isRemoved = state === 'removed';
                    const isExtra = state === 'extra';
                    const isRemovable = (ingredient as any).is_removable !== false;
                    
                    return (
                      <div
                        key={ingredient.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                          isRemoved
                            ? 'border-destructive/50 bg-destructive/10'
                            : isExtra
                            ? 'border-green-500/50 bg-green-500/10'
                            : 'border-white/10 bg-transparent hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${
                            isRemoved 
                              ? 'text-muted-foreground line-through' 
                              : isExtra
                              ? 'text-green-400'
                              : 'text-foreground'
                          }`}>
                            {ingredient.name}
                          </span>
                          {isRemoved && (
                            <Badge variant="outline" className="text-[10px] text-destructive border-destructive/50">
                              No {ingredient.name}
                            </Badge>
                          )}
                          {isExtra && (
                            <Badge variant="outline" className="text-[10px] text-green-400 border-green-500/50">
                              Extra
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Remove Button */}
                          {isRemovable && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-8 px-3 text-xs gap-1.5 ${
                                isRemoved 
                                  ? 'bg-destructive/20 text-destructive hover:bg-destructive/30' 
                                  : 'hover:bg-destructive/10 hover:text-destructive'
                              }`}
                              onClick={() => handleRemoveIngredient(ingredient.id, ingredient.name)}
                            >
                              <MinusCircle className="w-3.5 h-3.5" />
                              {isRemoved ? 'Undo' : 'Remove'}
                            </Button>
                          )}
                          
                          {/* Add Extra Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 px-3 text-xs gap-1.5 ${
                              isExtra 
                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                                : 'hover:bg-green-500/10 hover:text-green-400'
                            }`}
                            onClick={() => handleAddExtra(ingredient.id, ingredient.name)}
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            {isExtra ? 'Undo' : 'Extra'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION 2: Make it Epic (Paid Extras) */}
            {hasModifiers && (
              <div className="space-y-6 mb-8">
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
