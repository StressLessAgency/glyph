"use client";

import { Printer, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ALL_GLYPHS } from "@/lib/glyphs";
import { downloadBlob } from "@/lib/font-wrap";

const PAGE_W = 816; // 8.5" * 96dpi
const PAGE_H = 1056; // 11" * 96dpi
const MARGIN = 48;
const COLS = 7;

function buildTemplateSvg(): string {
  const cellsAvailH = PAGE_H - MARGIN * 2 - 80;
  const cellW = (PAGE_W - MARGIN * 2) / COLS;
  const rows = Math.ceil(ALL_GLYPHS.length / COLS);
  const cellH = Math.min(cellsAvailH / rows, cellW * 1.15);

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PAGE_W} ${PAGE_H}" width="${PAGE_W}" height="${PAGE_H}" font-family="Inter, system-ui, sans-serif">`
  );
  parts.push(
    `<rect width="${PAGE_W}" height="${PAGE_H}" fill="#fff"/>`
  );

  // Header
  parts.push(
    `<text x="${MARGIN}" y="${MARGIN}" font-size="22" font-style="italic" font-family="Georgia, serif" fill="#0a0a1a">Glyph — template sheet</text>`
  );
  parts.push(
    `<text x="${MARGIN}" y="${MARGIN + 22}" font-size="11" fill="#666" letter-spacing="0.5">Write each character inside the box, sitting on the baseline. Use a black felt-tip pen.</text>`
  );

  // Corner fiducials
  for (const [fx, fy] of [
    [MARGIN, MARGIN + 40],
    [PAGE_W - MARGIN - 18, MARGIN + 40],
    [MARGIN, PAGE_H - MARGIN - 18],
    [PAGE_W - MARGIN - 18, PAGE_H - MARGIN - 18],
  ]) {
    parts.push(`<rect x="${fx}" y="${fy}" width="18" height="18" fill="#000"/>`);
  }

  const gridTop = MARGIN + 80;
  let i = 0;
  for (const g of ALL_GLYPHS) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = MARGIN + col * cellW;
    const y = gridTop + row * cellH;
    const baselineY = y + cellH * 0.74;
    const capY = baselineY - cellH * 0.62;
    const xY = baselineY - cellH * 0.4;

    // cell box
    parts.push(
      `<rect x="${x + 4}" y="${y + 4}" width="${cellW - 8}" height="${cellH - 8}" fill="none" stroke="#e5e5e3" stroke-width="1" rx="6"/>`
    );
    // baseline + lines
    parts.push(
      `<line x1="${x + 8}" y1="${baselineY}" x2="${x + cellW - 8}" y2="${baselineY}" stroke="#ff5722" stroke-opacity="0.4" stroke-width="0.7"/>`
    );
    parts.push(
      `<line x1="${x + 8}" y1="${capY}" x2="${x + cellW - 8}" y2="${capY}" stroke="#bbb" stroke-dasharray="2 3" stroke-width="0.5"/>`
    );
    parts.push(
      `<line x1="${x + 8}" y1="${xY}" x2="${x + cellW - 8}" y2="${xY}" stroke="#bbb" stroke-dasharray="2 3" stroke-width="0.5"/>`
    );
    // char hint (faint)
    parts.push(
      `<text x="${x + cellW / 2}" y="${baselineY}" font-size="${cellH * 0.55}" fill="#0a0a1a" fill-opacity="0.08" text-anchor="middle" font-family="Georgia, serif" font-style="italic">${escapeXml(g.char)}</text>`
    );
    // label
    parts.push(
      `<text x="${x + 10}" y="${y + 16}" font-size="9" fill="#999" font-family="ui-monospace, monospace" letter-spacing="0.5">${g.char === " " ? "SPC" : g.code.toString(16).toUpperCase().padStart(2, "0")}</text>`
    );
    i++;
  }

  // Footer
  parts.push(
    `<text x="${MARGIN}" y="${PAGE_H - MARGIN + 8}" font-size="9" fill="#999" font-family="ui-monospace, monospace">glyph.studio · template v1 · ${COLS}-col</text>`
  );

  parts.push("</svg>");
  return parts.join("\n");
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function TemplateSheet() {
  const downloadSvg = () => {
    const svg = buildTemplateSvg();
    const buf = new TextEncoder().encode(svg).buffer as ArrayBuffer;
    downloadBlob(buf, "glyph-template.svg", "image/svg+xml");
  };

  const print = () => {
    const svg = buildTemplateSvg();
    const w = window.open("", "_blank", "width=820,height=1080");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Glyph Template</title><style>@page{margin:0}body{margin:0;background:#fff}svg{display:block;margin:0 auto}</style></head><body>${svg}<script>window.onload=()=>setTimeout(()=>window.print(),200)</script></body></html>`);
    w.document.close();
  };

  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" size="sm" className="w-full justify-start" onClick={print}>
        <Printer className="h-3.5 w-3.5" />
        Print template sheet
      </Button>
      <Button variant="ghost" size="sm" className="w-full justify-start" onClick={downloadSvg}>
        <FileDown className="h-3.5 w-3.5" />
        Download as SVG
      </Button>
    </div>
  );
}
