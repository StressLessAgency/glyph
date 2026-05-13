"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RotateCcw, PenTool } from "lucide-react";
import {
  DEFAULT_STROKE,
  strokeToSvgPath,
  strokesToCompoundPath,
  type StrokePoint,
} from "@/lib/stroke-to-path";

const W = 1000;
const H = 560;
const TRAIL_LIFE = 650;

interface TrailDot {
  x: number;
  y: number;
  born: number;
  color: string;
}

const TRAIL_PALETTE = ["#EE9B00", "#CA6702", "#BB3E03", "#0A9396", "#94D2BD"];

/**
 * Hero canvas. Designer can immediately scribble. Pre-seeded with the word
 * "glyph" written in ink. Erasing reveals an invitation to draw.
 */
export function InkScribble() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  // Empty on first render to avoid SSR/CSR floating-point drift on path "d".
  const [strokes, setStrokes] = useState<StrokePoint[][]>([]);
  const [live, setLive] = useState<StrokePoint[] | null>(null);
  const drawingRef = useRef(false);
  const tStartRef = useRef(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const trailRef = useRef<TrailDot[]>([]);
  const trailIdxRef = useRef(0);
  const trailCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const trailRafRef = useRef<number | null>(null);
  const trailDirtyRef = useRef(false);

  useEffect(() => {
    setStrokes(seedStrokes());
  }, []);

  // rAF trail renderer — no React renders per move event.
  useEffect(() => {
    const canvas = trailCanvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width * dpr);
      canvas.height = Math.max(1, rect.height * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const now = performance.now();
      const cutoff = now - TRAIL_LIFE;
      const alive: TrailDot[] = [];
      for (const d of trailRef.current) if (d.born > cutoff) alive.push(d);
      trailRef.current = alive;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (alive.length > 0) {
        const cw = canvas.width;
        const ch = canvas.height;
        ctx.globalCompositeOperation = "source-over";
        for (let i = 0; i < alive.length; i++) {
          const d = alive[i];
          const age = (now - d.born) / TRAIL_LIFE;
          const a = Math.max(0, 1 - age);
          const r = ((1 - age) * 9 + 2) * dpr;
          const x = (d.x / W) * cw;
          const y = (d.y / H) * ch;
          ctx.fillStyle = withAlpha(d.color, a * 0.55);
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
        trailDirtyRef.current = true;
      } else if (trailDirtyRef.current) {
        trailDirtyRef.current = false;
      }
      trailRafRef.current = requestAnimationFrame(draw);
    };
    trailRafRef.current = requestAnimationFrame(draw);
    return () => {
      if (trailRafRef.current) cancelAnimationFrame(trailRafRef.current);
      ro.disconnect();
    };
  }, []);

  const getPoint = useCallback(
    (e: React.PointerEvent<SVGSVGElement>): StrokePoint | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * W;
      const y = ((e.clientY - rect.top) / rect.height) * H;
      return { x, y, pressure: e.pressure || 0.5, t: performance.now() - tStartRef.current };
    },
    []
  );

  const start = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.pointerType !== "touch" && e.pointerType !== "pen") return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    tStartRef.current = performance.now();
    const p = getPoint(e);
    if (!p) return;
    drawingRef.current = true;
    setLive([p]);
    setHasInteracted(true);
  };

  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drawingRef.current) {
      // Idle hover: push trail dot to ref (rAF picks it up, no React render).
      const p = getPoint(e);
      if (!p) return;
      const color = TRAIL_PALETTE[trailIdxRef.current % TRAIL_PALETTE.length];
      trailIdxRef.current += 1;
      trailRef.current.push({ x: p.x, y: p.y, born: performance.now(), color });
      if (trailRef.current.length > 80) trailRef.current.shift();
      return;
    }
    const p = getPoint(e);
    if (!p) return;
    setLive((prev) => (prev ? [...prev, p] : [p]));
  };

  const finish = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    try {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
    } catch {}
    setLive((current) => {
      if (current && current.length >= 2) {
        setStrokes((prev) => [...prev, current]);
      }
      return null;
    });
  };

  const committed = useMemo(
    () => strokesToCompoundPath(strokes, DEFAULT_STROKE),
    [strokes]
  );
  const livePath = useMemo(
    () => (live && live.length >= 2 ? strokeToSvgPath(live, DEFAULT_STROKE) : ""),
    [live]
  );

  const clear = () => {
    setStrokes([]);
    setLive(null);
    setHasInteracted(true);
  };

  const isEmpty = strokes.length === 0 && !live;

  return (
    <div className="relative mx-auto aspect-[16/9] w-full overflow-hidden rounded-3xl border border-border bg-bg shadow-pop">
      <div className="absolute inset-0 grid-paper" aria-hidden />
      {/* baseline + guides */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <line x1="80" y1={H * 0.74} x2={W - 80} y2={H * 0.74} stroke="rgba(238,155,0,0.5)" strokeWidth="0.8" />
        <line x1="80" y1={H * 0.42} x2={W - 80} y2={H * 0.42} stroke="rgba(0,18,25,0.1)" strokeDasharray="3 5" strokeWidth="0.6" />
        <line x1="80" y1={H * 0.58} x2={W - 80} y2={H * 0.58} stroke="rgba(0,18,25,0.1)" strokeDasharray="3 5" strokeWidth="0.6" />
      </svg>

      {/* interactive surface */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={finish}
        onPointerLeave={finish}
      >
        {committed && <path d={committed} fill="var(--color-ocean)" fillRule="nonzero" />}
        {livePath && <path d={livePath} fill="var(--color-ocean)" fillRule="nonzero" />}
      </svg>

      {/* Trail canvas overlays the SVG but doesn't intercept pointer events. */}
      <canvas
        ref={trailCanvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden
      />

      {/* empty-state invite */}
      <AnimatePresence>
        {isEmpty && (
          <motion.div
            key="invite"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-bg/80 px-4 py-2 text-fg-muted shadow-soft backdrop-blur">
              <PenTool className="h-3.5 w-3.5" />
              <span className="font-serif italic text-[18px]">Draw something here.</span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
              Stylus, finger, mouse — all good.
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HUD */}
      <div className="pointer-events-none absolute left-5 top-5 flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
          Canvas · live
        </span>
      </div>
      <div className="pointer-events-none absolute right-5 top-5 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
        {strokes.length + (live ? 1 : 0)} stroke{strokes.length + (live ? 1 : 0) === 1 ? "" : "s"}
      </div>
      <div className="pointer-events-none absolute left-5 bottom-5 font-mono text-[10px] uppercase tracking-[0.18em] text-accent/80">
        BASELINE
      </div>

      {/* reset */}
      <AnimatePresence>
        {hasInteracted && (
          <motion.button
            key="reset"
            type="button"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            onClick={clear}
            className="absolute right-5 bottom-5 inline-flex items-center gap-1.5 rounded-md bg-bg/80 px-2.5 py-1.5 text-[11px] font-mono text-fg-muted shadow-soft backdrop-blur hover:text-fg hover:bg-bg transition"
          >
            <RotateCcw className="h-3 w-3" />
            CLEAR
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function seedStrokes(): StrokePoint[][] {
  // Pre-baked "glyph" handwriting. Approximate but feels alive.
  const t = (n: number) => n * 30;
  const mk = (pts: [number, number, number?][]): StrokePoint[] =>
    pts.map(([x, y, p], i) => ({ x, y, pressure: p ?? 0.5, t: t(i) }));

  return [
    // g
    mk([
      [200, 280, 0.4],
      [180, 250, 0.6],
      [170, 220, 0.7],
      [180, 200, 0.8],
      [210, 195, 0.8],
      [240, 210, 0.7],
      [250, 240, 0.6],
      [240, 270, 0.5],
      [215, 285, 0.5],
      [195, 280, 0.55],
      [180, 270, 0.5],
    ]),
    mk([
      [250, 240, 0.5],
      [255, 280, 0.55],
      [255, 330, 0.6],
      [245, 380, 0.6],
      [220, 415, 0.55],
      [185, 420, 0.5],
      [155, 405, 0.45],
      [145, 380, 0.4],
    ]),
    // l
    mk([
      [320, 160, 0.55],
      [325, 200, 0.6],
      [325, 240, 0.65],
      [322, 280, 0.6],
      [318, 320, 0.55],
      [312, 375, 0.5],
    ]),
    // y
    mk([
      [395, 230, 0.55],
      [385, 270, 0.6],
      [390, 310, 0.6],
      [410, 335, 0.55],
      [440, 335, 0.5],
      [465, 320, 0.5],
      [475, 280, 0.55],
      [478, 240, 0.6],
    ]),
    mk([
      [478, 240, 0.55],
      [475, 290, 0.55],
      [465, 350, 0.55],
      [445, 400, 0.5],
      [415, 425, 0.45],
      [380, 430, 0.4],
      [355, 415, 0.4],
    ]),
    // p
    mk([
      [555, 240, 0.55],
      [550, 290, 0.6],
      [548, 340, 0.6],
      [548, 390, 0.55],
      [548, 430, 0.5],
    ]),
    mk([
      [555, 240, 0.55],
      [590, 220, 0.65],
      [625, 230, 0.7],
      [645, 260, 0.7],
      [645, 295, 0.65],
      [625, 325, 0.6],
      [590, 335, 0.55],
      [560, 325, 0.5],
    ]),
    // h
    mk([
      [710, 160, 0.55],
      [705, 200, 0.6],
      [700, 245, 0.65],
      [695, 290, 0.65],
      [690, 330, 0.6],
      [685, 375, 0.55],
    ]),
    mk([
      [705, 255, 0.55],
      [725, 230, 0.6],
      [760, 220, 0.65],
      [795, 235, 0.65],
      [805, 270, 0.6],
      [800, 310, 0.55],
      [793, 350, 0.55],
      [787, 380, 0.5],
    ]),
  ];
}

function withAlpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}
