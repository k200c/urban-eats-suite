/**
 * Optimizes Supabase Storage image URLs by using the render/image endpoint
 * with resize parameters. This serves properly sized, optimized images
 * instead of full-resolution originals (saving ~30MB on the menu page).
 *
 * For non-Supabase URLs, returns the original URL unchanged.
 */

const SUPABASE_STORAGE_PREFIX = 'supabase.co/storage/v1/object/public/';

export function getOptimizedImageUrl(
  url: string | null | undefined,
  width: number = 400,
): string {
  if (!url) return '';

  // Only transform Supabase Storage public URLs
  if (!url.includes(SUPABASE_STORAGE_PREFIX)) {
    return url;
  }

  // Replace /object/public/ with /render/image/public/ and add resize params
  const optimized = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/',
  );

  // Append resize query params + request WebP format for smaller sizes
  const separator = optimized.includes('?') ? '&' : '?';
  return `${optimized}${separator}width=${width}&resize=contain&format=webp`;
}
