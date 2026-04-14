'use client';

import { useState, useEffect } from 'react';

/** Extract dominant colors from an image URL using canvas pixel sampling */
async function extractPalette(iconUrl: string, count = 6): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const SIZE = 64; // downsample for speed
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve([]);
      ctx.drawImage(img, 0, 0, SIZE, SIZE);

      const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
      // Bucket colors into 32-step buckets
      const buckets: Record<string, number> = {};
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a < 128) continue; // skip transparent
        // Quantize to reduce similar colors
        const rq = Math.round(r / 32) * 32;
        const gq = Math.round(g / 32) * 32;
        const bq = Math.round(b / 32) * 32;
        const key = `${rq},${gq},${bq}`;
        buckets[key] = (buckets[key] ?? 0) + 1;
      }

      // Sort by frequency, take top N
      const sorted = Object.entries(buckets)
        .sort(([, a], [, b]) => b - a)
        .slice(0, count * 3); // take more, then deduplicate visually

      // Convert to hex and deduplicate by visual distance
      const toHex = (r: number, g: number, b: number) =>
        '#' +
        [r, g, b]
          .map((v) => Math.min(255, v).toString(16).padStart(2, '0'))
          .join('');

      const colors: string[] = [];
      for (const [key] of sorted) {
        const [r, g, b] = key.split(',').map(Number);
        const hex = toHex(r, g, b);
        // Skip near-duplicates
        if (
          colors.every((c) => {
            const cr = parseInt(c.slice(1, 3), 16);
            const cg = parseInt(c.slice(3, 5), 16);
            const cb = parseInt(c.slice(5, 7), 16);
            return Math.abs(cr - r) + Math.abs(cg - g) + Math.abs(cb - b) > 60;
          })
        ) {
          colors.push(hex);
        }
        if (colors.length >= count) break;
      }
      resolve(colors);
    };
    img.onerror = () => resolve([]);
    img.src = `/api/proxy-image?url=${encodeURIComponent(iconUrl)}`;
  });
}

interface PaletteSwatchesProps {
  iconUrl: string;
  onPick: (color: string) => void;
  label?: string;
}

export function PaletteSwatches({
  iconUrl,
  onPick,
  label,
}: PaletteSwatchesProps) {
  const [colors, setColors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    if (loaded || loading) return;
    setLoading(true);
    const palette = await extractPalette(iconUrl);
    setColors(palette);
    setLoaded(true);
    setLoading(false);
  };

  useEffect(() => {
    if (iconUrl) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iconUrl]);

  if (!iconUrl) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {label && (
        <span className="text-[10px] text-muted-foreground">{label}</span>
      )}
      {loading && (
        <span className="text-[10px] text-muted-foreground animate-pulse">
          Extracting…
        </span>
      )}
      {colors.map((color) => (
        <button
          key={color}
          title={color}
          onClick={() => onPick(color)}
          className="w-5 h-5 rounded border border-white/20 shadow hover:scale-110 transition-transform shrink-0"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
