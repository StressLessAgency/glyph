"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Delaunay } from "d3-delaunay";

const NUM_SHARDS = 240;
const SEED = 8821;
// Generation viewport in normalized units (0–1000 x, 0–700 y).
const W = 1000;
const H = 700;

interface Shard {
  /** SVG polygon points string in absolute viewport %. */
  clip: string;
  /** Centroid in 0..100 % coords. */
  cx: number;
  cy: number;
  /** Initial velocity at launch (px/s). */
  vx: number;
  vy: number;
  /** Angular velocity (deg/s). */
  omega: number;
  /** Per-shard launch stagger (s). */
  delay: number;
  /** Micro-jitter pre-launch px. */
  jitterX: number;
  jitterY: number;
  /** Final scale to ease toward (varies 0.4-0.85). */
  endScale: number;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildShards(): Shard[] {
  const rand = mulberry32(SEED);
  // Jittered grid seed points produce more even-sized shards than pure random.
  const cols = 20;
  const rows = 14;
  const pts: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const jx = (rand() - 0.5) * (W / cols) * 0.85;
      const jy = (rand() - 0.5) * (H / rows) * 0.85;
      pts.push([
        (c + 0.5) * (W / cols) + jx,
        (r + 0.5) * (H / rows) + jy,
      ]);
    }
  }
  // Trim to NUM_SHARDS by sampling.
  const sampled =
    pts.length <= NUM_SHARDS
      ? pts
      : pts.filter((_, i) => i % Math.ceil(pts.length / NUM_SHARDS) === 0).slice(0, NUM_SHARDS);

  const d = Delaunay.from(sampled);
  const v = d.voronoi([0, 0, W, H]);

  const shards: Shard[] = [];
  const cxCenter = W / 2;
  const cyCenter = H / 2;
  const maxDist = Math.hypot(cxCenter, cyCenter);
  for (let i = 0; i < sampled.length; i++) {
    const poly = v.cellPolygon(i);
    if (!poly) continue;
    const clip = poly
      .map(([x, y]) => `${((x / W) * 100).toFixed(2)}% ${((y / H) * 100).toFixed(2)}%`)
      .join(", ");
    let sx = 0;
    let sy = 0;
    for (const [x, y] of poly) {
      sx += x;
      sy += y;
    }
    const cx = sx / poly.length;
    const cy = sy / poly.length;
    const dx = cx - cxCenter;
    const dy = cy - cyCenter;
    const dist = Math.hypot(dx, dy) || 1;

    // Crumble feel: minimal outward push, mostly straight down with light drift.
    // Pieces detach and fall under gravity instead of exploding.
    const vx = (rand() - 0.5) * 80; // -40..40 px/s lateral drift
    const vy = rand() * 60; // 0..60 px/s initial downward
    const omega = (rand() - 0.5) * 220; // -110..110 deg/s — gentle tumble

    // Cascade: center disintegrates first, edges crumble last.
    const distRatio = dist / maxDist; // 0=center, 1=corner
    const delay = distRatio * 2.4 + rand() * 0.4;

    const jitterX = (rand() - 0.5) * 4;
    const jitterY = (rand() - 0.5) * 4;
    const endScale = 0.7 + rand() * 0.2;

    shards.push({
      clip: `polygon(${clip})`,
      cx: (cx / W) * 100,
      cy: (cy / H) * 100,
      vx,
      vy,
      omega,
      delay,
      jitterX,
      jitterY,
      endScale,
    });
  }
  return shards;
}

const GRAVITY = 900; // px/s² — gentler than freefall, sand-like
const SHARD_FALL_S = 3.6; // each shard's own fall duration
const MAX_STAGGER_S = 2.8; // last shards detach this long after first
const SHATTER_DURATION_S = SHARD_FALL_S + MAX_STAGGER_S; // total intro tail

function shardKeyframes(s: Shard) {
  const T = SHARD_FALL_S;
  // Three keyframes — t=0, t=T/2, t=T — with gravity-integrated positions.
  const t1 = T / 2;
  const t2 = T;
  const x1 = s.vx * t1;
  const x2 = s.vx * t2;
  const y1 = s.vy * t1 + 0.5 * GRAVITY * t1 * t1;
  const y2 = s.vy * t2 + 0.5 * GRAVITY * t2 * t2;
  const r1 = s.omega * t1;
  const r2 = s.omega * t2;
  return {
    x: [s.jitterX, x1, x2],
    y: [s.jitterY, y1, y2],
    rotate: [0, r1, r2],
    scale: [1, 0.9, s.endScale],
    opacity: [1, 1, 0],
  };
}

interface Props {
  /** Base image name (without extension). Loader picks AVIF > WebP > JPG. */
  src?: string;
  holdMs?: number;
  /** Fires when shatter phase begins (good for crossfading to a follow-up bg). */
  onShatterStart?: () => void;
  /** Fires when all shards have flown off-screen. */
  onShattered?: () => void;
}

/**
 * CSS `image-set()` lets the browser pick the smallest format it supports.
 * AVIF ~168KB, WebP ~214KB, JPG ~261KB fallback.
 */
function backgroundImageSet(base: string): string {
  return [
    `url("${base}.avif") type("image/avif")`,
    `url("${base}.webp") type("image/webp")`,
    `url("${base}.opt.jpg") type("image/jpeg")`,
  ]
    .map((s) => s)
    .join(", ");
}

const FADE_IN_MS = 450;
const SHATTER_DURATION_MS = SHATTER_DURATION_S * 1000;

/**
 * Full-viewport stained-glass curtain. Renders above all page content, holds
 * for `holdMs`, then explodes outward into irregular Voronoi shards revealing
 * the site behind.
 */
export function StainedGlassHero({
  src = "/hero-stained",
  holdMs = 1600,
  onShatterStart,
  onShattered,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const shards = useMemo(buildShards, []);
  const [phase, setPhase] = useState<"in" | "hold" | "shatter" | "gone">("in");
  // Stash callbacks in refs so the timer effect never re-fires on parent renders.
  const onShatterStartRef = useRef(onShatterStart);
  const onShatteredRef = useRef(onShattered);
  onShatterStartRef.current = onShatterStart;
  onShatteredRef.current = onShattered;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const t1 = window.setTimeout(() => setPhase("hold"), FADE_IN_MS);
    const t2 = window.setTimeout(() => {
      setPhase("shatter");
      onShatterStartRef.current?.();
    }, FADE_IN_MS + holdMs);
    const t3 = window.setTimeout(() => {
      setPhase("gone");
      onShatteredRef.current?.();
    }, FADE_IN_MS + holdMs + SHATTER_DURATION_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [mounted, holdMs]);

  if (!mounted) return null;
  if (phase === "gone") return null;

  const shattering = phase === "shatter";

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[200] overflow-hidden pointer-events-none"
    >
      {/* Preload modern format with type hint so browser picks AVIF if supported. */}
      <link
        rel="preload"
        as="image"
        href={`${src}.avif`}
        type="image/avif"
        imageSrcSet={`${src}.avif`}
      />
      {shards.map((s, i) => {
        const kf = shardKeyframes(s);
        return (
          <motion.div
            key={i}
            className="absolute inset-0"
            style={{
              backgroundImage: `image-set(${backgroundImageSet(src)})`,
              backgroundSize: "cover",
              backgroundPosition: "center center",
              clipPath: s.clip,
              WebkitClipPath: s.clip,
              transformOrigin: `${s.cx}% ${s.cy}%`,
              willChange: "transform, opacity",
              boxShadow: "inset 0 0 0 0.5px rgba(0,18,25,0.3)",
            }}
            initial={{ opacity: 0, scale: 1.005, x: 0, y: 0, rotate: 0 }}
            animate={
              shattering
                ? kf
                : { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }
            }
            transition={
              shattering
                ? {
                    delay: s.delay,
                    duration: SHARD_FALL_S,
                    ease: "linear",
                    times: [0, 0.5, 1],
                  }
                : {
                    duration: FADE_IN_MS / 1000,
                    ease: [0.16, 1, 0.3, 1],
                  }
            }
          />
        );
      })}

      {/* Outer leading — animated SVG lines that trace shard edges, fade on shatter */}
      <motion.div
        className="absolute inset-0 mix-blend-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: shattering ? 0 : 0.06 }}
        transition={{ duration: 0.5 }}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 240 240' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
