"use client";

import { useMemo, useState } from "react";
import { useFontStore } from "@/stores/font-store";
import {
  UPPERCASE,
  LOWERCASE,
  DIGITS,
  PUNCTUATION,
  type GlyphSpec,
} from "@/lib/glyphs";
import { GlyphTile } from "./glyph-tile";

const SECTIONS: { label: string; key: string; glyphs: GlyphSpec[] }[] = [
  { label: "Uppercase", key: "upper", glyphs: UPPERCASE },
  { label: "Lowercase", key: "lower", glyphs: LOWERCASE },
  { label: "Numbers", key: "num", glyphs: DIGITS },
  { label: "Punctuation", key: "punc", glyphs: PUNCTUATION },
];

export function GlyphGrid() {
  const font = useFontStore((s) => s.font);
  const activeChar = useFontStore((s) => s.activeChar);
  const setActive = useFontStore((s) => s.setActive);
  const [filter, setFilter] = useState<string | null>(null);

  const totals = useMemo(() => {
    if (!font) return { drawn: 0, total: 0 };
    let drawn = 0;
    let total = 0;
    for (const sec of SECTIONS) {
      for (const g of sec.glyphs) {
        total++;
        const s = font.glyphs[g.char];
        if (s && s.source !== "empty") drawn++;
      }
    }
    return { drawn, total };
  }, [font]);

  if (!font) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
        <span className="text-[11px] uppercase tracking-[0.18em] text-fg-subtle font-mono">
          Glyphs
        </span>
        <span className="font-mono text-[11px] text-fg-muted">
          {totals.drawn}/{totals.total}
        </span>
      </div>

      <div className="flex gap-1 px-5 pb-3">
        <FilterChip label="All" active={filter === null} onClick={() => setFilter(null)} />
        {SECTIONS.map((s) => (
          <FilterChip
            key={s.key}
            label={s.label.slice(0, 3).toUpperCase()}
            active={filter === s.key}
            onClick={() => setFilter(s.key)}
          />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 pb-5">
        {SECTIONS.filter((s) => filter === null || filter === s.key).map(
          (sec) => (
            <div key={sec.key} className="mb-5">
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
                  {sec.label}
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-6 gap-1">
                {sec.glyphs.map((g) => (
                  <GlyphTile
                    key={g.char}
                    spec={g}
                    state={font.glyphs[g.char]}
                    canvas={font.canvasSize}
                    strokeOpts={font.strokeOptions}
                    active={g.char === activeChar}
                    onClick={() => setActive(g.char)}
                  />
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition ${
        active
          ? "bg-ink text-bg"
          : "bg-surface text-fg-muted hover:text-fg"
      }`}
    >
      {label}
    </button>
  );
}
