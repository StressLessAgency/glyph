"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFontStore } from "@/stores/font-store";
import { buildFont } from "@/lib/build-font";

const SAMPLES = [
  "The quick brown fox jumps over the lazy dog.",
  "Handgloves & jumbo whisky.",
  "abcdefghijklmnopqrstuvwxyz",
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "0123456789 . , ! ? & @",
];

export function LivePreview() {
  const font = useFontStore((s) => s.font);
  const [text, setText] = useState(SAMPLES[0]);
  const [size, setSize] = useState(64);
  const [fontUrl, setFontUrl] = useState<string | null>(null);
  const [familyName] = useState(() => `glyph-${Math.random().toString(36).slice(2, 8)}`);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  // Build font when project changes.
  useEffect(() => {
    if (!font) return;
    let cancelled = false;
    let nextUrl: string | null = null;
    try {
      const built = buildFont(font);
      const buffer = built.font.toArrayBuffer();
      const blob = new Blob([buffer], { type: "font/otf" });
      nextUrl = URL.createObjectURL(blob);
      if (!cancelled) setFontUrl(nextUrl);
    } catch (e) {
      console.error("preview build failed", e);
    }
    return () => {
      cancelled = true;
      if (nextUrl) URL.revokeObjectURL(nextUrl);
    };
  }, [font]);

  // Inject @font-face on every fontUrl change.
  useEffect(() => {
    if (!fontUrl) return;
    if (!styleRef.current) {
      const el = document.createElement("style");
      document.head.appendChild(el);
      styleRef.current = el;
    }
    styleRef.current.textContent = `@font-face { font-family: "${familyName}"; src: url(${fontUrl}) format("opentype"); font-display: swap; }`;
    return () => {
      // keep style element across updates; only remove on unmount
    };
  }, [fontUrl, familyName]);

  useEffect(
    () => () => {
      if (styleRef.current) {
        styleRef.current.remove();
        styleRef.current = null;
      }
    },
    []
  );

  const drawnCount = useMemo(() => {
    if (!font) return 0;
    return Object.values(font.glyphs).filter((g) => g.source !== "empty").length;
  }, [font]);

  if (!font) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
        <span className="text-[11px] uppercase tracking-[0.18em] text-fg-subtle font-mono">
          Live preview
        </span>
        <span className="font-mono text-[11px] text-fg-muted">
          {drawnCount} glyph{drawnCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="px-5 pb-3 flex items-center gap-1">
        {SAMPLES.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setText(s)}
            className={`rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition ${
              text === s
                ? "bg-ink text-bg"
                : "bg-surface text-fg-muted hover:text-fg"
            }`}
          >
            {i + 1}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="font-mono text-[10px] text-fg-subtle">
            {size}px
          </span>
          <input
            type="range"
            min={20}
            max={140}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            aria-label="Preview text size"
            className="h-1 w-24 accent-ink"
          />
        </div>
      </div>

      <div className="card-light mx-5 mb-5 flex-1 rounded-xl border border-border overflow-hidden noise">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Sample text"
          spellCheck={false}
          style={{
            fontFamily: fontUrl
              ? `"${familyName}", var(--font-serif)`
              : "var(--font-serif)",
            fontSize: size,
            lineHeight: 1.18,
          }}
          className="block h-full w-full resize-none bg-transparent px-6 py-5 text-fg outline-none placeholder:text-fg-subtle"
          placeholder="Type to preview your font..."
        />
      </div>
    </div>
  );
}
