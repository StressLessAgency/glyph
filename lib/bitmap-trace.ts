import { simplifyPolyline } from "./path-simplify";
import type { PathCmd } from "./svg-path";

/**
 * Load an image File, threshold it, and produce SVG-style path commands
 * representing the dark regions. Handles multi-blob letters (i, j, !, etc.).
 *
 * Strategy:
 *   1. Decode → ImageData (max 600px on long edge).
 *   2. Otsu threshold to binary mask.
 *   3. Connected-component labelling (8-conn).
 *   4. For each component above a min area, trace contour with Moore-Neighbor.
 *   5. RDP simplify, emit M / L / ... / Z.
 */
export async function bitmapToCommands(
  file: File,
  opts: {
    minAreaRatio?: number;
    simplifyTolerance?: number;
    maxLongEdge?: number;
  } = {}
): Promise<{ cmds: PathCmd[]; width: number; height: number }> {
  const minAreaRatio = opts.minAreaRatio ?? 0.0008;
  const tolerance = opts.simplifyTolerance ?? 1.4;
  const maxLong = opts.maxLongEdge ?? 600;

  const img = await loadImage(file);
  const scale = Math.min(1, maxLong / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D unavailable");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  const id = ctx.getImageData(0, 0, w, h);
  const lum = toLuminance(id.data, w, h);
  const threshold = otsu(lum);
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < lum.length; i++) {
    mask[i] = lum[i] < threshold ? 1 : 0;
  }

  // Determine dominant ink direction. If >50% of pixels are "dark", invert.
  let darkCount = 0;
  for (let i = 0; i < mask.length; i++) darkCount += mask[i];
  if (darkCount > mask.length * 0.5) {
    for (let i = 0; i < mask.length; i++) mask[i] = mask[i] ? 0 : 1;
  }

  const blobs = labelComponents(mask, w, h);
  const minArea = Math.max(8, Math.floor(w * h * minAreaRatio));
  const cmds: PathCmd[] = [];
  for (const b of blobs) {
    if (b.area < minArea) continue;
    const contour = traceContour(mask, w, h, b.startX, b.startY);
    if (contour.length < 4) continue;
    const simplified = simplifyPolyline(contour, tolerance);
    if (simplified.length < 3) continue;
    cmds.push({ type: "M", x: simplified[0][0], y: simplified[0][1] });
    for (let i = 1; i < simplified.length; i++) {
      cmds.push({ type: "L", x: simplified[i][0], y: simplified[i][1] });
    }
    cmds.push({ type: "Z" });
  }
  return { cmds, width: w, height: h };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image decode failed"));
    };
    img.src = url;
  });
}

function toLuminance(rgba: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let i = 0, p = 0; p < out.length; i += 4, p++) {
    out[p] = (rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) >>> 10;
    // *256/1024 = /4 → approximate luma; refine:
    out[p] = (rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114) | 0;
  }
  return out;
}

function otsu(lum: Uint8Array): number {
  const hist = new Uint32Array(256);
  for (let i = 0; i < lum.length; i++) hist[lum[i]]++;
  const total = lum.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0,
    wB = 0,
    wF = 0,
    maxVar = 0,
    th = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > maxVar) {
      maxVar = v;
      th = t;
    }
  }
  return th;
}

interface Blob {
  area: number;
  startX: number;
  startY: number;
}

function labelComponents(mask: Uint8Array, w: number, h: number): Blob[] {
  const visited = new Uint8Array(mask.length);
  const blobs: Blob[] = [];
  const stack: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (!mask[idx] || visited[idx]) continue;
      let area = 0;
      let sx = x,
        sy = y;
      let bestY = y;
      stack.length = 0;
      stack.push(idx);
      visited[idx] = 1;
      while (stack.length) {
        const i = stack.pop()!;
        const yy = (i / w) | 0;
        const xx = i - yy * w;
        area++;
        if (yy < bestY || (yy === bestY && xx < sx)) {
          sx = xx;
          sy = yy;
          bestY = yy;
        }
        for (let dy = -1; dy <= 1; dy++) {
          const ny = yy + dy;
          if (ny < 0 || ny >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = xx + dx;
            if (nx < 0 || nx >= w) continue;
            const ni = ny * w + nx;
            if (!mask[ni] || visited[ni]) continue;
            visited[ni] = 1;
            stack.push(ni);
          }
        }
      }
      blobs.push({ area, startX: sx, startY: sy });
    }
  }
  return blobs;
}

/**
 * Moore-Neighbor contour tracing starting from the topmost-leftmost pixel.
 * Returns the outline as polyline points.
 */
function traceContour(
  mask: Uint8Array,
  w: number,
  h: number,
  startX: number,
  startY: number
): number[][] {
  const dirs = [
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1],
  ];
  const isFilled = (x: number, y: number) =>
    x >= 0 && x < w && y >= 0 && y < h && mask[y * w + x];

  const pts: number[][] = [];
  let cx = startX,
    cy = startY;
  let dir = 0;
  const maxSteps = w * h * 4;
  let steps = 0;
  pts.push([cx, cy]);

  while (steps++ < maxSteps) {
    let found = false;
    for (let i = 0; i < 8; i++) {
      const d = (dir + 6 + i) % 8; // start from "back-right" of last direction
      const nx = cx + dirs[d][0];
      const ny = cy + dirs[d][1];
      if (isFilled(nx, ny)) {
        cx = nx;
        cy = ny;
        dir = d;
        pts.push([cx, cy]);
        found = true;
        break;
      }
    }
    if (!found) break;
    if (cx === startX && cy === startY && pts.length > 2) break;
  }
  return pts;
}
