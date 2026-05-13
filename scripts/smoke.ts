/* eslint-disable no-console */
/**
 * Node-side smoke test for pure libs (no DOM).
 * Run: npx tsx scripts/smoke.ts
 */
import * as opentype from "opentype.js";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  parseSvgPath,
  bboxOfCommands,
  transformCommands,
} from "../lib/svg-path";
import { simplifyPolyline } from "../lib/path-simplify";
import {
  deriveMetrics,
  autoSidebearings,
  autoKernAdjust,
} from "../lib/auto-metrics";
import {
  strokeToSvgPath,
  strokesToCompoundPath,
  type StrokePoint,
} from "../lib/stroke-to-path";
import { buildFont } from "../lib/build-font";
import { sfntToWoff } from "../lib/font-wrap";
import { createFontProject } from "../lib/font-project";
import { ALL_GLYPHS, GLYPH_BY_CHAR } from "../lib/glyphs";

let pass = 0;
let fail = 0;
const failures: string[] = [];

function assert(name: string, cond: boolean, detail?: string) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    failures.push(`${name}${detail ? " — " + detail : ""}`);
    console.log(`  ✗ ${name}${detail ? " — " + detail : ""}`);
  }
}

function head(title: string) {
  console.log(`\n· ${title}`);
}

head("svg-path: M/L/Q/C parse + bbox");
{
  const cmds = parseSvgPath("M 10 10 L 100 10 L 100 100 L 10 100 Z");
  assert("rect parses to 5 cmds", cmds.length === 5);
  const bb = bboxOfCommands(cmds);
  assert("rect bbox 90x90", !!bb && bb.width === 90 && bb.height === 90);
}
{
  const cmds = parseSvgPath("M 0 0 q 50 50 100 0");
  assert("relative Q parses", cmds.length === 2);
  assert("Q absolute conversion", cmds[1].type === "Q");
}
{
  const cmds = parseSvgPath("M 0 0 C 10 20 30 40 50 60");
  assert("C parses with control pts", cmds.length === 2 && cmds[1].type === "C");
}
{
  const cmds = parseSvgPath("M 0 0 L 10 10");
  const t = transformCommands(cmds, 2, 2, 5, 5);
  assert(
    "transformCommands scales+translates",
    t[0].type === "M" && (t[0] as { x: number }).x === 5 &&
    t[1].type === "L" && (t[1] as { x: number; y: number }).x === 25 && (t[1] as { y: number }).y === 25
  );
}

head("path-simplify: RDP");
{
  const pts = [
    [0, 0],
    [1, 0.05],
    [2, -0.02],
    [3, 0.04],
    [10, 0],
  ];
  const s = simplifyPolyline(pts, 1.0);
  assert("collapses near-collinear", s.length < pts.length);
  const dense = simplifyPolyline(
    [
      [0, 0],
      [5, 5],
      [10, 0],
      [15, -5],
      [20, 0],
    ],
    0.1
  );
  assert("keeps zig-zag at low tolerance", dense.length >= 4);
}

head("perfect-freehand: stroke → path");
{
  const pts: StrokePoint[] = [
    { x: 50, y: 200, pressure: 0.4, t: 0 },
    { x: 100, y: 100, pressure: 0.6, t: 50 },
    { x: 150, y: 200, pressure: 0.6, t: 100 },
    { x: 200, y: 100, pressure: 0.7, t: 150 },
    { x: 250, y: 200, pressure: 0.5, t: 200 },
  ];
  const d = strokeToSvgPath(pts);
  assert("emits non-empty path d", d.length > 10);
  assert("path starts with M", d.startsWith("M"));
  const compound = strokesToCompoundPath([pts, pts]);
  assert("compound path 2x size", compound.length > d.length);
}

head("auto-metrics");
{
  // Synthetic glyph bboxes (canvas px). Baseline at y=400.
  const drawnA = {
    spec: GLYPH_BY_CHAR.get("A")!,
    bbox: { minX: 50, minY: 100, maxX: 250, maxY: 400, width: 200, height: 300 },
  };
  const drawnX = {
    spec: GLYPH_BY_CHAR.get("x")!,
    bbox: { minX: 60, minY: 220, maxX: 240, maxY: 400, width: 180, height: 180 },
  };
  const drawnG = {
    spec: GLYPH_BY_CHAR.get("g")!,
    bbox: { minX: 60, minY: 220, maxX: 240, maxY: 480, width: 180, height: 260 },
  };
  const m = deriveMetrics([drawnA, drawnX, drawnG]);
  assert("baseline ~ 400", Math.abs(m.baseline - 400) < 1, `got ${m.baseline}`);
  assert("capHeight ~ 300", Math.abs(m.capHeight - 300) < 1, `got ${m.capHeight}`);
  assert("xHeight ~ 180", Math.abs(m.xHeight - 180) < 1, `got ${m.xHeight}`);
  assert("descender ~ 80", Math.abs(m.descender - 80) < 1, `got ${m.descender}`);
  const sb = autoSidebearings(drawnA, m);
  assert("sidebearings positive", sb.left > 0 && sb.right > 0);
  const round = {
    spec: GLYPH_BY_CHAR.get("O")!,
    bbox: { minX: 50, minY: 100, maxX: 250, maxY: 400, width: 200, height: 300 },
  };
  const sbR = autoSidebearings(round, m);
  assert("round letter tighter than square", sbR.left < sb.left);
  const kAV = autoKernAdjust(
    GLYPH_BY_CHAR.get("A")!,
    GLYPH_BY_CHAR.get("V")!,
    m
  );
  assert("AV pair gets negative kern", kAV < 0);
  const kAB = autoKernAdjust(
    GLYPH_BY_CHAR.get("A")!,
    GLYPH_BY_CHAR.get("B")!,
    m
  );
  assert("AB pair zero kern", kAB === 0);
}

head("font build: OTF + roundtrip parse");
{
  const project = createFontProject("Smoke Font");
  project.author = "Tester";

  // Fill a handful of letters with simple drawn rectangles.
  const W = project.canvasSize.width;
  const H = project.canvasSize.height;
  const baseline = H * 0.74;
  const capH = H * 0.62;

  function rectStroke(left: number, right: number, top: number, bottom: number): StrokePoint[] {
    const pts: StrokePoint[] = [];
    const ts = 0;
    for (let x = left; x <= right; x += 4) pts.push({ x, y: top, pressure: 0.55, t: ts });
    for (let y = top; y <= bottom; y += 4) pts.push({ x: right, y, pressure: 0.55, t: ts });
    for (let x = right; x >= left; x -= 4) pts.push({ x, y: bottom, pressure: 0.55, t: ts });
    for (let y = bottom; y >= top; y -= 4) pts.push({ x: left, y, pressure: 0.55, t: ts });
    return pts;
  }

  for (const c of ["A", "B", "C", "a", "b", "c", "1", "."]) {
    const spec = GLYPH_BY_CHAR.get(c)!;
    const top = spec.vAlign === "x" ? baseline - H * 0.4 : baseline - capH;
    const bottom = spec.vAlign === "desc" ? baseline + H * 0.18 : baseline;
    project.glyphs[c] = {
      char: c,
      source: "draw",
      strokes: [rectStroke(W * 0.3, W * 0.7, top, bottom)],
      updatedAt: Date.now(),
    };
  }

  const built = buildFont(project);
  assert(
    "builtGlyphs counts non-empty",
    built.builtGlyphs === 8,
    `got ${built.builtGlyphs}`
  );

  const sfnt = built.font.toArrayBuffer();
  assert("SFNT buffer non-empty", sfnt.byteLength > 1000, `size ${sfnt.byteLength}`);

  // Round-trip: parse the produced font.
  const parsed = opentype.parse(sfnt);
  assert("opentype roundtrip parse", !!parsed && parsed.unitsPerEm === 1000);
  const a = parsed.charToGlyph("A");
  assert(
    "round-tripped 'A' has advance",
    (a.advanceWidth ?? 0) > 0,
    `advance ${a.advanceWidth}`
  );
  assert("round-tripped 'A' has path", (a.path?.commands?.length ?? 0) > 0);

  // Persist for manual inspection.
  const tmpPath = join(tmpdir(), "glyph-smoke.otf");
  writeFileSync(tmpPath, Buffer.from(sfnt));
  console.log(`    OTF written → ${tmpPath}`);

  head("font-wrap: WOFF1");
  const woff = sfntToWoff(sfnt);
  assert("WOFF non-empty", woff.byteLength > 100);
  const sig = new DataView(woff).getUint32(0);
  assert("WOFF signature wOFF (0x774F4646)", sig === 0x774f4646, `got ${sig.toString(16)}`);
  const innerSize = new DataView(woff).getUint32(16);
  assert(
    "WOFF totalSfntSize matches",
    innerSize === sfnt.byteLength,
    `got ${innerSize} vs ${sfnt.byteLength}`
  );
  const woffPath = join(tmpdir(), "glyph-smoke.woff");
  writeFileSync(woffPath, Buffer.from(woff));
  console.log(`    WOFF written → ${woffPath}`);
}

head("charset integrity");
{
  assert("83 glyphs in charset", ALL_GLYPHS.length === 83, `got ${ALL_GLYPHS.length}`);
  assert("'A' lookup works", GLYPH_BY_CHAR.get("A")?.code === 65);
  assert("'a' lookup works", GLYPH_BY_CHAR.get("a")?.code === 97);
  assert("'0' lookup works", GLYPH_BY_CHAR.get("0")?.code === 48);
  assert("'.' lookup works", GLYPH_BY_CHAR.get(".")?.code === 46);
  assert("'g' classified as descender", GLYPH_BY_CHAR.get("g")?.vAlign === "desc");
  assert("'b' classified as ascender", GLYPH_BY_CHAR.get("b")?.vAlign === "cap");
}

console.log(`\n${pass} passed · ${fail} failed`);
if (fail > 0) {
  console.log("Failures:");
  for (const f of failures) console.log("  - " + f);
  process.exit(1);
}
