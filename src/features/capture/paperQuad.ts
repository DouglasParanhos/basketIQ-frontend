/**
 * The four corners of the receipt in a grey probe: a port of the backend's `_paper_quad` (and of the part of
 * `flatten_paper` that finds it, Backend/src/basketiq/pipeline/preprocess.py), on a probe of the same size,
 * so that the corners shown on the phone are the ones the backend will straighten.
 */
import { boxArea, paperThreshold, plausible, type Box } from "./analyzeFrame";
import { edgeLengths, mapQuad, rectQuad, scaleQuad, type Point, type Quad } from "./homography";

export const PAPER_PROBE_SIDE = 800; // backend preprocess.PAPER_PROBE_SIDE
const PAPER_TEXT_GAP = 7; // backend: dark gaps (printed text) up to this wide do not split the paper
const PAPER_MIN_EDGE_ROWS = 20; // backend: probe rows needed to trace the long edges of the paper
const PAPER_MAX_EDGE_MISS = 0.08; // backend: of the paper width, edge points this far off a line: no clean edge
const ALONG_BIN = 0.25; // probe pixels: the ends are read from a histogram this fine (a sort is too slow live)

/** Corners of the receipt (top-left, top-right, bottom-right, bottom-left as seen), as shares (0..1) of the
 * probe's width and height; the paper's box when its edges are not clean; null without a plausible paper. */
export function paperQuad(gray: Uint8Array, w: number, h: number): Quad | null {
  const { threshold, box } = paperThreshold(gray, w, h);
  if (!box || !plausible(boxArea(box), w, h)) return null;
  if (box.right - box.left > box.bottom - box.top) {
    // Lying sideways: the backend stands it up first. Transposed, the rows cross the paper again.
    const turned = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) turned[x * h + y] = gray[y * w + x]!;
    const quad = paperQuad(turned, h, w);
    if (!quad) return null;
    const [a, b, c, d] = mapQuad(quad, ([x, y]) => [y, x]);
    return [a, d, c, b]; // transposed, the corners go round the other way
  }
  const corners = traceQuad(close(gray, w, h, threshold), w, h, box);
  const size = corners && edgeLengths(corners);
  const pixels = corners && size && plausible(size.width * size.height, w, h) ? corners : rectQuad(box.left, box.top, box.right - box.left, box.bottom - box.top);
  return scaleQuad(pixels, 1 / w, 1 / h);
}

/** The paper mask with the printed text closed: a 7 × 7 maximum, then minimum (PIL's MaxFilter and MinFilter
 * on the grey probe before the threshold, which is the same thing). The window stops at the borders. */
function close(gray: Uint8Array, w: number, h: number, threshold: number): Uint8Array {
  const a = new Uint8Array(w * h);
  const b = new Uint8Array(w * h);
  for (let i = 0; i < a.length; i++) a[i] = gray[i]! > threshold ? 1 : 0;
  // Rows, then columns (lines of `length` pixels `step` apart, `stride` from one line to the next), from a to b and back.
  rank(a, b, h, w, w, 1, true);
  rank(b, a, w, h, 1, w, true);
  rank(a, b, h, w, w, 1, false);
  rank(b, a, w, h, 1, w, false);
  return a;
}

/** One pass of the window along each line: any pixel set (`dilate`) or all of them. */
function rank(mask: Uint8Array, out: Uint8Array, lines: number, length: number, stride: number, step: number, dilate: boolean): void {
  const r = PAPER_TEXT_GAP >> 1;
  const sums = new Uint32Array(length + 1);
  for (let line = 0, base = 0; line < lines; line++, base += stride) {
    for (let i = 0, at = base; i < length; i++, at += step) sums[i + 1] = sums[i]! + mask[at]!;
    for (let i = 0, at = base; i < length; i++, at += step) {
      const from = Math.max(0, i - r);
      const to = Math.min(length, i + r + 1);
      const count = sums[to]! - sums[from]!;
      out[at] = dilate ? (count > 0 ? 1 : 0) : count === to - from ? 1 : 0;
    }
  }
}

/** Backend `_paper_quad`: each row crosses the paper once; its longest bright run (touching the box) gives a
 * point of the left and of the right edge, and a line through each set gives the two long edges. The ends are
 * where the paper stops along the direction of those edges. */
function traceQuad(bright: Uint8Array, w: number, h: number, box: Box): Quad | null {
  const ys: number[] = [];
  const starts: number[] = [];
  const ends: number[] = [];
  for (let y = 0; y < h; y++) {
    let best = -1;
    let bestStart = 0;
    let bestEnd = 0;
    for (let x = 0; x < w; ) {
      if (!bright[y * w + x]) {
        x++;
        continue;
      }
      const start = x;
      while (x < w && bright[y * w + x]) x++;
      if (x > box.left && start < box.right && x - start > best) {
        best = x - start;
        bestStart = start;
        bestEnd = x;
      }
    }
    if (best >= 0) {
      ys.push(y);
      starts.push(bestStart);
      ends.push(bestEnd);
    }
  }
  const widths = ys.map((_, i) => ends[i]! - starts[i]!);
  const wideEnough = 0.5 * median(widths);
  const keep = widths.map((width) => width >= wideEnough);
  const y = ys.filter((_, i) => keep[i]);
  const x0 = starts.filter((_, i) => keep[i]);
  const x1 = ends.filter((_, i) => keep[i]);
  if (y.length < PAPER_MIN_EDGE_ROWS) return null;
  const left = edgeFit(y, x0);
  const right = edgeFit(y, x1);
  if (!left || !right) return null;
  const paperWidth = median(widths.filter((_, i) => keep[i]));
  if (Math.max(left.miss, right.miss) > PAPER_MAX_EDGE_MISS * paperWidth) return null;

  // The ends: the paper pixels between the two edges, projected on the direction of the edges.
  const slope = (left.slope + right.slope) / 2;
  const norm = Math.hypot(slope, 1);
  const ux = slope / norm;
  const uy = 1 / norm;
  // Straight into a histogram of ALONG_BIN-wide bins over every value the probe can give.
  const low = Math.min(0, (w - 1) * ux);
  const bins = new Uint32Array(Math.ceil((Math.max(0, (w - 1) * ux) + (h - 1) * uy - low) / ALONG_BIN) + 1);
  let count = 0;
  for (let py = 0; py < h; py++) {
    const from = left.slope * py + left.offset - 2;
    const to = right.slope * py + right.offset + 2;
    for (let px = Math.max(0, Math.ceil(from)); px <= Math.min(w - 1, Math.floor(to)); px++) {
      if (!bright[py * w + px]) continue;
      bins[Math.floor((px * ux + py * uy - low) / ALONG_BIN)]!++;
      count++;
    }
  }
  if (!count) return null;
  const first = percentile(bins, count, low, 0.2);
  const last = percentile(bins, count, low, 99.8);
  const corner = (edge: { slope: number; offset: number }, at: number): Point => {
    const cy = (at - edge.offset * ux) / (edge.slope * ux + uy);
    return [edge.slope * cy + edge.offset, cy];
  };
  return [corner(left, first), corner(right, first), corner(right, last), corner(left, last)];
}

/** Backend `_edge_fit`: x = slope * y + offset through the points, refitted three times without the points far
 * from the line (a torn corner, a shadow); also the median distance of the kept points. */
function edgeFit(ys: number[], xs: number[]): { slope: number; offset: number; miss: number } | null {
  let keep = ys.map(() => true);
  let slope = 0;
  let offset = 0;
  let residual: number[] = [];
  for (let pass = 0; pass < 3; pass++) {
    let n = 0;
    let sy = 0;
    let sx = 0;
    let syy = 0;
    let sxy = 0;
    ys.forEach((y, i) => {
      if (!keep[i]) return;
      n++;
      sy += y;
      sx += xs[i]!;
      syy += y * y;
      sxy += y * xs[i]!;
    });
    const spread = n * syy - sy * sy;
    if (n < 2 || spread === 0) return null;
    slope = (n * sxy - sy * sx) / spread;
    offset = (sx - slope * sy) / n;
    residual = ys.map((y, i) => Math.abs(xs[i]! - (slope * y + offset)));
    const limit = Math.max(2, 2.5 * median(residual.filter((_, i) => keep[i])));
    keep = residual.map((r) => r <= limit);
  }
  return { slope, offset, miss: median(residual.filter((_, i) => keep[i])) };
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** numpy's linear percentile `p` of the `count` values in `bins` (ALONG_BIN wide from `low`; within a bin the
 * values are taken as evenly spread). */
function percentile(bins: Uint32Array, count: number, low: number, p: number): number {
  const rank = (p / 100) * (count - 1);
  let below = 0;
  for (let b = 0; b < bins.length; b++) {
    if (below + bins[b]! > rank) return low + (b + (rank - below + 0.5) / bins[b]!) * ALONG_BIN;
    below += bins[b]!;
  }
  return low + bins.length * ALONG_BIN;
}
