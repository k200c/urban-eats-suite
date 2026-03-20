/**
 * Image optimization utilities for the Street Eatz menu.
 *
 * Strategy:
 *  - getOptimizedImageUrl: pass-through — returns the stored URL unchanged.
 *    No runtime URL rewriting. All rendering components use this safely.
 *  - optimizeImageBeforeUpload: client-side resize/compress BEFORE uploading
 *    to Supabase Storage. This is where performance gains come from.
 */

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_WIDTH = 1200;
const WEBP_QUALITY = 0.8;
const JPEG_QUALITY = 0.85;

/**
 * Returns the image URL as-is. Kept as a stable API so all rendering
 * call-sites continue to work without changes.
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  _width: number = 400,
): string {
  if (!url) return '';
  return url;
}

/**
 * Validates and optimizes an image File before upload.
 * - Validates type (jpeg, png, webp) and size (≤10 MB)
 * - Resizes to max 1200px width, preserving aspect ratio
 * - Converts to WebP (falls back to JPEG if unsupported)
 * - Returns an optimized File ready for Supabase Storage upload
 */
export async function optimizeImageBeforeUpload(file: File): Promise<File> {
  // --- Validate type ---
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      `Unsupported image type "${file.type}". Please upload a JPEG, PNG, or WebP image.`,
    );
  }

  // --- Validate size ---
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `Image is too large (${sizeMB} MB). Maximum allowed size is 10 MB.`,
    );
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      try {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        // Draw to canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context for image optimization.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first, fall back to JPEG
        const tryExport = (mime: string, quality: number, ext: string) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                // WebP not supported — fall back to JPEG
                if (mime === 'image/webp') {
                  tryExport('image/jpeg', JPEG_QUALITY, 'jpg');
                  return;
                }
                reject(new Error('Failed to compress image.'));
                return;
              }

              const optimizedName = file.name.replace(/\.[^.]+$/, '') + '.' + ext;
              const optimizedFile = new File([blob], optimizedName, { type: mime });

              console.log(
                `📸 Image optimized: ${(file.size / 1024).toFixed(0)}KB → ${(optimizedFile.size / 1024).toFixed(0)}KB (${mime}, ${width}×${height})`,
              );

              resolve(optimizedFile);
            },
            mime,
            quality,
          );
        };

        tryExport('image/webp', WEBP_QUALITY, 'webp');
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for optimization.'));
    };

    img.src = objectUrl;
  });
}
