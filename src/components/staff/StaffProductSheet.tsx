import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Minus, Plus, X } from 'lucide-react';
import { Product, Modifier, SelectedModifier, RemovedIngredient } from '@/types/database';
import { useProductModifiers, ModifierGroupWithModifiers } from '@/hooks/useProductModifiers';
import { useProductIngredients, ProductIngredientWithDetails } from '@/hooks/useProductIngredients';
import { useStaffCartStore } from '@/stores/staffCartStore';
import { getExtraPrice, formatExtraPrice } from '@/lib/pricingRules';
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

interface StaffProductSheetProps {
  product: Product | null;
  onClose: () => void;
}

// Track ingredient customization state
type IngredientState = 'included' | 'removed' | 'extra';

export function StaffProductSheet({ product, onClose }: StaffProductSheetProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([]);
  const [ingredientStates, setIngredientStates] = useState<Record<string, IngredientState>>({});
  const [selectedSide, setSelectedSide] = useState<string | null>(null);
  
  const addItem = useStaffCartStore((state) => state.addItem);
  
  // Fetch ingredients and modifiers for this product
  const { data: ingredients } = useProductIngredients(product?.id);
  const { data: modifierGroups } = useProductModifiers(product?.id);

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

  const handleRemoveIngredient = (ingredientId: string) => {
    setIngredientStates((prev) => {
      const current = prev[ingredientId] || 'included';
      return {
        ...prev,
        [ingredientId]: current === 'removed' ? 'included' : 'removed',
      };
    });
  };

  const handleAddExtra = (ingredientId: string) => {
    setIngredientStates((prev) => {
      const current = prev[ingredientId] || 'included';
      return {
        ...prev,
        [ingredientId]: current === 'extra' ? 'included' : 'extra',
      };
    });
  };

  // Get removed ingredients for cart
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

  // Calculate totals with dynamic pricing
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
    toast.success('Added to Order', {
      description: `${quantity}x ${product.name} added`,
      duration: 1500,
    });
    onClose();
  };

  const defaultIngredients = ingredients?.filter((ing) => ing.is_default) || [];
  const hasIngredients = defaultIngredients.length > 0;
  const hasAddOns = addOnGroups && addOnGroups.length > 0 && addOnGroups.some(g => g.modifiers.length > 0);
  const hasSides = sidesGroup && sidesGroup.modifiers.length > 0;

  // Count customizations
  const removedCount = Object.values(ingredientStates).filter(s => s === 'removed').length;
  const extraCount = Object.values(ingredientStates).filter(s => s === 'extra').length;

  return (
    <Sheet open={!!product} onOpenChange={() => onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md bg-gradient-to-b from-card to-background border-l border-border p-0 overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Scrollable Content */}
        <div className="h-full overflow-y-auto pb-32">
          {/* Product Image */}
          <div className="relative h-40">
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
            
            {/* Base Price Badge */}
            <div className="absolute bottom-3 left-4">
              <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold">
                €{product.price.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Product Info */}
          <div className="p-4">
            <SheetHeader className="text-left mb-4">
              <SheetTitle className="font-heading text-xl text-foreground">
                {product.name}
              </SheetTitle>
              {product.description && (
                <p className="text-muted-foreground text-sm mt-1">{product.description}</p>
              )}
            </SheetHeader>

            {/* SECTION 1: Make it Epic (Paid Extras + Sides) */}
            {(hasAddOns || hasSides) && (
              <div className="space-y-4 mb-6">
                <h4 className="font-heading text-xs uppercase tracking-wider text-muted-foreground">
                  Make it Epic
                </h4>

                {/* Protein & Cheese Add-ons (Checkboxes) */}
                {addOnGroups?.map((group) => (
                  group.modifiers.length > 0 && (
                    <div key={group.id} className="space-y-1.5">
                      <h5 className="text-xs text-muted-foreground mb-2">
                        {group.name}
                      </h5>
                      
                      {group.modifiers.map((modifier) => {
                        const isSelected = selectedModifiers.some((m) => m.id === modifier.id);
                        return (
                          <label
                            key={modifier.id}
                            className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleModifier(modifier)}
                                className="border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                              <span className="text-sm text-foreground">{modifier.name}</span>
                            </div>
                            {modifier.price_adjustment && modifier.price_adjustment > 0 && (
                              <span className="text-primary font-semibold text-sm">
                                +€{modifier.price_adjustment.toFixed(2)}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )
                ))}

                {/* Sides Dropdown */}
                {hasSides && (
                  <div className="space-y-2">
                    <h5 className="text-xs text-muted-foreground">Add a Side</h5>
                    <Select 
                      value={selectedSide || 'none'} 
                      onValueChange={handleSideChange}
                    >
                      <SelectTrigger className="w-full bg-secondary border-border hover:border-primary/50">
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

            {/* SECTION 2: Customize Ingredients */}
            {hasIngredients && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-heading text-xs uppercase tracking-wider text-muted-foreground">
                    Customize
                  </h4>
                  {(removedCount > 0 || extraCount > 0) && (
                    <div className="flex gap-1">
                      {removedCount > 0 && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          {removedCount} removed
                        </Badge>
                      )}
                      {extraCount > 0 && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-green-600">
                          {extraCount} extra
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="space-y-1.5">
                  {defaultIngredients.map((ingredient) => {
                    const state = ingredientStates[ingredient.id] || 'included';
                    const isRemoved = state === 'removed';
                    const isExtra = state === 'extra';
                    const isRemovable = ingredient.is_removable !== false;
                    const isAddable = ingredient.is_addable !== false;
                    const extraPrice = getExtraPrice(ingredient.name);
                    
                    return (
                      <div
                        key={ingredient.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                          isRemoved
                            ? 'border-destructive/50 bg-destructive/10'
                            : isExtra
                            ? 'border-green-500/50 bg-green-500/10'
                            : 'border-border bg-secondary/50'
                        }`}
                      >
                        {/* Ingredient Name & Price */}
                        <div className="flex-1">
                          <span className={`text-sm font-medium ${
                            isRemoved 
                              ? 'text-muted-foreground line-through' 
                              : isExtra
                              ? 'text-green-400'
                              : 'text-foreground'
                          }`}>
                            {isRemoved && 'No '}{isExtra && 'Extra '}{ingredient.name}
                          </span>
                          {/* Show price for extras */}
                          {isExtra && extraPrice > 0 && (
                            <span className="ml-2 text-xs text-green-400 font-semibold">
                              +€{extraPrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                        
                        {/* +/- Button Controls */}
                        <div className="flex items-center gap-1">
                          {/* Minus Button (Remove) */}
                          {isRemovable && (
                            <button
                              onClick={() => handleRemoveIngredient(ingredient.id)}
                              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                isRemoved 
                                  ? 'bg-destructive text-destructive-foreground' 
                                  : 'bg-background text-muted-foreground hover:bg-destructive/20 hover:text-destructive'
                              }`}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                          )}
                          
                          {/* Plus Button (Extra) */}
                          {isAddable && (
                            <button
                              onClick={() => handleAddExtra(ingredient.id)}
                              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                isExtra 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-background text-muted-foreground hover:bg-green-500/20 hover:text-green-400'
                              }`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Pricing Legend */}
                <div className="mt-3 flex gap-3 text-[10px] text-muted-foreground">
                  <span>🥩 Meat +€2.50</span>
                  <span>🧀 Cheese +€1.00</span>
                  <span>Others FREE</span>
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="mt-6">
              <h4 className="font-heading text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Quantity
              </h4>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-xl font-bold text-foreground w-8 text-center">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Add to Order Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-card via-card to-transparent pt-8">
          <Button
            onClick={handleAddToOrder}
            disabled={!product.is_available}
            className="w-full h-12 btn-glow text-base font-semibold tracking-wider"
          >
            SAVE TO ORDER - €{totalPrice.toFixed(2)}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
