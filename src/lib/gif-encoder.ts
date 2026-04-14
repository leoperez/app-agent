/**
 * Minimal animated GIF encoder (pure TypeScript, no dependencies).
 * Only supports 256-colour paletted GIFs with optional transparency.
 * Sufficient for screenshot carousels at reasonable sizes.
 */

// ── LZW compression ──────────────────────────────────────────────────────────

function lzwEncode(pixels: Uint8Array, colorDepth: number): number[] {
  const codeSize = Math.max(colorDepth, 2);
  const clear = 1 << codeSize;
  const eoi = clear + 1;
  let table: Map<string, number> = new Map();
  const reset = () => {
    table = new Map();
    for (let i = 0; i < clear; i++) table.set(String(i), i);
  };
  reset();

  const bits: number[] = [];
  let runBits = codeSize + 1;
  let buf = 0;
  let bufLen = 0;

  const emit = (code: number) => {
    buf |= code << bufLen;
    bufLen += runBits;
    while (bufLen >= 8) {
      bits.push(buf & 0xff);
      buf >>= 8;
      bufLen -= 8;
    }
  };

  emit(clear);
  let index = String(pixels[0]);
  for (let i = 1; i < pixels.length; i++) {
    const next = index + ',' + pixels[i];
    if (table.has(next)) {
      index = next;
    } else {
      emit(table.get(index)!);
      const newCode = table.size;
      if (newCode < 4096) {
        table.set(next, newCode);
        if (newCode === 1 << runBits) runBits = Math.min(runBits + 1, 12);
      } else {
        emit(clear);
        reset();
        runBits = codeSize + 1;
      }
      index = String(pixels[i]);
    }
  }
  emit(table.get(index)!);
  emit(eoi);
  if (bufLen > 0) bits.push(buf & 0xff);
  return bits;
}

// ── Colour quantisation (median cut, simplified) ──────────────────────────────

function quantize(
  imageData: ImageData,
  numColors = 256
): { palette: number[][]; indexed: Uint8Array } {
  const { data, width, height } = imageData;
  const pixels: number[][] = [];
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    pixels.push([r, g, b]);
  }

  // Median cut — split the largest range dimension
  type Bucket = number[][];
  // eslint-disable-next-line prefer-const
  let buckets: Bucket[] = [pixels];
  while (buckets.length < numColors) {
    // Find largest bucket
    let maxIdx = 0;
    let maxSize = 0;
    buckets.forEach((b, i) => {
      if (b.length > maxSize) {
        maxSize = b.length;
        maxIdx = i;
      }
    });
    const bucket = buckets[maxIdx];
    if (bucket.length <= 1) break;
    // Find widest channel
    let [rMin, gMin, bMin] = [255, 255, 255];
    let [rMax, gMax, bMax] = [0, 0, 0];
    for (const [r, g, b] of bucket) {
      rMin = Math.min(rMin, r);
      rMax = Math.max(rMax, r);
      gMin = Math.min(gMin, g);
      gMax = Math.max(gMax, g);
      bMin = Math.min(bMin, b);
      bMax = Math.max(bMax, b);
    }
    const rRange = rMax - rMin,
      gRange = gMax - gMin,
      bRange = bMax - bMin;
    const ch =
      rRange >= gRange && rRange >= bRange ? 0 : gRange >= bRange ? 1 : 2;
    bucket.sort((a, b) => a[ch] - b[ch]);
    const mid = Math.floor(bucket.length / 2);
    buckets.splice(maxIdx, 1, bucket.slice(0, mid), bucket.slice(mid));
  }

  // Palette = average of each bucket
  const palette: number[][] = buckets.map((b) => {
    const avg = b.reduce(
      (acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]],
      [0, 0, 0]
    );
    return avg.map((v) => Math.round(v / b.length));
  });
  // Pad palette to 256
  while (palette.length < 256) palette.push([0, 0, 0]);

  // Map each pixel to nearest palette colour
  const indexed = new Uint8Array(width * height);
  for (let i = 0; i < pixels.length; i++) {
    const [r, g, b] = pixels[i];
    let best = 0,
      bestDist = Infinity;
    for (let j = 0; j < palette.length; j++) {
      const dr = r - palette[j][0],
        dg = g - palette[j][1],
        db = b - palette[j][2];
      const dist = dr * dr + dg * dg + db * db;
      if (dist < bestDist) {
        bestDist = dist;
        best = j;
      }
    }
    indexed[i] = best;
  }
  return { palette, indexed };
}

// ── GIF byte writer ────────────────────────────────────────────────────────────

class ByteWriter {
  private bytes: number[] = [];
  write(b: number) {
    this.bytes.push(b & 0xff);
  }
  writeStr(s: string) {
    for (const c of s) this.bytes.push(c.charCodeAt(0) & 0xff);
  }
  writeUint16LE(v: number) {
    this.write(v & 0xff);
    this.write((v >> 8) & 0xff);
  }
  writeBytes(arr: number[] | Uint8Array) {
    Array.from(arr).forEach((b) => this.bytes.push(b & 0xff));
  }
  toUint8Array() {
    return new Uint8Array(this.bytes);
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export interface GifFrame {
  imageData: ImageData;
  /** Delay in centiseconds (100 = 1 s) */
  delay: number;
}

/**
 * Encode an array of frames into an animated GIF Blob.
 */
export function encodeGif(frames: GifFrame[]): Blob {
  if (frames.length === 0) throw new Error('No frames');
  const { width, height } = frames[0].imageData;
  const w = new ByteWriter();

  // Header
  w.writeStr('GIF89a');
  // Logical Screen Descriptor
  w.writeUint16LE(width);
  w.writeUint16LE(height);
  w.write(0x70); // global colour table flag=0, colour resolution=8 bits
  w.write(0); // background colour index
  w.write(0); // pixel aspect ratio

  // Application Extension for looping
  w.write(0x21);
  w.write(0xff);
  w.write(11);
  w.writeStr('NETSCAPE2.0');
  w.write(3);
  w.write(1);
  w.writeUint16LE(0); // loop forever
  w.write(0);

  for (const frame of frames) {
    const { palette, indexed } = quantize(frame.imageData, 256);
    const colorDepth = 8;

    // Graphic Control Extension (for frame delay)
    w.write(0x21);
    w.write(0xf9);
    w.write(4);
    w.write(0); // disposal: do not dispose
    w.writeUint16LE(frame.delay);
    w.write(0); // transparent colour index
    w.write(0);

    // Image Descriptor
    w.write(0x2c);
    w.writeUint16LE(0);
    w.writeUint16LE(0); // position
    w.writeUint16LE(frame.imageData.width);
    w.writeUint16LE(frame.imageData.height);
    w.write(0x80 | (colorDepth - 1)); // local colour table flag, size

    // Local colour table
    for (const [r, g, b] of palette) {
      w.write(r);
      w.write(g);
      w.write(b);
    }

    // Image data
    w.write(colorDepth - 1); // LZW minimum code size
    const lzw = lzwEncode(indexed, colorDepth - 1);
    // Write in sub-blocks of max 255 bytes
    let offset = 0;
    while (offset < lzw.length) {
      const chunk = lzw.slice(offset, offset + 255);
      w.write(chunk.length);
      w.writeBytes(chunk);
      offset += 255;
    }
    w.write(0); // block terminator
  }

  w.write(0x3b); // GIF trailer
  return new Blob([w.toUint8Array()], { type: 'image/gif' });
}
