/**
 * Extracts dominant colors from an image URL using an off-screen canvas.
 * Returns up to `maxColors` hex strings sorted by frequency.
 */
export async function extractDominantColors(
  imageUrl: string,
  maxColors = 6,
  sampleSize = 32
): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = sampleSize;
      canvas.height = sampleSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve([]);
        return;
      }

      ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
      const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);

      // Bucket pixels into 6-bit RGB (64 values per channel → 262144 buckets)
      const buckets: Record<
        string,
        { r: number; g: number; b: number; count: number }
      > = {};
      for (let i = 0; i < data.length; i += 4) {
        const r = Math.round(data[i] / 32) * 32;
        const g = Math.round(data[i + 1] / 32) * 32;
        const b = Math.round(data[i + 2] / 32) * 32;
        const key = `${r},${g},${b}`;
        if (!buckets[key]) buckets[key] = { r, g, b, count: 0 };
        buckets[key].count++;
      }

      // Sort by frequency and pick top colors that are visually distinct
      const sorted = Object.values(buckets).sort((a, b) => b.count - a.count);
      const picked: typeof sorted = [];
      for (const candidate of sorted) {
        if (picked.length >= maxColors) break;
        // Skip near-white and near-black (low saturation extremes)
        const max = Math.max(candidate.r, candidate.g, candidate.b);
        const min = Math.min(candidate.r, candidate.g, candidate.b);
        if (max > 240 && min > 220) continue; // near-white
        if (max < 30) continue; // near-black
        // Ensure distinct from already-picked colors (Euclidean distance > 60)
        const distinct = picked.every(
          (p) =>
            Math.sqrt(
              (p.r - candidate.r) ** 2 +
                (p.g - candidate.g) ** 2 +
                (p.b - candidate.b) ** 2
            ) > 60
        );
        if (distinct) picked.push(candidate);
      }

      resolve(
        picked.map(
          ({ r, g, b }) =>
            `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
        )
      );
    };
    img.onerror = () => resolve([]);
    img.src = imageUrl;
  });
}

/**
 * Measures the minimum font size (px at the given canvas width) that keeps
 * the text within `maxWidthFraction` of the canvas width and within
 * `maxLines` wrapped lines.
 *
 * Uses the Canvas 2D measureText API — font family should match the slide.
 */
export function autoFitFontSize(opts: {
  text: string;
  fontFamily: string;
  fontWeight: number;
  canvasWidth: number;
  /** Fraction of canvas width the text block may occupy. Default 0.84 */
  maxWidthFraction?: number;
  /** Max number of lines before we consider it overflowing. Default 2 */
  maxLines?: number;
  minSize?: number;
  maxSize?: number;
}): number {
  const {
    text,
    fontFamily,
    fontWeight,
    canvasWidth,
    maxWidthFraction = 0.84,
    maxLines = 2,
    minSize = 16,
    maxSize = 120,
  } = opts;

  const maxW = canvasWidth * maxWidthFraction;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const fits = (size: number) => {
    ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
    const words = text.split(/\s+/).filter(Boolean);
    let lines = 1;
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW) {
        lines++;
        line = word;
      } else {
        line = test;
      }
    }
    return lines <= maxLines;
  };

  // Binary search
  let lo = minSize;
  let hi = maxSize;
  while (lo < hi - 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (fits(mid)) lo = mid;
    else hi = mid - 1;
  }
  return fits(hi) ? hi : lo;
}
