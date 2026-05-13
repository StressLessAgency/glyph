"use client";

import { useMemo } from "react";
import type { GlyphSpec } from "@/lib/glyphs";
import type { GlyphState } from "@/lib/font-types";
import type { StrokeOptions } from "@/lib/stroke-to-path";
import { strokesToCompoundPath } from "@/lib/stroke-to-path";
import { commandsToD } from "@/lib/svg-path";
import { cn } from "@/lib/cn";

export function GlyphTile({
  spec,
  state,
  canvas,
  strokeOpts,
  active,
  onClick,
}: {
  spec: GlyphSpec;
  state: GlyphState | undefined;
  canvas: { width: number; height: number };
  strokeOpts: StrokeOptions;
  active: boolean;
  onClick: () => void;
}) {
  const path = useMemo(() => {
    if (!state) return "";
    if (state.source === "draw" && state.strokes?.length) {
      return strokesToCompoundPath(state.strokes, strokeOpts);
    }
    if ((state.source === "svg" || state.source === "photo") && state.commands?.length) {
      return commandsToD(state.commands);
    }
    return "";
  }, [state, strokeOpts]);

  const has = !!path;

  return (
    <button
      type="button"
      onClick={onClick}
      title={spec.name}
      className={cn(
        "group relative flex aspect-square w-full flex-col items-center justify-center rounded-md border transition-all overflow-hidden",
        active
          ? "border-ink bg-bg shadow-soft"
          : has
            ? "border-border bg-bg hover:border-ink/40"
            : "border-border bg-surface/40 hover:bg-surface text-fg-subtle"
      )}
    >
      {has ? (
        <svg
          viewBox={`0 0 ${canvas.width} ${canvas.height}`}
          className="h-[78%] w-[78%]"
          preserveAspectRatio="xMidYMid meet"
        >
          <path d={path} fill="var(--color-ink)" fillRule="nonzero" />
        </svg>
      ) : (
        <span
          className={cn(
            "font-serif italic",
            active ? "text-fg" : "text-fg-subtle/50"
          )}
          style={{ fontSize: 26, lineHeight: 1 }}
        >
          {spec.char === " " ? "␣" : spec.char}
        </span>
      )}
      <span className="absolute left-1 top-1 font-mono text-[8px] uppercase tracking-[0.16em] text-fg-subtle/60">
        {spec.char === " "
          ? "spc"
          : spec.code.toString(16).toUpperCase().padStart(2, "0")}
      </span>
      {has && (
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-success" />
      )}
    </button>
  );
}

