

# Plan: Delivery Modal + Bacon Price Fix + Capri Sun Verification

## Part 1 — Delivery Options Modal

**New file: `src/components/customer/DeliveryOptionsModal.tsx`**
- Dialog with two large CTA buttons: Just Eat (orange) and Deliveroo (purple)
- Both open in new tabs with `target="_blank"` and `rel="noopener noreferrer"`
- Dark theme, mobile-first, 52px min button height, fade+scale animation
- Subtitle: "Choose your preferred delivery partner"
- ExternalLink icons on both buttons

**Edit: `src/components/customer/HeroSection.tsx`**
- Replace direct `window.open` on the Delivery button with `setIsDeliveryModalOpen(true)`
- Import and render `DeliveryOptionsModal`
- Change button label from "DELIVERY (Just Eat)" to "DELIVERY"

## Part 2 — Bacon Price = €2.00 Everywhere

**Edit: `src/lib/pricingRules.ts`**
- Add a bacon-specific check **before** the general meat check in `getExtraPrice()`:
  ```typescript
  // Bacon is always €2.00 (overrides general meat price)
  if (lowerName.includes('bacon')) return 2.00;
  ```
- This ensures ingredient extras priced via `getExtraPrice` charge €2.00 for bacon instead of €2.50

**Already correct:**
- `STANDALONE_ADDONS` in both ProductSheet and StaffProductSheet already has Bacon at €2.00
- Only the `getExtraPrice` path (ingredient-based extras) was wrong at €2.50

## Part 3 — Capri Sun (Kids Only)

**Already correct — no changes needed.**
- Capri Sun is in `KIDS_MENU_ADDONS`, which only renders when `product.category === 'Kids Menu'`
- The drinks dropdown fetches from the DB `Drinks` category, which does not include Capri Sun
- Capri Sun never appears for adult items

## Files Changed

| File | Change |
|------|--------|
| `src/components/customer/DeliveryOptionsModal.tsx` | New — modal with Just Eat + Deliveroo buttons |
| `src/components/customer/HeroSection.tsx` | Swap direct link for modal trigger |
| `src/lib/pricingRules.ts` | Add bacon-specific €2.00 override before meat check |

