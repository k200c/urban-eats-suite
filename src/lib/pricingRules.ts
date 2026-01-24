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
  
  // Default price for other extras (currently free)
  defaultExtraPrice: 0,
  
  // Removals are always free
  removalPrice: 0,
};

/**
 * Calculate the extra price for an ingredient based on its name
 * @param ingredientName - Name of the ingredient
 * @returns Price adjustment for adding this ingredient as an extra
 */
export function getExtraPrice(ingredientName: string): number {
  const lowerName = ingredientName.toLowerCase();
  
  // Check for meat ingredients - €2.50
  if (EXTRA_PRICING.meatKeywords.some(keyword => lowerName.includes(keyword))) {
    return EXTRA_PRICING.meatPrice;
  }
  
  // Check for cheese ingredients - €1.00
  if (EXTRA_PRICING.cheeseKeywords.some(keyword => lowerName.includes(keyword))) {
    return EXTRA_PRICING.cheesePrice;
  }
  
  // Other extras are free (or use defaultExtraPrice if needed)
  return EXTRA_PRICING.defaultExtraPrice;
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
