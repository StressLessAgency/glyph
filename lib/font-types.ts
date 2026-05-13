import type { StrokePoint, StrokeOptions } from "./stroke-to-path";
import type { PathCmd } from "./svg-path";

/**
 * Per-glyph state. Source-of-truth shape is stored as:
 *  - strokes (perfect-freehand input pts) for drawn glyphs, OR
 *  - commands (parsed SVG path) for uploaded SVG / photo-segmented glyphs.
 *
 * Both live in canvas px with the canvas's logical viewport coords. The export
 * pipeline maps them into em-space at build time.
 */
export interface GlyphState {
  char: string;
  source: "draw" | "svg" | "photo" | "empty";
  strokes?: StrokePoint[][];
  commands?: PathCmd[];
  /** User-edited overrides for sidebearings (em units). undefined = auto. */
  bearings?: { left?: number; right?: number };
  /** When this glyph was last touched. */
  updatedAt: number;
}

export interface FontProject {
  id: string;
  name: string;
  author: string;
  createdAt: number;
  updatedAt: number;
  /** Per-glyph state, keyed by char. */
  glyphs: Record<string, GlyphState>;
  /** Active stroke options for new strokes. */
  strokeOptions: StrokeOptions;
  /**
   * Optional override metrics. If null, metrics are derived automatically from
   * existing glyphs each build.
   */
  metricsOverride?: {
    baseline: number;
    capHeight: number;
    xHeight: number;
    descender: number;
    ascender: number;
  } | null;
  /** Default canvas size used when each glyph was drawn. */
  canvasSize: { width: number; height: number };
}
