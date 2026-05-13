"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { type StrokePoint, type StrokeOptions } from "@/lib/stroke-to-path";
import type { FontProject, GlyphState } from "@/lib/font-types";
import { loadFont, saveFont } from "@/lib/db";
import { createFontProject } from "@/lib/font-project";

export { createFontProject };

interface FontStore {
  font: FontProject | null;
  activeChar: string;
  isSaving: boolean;

  initWith(font: FontProject): void;
  loadById(id: string): Promise<boolean>;

  setActive(char: string): void;
  setStrokeOption<K extends keyof StrokeOptions>(key: K, value: StrokeOptions[K]): void;
  setName(name: string): void;
  setAuthor(author: string): void;

  addStroke(char: string, stroke: StrokePoint[]): void;
  undoStroke(char: string): void;
  clearGlyph(char: string): void;
  setSvgCommands(char: string, cmds: import("@/lib/svg-path").PathCmd[]): void;

  setBearings(char: string, side: "left" | "right", value: number | undefined): void;

  save(): Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useFontStore = create<FontStore>()(
  subscribeWithSelector((set, get) => ({
    font: null,
    activeChar: "A",
    isSaving: false,

    initWith(font) {
      set({ font, activeChar: get().activeChar });
    },

    async loadById(id) {
      const f = await loadFont(id);
      if (!f) return false;
      set({ font: f });
      return true;
    },

    setActive(char) {
      set({ activeChar: char });
    },

    setStrokeOption(key, value) {
      const f = get().font;
      if (!f) return;
      set({
        font: {
          ...f,
          strokeOptions: { ...f.strokeOptions, [key]: value },
          updatedAt: Date.now(),
        },
      });
      scheduleSave(get);
    },

    setName(name) {
      const f = get().font;
      if (!f) return;
      set({ font: { ...f, name, updatedAt: Date.now() } });
      scheduleSave(get);
    },

    setAuthor(author) {
      const f = get().font;
      if (!f) return;
      set({ font: { ...f, author, updatedAt: Date.now() } });
      scheduleSave(get);
    },

    addStroke(char, stroke) {
      const f = get().font;
      if (!f) return;
      const cur = f.glyphs[char] ?? { char, source: "empty", updatedAt: 0 };
      const strokes = cur.source === "draw" && cur.strokes ? cur.strokes : [];
      const updated: GlyphState = {
        ...cur,
        char,
        source: "draw",
        strokes: [...strokes, stroke],
        commands: undefined,
        updatedAt: Date.now(),
      };
      set({
        font: {
          ...f,
          glyphs: { ...f.glyphs, [char]: updated },
          updatedAt: Date.now(),
        },
      });
      scheduleSave(get);
    },

    undoStroke(char) {
      const f = get().font;
      if (!f) return;
      const cur = f.glyphs[char];
      if (!cur || cur.source !== "draw" || !cur.strokes?.length) return;
      const next = cur.strokes.slice(0, -1);
      const updated: GlyphState =
        next.length === 0
          ? { char, source: "empty", updatedAt: Date.now() }
          : { ...cur, strokes: next, updatedAt: Date.now() };
      set({
        font: {
          ...f,
          glyphs: { ...f.glyphs, [char]: updated },
          updatedAt: Date.now(),
        },
      });
      scheduleSave(get);
    },

    clearGlyph(char) {
      const f = get().font;
      if (!f) return;
      set({
        font: {
          ...f,
          glyphs: {
            ...f.glyphs,
            [char]: { char, source: "empty", updatedAt: Date.now() },
          },
          updatedAt: Date.now(),
        },
      });
      scheduleSave(get);
    },

    setSvgCommands(char, cmds) {
      const f = get().font;
      if (!f) return;
      const cur = f.glyphs[char] ?? { char, source: "empty", updatedAt: 0 };
      set({
        font: {
          ...f,
          glyphs: {
            ...f.glyphs,
            [char]: {
              ...cur,
              char,
              source: "svg",
              commands: cmds,
              strokes: undefined,
              updatedAt: Date.now(),
            },
          },
          updatedAt: Date.now(),
        },
      });
      scheduleSave(get);
    },

    setBearings(char, side, value) {
      const f = get().font;
      if (!f) return;
      const cur = f.glyphs[char];
      if (!cur) return;
      const bearings = { ...(cur.bearings ?? {}), [side]: value };
      set({
        font: {
          ...f,
          glyphs: {
            ...f.glyphs,
            [char]: { ...cur, bearings, updatedAt: Date.now() },
          },
          updatedAt: Date.now(),
        },
      });
      scheduleSave(get);
    },

    async save() {
      const f = get().font;
      if (!f) return;
      set({ isSaving: true });
      try {
        await saveFont(f);
      } finally {
        set({ isSaving: false });
      }
    },
  }))
);

function scheduleSave(get: () => FontStore) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    get().save();
  }, 600);
}
