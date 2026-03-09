import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Minus, Plus, X, Flame } from 'lucide-react';
import { Product, SelectedModifier, RemovedIngredient } from '@/types/database';
import { useProductModifiers } from '@/hooks/useProductModifiers';
import { useProductIngredients } from '@/hooks/useProductIngredients';
import { useLoadedFries, useDrinks, useSauces } from '@/hooks/useProductsByCategory';
import { useStaffCartStore } from '@/stores/staffCartStore';
import { getIngredientAddonPrice, getModifierTotal, getLoadedFriesPrice, hasFriesLargeOption, getFriesLargeUpgradeDelta } from '@/lib/pricingRules';
import { useIngredientPriceLookup } from '@/hooks/useIngredientPriceLookup';
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
  'Kids Menu': heroBurger,
};

interface StaffProductSheetProps {
  product: Product | null;
  onClose: () => void;
  editMode?: boolean;
  editIndex?: number;
  initialItem?: {
    quantity: number;
    selectedModifiers: SelectedModifier[];
    removedIngredients: RemovedIngredient[];
  };
}

type IngredientState = 'included' | 'removed' | 'extra';

// Standalone add-on items — prices resolved at render time via useIngredientPriceLookup
// dbName maps to the exact ingredient name in the database for accurate price lookup
const STANDALONE_ADDONS = [
  { id: 'bacon', name: 'Bacon', dbName: 'Bacon' },
  { id: 'extra-chicken', name: 'Extra Jerk Chicken', dbName: 'Jamaican jerk chicken' },
  { id: 'cheese', name: 'Cheese', dbName: 'Cheese' },
  { id: 'smoked-applewood', name: 'Smoked Applewood Cheese', dbName: 'Smoked applewood cheese' },
  { id: 'handcut-chips', name: 'Hand-Cut Chips', dbName: 'Hand-cut chips' },
];

// Beef Patty config for stepper — price resolved via lookupPrice
const BEEF_PATTY = { id: 'beef-patty', name: 'Beef Patty', dbName: 'Dry-aged beef patties', maxQty: 4 };

const KIDS_MENU_ADDONS = [
  { id: 'add-chips', name: 'Add Chips' },
  { id: 'capri-sun', name: 'Capri Sun' },
];

const BREAD_SWAP_FLATBREAD = {
  id: 'bread-swap-flatbread',
  name: 'Make it a Flatbread',
  kitchenLabel: 'FLATBREAD',
  price: 1.00,
};

export function StaffProductSheet({ 
  product, 
  onClose,
  editMode = false,
  editIndex,
  initialItem 
}: StaffProductSheetProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([]);
  const [ingredientStates, setIngredientStates] = useState<Record<string, IngredientState>>({});
  const [standaloneAddons, setStandaloneAddons] = useState<Set<string>>(new Set());
  const [beefPattyCount, setBeefPattyCount] = useState(0);
  const [selectedLoadedFries, setSelectedLoadedFries] = useState<string | null>(null);
  const [selectedDrink, setSelectedDrink] = useState<string | null>(null);
  const [selectedSauce, setSelectedSauce] = useState<string | null>(null);
  const [flatbreadSelected, setFlatbreadSelected] = useState(false);
  const [makeLargeSelected, setMakeLargeSelected] = useState(false);
  
  const addItem = useStaffCartStore((state) => state.addItem);
  const updateItem = useStaffCartStore((state) => state.updateItem);
  
  const { data: ingredients } = useProductIngredients(product?.id);
  const { data: modifierGroups } = useProductModifiers(product?.id);
  const { data: loadedFriesProducts } = useLoadedFries();
  const { data: drinksProducts } = useDrinks();
  const { data: saucesProducts } = useSauces();
  const { lookupPrice } = useIngredientPriceLookup();

  useEffect(() => {
    if (product) {
      // Reset "Make it Large"
      setMakeLargeSelected(false);

      if (editMode && initialItem) {
        setQuantity(initialItem.quantity);
        
        const addonIds = new Set<string>();
        let loadedFriesVal: string | null = null;
        let drink: string | null = null;
        let sauce: string | null = null;
        const otherMods: SelectedModifier[] = [];
        let hasFlatbread = false;
        let pattyCount = 0;
        let hasLarge = false;
        
        initialItem.selectedModifiers.forEach(mod => {
          if (mod.id === BEEF_PATTY.id || mod.name === BEEF_PATTY.name) {
            pattyCount = mod.quantity || 1;
          } else if ([...STANDALONE_ADDONS, ...KIDS_MENU_ADDONS].some(a => a.id === mod.id || a.name === mod.name)) {
            addonIds.add(mod.id);
          } else if (mod.modifier_type === 'loaded_fries_small') {
            loadedFriesVal = mod.id;
          } else if (mod.modifier_type === 'drink') {
            drink = mod.id;
          } else if (mod.modifier_type === 'sauce') {
            sauce = mod.id;
          } else if (mod.modifier_type === 'bread_swap') {
            hasFlatbread = true;
          } else if (mod.id === 'make-it-large') {
            hasLarge = true;
          } else {
            otherMods.push(mod);
          }
        });
        
        setBeefPattyCount(pattyCount);
        setMakeLargeSelected(hasLarge);
        setFlatbreadSelected(hasFlatbread);
        setStandaloneAddons(addonIds);
        setSelectedLoadedFries(loadedFriesVal);
        setSelectedDrink(drink);
        setSelectedSauce(sauce);
        setSelectedModifiers(otherMods);
        
        const ingStates: Record<string, IngredientState> = {};
        ingredients?.forEach((ing) => {
          if (ing.is_default) {
            ingStates[ing.id] = 'included';
          }
        });
        
        initialItem.removedIngredients.forEach(ri => {
          const found = ingredients?.find(ing => ing.id === ri.id || ing.name === ri.name);
          if (found) {
            ingStates[found.id] = 'removed';
          }
        });
        
        initialItem.selectedModifiers.forEach(mod => {
          if (mod.modifier_type === 'extra') {
            const found = ingredients?.find(ing => 
              mod.name.includes(ing.name) || ing.id === mod.id
            );
            if (found) {
              ingStates[found.id] = 'extra';
            }
          }
        });
        
        setIngredientStates(ingStates);
      } else {
        setQuantity(1);
        setSelectedModifiers([]);
        setStandaloneAddons(new Set());
        setBeefPattyCount(0);
        setSelectedLoadedFries(null);
        setSelectedDrink(null);
        setSelectedSauce(null);
        setFlatbreadSelected(false);
        const initStates: Record<string, IngredientState> = {};
        ingredients?.forEach((ing) => {
          if (ing.is_default) {
            initStates[ing.id] = 'included';
          }
        });
        setIngredientStates(initStates);
      }
    }
  }, [product?.id, ingredients, editMode, initialItem]);

  if (!product) return null;

  const imageUrl = product.image_url || categoryImages[product.category] || heroBurger;
  const isKidsMenu = product.category === 'Kids Menu';
  const currentAddons = isKidsMenu ? KIDS_MENU_ADDONS : STANDALONE_ADDONS;
  const loadedFriesPrice = getLoadedFriesPrice(product.category);

  const showMakeItEpic = product.category !== 'Fries' && product.category !== 'Drinks' && product.category !== 'Sauces';
  const showFriesMakeItEpic = product.category === 'Fries';
  const showDropdowns = !isKidsMenu;
  const showFlatbreadOption = product.category === 'Burgers' || product.category === 'Specials';
  const showBeefPattyStepper = showMakeItEpic && !isKidsMenu && product.category !== 'Flatbreads';

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
        name: ing.is_addable && !ing.is_default ? ing.name : `Extra ${ing.name}`,
        price_adjustment: getIngredientAddonPrice(ing, product.category),
        modifier_type: 'extra' as const,
      }));
  };

  const buildAllModifiers = (): SelectedModifier[] => {
    const allMods: SelectedModifier[] = [...selectedModifiers, ...getExtraIngredients()];

    currentAddons.forEach(addon => {
      if (standaloneAddons.has(addon.id)) {
        allMods.push({
          id: addon.id,
          name: addon.name,
          price_adjustment: lookupPrice(addon.dbName || addon.name, product.category),
          modifier_type: 'addon',
        });
      }
    });

    // Add beef patty with quantity
    if (beefPattyCount > 0) {
      allMods.push({
        id: BEEF_PATTY.id,
        name: BEEF_PATTY.name,
        price_adjustment: lookupPrice(BEEF_PATTY.dbName, product.category),
        modifier_type: 'addon',
        quantity: beefPattyCount,
      });
    }

    if (selectedLoadedFries && loadedFriesProducts) {
      const fry = loadedFriesProducts.find(p => p.id === selectedLoadedFries);
      if (fry) {
        allMods.push({
          id: fry.id,
          name: `Side: ${fry.name} (Small)`,
          price_adjustment: loadedFriesPrice,
          modifier_type: 'loaded_fries_small',
        });
      }
    }

    if (selectedDrink && drinksProducts) {
      const drink = drinksProducts.find(p => p.id === selectedDrink);
      if (drink) {
        allMods.push({
          id: drink.id,
          name: `Drink: ${drink.name}`,
          price_adjustment: drink.price,
          modifier_type: 'drink',
        });
      }
    }

    if (selectedSauce && saucesProducts) {
      const sauce = saucesProducts.find(p => p.id === selectedSauce);
      if (sauce) {
        allMods.push({
          id: sauce.id,
          name: `Sauce: ${sauce.name}`,
          price_adjustment: lookupPrice(sauce.name, product.category),
          modifier_type: 'sauce',
        });
      }
    }

    if (flatbreadSelected) {
      allMods.push({
        id: BREAD_SWAP_FLATBREAD.id,
        name: BREAD_SWAP_FLATBREAD.name,
        price_adjustment: BREAD_SWAP_FLATBREAD.price,
        modifier_type: 'bread_swap',
      });
    }

    // Add "Make it Large" for fries
    if (makeLargeSelected && hasFriesLargeOption(product)) {
      allMods.push({
        id: 'make-it-large',
        name: 'Make it Large',
        price_adjustment: getFriesLargeUpgradeDelta(product),
        modifier_type: 'addon',
      });
    }

    return allMods;
  };

  const currentAddonsTotal = currentAddons.filter(a => standaloneAddons.has(a.id)).reduce((sum, a) => sum + lookupPrice(a.name, product.category), 0);
  const beefPattyTotal = beefPattyCount * lookupPrice(BEEF_PATTY.name, product.category);
  const extrasTotal = getExtraIngredients().reduce((sum, e) => sum + e.price_adjustment, 0);
  const modifiersTotal = selectedModifiers.reduce((sum, m) => sum + getModifierTotal(m), 0);
  const loadedFriesCalcPrice = (selectedLoadedFries && !isKidsMenu) ? loadedFriesPrice : 0;
  const drinkPrice = (!isKidsMenu && drinksProducts?.find(p => p.id === selectedDrink)?.price) || 0;
  const selectedSauceProduct = saucesProducts?.find(p => p.id === selectedSauce);
  const saucePrice = selectedSauceProduct ? lookupPrice(selectedSauceProduct.name, product.category) : 0;
  const flatbreadPrice = flatbreadSelected ? BREAD_SWAP_FLATBREAD.price : 0;
  const makeLargeTotal = makeLargeSelected ? getFriesLargeUpgradeDelta(product) : 0;
  
  const totalPrice = (product.price + currentAddonsTotal + beefPattyTotal + extrasTotal + modifiersTotal + loadedFriesCalcPrice + drinkPrice + saucePrice + flatbreadPrice + makeLargeTotal) * quantity;

  const handleAddToOrder = () => {
    const removedIngredients = getRemovedIngredients();
    const allModifiers = buildAllModifiers();
    
    if (editMode && editIndex !== undefined) {
      updateItem(editIndex, product, quantity, allModifiers, removedIngredients);
      toast.success('Updated Order', {
        description: `${product.name} updated`,
        duration: 1500,
      });
    } else {
      addItem(product, quantity, allModifiers, removedIngredients);
      toast.success('Added to Order', {
        description: `${quantity}x ${product.name} added`,
        duration: 1500,
      });
    }
    onClose();
  };

  const defaultIngredients = ingredients?.filter((ing) => ing.is_default) || [];
  const addableOnlyIngredients = ingredients?.filter((ing) => ing.is_addable && !ing.is_default) || [];
  const hasIngredients = defaultIngredients.length > 0;
  const hasAddableIngredients = addableOnlyIngredients.length > 0;
  const showFriesCustomization = product.category === 'Fries' && hasAddableIngredients;

  const removedCount = Object.values(ingredientStates).filter(s => s === 'removed').length;
  const extraCount = Object.values(ingredientStates).filter(s => s === 'extra').length;

  return (
    <Sheet open={!!product} onOpenChange={() => onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md bg-gradient-to-b from-card to-background border-l border-border p-0 overflow-hidden"
      >
        <button
          onClick={onClose}
          className="absolute right-4 z-10 w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
          style={{ top: 'max(16px, env(safe-area-inset-top, 16px))' }}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="h-full overflow-y-auto pb-32" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          {/* Product Image */}
          <div className="relative h-40">
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
            <div className="absolute bottom-3 left-4">
              <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold">
                €{product.price.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="p-4">
            <SheetHeader className="text-left mb-4">
              <SheetTitle className="font-heading text-xl text-foreground">
                {product.name}
              </SheetTitle>
              {product.description && (
                <p className="text-muted-foreground text-sm mt-1">{product.description}</p>
              )}
            </SheetHeader>

            {/* SECTION 1: Make it Epic */}
            {showMakeItEpic && (
              <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 relative overflow-hidden">
                <div className="absolute top-2 right-2 text-primary/30">
                  <Flame className="w-8 h-8" />
                </div>
                
                <h4 className="font-heading text-sm uppercase tracking-wider text-primary flex items-center gap-2 mb-4">
                  <Flame className="w-4 h-4" />
                  Make it Epic
                </h4>

                {/* Beef Patty Stepper (0-4) */}
                {showBeefPattyStepper && (
                  <div className={`flex items-center justify-between p-3.5 rounded-lg border mb-2 transition-all ${
                    beefPattyCount > 0
                      ? 'border-primary bg-primary/15 shadow-sm shadow-primary/20'
                      : 'border-border bg-secondary/30'
                  }`}>
                    <span className="text-sm text-foreground font-medium">{BEEF_PATTY.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setBeefPattyCount(Math.max(0, beefPattyCount - 1))}
                          disabled={beefPattyCount === 0}
                          className="w-7 h-7 rounded-full bg-background flex items-center justify-center hover:bg-secondary/80 transition-colors disabled:opacity-30"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-5 text-center font-bold text-foreground text-sm">{beefPattyCount}</span>
                        <button
                          onClick={() => setBeefPattyCount(Math.min(BEEF_PATTY.maxQty, beefPattyCount + 1))}
                          disabled={beefPattyCount >= BEEF_PATTY.maxQty}
                          className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-30"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-primary font-bold text-sm min-w-[60px] text-right">
                        {beefPattyCount > 0 ? `+€${(beefPattyCount * lookupPrice(BEEF_PATTY.name, product.category)).toFixed(2)}` : `€${lookupPrice(BEEF_PATTY.name, product.category).toFixed(2)}/ea`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Standalone Add-on Checkboxes */}
                <div className="space-y-2 mb-4">
                  {currentAddons.map((addon) => {
                    const isSelected = standaloneAddons.has(addon.id);
                    return (
                      <label
                        key={addon.id}
                        className={`flex items-center justify-between p-3.5 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/15 shadow-sm shadow-primary/20'
                            : 'border-border bg-secondary/30 hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleStandaloneAddon(addon.id)}
                            className="border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <span className="text-sm text-foreground font-medium">{addon.name}</span>
                        </div>
                        <span className="text-primary font-bold text-sm">
                          +€{lookupPrice(addon.name, product.category).toFixed(2)}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Dropdowns - only shown for non-Kids Menu items */}
                {showDropdowns && (
                  <>
                {loadedFriesProducts && loadedFriesProducts.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    <label className="text-xs text-muted-foreground font-medium">
                      {product.category === 'Specials' ? 'Upgrade to Loaded Fries' : 'Add Small Loaded Fries'}
                    </label>
                    <Select 
                      value={selectedLoadedFries || 'none'} 
                      onValueChange={(v) => setSelectedLoadedFries(v === 'none' ? null : v)}
                    >
                      <SelectTrigger className="w-full bg-secondary/50 border-border hover:border-primary/40">
                        <SelectValue placeholder="No Loaded Fries" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border z-50">
                        <SelectItem value="none">No Loaded Fries (€0.00)</SelectItem>
                        {loadedFriesProducts.map(fry => (
                          <SelectItem key={fry.id} value={fry.id}>
                            {fry.name} (+€{loadedFriesPrice.toFixed(2)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Dropdown 2: Drinks */}
                {drinksProducts && drinksProducts.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    <label className="text-xs text-muted-foreground font-medium">
                      Add a Drink
                    </label>
                    <Select 
                      value={selectedDrink || 'none'} 
                      onValueChange={(v) => setSelectedDrink(v === 'none' ? null : v)}
                    >
                      <SelectTrigger className="w-full bg-secondary/50 border-border hover:border-primary/40">
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
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium">
                      Add a Sauce
                    </label>
                    <Select 
                      value={selectedSauce || 'none'} 
                      onValueChange={(v) => setSelectedSauce(v === 'none' ? null : v)}
                    >
                      <SelectTrigger className="w-full bg-secondary/50 border-border hover:border-primary/40">
                        <SelectValue placeholder="No Sauce" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border z-50">
                        <SelectItem value="none">No Sauce (€0.00)</SelectItem>
                        {saucesProducts.map(sauce => (
                          <SelectItem key={sauce.id} value={sauce.id}>
                            {sauce.name} (+€{lookupPrice(sauce.name, product.category).toFixed(2)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                </Select>
                  </div>
                )}
                </>
              )}

                {/* Bread Swap Option - Only for Burgers & Specials */}
                {showFlatbreadOption && (
                  <div className="mt-3 pt-3 border-t border-border/30">
                    <label
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                        flatbreadSelected
                          ? 'border-amber-500 bg-amber-500/15 shadow-sm shadow-amber-500/20'
                          : 'border-border bg-secondary/30 hover:border-amber-500/40'
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={flatbreadSelected}
                            onCheckedChange={(checked) => setFlatbreadSelected(checked === true)}
                            className="border-amber-500/50 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                          />
                          <span className="text-sm text-foreground font-medium">Make it a Flatbread</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground ml-6">Replaces the standard bun</span>
                      </div>
                      <span className="text-amber-400 font-bold text-sm">+€1.00</span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* FRIES CUSTOMIZATION SECTION */}
            {showFriesCustomization && (
              <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 relative overflow-hidden">
                <h4 className="font-heading text-sm uppercase tracking-wider text-amber-400 flex items-center gap-2 mb-4">
                  🍟 Customize Your Fries
                </h4>

                <div className="space-y-2">
                  {addableOnlyIngredients.map((ingredient) => {
                    const isSelected = ingredientStates[ingredient.id] === 'extra';
                    const price = getIngredientAddonPrice(ingredient, product.category);
                    
                    return (
                      <label
                        key={ingredient.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/15 shadow-sm shadow-amber-500/20'
                            : 'border-border bg-secondary/30 hover:border-amber-500/40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleAddExtra(ingredient.id)}
                            className="border-amber-500/50 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                          />
                          <span className="text-sm text-foreground font-medium">{ingredient.name}</span>
                        </div>
                        <span className="text-amber-400 font-bold text-sm">
                          +€{price.toFixed(2)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* FRIES MAKE IT EPIC - "Make it Large" + Drink upsell */}
            {showFriesMakeItEpic && (
              <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 relative overflow-hidden">
                <div className="absolute top-2 right-2 text-primary/30">
                  <Flame className="w-8 h-8" />
                </div>
                
                <h4 className="font-heading text-sm uppercase tracking-wider text-primary flex items-center gap-2 mb-4">
                  <Flame className="w-4 h-4" />
                  Make it Epic
                </h4>

                {/* Make it Large checkbox */}
                {hasFriesLargeOption(product) && (
                  <label className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all mb-4 ${
                    makeLargeSelected ? 'border-primary bg-primary/15' : 'border-border bg-secondary/30'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={makeLargeSelected} onCheckedChange={(v) => setMakeLargeSelected(v === true)} />
                      <span className="text-sm text-foreground font-medium">Make it Large</span>
                    </div>
                    <span className="text-primary font-bold text-sm">
                      +€{getFriesLargeUpgradeDelta(product).toFixed(2)}
                    </span>
                  </label>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">
                    Add a Drink
                  </label>
                  <Select 
                    value={selectedDrink || 'none'} 
                    onValueChange={(v) => setSelectedDrink(v === 'none' ? null : v)}
                  >
                    <SelectTrigger className="w-full bg-secondary/50 border-border hover:border-primary/40">
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
                    const extraPrice = getIngredientAddonPrice(ingredient, product.category);
                    
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
                          {isExtra && extraPrice > 0 && (
                            <span className="ml-2 text-xs text-green-400 font-semibold">
                              +€{extraPrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {isRemovable && (
                            <button
                              onClick={() => handleRemoveIngredient(ingredient.id)}
                              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                                isRemoved 
                                  ? 'bg-destructive text-destructive-foreground' 
                                  : 'bg-background text-muted-foreground hover:bg-destructive/20 hover:text-destructive'
                              }`}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                          )}
                          
                          {isAddable && (
                            <button
                              onClick={() => handleAddExtra(ingredient.id)}
                              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
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
                <div className="mt-3 text-[10px] text-muted-foreground">
                  <span>Prices shown per ingredient</span>
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
                  className="h-11 w-11"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-xl font-bold text-foreground w-10 text-center">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Add to Order Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-card via-card/95 to-transparent pt-8">
          <Button
            className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl pos-control"
            onClick={handleAddToOrder}
          >
            {editMode ? 'UPDATE ORDER' : 'SAVE TO ORDER'} · €{totalPrice.toFixed(2)}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
