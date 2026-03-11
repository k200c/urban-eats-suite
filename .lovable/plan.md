

# Plan: Complete Make It Epic DB-Driven Pricing Audit

## Current State — Already Well-Architected

After thorough audit, the Make It Epic pricing system is **already DB-driven**. Both `ProductSheet.tsx` and `StaffProductSheet.tsx` use `useIngredientPriceLookup` with `dbName` mappings to resolve all addon prices from the `ingredients` table. No hardcoded addon prices remain for Make It Epic items.

### What's already working correctly:
- Standalone addons (Bacon, Cheese, etc.) → `lookupPrice(addon.dbName, category)`
- Beef Patty stepper → `lookupPrice(BEEF_PATTY.dbName, category)`
- Sauce dropdown → `lookupPrice(sauce.name, category)`
- Extra ingredients → `getIngredientAddonPrice(ing, category)` from DB data
- Ingredient Price Manager → batch saves with multi-query invalidation
- Cache propagation → 30s staleTime on `useAllIngredients`

### Remaining hardcoded prices (intentional, not ingredient-based):
- `BREAD_SWAP_FLATBREAD.price = 1.00` — This is a bread swap modifier, not an ingredient addon. Intentional fixed price.
- `StaffPOS.tsx` bundle prices (€12.99, €24.99) — combo deal pricing, unrelated to ingredients.
- Loaded Fries pricing (€3.50/€6.50) — category-based upsell pricing from `pricingRules.ts`, not ingredient-level.
- Drink prices — pulled from `products.price` column, correct behavior.

### Minor cleanup opportunities:

1. **Remove deprecated `getExtraPrice()` and `EXTRA_PRICING`** from `pricingRules.ts` — dead code that could cause confusion.
2. **Remove the `getSaucePrice()` comment** — the removal note is unnecessary now.

## Changes

### 1. `src/lib/pricingRules.ts` — Remove dead code

Remove the deprecated `EXTRA_PRICING` constant, `getExtraPrice()` function, and the orphaned comment about `getSaucePrice()`. These are never called but create confusion about whether hardcoded prices still exist.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/pricingRules.ts` | Remove deprecated `EXTRA_PRICING`, `getExtraPrice()`, and `getSaucePrice` comment |

## Source of Truth Model (Post-Refactor)

```text
ingredients.addon_price / addon_price_kids
        ↓
useAllIngredients() hook (30s staleTime)
        ↓
useIngredientPriceLookup() → lookupPrice(dbName, category)
        ↓
ProductSheet / StaffProductSheet / buildAllModifiers()
        ↓
Order totals (calculated at add-to-cart time)
```

## Cache Refresh Flow

1. Staff edits prices in `IngredientPriceManager` → batch save to Supabase
2. On save success: invalidates `all-ingredients`, `product-ingredients`, `product-ingredients-admin`, `products`
3. `useAllIngredients` refetches → `useIngredientPriceLookup` returns new prices
4. All ProductSheet/StaffProductSheet renders pick up new prices immediately

## Technical Debt Flagged

- **Name-based matching**: `lookupPrice` matches by ingredient name (case-insensitive). If a DB ingredient is renamed, the `dbName` mapping in the addon config breaks silently (falls back to €0.50). Consider adding a dev-mode warning when a `dbName` lookup misses.
- **Voice ordering**: The `create-voice-order` edge function resolves items by product name/price only — it does not handle ingredient-level addon customization. This is a known limitation, not a pricing drift issue.

