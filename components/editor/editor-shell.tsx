"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Topbar } from "./topbar";
import { DrawCanvas } from "@/components/canvas/draw-canvas";
import { StrokeControls } from "@/components/canvas/stroke-controls";
import { GlyphGrid } from "@/components/glyph-grid/glyph-grid";
import { LivePreview } from "@/components/preview/live-preview";
import { ExportPanel } from "@/components/export/export-panel";
import { ImportPanel } from "./import-panel";
import { useFontStore, createFontProject } from "@/stores/font-store";
import { loadFont, saveFont } from "@/lib/db";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Sheet = null | "glyphs" | "pen" | "import" | "preview" | "export";

export function EditorShell({ id }: { id: string }) {
  const font = useFontStore((s) => s.font);
  const initWith = useFontStore((s) => s.initWith);
  const [ready, setReady] = useState(false);
  const activeChar = useFontStore((s) => s.activeChar);
  const [mobileSheet, setMobileSheet] = useState<Sheet>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let f = await loadFont(id);
      if (!f) {
        f = createFontProject("Untitled font");
        f.id = id;
        await saveFont(f);
      }
      if (!cancelled) {
        initWith(f);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, initWith]);

  useEffect(() => {
    document.body.dataset.route = "editor";
    return () => {
      delete document.body.dataset.route;
    };
  }, []);

  if (!ready || !font) {
    return (
      <div
        role="status"
        aria-label="Opening font"
        className="flex h-screen w-screen items-center justify-center bg-bg"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full w-1/3 bg-ink animate-pulse" />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
            Opening font
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-bg">
      <Topbar />
      <div className="flex flex-1 min-h-0">
        {/* Left rail — glyph grid (≥ lg) */}
        <aside
          aria-label="Glyph grid"
          className="hidden lg:flex w-[320px] shrink-0 flex-col border-r border-border bg-surface/30"
        >
          <GlyphGrid />
        </aside>

        {/* Center — canvas */}
        <main className="flex-1 min-w-0 flex flex-col relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeChar}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex"
            >
              <DrawCanvas />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Right rail — tools (≥ md) */}
        <aside
          aria-label="Tools"
          className="hidden md:flex w-[340px] shrink-0 flex-col border-l border-border bg-surface/30"
        >
          <Tabs defaultValue="pen" className="flex flex-1 flex-col min-h-0">
            <div className="px-5 pt-5 pb-2">
              <TabsList className="w-full">
                <TabsTrigger value="pen" className="flex-1">
                  Pen
                </TabsTrigger>
                <TabsTrigger value="import" className="flex-1">
                  Import
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex-1">
                  Preview
                </TabsTrigger>
                <TabsTrigger value="export" className="flex-1">
                  Export
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
              <TabsContent value="pen" className="m-0">
                <StrokeControls />
              </TabsContent>
              <TabsContent value="import" className="m-0">
                <ImportPanel />
              </TabsContent>
              <TabsContent value="preview" className="m-0 h-[60vh]">
                <LivePreview />
              </TabsContent>
              <TabsContent value="export" className="m-0">
                <ExportPanel />
              </TabsContent>
            </div>
          </Tabs>
        </aside>
      </div>

      {/* Mobile bottom toolbar — hidden ≥ md */}
      <nav
        aria-label="Editor sections"
        className="md:hidden flex shrink-0 items-stretch justify-around border-t border-border bg-bg"
      >
        {(
          [
            { id: "glyphs", label: "Glyphs" },
            { id: "pen", label: "Pen" },
            { id: "import", label: "Import" },
            { id: "preview", label: "Preview" },
            { id: "export", label: "Export" },
          ] as { id: Sheet; label: string }[]
        ).map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setMobileSheet(b.id)}
            aria-label={`Open ${b.label}`}
            className="flex-1 h-12 font-mono text-[10.5px] uppercase tracking-[0.18em] text-fg-muted active:bg-surface-2 active:text-fg transition"
          >
            {b.label}
          </button>
        ))}
      </nav>

      {/* Mobile bottom-sheet */}
      <AnimatePresence>
        {mobileSheet && (
          <>
            <motion.div
              key="sheet-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMobileSheet(null)}
              className="md:hidden fixed inset-0 z-40 bg-ink/35"
            />
            <motion.div
              key="sheet"
              role="dialog"
              aria-modal="true"
              aria-label={mobileSheet}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-hidden rounded-t-2xl border-t border-border bg-bg shadow-pop"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-fg-muted">
                  {mobileSheet}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileSheet(null)}
                  aria-label="Close"
                  className="h-11 w-11 inline-flex items-center justify-center rounded-md text-fg-muted hover:text-fg"
                >
                  ✕
                </button>
              </div>
              <div className="max-h-[calc(80vh-56px)] overflow-y-auto scrollbar-thin">
                {mobileSheet === "glyphs" && <GlyphGrid />}
                {mobileSheet === "pen" && <StrokeControls />}
                {mobileSheet === "import" && <ImportPanel />}
                {mobileSheet === "preview" && <LivePreview />}
                {mobileSheet === "export" && <ExportPanel />}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
