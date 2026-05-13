"use client";

import { Undo2, Trash2, Pen, Droplet, Waves, Wind } from "lucide-react";
import { useFontStore } from "@/stores/font-store";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

export function StrokeControls() {
  const font = useFontStore((s) => s.font);
  const activeChar = useFontStore((s) => s.activeChar);
  const setStrokeOption = useFontStore((s) => s.setStrokeOption);
  const undoStroke = useFontStore((s) => s.undoStroke);
  const clearGlyph = useFontStore((s) => s.clearGlyph);
  if (!font) return null;
  const opts = font.strokeOptions;

  return (
    <div className="flex w-full flex-col gap-5 px-5 py-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.18em] text-fg-subtle font-mono">
          Pen
        </span>
        <div className="flex items-center gap-1">
          <Tooltip label="Undo last stroke (⌘Z)">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => undoStroke(activeChar)}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </Tooltip>
          <Tooltip label="Clear glyph">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => clearGlyph(activeChar)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      </div>

      <ControlRow
        icon={<Pen className="h-3.5 w-3.5" />}
        label="Size"
        value={opts.size}
        min={2}
        max={36}
        step={1}
        onChange={(v) => setStrokeOption("size", v)}
      />
      <ControlRow
        icon={<Droplet className="h-3.5 w-3.5" />}
        label="Thinning"
        value={opts.thinning}
        min={-0.5}
        max={0.95}
        step={0.05}
        format={(v) => v.toFixed(2)}
        onChange={(v) => setStrokeOption("thinning", v)}
      />
      <ControlRow
        icon={<Waves className="h-3.5 w-3.5" />}
        label="Smoothing"
        value={opts.smoothing}
        min={0}
        max={1}
        step={0.05}
        format={(v) => v.toFixed(2)}
        onChange={(v) => setStrokeOption("smoothing", v)}
      />
      <ControlRow
        icon={<Wind className="h-3.5 w-3.5" />}
        label="Streamline"
        value={opts.streamline}
        min={0}
        max={1}
        step={0.05}
        format={(v) => v.toFixed(2)}
        onChange={(v) => setStrokeOption("streamline", v)}
      />

      <label className="flex items-center justify-between gap-3 cursor-pointer">
        <span className="text-[12px] text-fg-muted">Simulate pressure</span>
        <button
          type="button"
          aria-pressed={opts.simulatePressure}
          onClick={() => setStrokeOption("simulatePressure", !opts.simulatePressure)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${opts.simulatePressure ? "bg-ink" : "bg-border-strong"}`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-bg shadow-soft transition ${opts.simulatePressure ? "translate-x-[18px]" : "translate-x-[3px]"}`}
          />
        </button>
      </label>
    </div>
  );
}

function ControlRow({
  icon,
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[12px] text-fg">
          <span className="text-fg-muted">{icon}</span>
          {label}
        </span>
        <span className="font-mono text-[11px] text-fg-muted">
          {format ? format(value) : value}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}
