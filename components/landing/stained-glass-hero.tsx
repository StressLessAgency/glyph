"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Delaunay } from "d3-delaunay";

const NUM_SHARDS = 64;
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
  const cols = 10;
  const rows = 7;
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

    // Initial velocity: radial outward, with cone spread + speed variance.
    const radialX = dx / dist;
    const radialY = dy / dist;
    const baseAngle = Math.atan2(radialY, radialX);
    const angleSpread = (rand() - 0.5) * 0.55; // ±0.275 rad ≈ ±15°
    const launchAngle = baseAngle + angleSpread;
    const speed = 380 + rand() * 720; // 380–1100 px/s
    let vx = Math.cos(launchAngle) * speed;
    let vy = Math.sin(launchAngle) * speed;
    // Upper-half shards get an upward kick so they arc before falling.
    if (cy < cyCenter) vy -= 280 + rand() * 280;
    // Lower-half shards already get gravity acceleration; reduce upward bias.

    // Angular velocity — tumble. Sign mostly matches drift direction.
    const omega = (rand() - 0.5) * 1100; // -550..550 deg/s

    // Cascade: edges break a touch later than middle, with randomness.
    const delay = (1 - dist / maxDist) * 0.12 + rand() * 0.22;

    const jitterX = (rand() - 0.5) * 8;
    const jitterY = (rand() - 0.5) * 8;
    const endScale = 0.55 + rand() * 0.3;

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

const GRAVITY = 2400; // px/s²
const SHATTER_DURATION_S = 1.55;

function shardKeyframes(s: Shard) {
  const T = SHATTER_DURATION_S;
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
  src?: string;
  holdMs?: number;
  onShattered?: () => void;
}

const FADE_IN_MS = 450;
const SHATTER_DURATION_MS = SHATTER_DURATION_S * 1000;

/**
 * Full-viewport stained-glass curtain. Renders above all page content, holds
 * for `holdMs`, then explodes outward into irregular Voronoi shards revealing
 * the site behind.
 */
export function StainedGlassHero({
  src = "/hero-stained.jpg",
  holdMs = 1600,
  onShattered,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const shards = useMemo(buildShards, []);
  const [phase, setPhase] = useState<"in" | "hold" | "shatter" | "gone">("in");
  const ran = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (ran.current) return;
    ran.current = true;
    const t1 = window.setTimeout(() => setPhase("hold"), FADE_IN_MS);
    const t2 = window.setTimeout(() => setPhase("shatter"), FADE_IN_MS + holdMs);
    const t3 = window.setTimeout(() => {
      setPhase("gone");
      onShattered?.();
    }, FADE_IN_MS + holdMs + SHATTER_DURATION_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [mounted, holdMs, onShattered]);

  if (!mounted) return null;
  if (phase === "gone") return null;

  const shattering = phase === "shatter";

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[200] overflow-hidden pointer-events-none"
    >
      {/* Hidden image keeps the asset hot in the browser cache. */}
      <link rel="preload" as="image" href={src} />
      {shards.map((s, i) => {
        const kf = shardKeyframes(s);
        return (
          <motion.div
            key={i}
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${src})`,
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
                    duration: SHATTER_DURATION_S,
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
