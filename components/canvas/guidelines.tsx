"use client";

import { useMemo } from "react";
import type { GlyphSpec } from "@/lib/glyphs";

/**
 * Background guideline layer. Shows baseline + helper lines tuned to the
 * vAlign category of the active glyph.
 */
export function Guidelines({
  spec,
  width,
  height,
  baselineRatio = 0.74,
  capHeightRatio = 0.62,
  xHeightRatio = 0.4,
  descenderRatio = 0.18,
}: {
  spec: GlyphSpec;
  width: number;
  height: number;
  baselineRatio?: number;
  capHeightRatio?: number;
  xHeightRatio?: number;
  descenderRatio?: number;
}) {
  const lines = useMemo(() => {
    const baseline = height * baselineRatio;
    const capTop = baseline - height * capHeightRatio;
    const xTop = baseline - height * xHeightRatio;
    const desc = baseline + height * descenderRatio;
    return { baseline, capTop, xTop, desc };
  }, [height, baselineRatio, capHeightRatio, xHeightRatio, descenderRatio]);

  const showCap = spec.vAlign === "cap" || spec.vAlign === "full";
  const showX = spec.vAlign === "x" || spec.vAlign === "desc";
  const showDesc = spec.vAlign === "desc" || spec.vAlign === "full";

  const labelStyle = {
    fontFamily: "var(--font-jetbrains)",
    fontSize: 9,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    fill: "hsl(220 6% 58%)",
  };

  return (
    <g pointerEvents="none">
      {/* page margin */}
      <rect
        x={20}
        y={20}
        width={width - 40}
        height={height - 40}
        fill="none"
        stroke="hsl(220 15% 8% / 0.06)"
        strokeDasharray="3 4"
        rx={8}
      />

      {/* baseline */}
      <line
        x1={20}
        y1={lines.baseline}
        x2={width - 20}
        y2={lines.baseline}
        stroke="hsl(15 88% 52% / 0.55)"
        strokeWidth={1}
      />
      <text x={width - 24} y={lines.baseline - 4} textAnchor="end" style={labelStyle} fill="hsl(15 88% 52% / 0.85)">
        baseline
      </text>

      {/* cap or x */}
      {showCap && (
        <>
          <line
            x1={20}
            y1={lines.capTop}
            x2={width - 20}
            y2={lines.capTop}
            stroke="hsl(220 15% 8% / 0.14)"
            strokeDasharray="2 4"
          />
          <text x={24} y={lines.capTop - 4} style={labelStyle}>
            cap height
          </text>
        </>
      )}
      {showX && (
        <>
          <line
            x1={20}
            y1={lines.xTop}
            x2={width - 20}
            y2={lines.xTop}
            stroke="hsl(220 15% 8% / 0.14)"
            strokeDasharray="2 4"
          />
          <text x={24} y={lines.xTop - 4} style={labelStyle}>
            x-height
          </text>
        </>
      )}
      {showDesc && (
        <>
          <line
            x1={20}
            y1={lines.desc}
            x2={width - 20}
            y2={lines.desc}
            stroke="hsl(220 15% 8% / 0.14)"
            strokeDasharray="2 4"
          />
          <text x={24} y={lines.desc + 12} style={labelStyle}>
            descender
          </text>
        </>
      )}
    </g>
  );
}
