import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Minus, Plus, X } from 'lucide-react';
import { Product, Modifier, SelectedModifier, RemovedIngredient } from '@/types/database';
import { ModifierGroupWithModifiers } from '@/hooks/useProductModifiers';
import { ProductIngredientWithDetails } from '@/hooks/useProductIngredients';
import { useCartStore } from '@/stores/cartStore';
import { getExtraPrice } from '@/lib/pricingRules';
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
  const [selectedSide, setSelectedSide] = useState<string | null>(null);
  const addItem = useCartStore((state) => state.addItem);

  // Separate sides group from other modifiers
  const sidesGroup = modifierGroups?.find(g => g.name === 'Add a Side');
  const addOnGroups = modifierGroups?.filter(g => g.name !== 'Add a Side' && g.name !== 'Drinks');

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setQuantity(1);
      setSelectedModifiers([]);
      setSelectedSide(null);
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

  const handleSideChange = (value: string) => {
    if (value === 'none') {
      setSelectedSide(null);
    } else {
      setSelectedSide(value);
    }
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

  // Get removed and extra ingredients for cart
  const getRemovedIngredients = (): RemovedIngredient[] => {
    return (ingredients || [])
      .filter((ing) => ingredientStates[ing.id] === 'removed')
      .map((ing) => ({ id: ing.id, name: ing.name }));
  };

  // Get extra ingredients with DYNAMIC PRICING
  const getExtraIngredients = (): SelectedModifier[] => {
    return (ingredients || [])
      .filter((ing) => ingredientStates[ing.id] === 'extra')
      .map((ing) => ({ 
        id: ing.id, 
        name: `Extra ${ing.name}`,
        price_adjustment: getExtraPrice(ing.name) // Dynamic pricing!
      }));
  };

  // Get selected side as modifier
  const getSelectedSideModifier = (): SelectedModifier | null => {
    if (!selectedSide || !sidesGroup) return null;
    const sideModifier = sidesGroup.modifiers.find(m => m.id === selectedSide);
    if (!sideModifier) return null;
    return {
      id: sideModifier.id,
      name: sideModifier.name,
      price_adjustment: sideModifier.price_adjustment || 0,
    };
  };

  // Calculate total price with dynamic extras pricing
  const extraIngredients = getExtraIngredients();
  const selectedSideModifier = getSelectedSideModifier();
  const extrasTotal = extraIngredients.reduce((sum, e) => sum + e.price_adjustment, 0);
  const modifiersTotal = selectedModifiers.reduce((sum, m) => sum + m.price_adjustment, 0);
  const sideTotal = selectedSideModifier?.price_adjustment || 0;
  const totalPrice = (product.price + extrasTotal + modifiersTotal + sideTotal) * quantity;

  const handleAddToOrder = () => {
    const removedIngredients = getRemovedIngredients();
    // Combine paid modifiers, extra ingredients, and selected side
    const allModifiers = [
      ...selectedModifiers, 
      ...extraIngredients,
      ...(selectedSideModifier ? [selectedSideModifier] : [])
    ];
    
    addItem(product, quantity, allModifiers, removedIngredients);
    toast.success('Added to Cart', {
      description: `${quantity}x ${product.name} added to your order`,
    });
    onClose();
  };


  const defaultIngredients = ingredients?.filter((ing) => ing.is_default) || [];
  const removableIngredients = defaultIngredients.filter((ing) => ing.is_removable !== false);
  
  const hasIngredients = defaultIngredients.length > 0;
  const hasAddOns = addOnGroups && addOnGroups.length > 0 && addOnGroups.some(g => g.modifiers.length > 0);
  const hasSides = sidesGroup && sidesGroup.modifiers.length > 0;

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

            {/* SECTION 1: Make it Epic (Paid Extras + Sides) */}
            {(hasAddOns || hasSides) && (
              <div className="space-y-6 mb-8">
                <h4 className="font-heading text-sm uppercase tracking-wider text-foreground">
                  Make it Epic
                </h4>
                
                {/* Protein & Cheese Add-ons (Checkboxes) */}
                {addOnGroups?.map((group) => (
                  group.modifiers.length > 0 && (
                    <div key={group.id} className="space-y-3">
                      <h5 className="text-sm text-muted-foreground">
                        {group.name}
                      </h5>
                      
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
                  )
                ))}

                {/* Sides Dropdown */}
                {hasSides && (
                  <div className="space-y-3">
                    <h5 className="text-sm text-muted-foreground">Add a Side</h5>
                    <Select 
                      value={selectedSide || 'none'} 
                      onValueChange={handleSideChange}
                    >
                      <SelectTrigger className="w-full bg-secondary border-white/10 hover:border-white/20">
                        <SelectValue placeholder="No Side" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border z-50">
                        <SelectItem value="none">No Side (€0.00)</SelectItem>
                        {sidesGroup.modifiers.map((modifier) => (
                          <SelectItem key={modifier.id} value={modifier.id}>
                            {modifier.name} (+€{(modifier.price_adjustment || 0).toFixed(2)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 2: Customize Your Order (Ingredients) */}
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
                    const isRemovable = ingredient.is_removable !== false;
                    const isAddable = ingredient.is_addable !== false;
                    
                    return (
                      <div
                        key={ingredient.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                          isRemoved
                            ? 'border-destructive/50 bg-destructive/10'
                            : isExtra
                            ? 'border-green-500/50 bg-green-500/10'
                            : 'border-white/10 bg-transparent'
                        }`}
                      >
                        {/* Ingredient Name & Price */}
                        <div className="flex-1">
                          <span className={`font-medium ${
                            isRemoved 
                              ? 'text-muted-foreground line-through' 
                              : isExtra
                              ? 'text-green-400'
                              : 'text-foreground'
                          }`}>
                            {isRemoved && 'No '}{isExtra && 'Extra '}{ingredient.name}
                          </span>
                          {/* Show price for extras */}
                          {isExtra && getExtraPrice(ingredient.name) > 0 && (
                            <span className="ml-2 text-sm text-green-400 font-semibold">
                              +€{getExtraPrice(ingredient.name).toFixed(2)}
                            </span>
                          )}
                        </div>
                        
                        {/* +/- Button Controls */}
                        <div className="flex items-center gap-1">
                          {/* Minus Button (Remove) */}
                          {isRemovable && (
                            <button
                              onClick={() => handleRemoveIngredient(ingredient.id, ingredient.name)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                isRemoved 
                                  ? 'bg-destructive text-destructive-foreground' 
                                  : 'bg-secondary text-secondary-foreground hover:bg-destructive/20 hover:text-destructive'
                              }`}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                          )}
                          
                          {/* Plus Button (Extra) - only show if is_addable */}
                          {isAddable && (
                            <button
                              onClick={() => handleAddExtra(ingredient.id, ingredient.name)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                isExtra 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-secondary text-secondary-foreground hover:bg-green-500/20 hover:text-green-400'
                              }`}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
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
