import { useAllIngredients } from '@/hooks/useIngredients';
import { getIngredientAddonPrice } from '@/lib/pricingRules';

/**
 * Shared hook that fetches all ingredients and returns lookup functions.
 * Use this to resolve DB-driven addon prices and stock status by ingredient name.
 */
export function useIngredientPriceLookup() {
  const { data: allIngredients, isLoading } = useAllIngredients();

  /**
   * Look up addon price for an ingredient by name.
   * Falls back to €0.50 if ingredient not found in DB.
   */
  const lookupPrice = (name: string, productCategory: string): number => {
    if (!allIngredients) return 0.50;
    const ingredient = allIngredients.find(
      (ing) => ing.name.toLowerCase() === name.toLowerCase()
    );
    if (!ingredient) return 0.50;
    return getIngredientAddonPrice(ingredient, productCategory);
  };

  /**
   * Check if an ingredient is in stock by name.
   * Returns true if ingredient not found (safe fallback).
   */
  const isInStock = (name: string): boolean => {
    if (!allIngredients) return true;
    const ingredient = allIngredients.find(
      (ing) => ing.name.toLowerCase() === name.toLowerCase()
    );
    if (!ingredient) return true;
    return ingredient.in_stock !== false;
  };

  return { lookupPrice, isInStock, isLoading };
}
