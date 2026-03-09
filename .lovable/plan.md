

# Plan: Enhance Ingredient Price Manager with Batch Save, Dirty Tracking & Cache Sync

## What's Actually Wrong

The current `IngredientPriceManager` **does persist** changes via debounced auto-save on blur, but has these gaps:

1. **No explicit Save/Reset UI** — staff can't see what's changed or batch-save
2. **No dirty state tracking** — no visual indicator of unsaved changes
3. **No validation feedback** — negative/invalid prices silently ignored
4. **Stale cache after save** — `useAllIngredients` has 5-min `staleTime`, so other components (ProductSheet, StaffProductSheet) won't reflect price changes until cache expires
5. **No cross-query invalidation** — saving doesn't invalidate `product-ingredients` queries used by customization UIs

## Changes

### 1. Refactor `IngredientPriceManager.tsx` — Add batch save with dirty tracking

- Replace auto-save-on-blur with controlled state: track `editedValues` map of `{[id]: {addon_price, addon_price_kids, name, ingredient_type}}`
- Track dirty rows via comparison to original data
- Add "Save Changes" button (disabled when no dirty rows) and "Reset" button
- Show dirty count badge ("3 unsaved changes")
- Validate prices on save: must be numeric, >= 0, normalized to 2 decimals
- On save: batch update only changed rows, show spinner, success/error toast
- After save: invalidate `all-ingredients`, `product-ingredients`, and `products` queries via `useQueryClient`
- Keep the existing collapsible UI structure and dark theme

### 2. Update `useIngredients.ts` — Reduce staleTime

- Change `useAllIngredients` staleTime from 5 minutes to 30 seconds so price changes propagate faster across components

### 3. No other files need changes

- `useIngredientPriceLookup` already correctly uses `useAllIngredients` 
- `ProductSheet` and `StaffProductSheet` already use `lookupPrice()` from the hook
- `pricingRules.ts` already has `getIngredientAddonPrice()` as the single helper
- No hardcoded prices remain in Make It Epic sections

## Files Changed

| File | Change |
|------|--------|
| `src/components/staff/IngredientPriceManager.tsx` | Add batch save/reset, dirty tracking, validation, query invalidation |
| `src/hooks/useIngredients.ts` | Reduce staleTime to 30s for faster propagation |

