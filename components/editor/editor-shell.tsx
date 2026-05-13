"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

export function EditorShell({ id }: { id: string }) {
  const router = useRouter();
  const font = useFontStore((s) => s.font);
  const initWith = useFontStore((s) => s.initWith);
  const [ready, setReady] = useState(false);
  const activeChar = useFontStore((s) => s.activeChar);

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
      <div className="flex h-screen w-screen items-center justify-center bg-bg">
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
        {/* Left rail — glyph grid */}
        <aside className="hidden lg:flex w-[320px] shrink-0 flex-col border-r border-border bg-surface/30">
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

        {/* Right rail */}
        <aside className="hidden md:flex w-[340px] shrink-0 flex-col border-l border-border bg-surface/30">
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
    </div>
  );
}
