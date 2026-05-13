"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useFontStore } from "@/stores/font-store";
import { bitmapToCommands } from "@/lib/bitmap-trace";
import {
  bboxOfCommands,
  transformCommands,
} from "@/lib/svg-path";
import { Button } from "@/components/ui/button";

/**
 * Upload a photo of one handwritten letter. Threshold + trace into outline
 * commands, normalized into the canvas viewport.
 */
export function PhotoUpload() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const activeChar = useFontStore((s) => s.activeChar);
  const font = useFontStore((s) => s.font);
  const setSvgCommands = useFontStore((s) => s.setSvgCommands);
  const [busy, setBusy] = useState(false);

  const onFile = async (f: File) => {
    if (!font) return;
    setBusy(true);
    try {
      const { cmds } = await bitmapToCommands(f);
      if (cmds.length === 0) {
        toast.error("Could not detect ink. Try a sharper photo with more contrast.");
        return;
      }
      const bb = bboxOfCommands(cmds);
      if (!bb) return;
      const target = font.canvasSize;
      const margin = 40;
      const availW = target.width - margin * 2;
      const availH = target.height - margin * 2;
      const scale = Math.min(availW / bb.width, availH / bb.height);
      const tx = margin + (availW - bb.width * scale) / 2 - bb.minX * scale;
      const ty = margin + (availH - bb.height * scale) / 2 - bb.minY * scale;
      const t = transformCommands(cmds, scale, scale, tx, ty);
      setSvgCommands(activeChar, t);
      toast.success(`Imported photo → ${activeChar}`);
    } catch (e) {
      toast.error(`Trace failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <Button
        variant="secondary"
        size="sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="w-full justify-start"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
        Photo of letter → {activeChar}
      </Button>
    </>
  );
}
