export type GlyphCategory =
  | "uppercase"
  | "lowercase"
  | "digit"
  | "punctuation"
  | "symbol";

export interface GlyphSpec {
  /** UTF-16 char (single codepoint for our v1 set) */
  char: string;
  /** Unicode codepoint */
  code: number;
  /** Friendly name */
  name: string;
  category: GlyphCategory;
  /**
   * Vertical alignment classification used by auto-metrics.
   * `cap` = ascends to cap-height, `x` = sits within x-height,
   * `desc` = has descender below baseline, `full` = both.
   */
  vAlign: "cap" | "x" | "desc" | "full";
}

const make = (
  char: string,
  name: string,
  category: GlyphCategory,
  vAlign: GlyphSpec["vAlign"]
): GlyphSpec => ({
  char,
  code: char.codePointAt(0)!,
  name,
  category,
  vAlign,
});

export const UPPERCASE: GlyphSpec[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  .split("")
  .map((c) => make(c, `Latin Capital ${c}`, "uppercase", c === "Q" || c === "J" ? "full" : "cap"));

export const LOWERCASE: GlyphSpec[] = "abcdefghijklmnopqrstuvwxyz"
  .split("")
  .map((c) => {
    const ascenders = "bdfhklt";
    const descenders = "gjpqy";
    const v = ascenders.includes(c)
      ? "cap"
      : descenders.includes(c)
        ? "desc"
        : "x";
    return make(c, `Latin Small ${c.toUpperCase()}`, "lowercase", v);
  });

export const DIGITS: GlyphSpec[] = "0123456789"
  .split("")
  .map((c) => make(c, `Digit ${c}`, "digit", "cap"));

export const PUNCTUATION: GlyphSpec[] = [
  [".", "Period", "x"],
  [",", "Comma", "desc"],
  [";", "Semicolon", "desc"],
  [":", "Colon", "x"],
  ["!", "Exclamation", "cap"],
  ["?", "Question", "cap"],
  ["'", "Apostrophe", "cap"],
  ['"', "Quote", "cap"],
  ["(", "Left Paren", "full"],
  [")", "Right Paren", "full"],
  ["-", "Hyphen", "x"],
  ["—", "Em Dash", "x"],
  ["/", "Slash", "full"],
  ["&", "Ampersand", "cap"],
  ["@", "At", "x"],
  ["#", "Hash", "x"],
  ["$", "Dollar", "full"],
  ["%", "Percent", "cap"],
  ["+", "Plus", "x"],
  ["=", "Equals", "x"],
  ["*", "Asterisk", "cap"],
].map(([c, n, v]) =>
  make(c as string, n as string, "punctuation", v as GlyphSpec["vAlign"])
);

export const ALL_GLYPHS: GlyphSpec[] = [
  ...UPPERCASE,
  ...LOWERCASE,
  ...DIGITS,
  ...PUNCTUATION,
];

export const GLYPH_BY_CHAR = new Map(ALL_GLYPHS.map((g) => [g.char, g]));

/** Common kerning pairs — adjusted automatically based on glyph shape. */
export const KERN_PAIRS: ReadonlyArray<[string, string]> = [
  ["A", "V"], ["A", "W"], ["A", "Y"], ["A", "T"],
  ["V", "A"], ["W", "A"], ["Y", "A"], ["T", "A"],
  ["F", "A"], ["P", "A"], ["L", "T"], ["L", "Y"], ["L", "V"], ["L", "W"],
  ["T", "o"], ["T", "a"], ["T", "e"], ["T", "y"],
  ["W", "o"], ["W", "a"], ["W", "e"],
  ["Y", "o"], ["Y", "a"], ["Y", "e"],
  ["V", "o"], ["V", "a"], ["V", "e"],
  ["P", "."], ["P", ","],
  ["F", "."], ["F", ","],
  ["T", "."], ["T", ","],
  ["V", "."], ["V", ","],
  ["W", "."], ["W", ","],
  ["Y", "."], ["Y", ","],
  ["f", "f"], ["f", "i"], ["f", "l"],
  ["r", "."], ["r", ","],
];
