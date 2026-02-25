

# Fries Sizing System: "Make it Large" Upsell in Make It Epic

## Summary

Replace the current Small/Large toggle (which swaps entire products) with a "Make it Large" checkbox inside the Make It Epic section. This requires a DB migration to add `fries_large_price` to the products table, hiding Large variant products from the menu, and updating pricing/voice logic.

---

## Current State

- Fries exist as separate Small and Large products in the DB
- A Small/Large toggle in ProductSheet swaps between products using `productVariants.ts`
- Both Small and Large products appear in the menu
- Voice ordering maps "large fries" directly to the Large product

## New Behavior

- Menu shows only the Small fries product (at small price)
- Large variant products are hidden from customer menu (`is_available = false`)
- When opening a fries product that has a `fries_large_price`, a "Make it Large" checkbox appears in Make It Epic
- Selecting it adds a modifier: `{ name: "Make it Large", price_adjustment: delta, modifier_type: "addon" }`
- Voice ordering resolves "large fries" to the Small product + "Make it Large" modifier

---

## Database Migration

```sql
-- Add fries_large_price column
ALTER TABLE products ADD COLUMN IF NOT EXISTS fries_large_price numeric DEFAULT NULL;
```

Then data updates (via insert tool, not migration):
```sql
-- Set large prices on small variant products
UPDATE products SET fries_large_price = 9.00 WHERE id = 'fc7e55cf-e01d-4c3f-a51d-2a09024774d8'; -- Small Truffle Parmesan Fries
UPDATE products SET fries_large_price = 9.00 WHERE id = 'd81357ed-6ef5-42fe-9e77-4161406758c4'; -- Truffle Parmesan Fries (alias)
UPDATE products SET fries_large_price = 11.50 WHERE id = '50ba3f2f-b10f-4338-83df-25e726d1f771'; -- Small Sloppy Fries

-- Hide Large variant products from customer menu
UPDATE products SET is_available = false WHERE id IN (
  'db58a98d-e755-4f42-8606-62c282881d22', -- Large Truffle Parmesan Fries
  'd4c8f458-23f1-4f40-865a-12d5687ffa18'  -- Sloppy Jose Fries (Large)
);
```

---

## File-by-File Changes

### 1. `src/types/database.ts` — Add `fries_large_price` to Product interface

Add optional field:
```typescript
fries_large_price?: number | null;
```

### 2. `src/lib/pricingRules.ts` — Add fries sizing helpers

```typescript
// Returns the large price if available, null otherwise
export function getFriesLargePrice(product: { fries_large_price?: number | null }): number | null {
  return product.fries_large_price ?? null;
}

// Returns upgrade delta rounded to 2 decimals
export function getFriesLargeUpgradeDelta(product: { fries_large_price?: number | null; price: number }): number {
  if (!product.fries_large_price) return 0;
  return Math.round((product.fries_large_price - product.price) * 100) / 100;
}

// Whether a product supports "Make it Large"
export function hasFriesLargeOption(product: { fries_large_price?: number | null; category: string }): boolean {
  return product.category === 'Fries' && product.fries_large_price != null && product.fries_large_price > 0;
}
```

### 3. `src/lib/productVariants.ts` — Simplify / keep for reference

Remove the Small/Large swap logic that drives the toggle UI. The file can be reduced to just export the large variant IDs (for potential future use), or removed entirely since the toggle is gone. The `isFriesProduct` function moves to pricingRules. The variant pair lookup is no longer needed by ProductSheet.

Keep it minimal — just export `LARGE_VARIANT_IDS` if needed for any filtering, or delete the file and remove imports.

### 4. `src/components/customer/ProductSheet.tsx` — Major changes

**Remove:**
- `selectedSize` state
- `friesVariantPair` / `activeProduct` derived state
- `allFriesProducts` query (`useProductsByCategory` for Fries)
- The Small/Large toggle UI block (lines 419-442)
- Import of `getFriesVariantPair`, `isSmallVariant`

**Add:**
- `makeLargeSelected` boolean state (default false)
- Import `hasFriesLargeOption`, `getFriesLargeUpgradeDelta` from pricingRules
- In the Fries Make It Epic section (`showFriesMakeItEpic`), add a "Make it Large" checkbox before the drink dropdown:
  ```tsx
  {hasFriesLargeOption(product) && (
    <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
      makeLargeSelected ? 'border-primary bg-primary/15' : 'border-white/10 bg-white/5'
    }`}>
      <div className="flex items-center gap-3">
        <Checkbox checked={makeLargeSelected} onCheckedChange={(v) => setMakeLargeSelected(v === true)} />
        <span className="text-foreground font-medium">Make it Large</span>
      </div>
      <span className="text-primary font-bold">
        +€{getFriesLargeUpgradeDelta(product).toFixed(2)}
      </span>
    </label>
  )}
  ```
- In `buildAllModifiers`: if `makeLargeSelected`, push modifier:
  ```typescript
  { id: 'make-it-large', name: 'Make it Large', price_adjustment: getFriesLargeUpgradeDelta(product), modifier_type: 'addon' }
  ```
- In total calc: add `makeLargeTotal = makeLargeSelected ? getFriesLargeUpgradeDelta(product) : 0`
- Replace all `activeProduct` references back to `product` (since no more variant swapping)
- In edit mode restoration, detect `mod.id === 'make-it-large'` to set `makeLargeSelected = true`

### 5. `src/components/staff/StaffProductSheet.tsx` — Mirror customer changes

Exact same modifications as ProductSheet:
- Remove variant toggle, add "Make it Large" checkbox in fries Make It Epic
- Same pricing logic using centralized helpers

### 6. `src/components/staff/AddProductDialog.tsx` — Add Large Price field for Fries

- Watch the `category` field value
- When category is `'Fries'`, show an additional form field:
  ```tsx
  <FormField name="fries_large_price" render={...}>
    <FormLabel>Large Price (€)</FormLabel>
    <Input type="number" step="0.01" placeholder="Leave empty if no large option" />
  </FormField>
  ```
- Update form schema to include `fries_large_price: z.number().optional().nullable()`
- Include `fries_large_price` in the insert payload

### 7. `supabase/functions/create-voice-order/index.ts` — Voice "large" handling

**Change approach**: Instead of mapping "large fries" to a separate Large product, resolve to the Small product and add a "Make it Large" modifier.

Update ALIAS_MAP:
```typescript
// Remove direct large product mappings
// "large fries": "large truffle parmesan fries",  ← REMOVE
// "large truffle fries": "large truffle parmesan fries", ← REMOVE
// "large sloppy fries": "sloppy jose fries", ← REMOVE

// Map large requests to small products (modifier added separately)
"large fries": "small truffle parmesan fries",
"large truffle fries": "small truffle parmesan fries",
"large sloppy fries": "small sloppy fries",
```

Add logic after product resolution: if the original spoken term contains "large" and the resolved product has `fries_large_price`, add a "Make it Large" modifier to the order item's `selected_modifiers` JSONB and adjust the total accordingly.

Implementation:
- After resolving the product, check if spoken name normalized includes "large"
- Query the product's `fries_large_price` (add to select fields)
- If large requested and `fries_large_price` exists:
  - `unit_price` stays as `product.price` (small price)
  - Add `selected_modifiers: [{ id: "make-it-large", name: "Make it Large", price_adjustment: fries_large_price - price, modifier_type: "addon" }]`
  - Adjust total computation to include modifier price

---

## Verification Checklist

| # | Check |
|---|-------|
| 1 | Truffle Parmesan Fries shows €6.00 on menu |
| 2 | Large Truffle Parmesan Fries NOT visible on menu |
| 3 | Opening Truffle Parmesan Fries shows "Make it Large" in Make It Epic |
| 4 | Selecting "Make it Large" shows +€3.00 and total becomes €9.00 |
| 5 | Sloppy Fries shows €6.50, "Make it Large" adds +€5.00 = €11.50 |
| 6 | Staff POS mirrors identical behavior |
| 7 | Handcut Chips (no fries_large_price) shows no "Make it Large" option |
| 8 | Cart/receipt shows "Make it Large +€X.XX" modifier line |
| 9 | Voice "large truffle fries" charges €9.00 total (€6.00 + €3.00 modifier) |
| 10 | AddProductDialog shows Large Price field when Fries category selected |
| 11 | No Small/Large toggle appears anywhere (old behavior removed) |
| 12 | No console errors, no regression for non-fries items |
| 13 | Existing historical orders with Large product references still render |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Setting Large products `is_available = false` hides them from menu but they remain in DB for historical orders | Order items store product_name in JSONB, so old orders display correctly |
| `fries_large_price` column not in auto-generated types | Add to local `Product` interface in `types/database.ts`; auto-gen types will catch up after migration |
| Voice orders for "large fries" previously created a separate product line item | Now creates small product line with modifier — different structure but same total price |

