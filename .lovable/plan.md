

# Plan: Unify Make It Epic Pricing with DB-Driven Ingredient Prices

## Problem

`STANDALONE_ADDONS` in both `ProductSheet.tsx` and `StaffProductSheet.tsx` has hardcoded prices (Bacon €2.00, Cheese €1.00, etc.) that don't match the DB (Bacon is €2.50 in `ingredients` table). The sauce dropdown uses `getSaucePrice()` keyword-based logic instead of DB prices.

## Changes

### 1. Create a shared hook: `src/hooks/useIngredientPriceLookup.ts`

Fetches all ingredients and returns a lookup function `getAddonPrice(name, category)` that finds the ingredient by name and calls `getIngredientAddonPrice()`. Falls back to €0.50 if not found.

### 2. Refactor `STANDALONE_ADDONS` to not include prices

Convert to price-less config arrays (just `id` and `name`). Resolve prices at render time via the lookup hook. Both `ProductSheet.tsx` and `StaffProductSheet.tsx` get the same treatment.

Bacon → DB returns €2.50. Cheese → DB returns whatever is set. Sauces in dropdown → use ingredient lookup by name instead of `getSaucePrice()`.

### 3. Update `ProductSheet.tsx`

- Import and call `useIngredientPriceLookup()`
- Remove hardcoded `price` from `STANDALONE_ADDONS` and `KIDS_MENU_ADDONS`
- Resolve addon prices dynamically: `const addonPrice = lookupPrice(addon.name, product.category)`
- Update `buildAllModifiers()` to use looked-up prices
- Update `currentAddonsTotal` calculation to use looked-up prices
- Replace `getSaucePrice()` in sauce dropdown with ingredient lookup

### 4. Update `StaffProductSheet.tsx`

Same changes as ProductSheet.

### 5. Clean up `pricingRules.ts`

- Remove `getSaucePrice()` function (replaced by DB lookup)
- Mark `getExtraPrice()` as deprecated with a comment (already not called anywhere)
- Remove `EXTRA_PRICING` constant (no longer used)

### 6. No database changes needed

The `ingredients` table already has correct pricing. Bacon = €2.50, sauces = €1.50, kids sauces = €0.00.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useIngredientPriceLookup.ts` | New — shared hook for name-based ingredient price lookup |
| `src/components/customer/ProductSheet.tsx` | Use DB prices for STANDALONE_ADDONS and sauce dropdown |
| `src/components/staff/StaffProductSheet.tsx` | Same |
| `src/lib/pricingRules.ts` | Remove `getSaucePrice()`, clean up legacy code |

