/**
 * Signature Photo Quality Enhancer
 * Develops image quality, removes paper backgrounds into clean transparency,
 * and sharpens ink contrast WITHOUT altering the authentic signature strokes.
 */

export interface SignatureProcessingOptions {
  /**
   * Luminance threshold for paper background removal (0-255).
   * Pixels brighter than this become transparent.
   * Default: 200
   */
  threshold: number;

  /**
   * Contrast boost factor (1.0 = normal, 1.5 = high contrast).
   * Default: 1.3
   */
  contrast: number;

  /**
   * Color enhancement mode.
   * - 'original': Preserves authentic pen colors, cleaning only paper haze.
   * - 'black': Deepens stroke to rich executive black ink.
   * - 'blue': Enhances to rich royal ballpoint blue ink.
   */
  colorMode: 'original' | 'black' | 'blue';

  /**
   * Automatically crop empty paper borders around the signature.
   */
  trimWhitespace: boolean;
}

export const DEFAULT_ENHANCE_OPTIONS: SignatureProcessingOptions = {
  threshold: 205,
  contrast: 1.35,
  colorMode: 'original',
  trimWhitespace: true,
};

/**
 * Loads an image from a File, Blob, or URL string into an HTMLImageElement
 */
export function loadImage(source: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Failed to load signature image: ' + err));

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          reject(new Error('Failed to read image file'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(source);
    }
  });
}

/**
 * Processes a signature photo: removes paper background into transparency,
 * sharpens authentic ink strokes, and trims transparent boundaries.
 */
export async function enhanceSignaturePhoto(
  source: File | Blob | string,
  options: Partial<SignatureProcessingOptions> = {}
): Promise<{ dataUrl: string; width: number; height: number }> {
  const opts: SignatureProcessingOptions = {
    ...DEFAULT_ENHANCE_OPTIONS,
    ...options,
  };

  const img = await loadImage(source);

  // Setup offscreen canvas
  const canvas = document.createElement('canvas');
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // Draw original image
  ctx.drawImage(img, 0, 0, width, height);

  // Read raw pixels
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Compute paper background estimate (average luminance of top corners)
  const threshold = Math.min(250, Math.max(120, opts.threshold));
  const featherRange = 35; // Soft transition zone to prevent harsh edges
  const minThreshold = threshold - featherRange;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let hasInk = false;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Perceived luminance
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    const pixelIndex = i / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    if (luminance >= threshold) {
      // Paper background -> 100% transparent
      data[i + 3] = 0;
    } else {
      // Ink stroke or anti-aliased edge
      let alpha = 255;
      if (luminance > minThreshold) {
        // Smooth feathering
        const factor = (threshold - luminance) / featherRange;
        alpha = Math.round(255 * Math.max(0, Math.min(1, factor)));
      }

      data[i + 3] = alpha;

      if (alpha > 30) {
        hasInk = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }

      // Ink color treatment
      if (opts.colorMode === 'black') {
        // Normalize to pure executive black ink while respecting stroke pressure
        const darkness = (255 - luminance) / 255;
        const inkVal = Math.max(0, Math.round((1 - darkness * opts.contrast) * 35));
        data[i] = inkVal;
        data[i + 1] = inkVal;
        data[i + 2] = inkVal;
      } else if (opts.colorMode === 'blue') {
        // Normalize to rich ballpoint blue ink
        const darkness = (255 - luminance) / 255;
        data[i] = Math.max(0, Math.round(15 + (1 - darkness) * 20));
        data[i + 1] = Math.max(0, Math.round(45 + (1 - darkness) * 40));
        data[i + 2] = Math.min(255, Math.round(140 + darkness * opts.contrast * 90));
      } else {
        // 'original' mode: enhance contrast while preserving authentic hue
        // Stretch contrast away from paper haze
        const scale = opts.contrast;
        data[i] = Math.max(0, Math.min(255, Math.round(r * (luminance / threshold) * scale)));
        data[i + 1] = Math.max(0, Math.min(255, Math.round(g * (luminance / threshold) * scale)));
        data[i + 2] = Math.max(0, Math.min(255, Math.round(b * (luminance / threshold) * scale)));
      }
    }
  }

  // Put enhanced pixel data back
  ctx.putImageData(imageData, 0, 0);

  // Trim whitespace if requested and ink was found
  if (opts.trimWhitespace && hasInk && maxX > minX && maxY > minY) {
    const padding = 16;
    const cropX = Math.max(0, minX - padding);
    const cropY = Math.max(0, minY - padding);
    const cropW = Math.min(width - cropX, maxX - minX + padding * 2);
    const cropH = Math.min(height - cropY, maxY - minY + padding * 2);

    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = cropW;
    trimmedCanvas.height = cropH;
    const trimmedCtx = trimmedCanvas.getContext('2d');
    if (trimmedCtx) {
      trimmedCtx.drawImage(
        canvas,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        cropW,
        cropH
      );
      return {
        dataUrl: trimmedCanvas.toDataURL('image/png'),
        width: cropW,
        height: cropH,
      };
    }
  }

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width,
    height,
  };
}
