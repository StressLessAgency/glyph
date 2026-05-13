"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { useFontStore } from "@/stores/font-store";
import {
  parseSvgPath,
  bboxOfCommands,
  transformCommands,
  type PathCmd,
} from "@/lib/svg-path";
import { Button } from "@/components/ui/button";

/**
 * Parse an SVG file → extract all path data, union into one set of commands,
 * normalize to fit canvas. Applies to the currently-active glyph.
 */
export function SvgUpload() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const activeChar = useFontStore((s) => s.activeChar);
  const font = useFontStore((s) => s.font);
  const setSvgCommands = useFontStore((s) => s.setSvgCommands);

  const handleFile = async (file: File) => {
    try {
      const txt = await file.text();
      const cmds = extractCommands(txt);
      if (cmds.length === 0) {
        toast.error("No <path> elements found in SVG.");
        return;
      }
      const bb = bboxOfCommands(cmds);
      if (!bb || bb.width === 0 || bb.height === 0) {
        toast.error("SVG path has no visible geometry.");
        return;
      }
      if (!font) return;
      const target = font.canvasSize;
      const margin = 40;
      const availW = target.width - margin * 2;
      const availH = target.height - margin * 2;
      const scale = Math.min(availW / bb.width, availH / bb.height);
      const tx = margin + (availW - bb.width * scale) / 2 - bb.minX * scale;
      const ty = margin + (availH - bb.height * scale) / 2 - bb.minY * scale;
      const transformed = transformCommands(cmds, scale, scale, tx, ty);
      setSvgCommands(activeChar, transformed);
      toast.success(`Imported "${file.name}" → ${activeChar}`);
    } catch (e) {
      toast.error(`Could not parse SVG: ${(e as Error).message}`);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".svg,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <Button
        variant="secondary"
        size="sm"
        onClick={() => inputRef.current?.click()}
        className="w-full justify-start"
      >
        <Upload className="h-3.5 w-3.5" />
        Import SVG to {activeChar}
      </Button>
    </>
  );
}

function extractCommands(svgText: string): PathCmd[] {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const parserErr = doc.querySelector("parsererror");
  if (parserErr) throw new Error("Invalid SVG");
  const out: PathCmd[] = [];
  doc.querySelectorAll("path").forEach((p) => {
    const d = p.getAttribute("d");
    if (!d) return;
    out.push(...parseSvgPath(d));
  });
  return out;
}
