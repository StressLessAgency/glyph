"use client";

import { useEffect, useRef } from "react";

/**
 * Single-canvas pebble fall. All pebbles drawn in one paint per frame.
 *
 * Per pebble we pre-bake a tiny offscreen canvas (the stained-glass image
 * clipped to the pebble's polygon shape, sampled at the pebble's random color
 * region). Per frame the main canvas blits the sprite with rotation +
 * translation. No layout, no per-pebble paint — only composite.
 */

type Pt = readonly [number, number];

/** Hand-tuned irregular shard polygons (12 variants) in 0..1 unit space. */
const SHAPES: Pt[][] = [
  [
    [0.5, 0],
    [1, 1],
    [0, 1],
  ],
  [
    [0, 0],
    [1, 0.25],
    [0.8, 1],
    [0.1, 0.9],
  ],
  [
    [0.2, 0],
    [1, 0],
    [1, 0.8],
    [0.3, 1],
    [0, 0.6],
  ],
  [
    [0.1, 0.1],
    [0.9, 0],
    [1, 0.7],
    [0.6, 1],
    [0, 0.8],
  ],
  [
    [0, 0.3],
    [0.5, 0],
    [1, 0.4],
    [0.8, 1],
    [0.2, 1],
  ],
  [
    [0.3, 0],
    [1, 0.3],
    [0.7, 1],
    [0, 0.7],
  ],
  [
    [0, 0],
    [0.8, 0.1],
    [1, 0.8],
    [0.5, 1],
    [0, 0.6],
  ],
  [
    [0.1, 0],
    [1, 0.2],
    [0.9, 0.9],
    [0, 0.8],
  ],
  [
    [0.4, 0],
    [1, 0.5],
    [0.6, 1],
    [0, 0.5],
  ],
  [
    [0, 0.2],
    [0.6, 0],
    [1, 0.3],
    [0.9, 1],
    [0.2, 0.9],
  ],
  [
    [0.3, 0.1],
    [1, 0],
    [1, 0.9],
    [0, 1],
  ],
  [
    [0, 0],
    [1, 0.4],
    [0.7, 1],
    [0, 0.7],
  ],
];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

interface Pebble {
  sprite: HTMLCanvasElement;
  size: number;
  x: number;
  y: number;
  z: number;
  vy: number;
  vx: number;
  rot: number;
  omega: number;
  scale: number;
  opacity: number;
}

interface Props {
  count?: number;
  src?: string;
}

async function loadImage(src: string): Promise<ImageBitmap | HTMLImageElement> {
  const res = await fetch(src);
  const blob = await res.blob();
  if (typeof createImageBitmap === "function") {
    return await createImageBitmap(blob);
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => reject(new Error("image load failed"));
    img.src = url;
  });
}

function bakeSprite(
  img: ImageBitmap | HTMLImageElement,
  shape: Pt[],
  size: number,
  bgX: number,
  bgY: number,
  dpr: number
): HTMLCanvasElement {
  const px = Math.max(2, Math.round(size * dpr));
  const c = document.createElement("canvas");
  c.width = px;
  c.height = px;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  // Clip to polygon.
  ctx.beginPath();
  ctx.moveTo(shape[0][0] * px, shape[0][1] * px);
  for (let i = 1; i < shape.length; i++) {
    ctx.lineTo(shape[i][0] * px, shape[i][1] * px);
  }
  ctx.closePath();
  ctx.clip();
  // Draw a tile of the image scaled so the pebble samples a small region.
  // bgX, bgY in [0, 1] picks the source corner; we crop a window of size
  // ~1/4 of the source.
  const sw = Math.min(img.width, img.height) / 4;
  const sx = bgX * (img.width - sw);
  const sy = bgY * (img.height - sw);
  ctx.drawImage(img, sx, sy, sw, sw, 0, 0, px, px);
  // Subtle leading line.
  ctx.strokeStyle = "rgba(0,18,25,0.5)";
  ctx.lineWidth = Math.max(0.5, dpr * 0.5);
  ctx.stroke();
  return c;
}

export function PebbleFall({ count = 110, src = "/hero-stained.avif" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const fit = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    fit();
    window.addEventListener("resize", fit);

    let pebbles: Pebble[] = [];

    (async () => {
      let img: ImageBitmap | HTMLImageElement;
      try {
        img = await loadImage(src);
      } catch {
        // Fallback: noop, no pebbles.
        return;
      }
      if (cancelled) return;

      const w = window.innerWidth;
      const h = window.innerHeight;
      const buf = 200;
      for (let i = 0; i < count; i++) {
        const z = rand(-320, 240);
        const depthFactor = (z + 320) / 560;
        const size = rand(8, 22) + depthFactor * 18;
        const scale = 0.6 + depthFactor * 0.75;
        const vy = 1.0 + depthFactor * 4 + rand(-0.3, 0.6);
        const vx = rand(-0.5, 0.5) + depthFactor * rand(-0.4, 0.4);
        const omega = rand(-22, 22);
        const shape = SHAPES[(Math.random() * SHAPES.length) | 0];
        const sprite = bakeSprite(img, shape, size, Math.random(), Math.random(), dpr);
        pebbles.push({
          sprite,
          size,
          x: rand(-buf, w + buf),
          y: rand(-buf, h + buf),
          z,
          vy,
          vx,
          rot: rand(0, 360) * (Math.PI / 180),
          omega: omega * (Math.PI / 180),
          scale,
          opacity: 0.5 + depthFactor * 0.5,
        });
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (reduced) {
        // Single frame in resting state, no rAF loop.
        renderFrame(ctx, pebbles, canvas.width, canvas.height, dpr);
        return;
      }

      let lastT = performance.now();
      const tick = () => {
        if (cancelled) return;
        const now = performance.now();
        const dt = Math.min(0.05, (now - lastT) / 1000);
        lastT = now;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const wrapTop = -200;
        const wrapBot = vh + 200;
        for (let i = 0; i < pebbles.length; i++) {
          const p = pebbles[i];
          p.y += p.vy * dt * 60;
          p.x += p.vx * dt * 60;
          p.rot += p.omega * dt;
          if (p.y > wrapBot) {
            p.y = wrapTop - Math.random() * 80;
            p.x = rand(-200, vw + 200);
          }
          if (p.x < -240) p.x = vw + 200;
          if (p.x > vw + 240) p.x = -200;
        }
        renderFrame(ctx, pebbles, canvas.width, canvas.height, dpr);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", fit);
      pebbles = [];
    };
  }, [count, src]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 0 }}
    />
  );
}

function renderFrame(
  ctx: CanvasRenderingContext2D,
  pebbles: Pebble[],
  cw: number,
  ch: number,
  dpr: number
) {
  ctx.clearRect(0, 0, cw, ch);
  for (let i = 0; i < pebbles.length; i++) {
    const p = pebbles[i];
    const px = p.x * dpr;
    const py = p.y * dpr;
    const s = p.scale;
    const half = p.sprite.width / 2;
    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.translate(px, py);
    ctx.rotate(p.rot);
    ctx.scale(s, s);
    ctx.drawImage(p.sprite, -half, -half);
    ctx.restore();
  }
}
