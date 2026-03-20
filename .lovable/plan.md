

# Pre-Upload Image Optimization + Fix Broken Rendering

## Root Cause

`getOptimizedImageUrl()` rewrites Supabase `/object/public/` URLs to `/render/image/public/` with `format=webp`. This endpoint returns 400 errors, breaking all Supabase-hosted product images (Drinks, Sauces, Specials, Kids Menu, some Burgers). Google Storage URLs pass through unaffected.

## Strategy

**Two changes:**
1. **Fix rendering** — make `getOptimizedImageUrl` a pass-through (no URL rewriting). Images render from their stored URL directly.
2. **Add pre-upload optimization** — new utility that resizes/compresses images client-side BEFORE uploading to Supabase Storage. This is where performance gains come from, not runtime URL rewriting.

## Files Changed

### 1. `src/lib/imageOptimization.ts` — Rewrite entirely

Remove the broken `/render/image/` URL rewriter. Replace with:

- **`getOptimizedImageUrl(url, width)`** — becomes a simple pass-through returning the URL as-is (keeps all call sites working, zero rendering breakage)
- **`optimizeImageBeforeUpload(file)`** — new async function:
  - Validates file type (`image/jpeg`, `image/png`, `image/webp` only)
  - Rejects files over 10MB with a clear error message
  - Uses Canvas API to resize to max 1200px width (preserving aspect ratio)
  - Exports as WebP at quality 0.8 (falls back to JPEG 0.85 if WebP unsupported)
  - Returns an optimized `File` object ready for upload
  - Logs original vs optimized size for staff debugging

### 2. `src/components/staff/EditProductDialog.tsx`

- In `handleImageChange`: add file type validation, show toast on rejection
- In `uploadImage`: call `optimizeImageBeforeUpload(file)` before `supabase.storage.upload()`
- Upload the optimized file; save the returned `publicUrl` unchanged to the database

### 3. `src/components/staff/AddProductDialog.tsx`

- Same changes as EditProductDialog:
  - Validate file type/size in `handleImageChange`
  - Call `optimizeImageBeforeUpload(file)` in `uploadImage` before Supabase upload
  - Store the raw `publicUrl` from Supabase — no URL rewriting

### 4. No changes to rendering components

`ProductCard.tsx`, `ProductCardHorizontal.tsx`, `ProductSheet.tsx`, `StaffProductSheet.tsx` — all call `getOptimizedImageUrl()` which now returns the URL unchanged. All product images (Drinks, Sauces, Specials, Burgers, Flatbreads, Kids Menu) render correctly.

## How Performance Is Preserved

| Before (broken) | After (safe) |
|---|---|
| Upload raw 4MB PNGs, rewrite URL at render time | Optimize to ~200-400KB WebP before upload |
| `/render/image/` endpoint returns 400 | No runtime URL transformation |
| Images break for Supabase-hosted products | All images render from stored URL |

Pre-upload optimization is strictly better: the optimized file is what gets stored, so every subsequent page load serves the smaller file automatically — no runtime transformation needed.

