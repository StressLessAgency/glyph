"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useFontStore } from "@/stores/font-store";
import { GLYPH_BY_CHAR } from "@/lib/glyphs";
import {
  strokeToSvgPath,
  strokesToCompoundPath,
  type StrokePoint,
} from "@/lib/stroke-to-path";
import { commandsToD } from "@/lib/svg-path";
import { Guidelines } from "./guidelines";
import { cn } from "@/lib/cn";

export function DrawCanvas() {
  const font = useFontStore((s) => s.font);
  const activeChar = useFontStore((s) => s.activeChar);
  const addStroke = useFontStore((s) => s.addStroke);

  const spec = useMemo(() => GLYPH_BY_CHAR.get(activeChar), [activeChar]);
  const w = font?.canvasSize.width ?? 360;
  const h = font?.canvasSize.height ?? 480;
  const glyph = font?.glyphs[activeChar];
  const strokeOpts = font?.strokeOptions;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [livePoints, setLivePoints] = useState<StrokePoint[] | null>(null);
  const drawingRef = useRef(false);
  const tStartRef = useRef(0);

  const getPoint = useCallback(
    (e: React.PointerEvent<SVGSVGElement>): StrokePoint | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * w;
      const y = ((e.clientY - rect.top) / rect.height) * h;
      const pressure =
        e.pressure && e.pressure !== 0.5
          ? e.pressure
          : e.pointerType === "pen"
            ? 0.5
            : 0.5;
      return { x, y, pressure, t: performance.now() - tStartRef.current };
    },
    [w, h]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.button !== 0 && e.pointerType !== "touch" && e.pointerType !== "pen") return;
      e.preventDefault();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      tStartRef.current = performance.now();
      const p = getPoint(e);
      if (!p) return;
      drawingRef.current = true;
      setLivePoints([p]);
    },
    [getPoint]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!drawingRef.current) return;
      const p = getPoint(e);
      if (!p) return;
      setLivePoints((prev) => (prev ? [...prev, p] : [p]));
    },
    [getPoint]
  );

  const finish = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      try {
        (e.target as Element).releasePointerCapture?.(e.pointerId);
      } catch {}
      setLivePoints((current) => {
        if (current && current.length >= 2) {
          addStroke(activeChar, current);
        }
        return null;
      });
    },
    [activeChar, addStroke]
  );

  const committedPath = useMemo(() => {
    if (!glyph || !strokeOpts) return "";
    if (glyph.source === "draw" && glyph.strokes?.length) {
      return strokesToCompoundPath(glyph.strokes, strokeOpts);
    }
    if ((glyph.source === "svg" || glyph.source === "photo") && glyph.commands?.length) {
      return commandsToD(glyph.commands);
    }
    return "";
  }, [glyph, strokeOpts]);

  const livePath = useMemo(() => {
    if (!livePoints || livePoints.length < 2 || !strokeOpts) return "";
    return strokeToSvgPath(livePoints, strokeOpts);
  }, [livePoints, strokeOpts]);

  const hasContent =
    (glyph?.source === "draw" && (glyph?.strokes?.length ?? 0) > 0) ||
    ((glyph?.source === "svg" || glyph?.source === "photo") &&
      (glyph?.commands?.length ?? 0) > 0);

  if (!spec || !font) return null;

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center px-6 py-8 select-none">
      <div
        className="card-light relative aspect-[3/4] w-full max-w-[520px] rounded-2xl border border-border shadow-soft noise overflow-hidden grid-paper"
        style={{ touchAction: "none" }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${w} ${h}`}
          className={cn(
            "absolute inset-0 h-full w-full cursor-crosshair",
            livePoints && "cursor-none"
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finish}
          onPointerCancel={finish}
          onPointerLeave={finish}
        >
          <Guidelines spec={spec} width={w} height={h} />
          {committedPath && (
            <path d={committedPath} fill="var(--color-ink)" fillRule="nonzero" />
          )}
          {livePath && (
            <path d={livePath} fill="var(--color-ink)" fillRule="nonzero" />
          )}
        </svg>
        {/* ambient char watermark */}
        {!hasContent && !livePoints && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center font-serif italic text-fg-subtle/25"
            style={{ fontSize: "min(40vh, 320px)", lineHeight: 1 }}
          >
            {spec.char}
          </div>
        )}
        <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
            Drawing
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg">
            {spec.name}
          </span>
        </div>
        <div className="pointer-events-none absolute right-4 top-4 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
          U+{spec.code.toString(16).toUpperCase().padStart(4, "0")}
        </div>
      </div>
    </div>
  );
}
