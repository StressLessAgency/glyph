import * as opentype from "opentype.js";
import type { FontProject, GlyphState } from "./font-types";
import {
  ALL_GLYPHS,
  GLYPH_BY_CHAR,
  KERN_PAIRS,
  type GlyphSpec,
} from "./glyphs";
import {
  bboxOfCommands,
  parseSvgPath,
  transformCommands,
  type PathCmd,
} from "./svg-path";
import {
  strokesToCompoundPath,
  type StrokeOptions,
} from "./stroke-to-path";
import {
  deriveMetrics,
  autoSidebearings,
  autoKernAdjust,
  type DrawnGlyph,
  type FontMetrics,
} from "./auto-metrics";

const UNITS_PER_EM = 1000;
const TARGET_CAP_HEIGHT_EM = 700;

export interface BuildResult {
  font: opentype.Font;
  metrics: FontMetrics & { scale: number };
  builtGlyphs: number;
}

/** Convert a single GlyphState into absolute SVG path commands. */
export function glyphToCommands(
  state: GlyphState,
  strokeOpts: StrokeOptions
): PathCmd[] | null {
  if (state.source === "empty") return null;
  if (state.source === "svg" || state.source === "photo") {
    return state.commands ?? null;
  }
  if (state.source === "draw" && state.strokes?.length) {
    const d = strokesToCompoundPath(state.strokes, strokeOpts);
    if (!d) return null;
    return parseSvgPath(d);
  }
  return null;
}

/** Build the full opentype.js Font from a FontProject. */
export function buildFont(project: FontProject): BuildResult {
  const drawnGlyphs: DrawnGlyph[] = [];
  const cmdMap = new Map<string, PathCmd[]>();

  for (const spec of ALL_GLYPHS) {
    const state = project.glyphs[spec.char];
    if (!state) continue;
    const cmds = glyphToCommands(state, project.strokeOptions);
    if (!cmds) continue;
    const bb = bboxOfCommands(cmds);
    if (!bb) continue;
    cmdMap.set(spec.char, cmds);
    drawnGlyphs.push({ spec, bbox: bb });
  }

  const rawMetrics = project.metricsOverride ?? deriveMetrics(drawnGlyphs);
  const scale = TARGET_CAP_HEIGHT_EM / rawMetrics.capHeight;

  const otGlyphs: opentype.Glyph[] = [];

  // .notdef
  const notdef = new opentype.Glyph({
    name: ".notdef",
    unicode: 0,
    advanceWidth: 500,
    path: notdefPath(),
  });
  otGlyphs.push(notdef);

  // space
  const spaceAdv = Math.round(rawMetrics.xHeight * scale * 0.5);
  otGlyphs.push(
    new opentype.Glyph({
      name: "space",
      unicode: 32,
      advanceWidth: spaceAdv,
      path: new opentype.Path(),
    })
  );

  for (const spec of ALL_GLYPHS) {
    const state = project.glyphs[spec.char];
    const cmds = cmdMap.get(spec.char);
    const bb = cmds ? bboxOfCommands(cmds) : null;
    if (!cmds || !bb) {
      otGlyphs.push(emptyGlyph(spec, spaceAdv));
      continue;
    }
    const drawn: DrawnGlyph = { spec, bbox: bb };
    const auto = autoSidebearings(drawn, rawMetrics);
    const leftPx = state?.bearings?.left ?? auto.left;
    const rightPx = state?.bearings?.right ?? auto.right;

    // Coordinate transform:
    //   src: canvas px, top-left origin, y down.
    //   dst: opentype em, baseline origin, y up.
    // x_dst = (x_src - bb.minX + leftPx) * scale
    // y_dst = (rawMetrics.baseline - y_src) * scale
    const tx = (-bb.minX + leftPx) * scale;
    const ty = rawMetrics.baseline * scale;
    const transformed = transformCommands(cmds, scale, -scale, tx, ty);

    const path = commandsToOpenTypePath(transformed);
    const advanceWidth = Math.round((bb.width + leftPx + rightPx) * scale);

    otGlyphs.push(
      new opentype.Glyph({
        name: glyphName(spec),
        unicode: spec.code,
        advanceWidth,
        path,
      })
    );
  }

  const ascender = Math.round(rawMetrics.ascender * scale);
  const descender = -Math.round(rawMetrics.descender * scale);

  const fontName = sanitize(project.name || "Untitled");
  const font = new opentype.Font({
    familyName: project.name || "Untitled",
    styleName: "Regular",
    unitsPerEm: UNITS_PER_EM,
    ascender,
    descender,
    glyphs: otGlyphs,
    designer: project.author || undefined,
  });
  const familyName = project.name || "Untitled";
  const author = project.author || "Glyph Studio";
  const platforms = ["macintosh", "windows", "unicode"] as const;
  type NameTable = {
    fontFamily?: { en: string };
    fontSubfamily?: { en: string };
    fullName?: { en: string };
    postScriptName?: { en: string };
    designer?: { en: string };
    manufacturer?: { en: string };
  };
  type NamesShape = Record<(typeof platforms)[number], NameTable | undefined>;
  const names = font.names as unknown as NamesShape;
  for (const p of platforms) {
    names[p] = names[p] ?? {};
    const t = names[p] as NameTable;
    t.fontFamily = { en: familyName };
    t.fontSubfamily = { en: "Regular" };
    t.fullName = { en: familyName };
    t.postScriptName = { en: fontName };
    t.designer = { en: author };
    t.manufacturer = { en: "Glyph Studio" };
  }

  // Kerning (auto pairs).
  const kernTable: Record<string, Record<string, number>> = {};
  for (const [l, r] of KERN_PAIRS) {
    const ls = GLYPH_BY_CHAR.get(l);
    const rs = GLYPH_BY_CHAR.get(r);
    if (!ls || !rs) continue;
    if (!cmdMap.has(l) || !cmdMap.has(r)) continue;
    const adj = autoKernAdjust(ls, rs, rawMetrics);
    if (Math.abs(adj) < 0.5) continue;
    kernTable[String(ls.code)] = kernTable[String(ls.code)] ?? {};
    kernTable[String(ls.code)][String(rs.code)] = Math.round(adj * scale);
  }
  (font as unknown as { kerningPairs: Record<string, number> }).kerningPairs =
    flattenKern(kernTable);

  return {
    font,
    metrics: { ...rawMetrics, scale },
    builtGlyphs: drawnGlyphs.length,
  };
}

function flattenKern(t: Record<string, Record<string, number>>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of Object.keys(t)) {
    for (const r of Object.keys(t[l])) {
      out[`${l},${r}`] = t[l][r];
    }
  }
  return out;
}

function emptyGlyph(spec: GlyphSpec, spaceAdv: number): opentype.Glyph {
  return new opentype.Glyph({
    name: glyphName(spec),
    unicode: spec.code,
    advanceWidth: spaceAdv,
    path: new opentype.Path(),
  });
}

function notdefPath(): opentype.Path {
  const p = new opentype.Path();
  p.moveTo(80, 0);
  p.lineTo(80, 700);
  p.lineTo(420, 700);
  p.lineTo(420, 0);
  p.closePath();
  p.moveTo(140, 60);
  p.lineTo(360, 60);
  p.lineTo(360, 640);
  p.lineTo(140, 640);
  p.closePath();
  return p;
}

function commandsToOpenTypePath(cmds: PathCmd[]): opentype.Path {
  const p = new opentype.Path();
  for (const c of cmds) {
    if (c.type === "M") p.moveTo(c.x, c.y);
    else if (c.type === "L") p.lineTo(c.x, c.y);
    else if (c.type === "Q") p.quadraticCurveTo(c.x1, c.y1, c.x, c.y);
    else if (c.type === "C") p.curveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y);
    else if (c.type === "Z") p.closePath();
  }
  return p;
}

const POSTSCRIPT_NAMES: Record<string, string> = {
  " ": "space",
  ".": "period",
  ",": "comma",
  ";": "semicolon",
  ":": "colon",
  "!": "exclam",
  "?": "question",
  "'": "quotesingle",
  '"': "quotedbl",
  "(": "parenleft",
  ")": "parenright",
  "-": "hyphen",
  "—": "emdash",
  "/": "slash",
  "&": "ampersand",
  "@": "at",
  "#": "numbersign",
  "$": "dollar",
  "%": "percent",
  "+": "plus",
  "=": "equal",
  "*": "asterisk",
};

function glyphName(spec: GlyphSpec): string {
  if (POSTSCRIPT_NAMES[spec.char]) return POSTSCRIPT_NAMES[spec.char];
  if (spec.category === "digit") {
    const names = [
      "zero",
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
    ];
    return names[Number(spec.char)] ?? `u${spec.code.toString(16).padStart(4, "0")}`;
  }
  if (spec.category === "uppercase") return spec.char;
  if (spec.category === "lowercase") return spec.char;
  return `u${spec.code.toString(16).padStart(4, "0")}`;
}

function sanitize(name: string): string {
  return name.replace(/[^A-Za-z0-9]/g, "") || "GlyphFont";
}

export function fontToArrayBuffer(font: opentype.Font): ArrayBuffer {
  return font.toArrayBuffer();
}
