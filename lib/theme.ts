/**
 * Ocean Sunset palette. Keep in sync with `app/globals.css` @theme tokens.
 * Use these constants anywhere you can't reference a CSS var directly:
 * inline SVG strings serialized to a file, canvas 2D contexts, etc.
 */
export const palette = {
  ocean: "#001219",
  deepTeal: "#005f73",
  teal: "#0a9396",
  mint: "#94d2bd",
  sand: "#e9d8a6",
  amber: "#ee9b00",
  rust: "#ca6702",
  fire: "#bb3e03",
  ember: "#ae2012",
  blood: "#9b2226",
  bg: "#faf6ec",
  surface: "#f3ecd9",
  fgMuted: "#2f4750",
  fgSubtle: "#566669",
  border: "#e6dcc1",
} as const;

export type PaletteKey = keyof typeof palette;

export function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
