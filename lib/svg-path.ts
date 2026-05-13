/**
 * Lightweight SVG path "d" parser → list of canonical commands in absolute
 * coordinates. Supports M/L/H/V/C/S/Q/T/A/Z (upper + lower case).
 */
export type PathCmd =
  | { type: "M" | "L"; x: number; y: number }
  | { type: "Q"; x1: number; y1: number; x: number; y: number }
  | { type: "C"; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { type: "Z" };

const NUMBER_RE = /-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;

function parseNums(s: string): number[] {
  const m = s.match(NUMBER_RE);
  return m ? m.map(Number) : [];
}

export function parseSvgPath(d: string): PathCmd[] {
  const out: PathCmd[] = [];
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g);
  if (!tokens) return out;

  let cx = 0,
    cy = 0,
    startX = 0,
    startY = 0;
  let prevCtrlX: number | null = null,
    prevCtrlY: number | null = null;
  let prevCmd = "";

  for (const tok of tokens) {
    const cmd = tok[0];
    const nums = parseNums(tok.slice(1));
    const lower = cmd === cmd.toLowerCase();
    let i = 0;

    const eat = () => nums[i++];

    while (i < nums.length || cmd.toUpperCase() === "Z") {
      switch (cmd.toUpperCase()) {
        case "M": {
          let x = eat();
          let y = eat();
          if (lower) {
            x += cx;
            y += cy;
          }
          out.push({ type: "M", x, y });
          cx = x;
          cy = y;
          startX = x;
          startY = y;
          // subsequent pairs after M are implicit L
          while (i < nums.length) {
            let lx = eat();
            let ly = eat();
            if (lower) {
              lx += cx;
              ly += cy;
            }
            out.push({ type: "L", x: lx, y: ly });
            cx = lx;
            cy = ly;
          }
          prevCtrlX = prevCtrlY = null;
          break;
        }
        case "L": {
          let x = eat();
          let y = eat();
          if (lower) {
            x += cx;
            y += cy;
          }
          out.push({ type: "L", x, y });
          cx = x;
          cy = y;
          prevCtrlX = prevCtrlY = null;
          break;
        }
        case "H": {
          let x = eat();
          if (lower) x += cx;
          out.push({ type: "L", x, y: cy });
          cx = x;
          prevCtrlX = prevCtrlY = null;
          break;
        }
        case "V": {
          let y = eat();
          if (lower) y += cy;
          out.push({ type: "L", x: cx, y });
          cy = y;
          prevCtrlX = prevCtrlY = null;
          break;
        }
        case "Q": {
          let x1 = eat(),
            y1 = eat(),
            x = eat(),
            y = eat();
          if (lower) {
            x1 += cx;
            y1 += cy;
            x += cx;
            y += cy;
          }
          out.push({ type: "Q", x1, y1, x, y });
          prevCtrlX = x1;
          prevCtrlY = y1;
          cx = x;
          cy = y;
          break;
        }
        case "T": {
          let x = eat();
          let y = eat();
          if (lower) {
            x += cx;
            y += cy;
          }
          const reflect = prevCmd === "Q" || prevCmd === "T";
          const tx1: number = reflect ? 2 * cx - (prevCtrlX ?? cx) : cx;
          const ty1: number = reflect ? 2 * cy - (prevCtrlY ?? cy) : cy;
          out.push({ type: "Q", x1: tx1, y1: ty1, x, y });
          prevCtrlX = tx1;
          prevCtrlY = ty1;
          cx = x;
          cy = y;
          break;
        }
        case "C": {
          let x1 = eat(),
            y1 = eat(),
            x2 = eat(),
            y2 = eat(),
            x = eat(),
            y = eat();
          if (lower) {
            x1 += cx;
            y1 += cy;
            x2 += cx;
            y2 += cy;
            x += cx;
            y += cy;
          }
          out.push({ type: "C", x1, y1, x2, y2, x, y });
          prevCtrlX = x2;
          prevCtrlY = y2;
          cx = x;
          cy = y;
          break;
        }
        case "S": {
          let x2 = eat(),
            y2 = eat(),
            x = eat(),
            y = eat();
          if (lower) {
            x2 += cx;
            y2 += cy;
            x += cx;
            y += cy;
          }
          const reflect = prevCmd === "C" || prevCmd === "S";
          const sx1: number = reflect ? 2 * cx - (prevCtrlX ?? cx) : cx;
          const sy1: number = reflect ? 2 * cy - (prevCtrlY ?? cy) : cy;
          out.push({ type: "C", x1: sx1, y1: sy1, x2, y2, x, y });
          prevCtrlX = x2;
          prevCtrlY = y2;
          cx = x;
          cy = y;
          break;
        }
        case "A": {
          // arc — flatten to a single line for now (rare in handwriting paths).
          eat();
          eat();
          eat();
          eat();
          eat();
          let x = eat(),
            y = eat();
          if (lower) {
            x += cx;
            y += cy;
          }
          out.push({ type: "L", x, y });
          cx = x;
          cy = y;
          break;
        }
        case "Z": {
          out.push({ type: "Z" });
          cx = startX;
          cy = startY;
          prevCtrlX = prevCtrlY = null;
          i = nums.length + 1;
          break;
        }
      }
      prevCmd = cmd.toUpperCase();
      if (cmd.toUpperCase() === "Z") break;
    }
  }
  return out;
}

export interface PathBBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function bboxOfCommands(cmds: PathCmd[]): PathBBox | null {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const ext = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };
  for (const c of cmds) {
    if (c.type === "M" || c.type === "L") ext(c.x, c.y);
    else if (c.type === "Q") {
      ext(c.x, c.y);
      ext(c.x1, c.y1);
    } else if (c.type === "C") {
      ext(c.x, c.y);
      ext(c.x1, c.y1);
      ext(c.x2, c.y2);
    }
  }
  if (!isFinite(minX)) return null;
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** Emit absolute SVG `d` string from canonical commands. */
export function commandsToD(cmds: PathCmd[]): string {
  const parts: string[] = [];
  for (const c of cmds) {
    if (c.type === "M") parts.push(`M${c.x} ${c.y}`);
    else if (c.type === "L") parts.push(`L${c.x} ${c.y}`);
    else if (c.type === "Q") parts.push(`Q${c.x1} ${c.y1} ${c.x} ${c.y}`);
    else if (c.type === "C")
      parts.push(`C${c.x1} ${c.y1} ${c.x2} ${c.y2} ${c.x} ${c.y}`);
    else parts.push("Z");
  }
  return parts.join(" ");
}

export function transformCommands(
  cmds: PathCmd[],
  sx: number,
  sy: number,
  tx: number,
  ty: number
): PathCmd[] {
  const out: PathCmd[] = [];
  for (const c of cmds) {
    switch (c.type) {
      case "Z":
        out.push(c);
        break;
      case "M":
      case "L":
        out.push({ type: c.type, x: c.x * sx + tx, y: c.y * sy + ty });
        break;
      case "Q":
        out.push({
          type: "Q",
          x1: c.x1 * sx + tx,
          y1: c.y1 * sy + ty,
          x: c.x * sx + tx,
          y: c.y * sy + ty,
        });
        break;
      case "C":
        out.push({
          type: "C",
          x1: c.x1 * sx + tx,
          y1: c.y1 * sy + ty,
          x2: c.x2 * sx + tx,
          y2: c.y2 * sy + ty,
          x: c.x * sx + tx,
          y: c.y * sy + ty,
        });
        break;
    }
  }
  return out;
}
