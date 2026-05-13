"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";

let trigger: ((dest?: string) => void) | null = null;

/**
 * Imperative API: trigger a full-screen paint wipe, await the cover phase,
 * then call `onCovered` (router.push) and let the wipe sweep off.
 */
export function fireRouteWipe(onCovered?: () => void) {
  if (trigger) trigger();
  // The cover phase is ~520ms (see panel durations below).
  if (onCovered) window.setTimeout(onCovered, 520);
}

export function RouteWipe({ children }: { children?: ReactNode }) {
  const [phase, setPhase] = useState<"idle" | "cover" | "reveal">("idle");

  useEffect(() => {
    trigger = () => {
      setPhase("cover");
      window.setTimeout(() => setPhase("reveal"), 700);
      window.setTimeout(() => setPhase("idle"), 1450);
    };
    return () => {
      trigger = null;
    };
  }, []);

  return (
    <>
      {children}
      <AnimatePresence>
        {phase !== "idle" && (
          <>
            {/* layer A — ocean ink, slides in from left */}
            <motion.div
              key="wipe-a"
              initial={{ x: "-105%" }}
              animate={{ x: phase === "cover" ? "0%" : "105%" }}
              exit={{ x: "105%" }}
              transition={{ duration: phase === "cover" ? 0.55 : 0.7, ease: [0.76, 0, 0.24, 1] }}
              className="fixed inset-0 z-[90] pointer-events-none"
              style={{ background: "var(--color-ocean)" }}
            />
            {/* layer B — amber, sweeps slightly after for parallax */}
            <motion.div
              key="wipe-b"
              initial={{ x: "-110%" }}
              animate={{ x: phase === "cover" ? "0%" : "110%" }}
              exit={{ x: "110%" }}
              transition={{ duration: phase === "cover" ? 0.6 : 0.75, ease: [0.76, 0, 0.24, 1], delay: 0.06 }}
              className="fixed inset-0 z-[91] pointer-events-none mix-blend-multiply"
              style={{ background: "var(--color-amber)", opacity: 0.45 }}
            />
            {/* center wordmark briefly when fully covered */}
            <motion.div
              key="wipe-mark"
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === "cover" ? 1 : 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-[92] pointer-events-none flex items-center justify-center"
            >
              <span
                className="font-serif italic text-5xl tracking-tight"
                style={{ color: "var(--color-bg)" }}
              >
                Glyph
              </span>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
