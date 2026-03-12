

# Plan: Fix Sauce Pricing + Add Bacon/Cheese to Fries

## Root Cause

**Sauce pricing**: `lookupPrice` does case-insensitive matching, but the product names and ingredient names are entirely different strings:

| Product name (sauce dropdown) | Ingredient name (DB) | Match? |
|---|---|---|
| Garlic Aioli | Garlic aioli | Yes (case-insensitive) |
| Burger Sauce | Burger sauce | Yes |
| **Jerk Mayonnaise** | Jerk mayo | **No** |
| **Mojo Picon Sauce** | Mojo picón sauce | **No** (accent) |
| **BBQ Sauce** | Chipotle BBQ sauce | **No** |
| **Chipotle Mayo** | Chipotle BBQ sauce | **No** |

Failed lookups fall back to €0.50. The fix is an alias map in the lookup hook, plus changing fallback to €0.

**Fries missing Bacon/Cheese**: The Fries "Make It Epic" section (lines 686-734 in ProductSheet, 655-703 in StaffProductSheet) only has "Make it Large" + drink dropdown. No standalone addon checkboxes exist for Fries.

## Changes

### 1. `src/hooks/useIngredientPriceLookup.ts`

- Add `INGREDIENT_ALIASES` map bridging product→ingredient names
- Apply alias resolution before case-insensitive search in both `lookupPrice` and `isInStock`
- Change fallback from `0.50` to `0`

```
const INGREDIENT_ALIASES: Record<string, string> = {
  "jerk mayonnaise": "jerk mayo",
  "mojo picon sauce": "mojo picón sauce",
  "bbq sauce": "chipotle bbq sauce",
  "chipotle mayo": "chipotle bbq sauce",
  "curry mayonnaise": "curry mayo",
  "hot sauce": "hot sauce",
  "ranch": "ranch",
};
```

Lookup flow: `name → lowercase → check alias map → search ingredients`

### 2. `src/components/customer/ProductSheet.tsx` — Add Bacon/Cheese to Fries Make It Epic

Inside the `showFriesMakeItEpic` section (after the drink dropdown, before the closing `</div>`), add a `FRIES_ADDONS` config and render checkbox rows for Bacon and Cheese using the same pattern as `STANDALONE_ADDONS`:

```ts
const FRIES_ADDONS = [
  { id: 'bacon', name: 'Bacon', dbName: 'Bacon' },
  { id: 'cheese', name: 'Cheese', dbName: 'Cheese' },
];
```

Each renders as a checkbox with price from `lookupPrice(addon.dbName, product.category)` and respects `isInStock(addon.dbName)`. Uses existing `standaloneAddons` state set + `toggleStandaloneAddon` handler.

### 3. `src/components/staff/StaffProductSheet.tsx` — Same Fries addon addition

Mirror the exact same `FRIES_ADDONS` checkboxes in the staff Fries Make It Epic section.

## Files Changed

| File | Change |
|---|---|
| `src/hooks/useIngredientPriceLookup.ts` | Add alias map, change fallback to €0 |
| `src/components/customer/ProductSheet.tsx` | Add Bacon/Cheese checkboxes in Fries Make It Epic |
| `src/components/staff/StaffProductSheet.tsx` | Same |

## No database changes needed

Bacon is €2.00, Cheese is €1.00, all sauces are €1.50 in the ingredients table already.

