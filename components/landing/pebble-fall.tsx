"use client";

import { useEffect, useRef } from "react";

interface Pebble {
  el: HTMLDivElement;
  x: number;
  y: number;
  z: number;
  vy: number;
  vx: number;
  rx: number;
  ry: number;
  rz: number;
  wx: number;
  wy: number;
  wz: number;
  scale: number;
  size: number;
  bgX: number;
  bgY: number;
  shape: number;
}

const SHAPES = [
  "polygon(50% 0%, 100% 100%, 0% 100%)",
  "polygon(0% 0%, 100% 25%, 80% 100%, 10% 90%)",
  "polygon(20% 0%, 100% 0%, 100% 80%, 30% 100%, 0% 60%)",
  "polygon(10% 10%, 90% 0%, 100% 70%, 60% 100%, 0% 80%)",
  "polygon(0% 30%, 50% 0%, 100% 40%, 80% 100%, 20% 100%)",
  "polygon(30% 0%, 100% 30%, 70% 100%, 0% 70%)",
  "polygon(0% 0%, 80% 10%, 100% 80%, 50% 100%, 0% 60%)",
  "polygon(10% 0%, 100% 20%, 90% 90%, 0% 80%)",
  "polygon(40% 0%, 100% 50%, 60% 100%, 0% 50%)",
  "polygon(0% 20%, 60% 0%, 100% 30%, 90% 100%, 20% 90%)",
  "polygon(30% 10%, 100% 0%, 100% 90%, 0% 100%)",
  "polygon(0% 0%, 100% 40%, 70% 100%, 0% 70%)",
];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

interface Props {
  count?: number;
  /** Base image path (without extension); loader picks AVIF > WebP > JPG. */
  src?: string;
}

export function PebbleFall({ count = 220, src = "/hero-stained" }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pebblesRef = useRef<Pebble[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (typeof window === "undefined") return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const buffer = 200;
    const yRange = h + buffer * 2;

    const pebbles: Pebble[] = [];
    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      // Depth: -300 (far) to 300 (near).
      const z = rand(-320, 240);
      // Size grows with depth.
      const depthFactor = (z + 320) / 560; // 0..1
      const size = rand(8, 28) + depthFactor * 22;
      const scale = 0.55 + depthFactor * 0.85;
      // Near pebbles fall faster (parallax).
      const vy = 6 + depthFactor * 22 + rand(-2, 4);
      const vx = rand(-3, 3) + depthFactor * rand(-2, 2);
      const wx = rand(-30, 30);
      const wy = rand(-30, 30);
      const wz = rand(-90, 90);
      const shape = (Math.random() * SHAPES.length) | 0;

      // Random initial position scattered across viewport so the fall reads
      // as ambient on first paint, not as a synchronized starting line.
      const x = rand(-buffer, w + buffer);
      const y = rand(-buffer, h + buffer);

      // Background sample position — random offset into hero image per pebble.
      const bgX = rand(0, 100);
      const bgY = rand(0, 100);

      el.style.position = "absolute";
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.top = "0";
      el.style.left = "0";
      el.style.clipPath = SHAPES[shape];
      // @ts-expect-error vendor prefix
      el.style.webkitClipPath = SHAPES[shape];
      el.style.backgroundImage = `image-set(url("${src}.avif") type("image/avif"), url("${src}.webp") type("image/webp"), url("${src}.opt.jpg") type("image/jpeg"))`;
      el.style.backgroundSize = "400% 400%";
      el.style.backgroundPosition = `${bgX}% ${bgY}%`;
      el.style.willChange = "transform";
      el.style.boxShadow = "inset 0 0 0 0.3px rgba(0,18,25,0.45), 0 1px 1.5px rgba(0,18,25,0.3)";
      // Far pebbles look hazy.
      const dim = 0.45 + depthFactor * 0.55;
      el.style.opacity = String(dim);
      el.style.filter = depthFactor < 0.4 ? `blur(${(0.4 - depthFactor) * 4}px)` : "none";
      container.appendChild(el);

      pebbles.push({
        el,
        x,
        y,
        z,
        vy,
        vx,
        rx: rand(0, 360),
        ry: rand(0, 360),
        rz: rand(0, 360),
        wx,
        wy,
        wz,
        scale,
        size,
        bgX,
        bgY,
        shape,
      });
    }
    pebblesRef.current = pebbles;

    if (reduced) {
      for (const p of pebbles) {
        p.el.style.transform = `translate3d(${p.x}px, ${p.y}px, ${p.z}px) rotateX(${p.rx}deg) rotateY(${p.ry}deg) rotateZ(${p.rz}deg) scale(${p.scale})`;
      }
      return () => {
        for (const p of pebbles) p.el.remove();
      };
    }

    let lastT = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastT) / 1000); // clamp to 50ms (after tab background)
      lastT = now;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const buf = 200;
      const wrapTop = -buf;
      const wrapBot = vh + buf;
      for (let i = 0; i < pebbles.length; i++) {
        const p = pebbles[i];
        p.y += p.vy * dt * 60;
        p.x += p.vx * dt * 60;
        p.rx += p.wx * dt;
        p.ry += p.wy * dt;
        p.rz += p.wz * dt;
        if (p.y > wrapBot) {
          p.y = wrapTop - Math.random() * 80;
          p.x = rand(-buf, vw + buf);
        }
        if (p.x < -buf - 40) p.x = vw + buf;
        if (p.x > vw + buf + 40) p.x = -buf;
        p.el.style.transform = `translate3d(${p.x}px, ${p.y}px, ${p.z}px) rotateX(${p.rx}deg) rotateY(${p.ry}deg) rotateZ(${p.rz}deg) scale(${p.scale})`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    const onResize = () => {
      // Just respawn x targets; vertical wrap recomputes on next tick.
    };
    window.addEventListener("resize", onResize);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      for (const p of pebbles) p.el.remove();
    };
  }, [count, src]);

  return (
    <div
      aria-hidden
      ref={containerRef}
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{
        perspective: "900px",
        perspectiveOrigin: "50% 30%",
        transformStyle: "preserve-3d",
        // Layer above sunset bg, behind page content.
        zIndex: 0,
      }}
    />
  );
}
