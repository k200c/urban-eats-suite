

# Fix Mobile Product Details Bug + Harden Mobile UX + Menu Option Changes

## Root Cause Analysis

### Android Product Details Glitch
The `ProductSheet` uses a Radix UI Sheet (`@radix-ui/react-dialog`) with `side="bottom"`. Two issues cause the Android glitch:

1. **Duplicate close buttons**: The `SheetContent` component (sheet.tsx line 60-63) renders a default `SheetPrimitive.Close` X button at `right-4 top-4`, while `ProductSheet` renders its own custom close button at the same position. On Android, these overlap and fight for tap events, causing visual flicker and state confusion.

2. **`overflow-hidden` on SheetContent + inner scroll container**: The SheetContent has `overflow-hidden` in the className, and the inner scrollable div uses `overflow-y-auto` with `h-full`. On Android Chrome, the combination of a `position: fixed` sheet with `overflow-hidden` and a child scroll container causes rendering glitches during the slide-in animation — the browser attempts to composite layers that conflict during the transition.

3. **No `will-change` or `transform: translateZ(0)` hint**: Android's compositor doesn't promote the scroll container to its own layer, causing paint jank during open/close.

### Fix approach
- Remove the default close button from `SheetContent` when used in bottom sheets (the ProductSheet already has its own styled one)
- Add GPU compositing hints to the scroll container
- Ensure touch-action is set correctly for the scroll area

## Plan

### Task A: Fix Android product details glitch

**File: `src/components/ui/sheet.tsx`**
- Add an optional `hideDefaultClose` prop to `SheetContent`
- When true, skip rendering the default `SheetPrimitive.Close` button
- This eliminates the duplicate close button conflict

**File: `src/components/customer/ProductSheet.tsx`**
- Pass `hideDefaultClose` to `SheetContent`
- Add `-webkit-overflow-scrolling: touch` and `overscroll-behavior-y: contain` to the scroll container for smoother Android scrolling
- Add `touch-action: pan-y` to the scroll container to prevent gesture conflicts
- Use `will-change: transform` on the scroll container to promote it to its own compositing layer

### Task B: Harden mobile UX

In the same `ProductSheet.tsx` changes:
- Ensure the sticky footer "Add to Order" button uses `pb-[env(safe-area-inset-bottom)]` for iPhone home indicator spacing
- Add `touch-manipulation` to all interactive elements to eliminate 300ms tap delay
- Ensure the overlay click correctly closes (already handled by Radix)

### Task C: Menu option changes (database + no frontend code changes needed)

The product customization system is fully database-driven via `product_ingredients`. The UI already renders add/remove buttons for all ingredients linked to a product. So:

**Database migrations needed:**

1. **Create "Mayo" ingredient** (doesn't exist yet — only specialty mayos like "Jerk mayo" exist):
   - Insert into `ingredients`: name="Mayo", addon_price=0.50, addon_price_kids=0.00, ingredient_type="sauce"

2. **Sloppy Fries — add Salsa as removable ingredient**:
   - The "Salsa" ingredient exists (id: `278cc272-...`) but is NOT linked to Small Sloppy Fries product
   - Insert into `product_ingredients`: product_id=`50ba3f2f-...`, ingredient_id=`278cc272-...`, is_default=true, is_removable=true, is_addable=true

3. **Kids Smash Burger (Smash Burger Plain, id: `c64610a8-...`)**:
   - Currently has: Lettuce, Onions, Pickles
   - Add "Beef Patty" (id: `42ca577e-...`) as addable (is_default=false, is_addable=true, is_removable=false) — for "add a patty"
   - Add new "Mayo" ingredient as addable+removable (is_default=false, is_addable=true, is_removable=true) — free via addon_price_kids=0.00
   - Add "Ketchup" (id: `1eb5712d-...`) as addable+removable default (is_default=true, is_addable=true, is_removable=true) — already free for kids if addon_price_kids is set to 0.00

4. **Kids Cheeseburger (id: `39852f78-...`)**:
   - Currently has: Lettuce, Onions, Pickles, Ketchup, Cheese
   - Add new "Mayo" ingredient as addable+removable (is_default=false, is_addable=true, is_removable=true)

5. **Update Ketchup addon_price_kids to 0.00** (currently 0.50 — must be free for Kids Menu per business rule)

6. **Update Beef Patty (42ca577e) addon_price_kids** to appropriate price for adding a patty to Kids items

The UI will automatically show these options because the `ProductSheet` ingredient section already renders +/- buttons for all linked ingredients based on `is_addable` and `is_removable` flags, with pricing from `getIngredientAddonPrice()` which checks `addon_price_kids` for Kids Menu items.

### Files changed summary
1. `src/components/ui/sheet.tsx` — Add `hideDefaultClose` prop
2. `src/components/customer/ProductSheet.tsx` — Use `hideDefaultClose`, add mobile scroll hardening
3. Database migration — Create Mayo ingredient, link ingredients to products, update kids pricing

