/**
 * Dynamic pricing rules for ingredient extras
 * Used consistently across both Customer and Staff interfaces
 */

export const EXTRA_PRICING = {
  // Meat-related ingredients - €2.50 extra
  meatKeywords: ['patty', 'beef', 'chicken', 'bacon', 'chorizo', 'meat', 'fillet', 'sausage', 'ham'],
  meatPrice: 2.50,
  
  // Cheese-related ingredients - €1.00 extra
  cheeseKeywords: ['cheese', 'cheddar', 'american', 'applewood', 'mozzarella', 'gouda', 'swiss', 'brie', 'smoked applewood'],
  cheesePrice: 1.00,
  
  // Sauce add-ons - €1.50 extra (for ingredient extras, not dropdown)
  sauceKeywords: ['aioli', 'cheese sauce'],
  saucePrice: 1.50,
  
  // Default price for other extras
  defaultExtraPrice: 0.50,
  
  // Removals are always free
  removalPrice: 0,
};

/**
 * Get per-ingredient add-on price from the database.
 * Uses the ingredient's stored addon_price / addon_price_kids columns.
 * Falls back to €0.50 if fields are null.
 */
export function getIngredientAddonPrice(
  ingredient: { addon_price?: number | null; addon_price_kids?: number | null },
  productCategory: string
): number {
  if (productCategory === 'Kids Menu') {
    return ingredient.addon_price_kids ?? 0.50;
  }
  return ingredient.addon_price ?? 0.50;
}

/**
 * @deprecated Use getIngredientAddonPrice instead – kept only as a fallback.
 * Calculate the extra price for an ingredient based on its name
 */
export function getExtraPrice(ingredientName: string): number {
  const lowerName = ingredientName.toLowerCase();
  
  // Bacon is always €2.50
  if (lowerName.includes('bacon')) return 2.50;

  if (EXTRA_PRICING.meatKeywords.some(keyword => lowerName.includes(keyword))) {
    return EXTRA_PRICING.meatPrice;
  }
  if (EXTRA_PRICING.cheeseKeywords.some(keyword => lowerName.includes(keyword))) {
    return EXTRA_PRICING.cheesePrice;
  }
  if (EXTRA_PRICING.sauceKeywords.some(keyword => lowerName.includes(keyword))) {
    return EXTRA_PRICING.saucePrice;
  }
  return EXTRA_PRICING.defaultExtraPrice;
}

/**
 * Calculate total price contribution for a modifier, accounting for quantity.
 * Backward-compatible: modifiers without `quantity` default to 1.
 */
export function getModifierTotal(mod: { price_adjustment: number; quantity?: number }): number {
  return mod.price_adjustment * (mod.quantity || 1);
}

/**
 * Format price for display
 * @param price - Price in euros
 * @returns Formatted string like "+€2.50" or "FREE"
 */
export function formatExtraPrice(price: number): string {
  if (price <= 0) return 'FREE';
  return `+€${price.toFixed(2)}`;
}

// ── Loaded Fries pricing (Make It Epic) ──────────────────────────

export const LOADED_FRIES_STANDARD_PRICE = 6.50;
export const LOADED_FRIES_SPECIALS_PRICE = 3.50;

/**
 * Category-based loaded fries pricing for "Make It Epic" upsell.
 * Specials get €3.50, all other categories get €6.50.
 */
export function getLoadedFriesPrice(category: string): number {
  return category === 'Specials' ? LOADED_FRIES_SPECIALS_PRICE : LOADED_FRIES_STANDARD_PRICE;
}

// ── Fries sizing ("Make it Large") ───────────────────────────────

/**
 * Whether a product supports the "Make it Large" upsell.
 * Requires Fries category AND a valid fries_large_price.
 */
export function hasFriesLargeOption(product: { fries_large_price?: number | null; category: string }): boolean {
  return product.category === 'Fries' && product.fries_large_price != null && product.fries_large_price > 0;
}

/**
 * Returns the large price if available, null otherwise.
 */
export function getFriesLargePrice(product: { fries_large_price?: number | null }): number | null {
  return product.fries_large_price ?? null;
}

/**
 * Returns upgrade delta (large - small) rounded to 2 decimals.
 */
export function getFriesLargeUpgradeDelta(product: { fries_large_price?: number | null; price: number }): number {
  if (!product.fries_large_price) return 0;
  return Math.round((product.fries_large_price - product.price) * 100) / 100;
}

// ── Sauce dropdown pricing ──────────────────────────────────────

/**
 * Centralized sauce pricing for Make It Epic dropdown.
 * - Kids Menu: all sauces are FREE
 * - Ketchup / Mayo: €0.50
 * - All other sauces: €1.50
 */
export function getSaucePrice(sauceName: string, productCategory: string): number {
  if (productCategory === 'Kids Menu') return 0;
  const lower = sauceName.toLowerCase();
  if (lower.includes('ketchup') || lower.includes('mayo')) return 0.50;
  return 1.50;
}
