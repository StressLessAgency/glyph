import { getStroke } from "perfect-freehand";

export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  t: number;
}

export interface StrokeOptions {
  size: number;
  thinning: number;
  smoothing: number;
  streamline: number;
  simulatePressure: boolean;
}

export const DEFAULT_STROKE: StrokeOptions = {
  size: 14,
  thinning: 0.55,
  smoothing: 0.55,
  streamline: 0.45,
  simulatePressure: true,
};

/**
 * Turn raw pointer points into the SVG outline of a single stroke.
 * Closes the stroke into a filled path.
 */
export function strokeToSvgPath(
  points: StrokePoint[],
  opts: StrokeOptions = DEFAULT_STROKE
): string {
  if (points.length === 0) return "";
  const outline = getStroke(
    points.map((p) => [p.x, p.y, p.pressure]),
    {
      size: opts.size,
      thinning: opts.thinning,
      smoothing: opts.smoothing,
      streamline: opts.streamline,
      simulatePressure: opts.simulatePressure,
      last: true,
    }
  );
  if (outline.length === 0) return "";
  return outlineToSvgPath(outline);
}

function outlineToSvgPath(pts: number[][]): string {
  const d: (string | number)[] = ["M", pts[0][0], pts[0][1], "Q"];
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    d.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
  }
  d.push("Z");
  return d.join(" ");
}

/** Union of multiple stroke paths concatenated for SVG `d`. */
export function strokesToCompoundPath(
  strokes: StrokePoint[][],
  opts: StrokeOptions = DEFAULT_STROKE
): string {
  return strokes
    .map((s) => strokeToSvgPath(s, opts))
    .filter(Boolean)
    .join(" ");
}

/** Compute bounding box of a set of strokes (raw points). */
export function strokesBBox(strokes: StrokePoint[][]) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const stroke of strokes) {
    for (const p of stroke) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  if (!isFinite(minX)) return null;
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}
