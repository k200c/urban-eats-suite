import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Minus, Plus, X, Flame } from 'lucide-react';
import { Product, Modifier, SelectedModifier, RemovedIngredient } from '@/types/database';
import { ModifierGroupWithModifiers } from '@/hooks/useProductModifiers';
import { ProductIngredientWithDetails } from '@/hooks/useProductIngredients';
import { useLoadedFries, useDrinks, useSauces } from '@/hooks/useProductsByCategory';
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

// Standalone add-on items with fixed prices
const STANDALONE_ADDONS = [
  { id: 'extra-chicken', name: 'Extra Chicken', price: 2.00 },
  { id: 'smoked-applewood', name: 'Smoked Applewood Cheese', price: 1.50 },
  { id: 'handcut-chips', name: 'Handcut Chips', price: 3.00 },
];

export function ProductSheet({ product, modifierGroups, ingredients, onClose }: ProductSheetProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([]);
  const [ingredientStates, setIngredientStates] = useState<Record<string, IngredientState>>({});
  const [standaloneAddons, setStandaloneAddons] = useState<Set<string>>(new Set());
  const [selectedLoadedFries, setSelectedLoadedFries] = useState<string | null>(null);
  const [selectedDrink, setSelectedDrink] = useState<string | null>(null);
  const [selectedSauce, setSelectedSauce] = useState<string | null>(null);
  
  const addItem = useCartStore((state) => state.addItem);

  // Fetch dynamic products for dropdowns
  const { data: loadedFriesProducts } = useLoadedFries();
  const { data: drinksProducts } = useDrinks();
  const { data: saucesProducts } = useSauces();

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setQuantity(1);
      setSelectedModifiers([]);
      setStandaloneAddons(new Set());
      setSelectedLoadedFries(null);
      setSelectedDrink(null);
      setSelectedSauce(null);
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

  // Visibility: Show "Make It Epic" for everything EXCEPT Fries and Drinks
  const showMakeItEpic = product.category !== 'Fries' && product.category !== 'Drinks' && product.category !== 'Sauces';

  const toggleStandaloneAddon = (addonId: string) => {
    setStandaloneAddons(prev => {
      const next = new Set(prev);
      if (next.has(addonId)) {
        next.delete(addonId);
      } else {
        next.add(addonId);
      }
      return next;
    });
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
        price_adjustment: getExtraPrice(ing.name)
      }));
  };

  // Build all modifiers for cart
  const buildAllModifiers = (): SelectedModifier[] => {
    const allMods: SelectedModifier[] = [...selectedModifiers, ...getExtraIngredients()];

    // Add standalone add-ons
    STANDALONE_ADDONS.forEach(addon => {
      if (standaloneAddons.has(addon.id)) {
        allMods.push({
          id: addon.id,
          name: addon.name,
          price_adjustment: addon.price,
        });
      }
    });

    // Add loaded fries selection
    if (selectedLoadedFries && loadedFriesProducts) {
      const fry = loadedFriesProducts.find(p => p.id === selectedLoadedFries);
      if (fry) {
        allMods.push({
          id: fry.id,
          name: `Side: ${fry.name}`,
          price_adjustment: fry.price,
        });
      }
    }

    // Add drink selection
    if (selectedDrink && drinksProducts) {
      const drink = drinksProducts.find(p => p.id === selectedDrink);
      if (drink) {
        allMods.push({
          id: drink.id,
          name: `Drink: ${drink.name}`,
          price_adjustment: drink.price,
        });
      }
    }

    // Add sauce selection
    if (selectedSauce && saucesProducts) {
      const sauce = saucesProducts.find(p => p.id === selectedSauce);
      if (sauce) {
        allMods.push({
          id: sauce.id,
          name: `Sauce: ${sauce.name}`,
          price_adjustment: sauce.price,
        });
      }
    }

    return allMods;
  };

  // Calculate total price
  const standaloneTotal = STANDALONE_ADDONS.filter(a => standaloneAddons.has(a.id)).reduce((sum, a) => sum + a.price, 0);
  const extrasTotal = getExtraIngredients().reduce((sum, e) => sum + e.price_adjustment, 0);
  const modifiersTotal = selectedModifiers.reduce((sum, m) => sum + m.price_adjustment, 0);
  const loadedFriesPrice = loadedFriesProducts?.find(p => p.id === selectedLoadedFries)?.price || 0;
  const drinkPrice = drinksProducts?.find(p => p.id === selectedDrink)?.price || 0;
  const saucePrice = saucesProducts?.find(p => p.id === selectedSauce)?.price || 0;
  
  const totalPrice = (product.price + standaloneTotal + extrasTotal + modifiersTotal + loadedFriesPrice + drinkPrice + saucePrice) * quantity;

  const handleAddToOrder = () => {
    const removedIngredients = getRemovedIngredients();
    const allModifiers = buildAllModifiers();
    
    addItem(product, quantity, allModifiers, removedIngredients);
    toast.success('Added to Cart', {
      description: `${quantity}x ${product.name} added to your order`,
    });
    onClose();
  };

  const defaultIngredients = ingredients?.filter((ing) => ing.is_default) || [];
  const removableIngredients = defaultIngredients.filter((ing) => ing.is_removable !== false);
  const hasIngredients = defaultIngredients.length > 0;

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

            {/* SECTION 1: Make it Epic (Premium Upsell Section) */}
            {showMakeItEpic && (
              <div className="mb-8 p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 relative overflow-hidden">
                {/* Decorative flame */}
                <div className="absolute top-3 right-3 text-primary/30">
                  <Flame className="w-12 h-12" />
                </div>
                
                <h4 className="font-heading text-lg uppercase tracking-wider text-primary flex items-center gap-2 mb-6">
                  <Flame className="w-5 h-5" />
                  Make it Epic
                </h4>

                {/* Standalone Add-on Checkboxes */}
                <div className="space-y-3 mb-6">
                  {STANDALONE_ADDONS.map((addon) => {
                    const isSelected = standaloneAddons.has(addon.id);
                    return (
                      <label
                        key={addon.id}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/15 shadow-sm shadow-primary/20'
                            : 'border-white/10 bg-white/5 hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleStandaloneAddon(addon.id)}
                            className="border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <span className="text-foreground font-medium">{addon.name}</span>
                        </div>
                        <span className="text-primary font-bold">
                          +€{addon.price.toFixed(2)}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Dropdown 1: Loaded Fries */}
                {loadedFriesProducts && loadedFriesProducts.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <label className="text-sm text-muted-foreground font-medium">
                      Add Small Loaded Fries
                    </label>
                    <Select 
                      value={selectedLoadedFries || 'none'} 
                      onValueChange={(v) => setSelectedLoadedFries(v === 'none' ? null : v)}
                    >
                      <SelectTrigger className="w-full bg-white/5 border-white/10 hover:border-primary/40">
                        <SelectValue placeholder="No Loaded Fries" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border z-50">
                        <SelectItem value="none">No Loaded Fries (€0.00)</SelectItem>
                        {loadedFriesProducts.map(fry => (
                          <SelectItem key={fry.id} value={fry.id}>
                            {fry.name} (+€{fry.price.toFixed(2)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Dropdown 2: Drinks */}
                {drinksProducts && drinksProducts.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <label className="text-sm text-muted-foreground font-medium">
                      Add a Drink
                    </label>
                    <Select 
                      value={selectedDrink || 'none'} 
                      onValueChange={(v) => setSelectedDrink(v === 'none' ? null : v)}
                    >
                      <SelectTrigger className="w-full bg-white/5 border-white/10 hover:border-primary/40">
                        <SelectValue placeholder="No Drink" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border z-50">
                        <SelectItem value="none">No Drink (€0.00)</SelectItem>
                        {drinksProducts.map(drink => (
                          <SelectItem key={drink.id} value={drink.id}>
                            {drink.name} (+€{drink.price.toFixed(2)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Dropdown 3: Sauces */}
                {saucesProducts && saucesProducts.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground font-medium">
                      Add a Sauce
                    </label>
                    <Select 
                      value={selectedSauce || 'none'} 
                      onValueChange={(v) => setSelectedSauce(v === 'none' ? null : v)}
                    >
                      <SelectTrigger className="w-full bg-white/5 border-white/10 hover:border-primary/40">
                        <SelectValue placeholder="No Sauce" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border z-50">
                        <SelectItem value="none">No Sauce (€0.00)</SelectItem>
                        {saucesProducts.map(sauce => (
                          <SelectItem key={sauce.id} value={sauce.id}>
                            {sauce.name} (+€{sauce.price.toFixed(2)})
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
                              onClick={() => handleRemoveIngredient(ingredient.id)}
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
                              onClick={() => handleAddExtra(ingredient.id)}
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
            className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/30"
            onClick={handleAddToOrder}
          >
            ADD TO ORDER · €{totalPrice.toFixed(2)}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
