# Plan: Hero Visibility + Footer Behavior Fix

## Root Causes

**Hero clipping**: `min-h-[20vh]` + `pt-2` + `overflow-hidden` on the section means the logo (w-12 = 48px) plus glow, heading, tagline, and buttons are crammed into ~168px. The `overflow-hidden` clips the glow but also clips the logo at the top edge. Combined with the nav sitting on top, the logo gets cut off.

**Footer following viewport**: FooterInfoBar has `className="fixed"` — it's viewport-fixed, floating over content as the user scrolls. The user wants it to be a normal in-flow element at the bottom of the page, not a fixed overlay.

## Changes

### 1. `src/components/customer/HeroSection.tsx` — Restore hero visibility

- Change `min-h-[20vh]` to `min-h-[30vh]` on mobile (keep `sm:min-h-[50vh]`)
- Change `pt-2` to `pt-6` on mobile so logo clears the nav
- Change `pb-2` to `pb-4` on mobile
- Change logo from `w-12` to `w-16` — 48px is too small to read
- Change `overflow-hidden` to `overflow-visible` so the glow doesn't clip the logo

### 2. `src/components/layout/FooterInfoBar.tsx` — Make non-fixed

- Remove `fixed` positioning — make it a normal flow element
- Remove `bottom: var(--bottom-nav-height)` inline style
- Keep its visual styling (dark bg, border, text)

### 3. `src/pages/Index.tsx` — Adjust bottom padding

- Since FooterInfoBar is no longer fixed, reduce `paddingBottom` — no longer need to reserve space for it
- Change to `calc(var(--bottom-nav-height) + var(--safe-bottom) + 2rem)` to only account for the fixed BottomNav

### 4. `src/pages/Menu.tsx` — Same bottom padding adjustment

### 5. `src/index.css` — Update `--bottom-offset`

- Since FooterInfoBar is no longer fixed, `--bottom-offset` should only account for BottomNav: `calc(var(--bottom-nav-height) + var(--safe-bottom))`
- Remove `--bottom-total` if it included the info bar height

### 6. `src/components/customer/FloatingCartButton.tsx` — Simplify position

- Since FooterInfoBar is no longer fixed, the cart button only needs to clear BottomNav: `bottom: calc(var(--bottom-nav-height) + var(--safe-bottom) + 0.5rem)`

### 7. `src/components/layout/CustomerLayout.tsx` — Same bottom padding fix

## Files Changed


| File                                             | Change                                                     |
| ------------------------------------------------ | ---------------------------------------------------------- |
| `src/components/customer/HeroSection.tsx`        | Increase min-h, padding, logo size; remove overflow-hidden |
| `src/components/layout/FooterInfoBar.tsx`        | Remove fixed positioning, make in-flow                     |
| `src/index.css`                                  | Simplify `--bottom-offset` to only account for BottomNav   |
| `src/components/customer/FloatingCartButton.tsx` | Simplify bottom calc                                       |
| `src/pages/Index.tsx`                            | Adjust paddingBottom                                       |
| `src/pages/Menu.tsx`                             | Adjust paddingBottom                                       |
| `src/components/layout/CustomerLayout.tsx`       | Adjust paddingBottom                                       |


## Why This Works

- **Hero logo visible**: More min-height + more top padding + no overflow clipping = logo fully visible
- **Footer stops following**: Removing `fixed` makes it a normal page element that scrolls with content, sitting at the bottom of the page naturally
- **Menu improvements preserved**: No changes to MenuSection, category bar, or product grid  
  
This plan is close, but adjust the hero fix to avoid overshooting and recreating a too-tall mobile hero.
  Keep the footer fix exactly as planned: FooterInfoBar should no longer be fixed.
  Refine the hero changes as follows:
  1. HeroSection.tsx
  - Do NOT jump directly from min-h-[20vh] to min-h-[30vh]
  - Start with a more measured mobile increase such as min-h-[24vh] or min-h-[26vh]
  - Change pt-2 to pt-4 first, not necessarily pt-6 unless still required after testing
  - Change pb-2 to pb-3 or pb-4
  - Restore logo from w-12 to w-16 on mobile
  - Avoid changing the entire hero section to overflow-visible unless absolutely necessary
  2. Clipping fix approach
  - Prefer fixing clipping at the logo/logo-glow wrapper level
  - Reduce or adjust the glow inset if needed
  - Only use overflow-visible on the inner logo wrapper if that is enough
  - Avoid allowing the full hero section to bleed visually into adjacent sections unless necessary
  3. FooterInfoBar.tsx
  - Keep this change: remove fixed positioning
  - Remove bottom anchoring
  - Return it to normal in-flow behavior
  4. Padding cleanup
  - Keep the bottom padding cleanup in Index/Menu/CustomerLayout/index.css/FloatingCartButton
  - Only reserve space for BottomNav and safe bottom after FooterInfoBar is no longer fixed
  Goal:
  - hero logo fully visible
  - hero still compact and premium
  - footer no longer follows viewport
  - preserve the improved menu density
  Output:
  1. Updated root cause
  2. Exact files changed
  3. Final production-ready code
  4. Explanation of why hero visibility is restored without making hero oversized again
  5. Explanation of why footer stops following the viewport