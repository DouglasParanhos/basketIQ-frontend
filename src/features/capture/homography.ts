/** A point (x, y) and four of them: top-left, top-right, bottom-right, bottom-left as they are seen. */
export type Point = readonly [number, number];
export type Quad = readonly [Point, Point, Point, Point];

/** Each corner of `q` through `f` (a map that keeps the four corners). */
export const mapQuad = (q: Quad, f: (p: Point, i: number) => Point): Quad => [f(q[0], 0), f(q[1], 1), f(q[2], 2), f(q[3], 3)];

/** `q` with x times `sx` and y times `sy`: shares of a picture to its pixels, or back. */
export const scaleQuad = (q: Quad, sx: number, sy: number): Quad => mapQuad(q, ([x, y]) => [x * sx, y * sy]);

export const lerpPoint = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** Each corner `t` of the way from `from` to the same corner of `to`. */
export const lerpQuad = (from: Quad, to: Quad, t: number): Quad => mapQuad(from, (p, i) => lerpPoint(p, to[i]!, t));

/** The upright rectangle at (left, top), `width` × `height`. */
export const rectQuad = (left: number, top: number, width: number, height: number): Quad => [
  [left, top],
  [left + width, top],
  [left + width, top + height],
  [left, top + height],
];

/** The width and height of the straightened quad: its longer opposite edges (as the backend's `flatten_paper`). */
export function edgeLengths([tl, tr, br, bl]: Quad): { width: number; height: number } {
  const d = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  return { width: Math.max(d(tl, tr), d(bl, br)), height: Math.max(d(tl, bl), d(tr, br)) };
}

/** The 8 coefficients (a…h) of the perspective that takes each corner of `from` to the same corner of `to`:
 * x' = (a x + b y + c) / (g x + h y + 1), y' = (d x + e y + f) / (g x + h y + 1). The backend's
 * `perspective_coefficients` (preprocess.py) solves the same system. */
export function homography(from: Quad, to: Quad): number[] {
  const rows: number[][] = [];
  from.forEach(([x, y], i) => {
    const [u, v] = to[i]!;
    rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    rows.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  });
  // Gaussian elimination with partial pivoting on the 8 × 9 augmented matrix.
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let r = col + 1; r < 8; r++) if (Math.abs(rows[r]![col]!) > Math.abs(rows[pivot]![col]!)) pivot = r;
    [rows[col], rows[pivot]] = [rows[pivot]!, rows[col]!];
    const top = rows[col]!;
    for (let r = 0; r < 8; r++) {
      if (r === col) continue;
      const row = rows[r]!;
      const factor = row[col]! / top[col]!;
      for (let c = col; c < 9; c++) row[c]! -= factor * top[c]!;
    }
  }
  return rows.map((row, i) => row[8]! / row[i]!);
}

export function mapPoint(h: readonly number[], [x, y]: Point): Point {
  const w = h[6]! * x + h[7]! * y + 1;
  return [(h[0]! * x + h[1]! * y + h[2]!) / w, (h[3]! * x + h[4]! * y + h[5]!) / w];
}

/** The perspective as a CSS transform (with `transform-origin: 0 0`): the 4 × 4 matrix column by column. */
export function matrix3d(h: readonly number[]): string {
  const [a, b, c, d, e, f, g, i] = h;
  return `matrix3d(${[a, d, 0, g, b, e, 0, i, 0, 0, 1, 0, c, f, 0, 1].join(",")})`;
}

export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** The part of `src` inside `quad` (pixels), straightened into an opaque `width` × `height` RGBA picture:
 * each output pixel is looked up in the source (bilinear), so there are no holes. */
export function warp(src: Pixels, quad: Quad, width: number, height: number): Uint8ClampedArray<ArrayBuffer> {
  const [a, b, c, d, e, f, g, h] = homography(rectQuad(0, 0, width, height), quad) as [number, number, number, number, number, number, number, number];
  const out = new Uint8ClampedArray(width * height * 4);
  const { data, width: sw, height: sh } = src;
  let o = 0;
  for (let y = 0; y < height; y++) {
    // Along a row the three sums grow by a, d and g at each pixel (the centre of output pixel x is x + 0.5).
    let nx = a * 0.5 + b * (y + 0.5) + c;
    let ny = d * 0.5 + e * (y + 0.5) + f;
    let nw = g * 0.5 + h * (y + 0.5) + 1;
    for (let x = 0; x < width; x++, nx += a, ny += d, nw += g, o += 4) {
      const fx = Math.min(sw - 1, Math.max(0, nx / nw - 0.5));
      const fy = Math.min(sh - 1, Math.max(0, ny / nw - 0.5));
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = fx - x0;
      const ty = fy - y0;
      const i00 = (y0 * sw + x0) * 4;
      const i10 = (y0 * sw + Math.min(sw - 1, x0 + 1)) * 4;
      const i01 = (Math.min(sh - 1, y0 + 1) * sw + x0) * 4;
      const i11 = (Math.min(sh - 1, y0 + 1) * sw + Math.min(sw - 1, x0 + 1)) * 4;
      for (let k = 0; k < 3; k++) {
        const top = data[i00 + k]! + (data[i10 + k]! - data[i00 + k]!) * tx;
        const bottom = data[i01 + k]! + (data[i11 + k]! - data[i01 + k]!) * tx;
        out[o + k] = top + (bottom - top) * ty;
      }
      out[o + 3] = 255;
    }
  }
  return out;
}
