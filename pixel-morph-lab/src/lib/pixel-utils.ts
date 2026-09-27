/**
 * Pixel transformation algorithms — used by the Pixel Morph Lab demo.
 *
 * Three core operations:
 *  1. pixelSort        — sort rows or columns of pixels by a chosen metric
 *  2. morph            — cross-dissolve / interpolate between two images
 *  3. glitch           — random block-shift glitch effect
 *
 * All operations are pure functions over ImageData-like buffers so they
 * can be reused by both the Next.js canvas demo and the standalone HTML
 * replica without changes.
 */

export type SortDirection = "horizontal" | "vertical";
export type SortMetric = "brightness" | "hue" | "red" | "green" | "blue" | "saturation";

export interface PixelSortParams {
  direction: SortDirection;
  metric: SortMetric;
  threshold: number; // 0..255 — only sort segments above (or below) this value
  thresholdMode: "above" | "below";
  intensity: number; // 0..1 — 0 = no sort, 1 = full sort
}

export interface MorphParams {
  amount: number; // 0..1 — 0 = pure source, 1 = pure target
  /** Optional easing: linear | easeinout */
  easing?: "linear" | "easeinout";
}

export interface GlitchParams {
  amount: number; // 0..1
  blockCount: number; // number of horizontal bands to displace
  seed: number;
}

/** RGBA buffer layout. 4 bytes per pixel, row-major. */
export interface RGBABuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}

export function metricValue(px: Uint8ClampedArray, idx: number, metric: SortMetric): number {
  const r = px[idx];
  const g = px[idx + 1];
  const b = px[idx + 2];
  switch (metric) {
    case "brightness":
      return 0.299 * r + 0.587 * g + 0.114 * b;
    case "red":
      return r;
    case "green":
      return g;
    case "blue":
      return b;
    case "hue": {
      const [h] = rgbToHsl(r, g, b);
      return h; // 0..360
    }
    case "saturation": {
      const [, s] = rgbToHsl(r, g, b);
      return s * 255;
    }
  }
}

/**
 * Pixel-sort a buffer.
 * Walks the image line-by-line (horizontal = rows, vertical = cols),
 * splits each line into "sort segments" using a threshold band, and
 * sorts the pixels inside each segment by the chosen metric.
 *
 * Sorts are applied N passes (N scales with intensity) so higher
 * intensity yields longer contiguous streaks.
 */
export function pixelSort(buf: RGBABuffer, params: PixelSortParams): RGBABuffer {
  const { direction, metric, threshold, thresholdMode, intensity } = params;
  if (intensity <= 0) return buf;

  const passes = Math.max(1, Math.round(intensity * 4));
  let current: RGBABuffer = { data: new Uint8ClampedArray(buf.data), width: buf.width, height: buf.height };

  for (let p = 0; p < passes; p++) {
    current = pixelSortPass(current, params);
  }
  return current;
}

function pixelSortPass(buf: RGBABuffer, params: PixelSortParams): RGBABuffer {
  const { direction, metric, threshold, thresholdMode, intensity } = params;
  const { data, width, height } = buf;
  const out = new Uint8ClampedArray(data);
  const lineLen = direction === "horizontal" ? width : height;
  const lineCount = direction === "horizontal" ? height : width;

  for (let line = 0; line < lineCount; line++) {
    let segStart = -1;
    const flushSeg = (end: number) => {
      if (segStart < 0) return;
      const len = end - segStart;
      if (len <= 1) {
        segStart = -1;
        return;
      }
      const indices: number[] = [];
      for (let i = segStart; i < end; i++) indices.push(i);
      indices.sort((a, b) => {
        let va: number;
        let vb: number;
        if (direction === "horizontal") {
          va = metricValue(data, (line * width + a) * 4, metric);
          vb = metricValue(data, (line * width + b) * 4, metric);
        } else {
          va = metricValue(data, (a * width + line) * 4, metric);
          vb = metricValue(data, (b * width + line) * 4, metric);
        }
        return vb - va;
      });
      for (let i = 0; i < indices.length; i++) {
        const srcIdx = indices[i];
        const dstIdx = segStart + i;
        let srcByteOffset: number;
        let dstByteOffset: number;
        if (direction === "horizontal") {
          srcByteOffset = (line * width + srcIdx) * 4;
          dstByteOffset = (line * width + dstIdx) * 4;
        } else {
          srcByteOffset = (srcIdx * width + line) * 4;
          dstByteOffset = (dstIdx * width + line) * 4;
        }
        const a = intensity;
        out[dstByteOffset] = data[srcByteOffset] * a + out[dstByteOffset] * (1 - a);
        out[dstByteOffset + 1] = data[srcByteOffset + 1] * a + out[dstByteOffset + 1] * (1 - a);
        out[dstByteOffset + 2] = data[srcByteOffset + 2] * a + out[dstByteOffset + 2] * (1 - a);
        out[dstByteOffset + 3] = data[srcByteOffset + 3] * a + out[dstByteOffset + 3] * (1 - a);
      }
      segStart = -1;
    };
    for (let i = 0; i < lineLen; i++) {
      let m: number;
      if (direction === "horizontal") {
        m = metricValue(data, (line * width + i) * 4, metric);
      } else {
        m = metricValue(data, (i * width + line) * 4, metric);
      }
      const inBand = thresholdMode === "above" ? m >= threshold : m <= threshold;
      if (inBand) {
        if (segStart < 0) segStart = i;
      } else {
        flushSeg(i);
      }
    }
    flushSeg(lineLen);
  }
  return { data: out, width, height };
}

/** Cross-dissolve between two same-sized buffers. */
export function morph(
  src: RGBABuffer,
  dst: RGBABuffer,
  params: MorphParams
): RGBABuffer {
  let { amount } = params;
  if (params.easing === "easeinout") {
    amount = amount < 0.5 ? 2 * amount * amount : 1 - Math.pow(-2 * amount + 2, 2) / 2;
  }
  const len = Math.min(src.data.length, dst.data.length);
  const out = new Uint8ClampedArray(len);
  for (let i = 0; i < len; i++) {
    out[i] = src.data[i] * (1 - amount) + dst.data[i] * amount;
  }
  return { data: out, width: src.width, height: src.height };
}

/** Random block-shift glitch. */
export function glitch(buf: RGBABuffer, params: GlitchParams): RGBABuffer {
  const { amount, blockCount, seed } = params;
  if (amount <= 0) return buf;
  const { data, width, height } = buf;
  const out = new Uint8ClampedArray(data);
  // simple seeded PRNG (mulberry32)
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let b = 0; b < blockCount; b++) {
    const y = Math.floor(rand() * height);
    const blockH = Math.max(1, Math.floor(rand() * (height * 0.05 + 2)));
    const shift = Math.floor((rand() - 0.5) * width * 0.3 * amount);
    for (let yy = 0; yy < blockH && y + yy < height; yy++) {
      const rowStart = ((y + yy) * width) * 4;
      for (let x = 0; x < width; x++) {
        const sx = (x - shift + width) % width;
        const srcOff = rowStart + sx * 4;
        const dstOff = rowStart + x * 4;
        out[dstOff] = data[srcOff];
        out[dstOff + 1] = data[srcOff + 1];
        out[dstOff + 2] = data[srcOff + 2];
        out[dstOff + 3] = data[srcOff + 3];
      }
    }
  }
  return { data: out, width, height };
}

/** Convenience: render an RGBABuffer onto a canvas 2d context. */
export function drawBuffer(ctx: CanvasRenderingContext2D, buf: RGBABuffer) {
  const imgData = new ImageData(buf.data, buf.width, buf.height);
  ctx.putImageData(imgData, 0, 0);
}

/** Load an HTMLImageElement from a URL, returning a promise. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/** Convert an HTMLImageElement to an RGBABuffer at native resolution. */
export function imageToBuffer(img: HTMLImageElement, maxDim?: number): RGBABuffer {
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (maxDim && Math.max(w, h) > maxDim) {
    const scale = maxDim / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  return { data, width: w, height: h };
}
