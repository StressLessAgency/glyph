/**
 * Ramer–Douglas–Peucker simplification for outline polygons.
 * Inputs/outputs use [x,y] pairs in pixel space.
 */
export function simplifyPolyline(
  points: number[][],
  tolerance = 1.2
): number[][] {
  if (points.length <= 2) return points;
  const sq = tolerance * tolerance;
  return rdp(points, sq);
}

function rdp(pts: number[][], sq: number): number[][] {
  const last = pts.length - 1;
  let maxD = 0;
  let idx = 0;
  for (let i = 1; i < last; i++) {
    const d = sqSegDist(pts[i], pts[0], pts[last]);
    if (d > maxD) {
      idx = i;
      maxD = d;
    }
  }
  if (maxD > sq) {
    const left = rdp(pts.slice(0, idx + 1), sq);
    const right = rdp(pts.slice(idx), sq);
    return left.slice(0, -1).concat(right);
  }
  return [pts[0], pts[last]];
}

function sqSegDist(p: number[], a: number[], b: number[]): number {
  let x = a[0],
    y = a[1],
    dx = b[0] - x,
    dy = b[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = b[0];
      y = b[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  return (p[0] - x) ** 2 + (p[1] - y) ** 2;
}
