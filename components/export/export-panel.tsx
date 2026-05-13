"use client";

import { useState } from "react";
import { Download, FileType2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useFontStore } from "@/stores/font-store";
import { buildFont } from "@/lib/build-font";
import {
  sfntToWoff,
  sfntToWoff2,
  downloadBlob,
} from "@/lib/font-wrap";
import { Button } from "@/components/ui/button";

type Fmt = "otf" | "ttf" | "woff" | "woff2";

const LABELS: Record<Fmt, { label: string; mime: string; ext: string; description: string }> = {
  otf: {
    label: "OTF",
    mime: "font/otf",
    ext: "otf",
    description: "OpenType — install on macOS/Windows/Linux",
  },
  ttf: {
    label: "TTF",
    mime: "font/ttf",
    ext: "ttf",
    description: "TrueType-compatible SFNT — universal install",
  },
  woff: {
    label: "WOFF",
    mime: "font/woff",
    ext: "woff",
    description: "Web format with Deflate compression",
  },
  woff2: {
    label: "WOFF2",
    mime: "font/woff2",
    ext: "woff2",
    description: "Smallest web format with Brotli",
  },
};

export function ExportPanel() {
  const font = useFontStore((s) => s.font);
  const [busy, setBusy] = useState<Fmt | null>(null);

  if (!font) return null;
  const drawn = Object.values(font.glyphs).filter((g) => g.source !== "empty").length;
  const disabled = drawn === 0;

  const run = async (fmt: Fmt) => {
    if (!font) return;
    setBusy(fmt);
    try {
      const result = buildFont(font);
      const sfnt = result.font.toArrayBuffer();
      const base = (font.name || "GlyphFont").replace(/[^A-Za-z0-9-]+/g, "-");
      const filename = `${base}.${LABELS[fmt].ext}`;
      if (fmt === "otf" || fmt === "ttf") {
        downloadBlob(sfnt, filename, LABELS[fmt].mime);
      } else if (fmt === "woff") {
        downloadBlob(sfntToWoff(sfnt), filename, LABELS[fmt].mime);
      } else {
        const woff2 = await sfntToWoff2(sfnt);
        downloadBlob(woff2, filename, LABELS[fmt].mime);
      }
      toast.success(`Exported ${LABELS[fmt].label} — ${result.builtGlyphs} glyphs`);
    } catch (e) {
      console.error(e);
      toast.error(`Export failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 px-5 py-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.18em] text-fg-subtle font-mono">
          Export
        </span>
        <FileType2 className="h-3.5 w-3.5 text-fg-subtle" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(LABELS) as Fmt[]).map((fmt) => (
          <button
            key={fmt}
            type="button"
            disabled={disabled || busy !== null}
            onClick={() => run(fmt)}
            className="group relative flex flex-col items-start gap-1 rounded-lg border border-border bg-bg p-3 text-left transition hover:border-ink/40 hover:shadow-soft disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border"
          >
            <div className="flex w-full items-center justify-between">
              <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em]">
                {LABELS[fmt].label}
              </span>
              {busy === fmt ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-fg-muted" />
              ) : (
                <Download className="h-3.5 w-3.5 text-fg-subtle transition group-hover:text-fg" />
              )}
            </div>
            <span className="text-[10.5px] leading-snug text-fg-muted">
              {LABELS[fmt].description}
            </span>
          </button>
        ))}
      </div>

      {disabled && (
        <p className="text-[11px] text-fg-muted leading-relaxed">
          Draw at least one glyph to enable export.
        </p>
      )}
    </div>
  );
}
