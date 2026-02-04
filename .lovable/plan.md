
# iOS Safe Area + Header Offset System Implementation

## Overview

Implement a centralized header offset system using CSS custom properties to ensure the hamburger menu is always visible and tappable on iOS devices with notches, while maintaining consistent spacing across all pages.

---

## Global CSS Variables

**File: `src/index.css`** (lines 12-73 in `:root`)

Add header offset system variables to the existing `:root` block:

```css
:root {
  /* ... existing variables ... */
  
  /* Header offset system - iOS safe area support */
  --nav-height: 64px;
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
  --header-offset: calc(var(--nav-height) + var(--safe-top));
}
```

This becomes the single source of truth for header spacing across the entire app.

---

## Navbar Changes

**File: `src/components/layout/Navbar.tsx`**

### Change 1: Apply Safe Area Padding to Nav Element

Update line 70 to include safe-area padding for top, left, and right edges:

**Before:**
```tsx
<nav className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-white/5">
```

**After:**
```tsx
<nav 
  className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-white/5"
  style={{
    paddingTop: 'var(--safe-top)',
    paddingLeft: 'env(safe-area-inset-left, 0px)',
    paddingRight: 'env(safe-area-inset-right, 0px)',
  }}
>
```

### Change 2: Update Mobile Menu Overlay

Update line 202-203 to use proper positioning and height:

**Before:**
```tsx
<div 
  className="fixed inset-0 top-16 z-50 md:hidden bg-black/95 backdrop-blur-lg animate-fade-in overflow-y-auto"
```

**After:**
```tsx
<div 
  className="fixed inset-x-0 z-50 md:hidden bg-black/95 backdrop-blur-lg animate-fade-in overflow-y-auto"
  style={{
    top: 'var(--header-offset)',
    height: 'calc(100dvh - var(--header-offset))',
  }}
```

---

## Page Updates

### Menu.tsx (line 9)

**Before:**
```tsx
<div className="min-h-screen pt-16 pb-24 flex flex-col">
```

**After:**
```tsx
<div className="min-h-screen pt-[var(--header-offset)] pb-24 flex flex-col">
```

---

### Cart.tsx (lines 113 and 130)

**Line 113 - Empty cart state:**

**Before:**
```tsx
<div className="pt-20 px-4 flex flex-col items-center justify-center min-h-[60vh]">
```

**After:**
```tsx
<div className="pt-[var(--header-offset)] px-4 flex flex-col items-center justify-center min-h-[60vh]">
```

**Line 130 - Cart with items:**

**Before:**
```tsx
<div className="pt-20 px-4 max-w-lg mx-auto pb-40">
```

**After:**
```tsx
<div className="pt-[var(--header-offset)] px-4 max-w-lg mx-auto pb-40">
```

---

### Details.tsx (line 44)

**Before:**
```tsx
<div className="min-h-screen bg-background pb-24 pt-20">
```

**After:**
```tsx
<div className="min-h-screen bg-background pb-24 pt-[var(--header-offset)]">
```

---

### HeroSection.tsx (line 15)

Add scroll margin for anchor link support:

**Before:**
```tsx
<section className="min-h-[50vh] sm:min-h-[70vh] md:min-h-screen flex flex-col items-center justify-center text-center px-4 pt-12 sm:pt-16 pb-12 sm:pb-20 relative overflow-hidden">
```

**After:**
```tsx
<section 
  className="min-h-[50vh] sm:min-h-[70vh] md:min-h-screen flex flex-col items-center justify-center text-center px-4 pt-12 sm:pt-16 pb-12 sm:pb-20 relative overflow-hidden"
  style={{ scrollMarginTop: 'var(--header-offset)' }}
>
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/index.css` | Add `--nav-height`, `--safe-top`, `--safe-left`, `--safe-right`, `--header-offset` variables |
| `src/components/layout/Navbar.tsx` | Apply safe-area padding (top + left + right), update mobile menu overlay positioning |
| `src/pages/Menu.tsx` | Replace `pt-16` with `pt-[var(--header-offset)]` |
| `src/pages/Cart.tsx` | Replace `pt-20` with `pt-[var(--header-offset)]` (2 locations) |
| `src/pages/Details.tsx` | Replace `pt-20` with `pt-[var(--header-offset)]` |
| `src/components/customer/HeroSection.tsx` | Add `scrollMarginTop: var(--header-offset)` style |

---

## Why This Works

```text
BEFORE (iPhone with notch):
┌──────────────────────────────────────────────┐
│████ NOTCH AREA ████│ [hamburger blocked!]    │
├──────────────────────────────────────────────┤
│       [LOGO]              [Cart]             │
└──────────────────────────────────────────────┘

AFTER (with CSS variables):
┌──────────────────────────────────────────────┐
│████ NOTCH AREA ████│                         │  ← var(--safe-top) padding
├──────────────────────────────────────────────┤
│  [LOGO]              [Cart] [☰ Hamburger]    │  ← h-16 content, fully tappable
└──────────────────────────────────────────────┘
        ↓
Page content starts at var(--header-offset) = 64px + safe-top
```

---

## Verification Steps

### 1. iPhone Portrait Test
- Open app in Safari on a notched iPhone
- Hamburger button should be fully visible below status bar
- Tap hamburger - menu opens immediately
- Scroll page and tap again - works at any scroll position

### 2. Console Validation
```javascript
// Check CSS variable values
getComputedStyle(document.documentElement).getPropertyValue('--header-offset');
// iPhone 14 Pro: "111px" (64px + 47px)
// iPhone SE: "64px"

// Verify hamburger receives taps
const btn = document.querySelector('[aria-label="Open menu"]');
const r = btn.getBoundingClientRect();
document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
// Should return the button element, not an overlay
```

### 3. Cross-Device Testing
| Device | Expected Behavior |
|--------|-------------------|
| iPhone 14 Pro (notch) | Hamburger below notch, tappable |
| iPhone SE (no notch) | Same as before, no visual change |
| iPad portrait/landscape | Safe areas apply correctly |
| Android Chrome | `env()` returns 0, no change |
| Desktop browsers | No change |
| PWA standalone mode | Safe areas respected |

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| No notch device | `env(safe-area-inset-top)` returns `0px`, header-offset = `64px` |
| Landscape mode | Safe area values adjust automatically via CSS |
| PWA fullscreen | iOS status bar handled correctly |
| Future iPhone models | `env()` will return correct values |
| Right-edge safe area (PWA) | `paddingRight` prevents hamburger being under sensor |
