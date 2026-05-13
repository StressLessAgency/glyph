"use client";

import { PhotoUpload } from "@/components/import/photo-upload";
import { SvgUpload } from "@/components/import/svg-upload";
import { TemplateSheet } from "@/components/import/template-sheet";

export function ImportPanel() {
  return (
    <div className="flex flex-col gap-4 px-5 py-5">
      <span className="text-[11px] uppercase tracking-[0.18em] text-fg-subtle font-mono">
        Import
      </span>
      <div className="flex flex-col gap-2">
        <PhotoUpload />
        <SvgUpload />
      </div>
      <div className="mt-2 flex flex-col gap-2 pt-3 border-t border-border">
        <span className="text-[10px] uppercase tracking-[0.18em] text-fg-subtle font-mono">
          Bulk template
        </span>
        <p className="text-[11px] text-fg-muted leading-relaxed">
          Print this sheet, write the whole alphabet, then photograph each cell.
        </p>
        <TemplateSheet />
      </div>
    </div>
  );
}
