import { ALL_GLYPHS } from "./glyphs";
import { DEFAULT_STROKE } from "./stroke-to-path";
import { nanoid } from "./nanoid";
import type { FontProject, GlyphState } from "./font-types";

export const DEFAULT_CANVAS = { width: 360, height: 480 };

function emptyGlyphs(): Record<string, GlyphState> {
  const out: Record<string, GlyphState> = {};
  for (const g of ALL_GLYPHS) {
    out[g.char] = { char: g.char, source: "empty", updatedAt: 0 };
  }
  return out;
}

export function createFontProject(name = "Untitled Font"): FontProject {
  const now = Date.now();
  return {
    id: nanoid(10),
    name,
    author: "",
    createdAt: now,
    updatedAt: now,
    glyphs: emptyGlyphs(),
    strokeOptions: { ...DEFAULT_STROKE },
    metricsOverride: null,
    canvasSize: { ...DEFAULT_CANVAS },
  };
}
