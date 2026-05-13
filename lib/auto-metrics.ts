import type { GlyphSpec } from "./glyphs";
import type { PathBBox } from "./svg-path";

export interface DrawnGlyph {
  spec: GlyphSpec;
  /** Raw bbox of strokes in canvas (px) units. */
  bbox: PathBBox;
  /** Stroke density: total path length / bbox area (used for sidebearings). */
  density?: number;
}

export interface FontMetrics {
  /** y coordinate of the baseline in canvas px (top-left origin). */
  baseline: number;
  /** Distance baseline → cap-height (px). */
  capHeight: number;
  /** Distance baseline → x-height (px). */
  xHeight: number;
  /** Distance baseline → descender bottom (px, positive value). */
  descender: number;
  /** Distance baseline → ascender top (px, often = capHeight + headroom). */
  ascender: number;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const a = [...xs].sort((p, q) => p - q);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/**
 * Given a set of drawn glyphs, derive coherent baseline / x-height / cap-height
 * / descender values. Works even if some glyphs missing — falls back to ratios.
 */
export function deriveMetrics(glyphs: DrawnGlyph[]): FontMetrics {
  const baselineSamples: number[] = [];
  const capTops: number[] = [];
  const xTops: number[] = [];
  const descBottoms: number[] = [];

  for (const g of glyphs) {
    const { vAlign } = g.spec;
    const top = g.bbox.minY;
    const bot = g.bbox.maxY;
    if (vAlign === "cap") {
      baselineSamples.push(bot);
      capTops.push(top);
    } else if (vAlign === "x") {
      baselineSamples.push(bot);
      xTops.push(top);
    } else if (vAlign === "desc") {
      xTops.push(top);
      descBottoms.push(bot);
    } else if (vAlign === "full") {
      capTops.push(top);
      descBottoms.push(bot);
    }
  }

  const baseline = median(baselineSamples);
  const capTop = capTops.length ? median(capTops) : baseline - 600;
  const xTop = xTops.length ? median(xTops) : baseline - 420;
  const descBot = descBottoms.length ? median(descBottoms) : baseline + 180;

  const capHeight = Math.max(1, baseline - capTop);
  const xHeight = Math.max(1, baseline - xTop);
  const descender = Math.max(1, descBot - baseline);
  const ascender = capHeight + Math.round(capHeight * 0.08);

  return { baseline, capHeight, xHeight, descender, ascender };
}

/**
 * Compute optical sidebearings for one glyph. Returns left + right in canvas px.
 * Round letters (O/C/G/Q/o/c/e/g) get a slightly smaller bearing for visual
 * balance. Density-aware: dense glyphs (M/W) need a bit more room.
 */
export function autoSidebearings(
  glyph: DrawnGlyph,
  metrics: FontMetrics,
  baseBearingRatio = 0.08
): { left: number; right: number } {
  const round = "OCGQUDcoegquds".includes(glyph.spec.char);
  const condensed = "ilIl1.,;:'".includes(glyph.spec.char);
  let bearing = metrics.xHeight * baseBearingRatio;
  if (round) bearing *= 0.7;
  if (condensed) bearing *= 1.4;
  if (glyph.density && glyph.density > 0.025) bearing *= 1.15;
  return { left: bearing, right: bearing };
}

/**
 * Heuristic kerning: open shapes paired with angular shapes get a tighter
 * (negative) advance adjustment proportional to x-height.
 */
export function autoKernAdjust(
  left: GlyphSpec,
  right: GlyphSpec,
  metrics: FontMetrics
): number {
  const openRight = "AVWYTLPF".includes(left.char);
  const openLeft = "AVWYTJ".includes(right.char);
  const tightDot = ".,;:".includes(right.char);
  if ((openRight && openLeft) || (openRight && tightDot))
    return -metrics.xHeight * 0.18;
  if (left.char === "f" && "fil".includes(right.char))
    return -metrics.xHeight * 0.06;
  return 0;
}
