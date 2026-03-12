

# Plan: Mobile Layout Stabilization

## Root Causes

1. **No unified bottom spacing** — Index, Menu, Cart, CustomerLayout all hardcode different `paddingBottom` values. The FloatingCartButton, FooterInfoBar, and BottomNav all stack at the bottom but content padding doesn't account for all of them consistently.

2. **Hero too tall on mobile** — `min-h-[28vh]` is still large. The logo glow overlay (`-inset-x-8 -inset-y-8`) adds invisible height. Combined with `pt-6`, the hero pushes menu content too far down.

3. **Category bar oversized** — `.category-pill` base styles use `px-5 py-2.5 text-sm` which the mobile override (`px-3 py-1 text-xs`) only partially overrides because the base class wins in CSS specificity.

4. **BottomNav height not variable-driven** — hardcoded `h-14` doesn't participate in the offset system, so pages can't calculate correct bottom padding.

5. **Cart page `min-h-screen`** — uses `100vh` not `100dvh`, causing overscroll on iOS Safari.

6. **Standalone mode only reduces `--nav-height` and `--bottom-bar-height`** but BottomNav and FooterInfoBar don't reference these variables for their own heights.

7. **Loading skeletons** in MenuSection use a vertical list layout (`space-y-4` with horizontal card skeletons) but final content renders as a 2-column grid — layout shift.

## Changes

### 1. `src/index.css` — Centralize all layout variables + fix category pill base size

- Add `--bottom-nav-height: 56px` (standalone: `48px`)
- Redefine `--bottom-offset: calc(var(--bottom-nav-height) + var(--safe-bottom))` — this is what content padding should use (BottomNav is the outermost fixed element)
- Add `--category-bar-height` variable for reference
- Fix `.category-pill` base to be mobile-first: smaller default, larger at `sm:`
- Keep FooterInfoBar offset as separate variable for FloatingCartButton positioning

### 2. `src/components/customer/HeroSection.tsx` — Compact mobile hero

- Reduce `min-h-[28vh]` to `min-h-[20vh]` on mobile
- Reduce `pt-6` to `pt-2`, `pb-3` to `pb-2`
- Shrink logo from `w-16` to `w-12` on mobile
- Remove the oversized glow inset (`-inset-x-8 -inset-y-8` → `-inset-x-4 -inset-y-4`)
- Reduce `mb-1` on logo to `mb-0.5`
- These are small but cumulative — saves ~60-80px above the fold

### 3. `src/components/customer/MenuSection.tsx` — Fix category bar + loading skeleton

- Category bar: reduce mobile `py-1` to `py-0.5`, reduce `mb-1.5` to `mb-1`
- Loading skeleton: change from vertical list to 2-column grid matching final layout
- Skeleton cards: use compact card shape instead of horizontal layout

### 4. `src/components/layout/BottomNav.tsx` — Use CSS variable for height

- Change `h-14` to `height: var(--bottom-nav-height)` so standalone mode automatically gets smaller nav

### 5. `src/components/layout/FooterInfoBar.tsx` — Use CSS variable for height

- Reference `--bottom-bar-height` for its own `min-height`
- Position itself above BottomNav: `bottom: var(--bottom-nav-height)`
- This stops it sitting at `bottom: 0` where it overlaps BottomNav

### 6. `src/components/customer/FloatingCartButton.tsx` — Fix stacking position

- Position above FooterInfoBar: `bottom: calc(var(--bottom-nav-height) + var(--bottom-bar-height) + var(--safe-bottom) + 0.5rem)`

### 7. `src/pages/Index.tsx` — Use centralized bottom offset

- Replace hardcoded `paddingBottom` with `var(--bottom-offset)` plus a buffer for FloatingCartButton and FooterInfoBar

### 8. `src/pages/Menu.tsx` — Same bottom offset fix

### 9. `src/pages/Cart.tsx` — Fix `min-h-screen` to `min-h-[100dvh]`

### 10. `src/components/layout/CustomerLayout.tsx` — Use centralized bottom offset

## Files Changed

| File | What |
|------|------|
| `src/index.css` | Add `--bottom-nav-height`, fix `.category-pill` mobile-first sizing, standalone overrides |
| `src/components/customer/HeroSection.tsx` | Smaller hero, logo, padding on mobile |
| `src/components/customer/MenuSection.tsx` | Tighter category bar, grid-based loading skeleton |
| `src/components/layout/BottomNav.tsx` | Use `--bottom-nav-height` variable |
| `src/components/layout/FooterInfoBar.tsx` | Position above BottomNav, use variable height |
| `src/components/customer/FloatingCartButton.tsx` | Correct stacking above both bars |
| `src/pages/Index.tsx` | Centralized bottom padding |
| `src/pages/Menu.tsx` | Centralized bottom padding |
| `src/pages/Cart.tsx` | `100dvh` fix |
| `src/components/layout/CustomerLayout.tsx` | Centralized bottom padding |

## Bottom Stacking Order (from screen bottom up)

```text
┌─────────────────────────┐
│   BottomNav (fixed)     │  bottom: 0, h: --bottom-nav-height
├─────────────────────────┤
│   FooterInfoBar (fixed) │  bottom: --bottom-nav-height, h: --bottom-bar-height  
├─────────────────────────┤
│   FloatingCartButton    │  bottom: nav + bar + safe + gap
├─────────────────────────┤
│   Page content padding  │  pb: nav + bar + safe + buffer
└─────────────────────────┘
```

## Key Decisions

- **BottomNav is the anchor** — everything stacks relative to it
- **FooterInfoBar sits above BottomNav**, not at `bottom: 0`
- **Mobile-first category pills** — small default, larger at `sm:` breakpoint
- **Loading skeletons match final grid** — 2-col grid of compact card shapes
- **All pages share the same bottom offset formula** via CSS variables
- **Standalone mode** reduces nav/bar heights via variables, everything auto-adjusts
- **Touch targets preserved** — BottomNav items stay ≥44px, category pills stay ≥44px hit area

