/**
 * What is wrong with a photo of a receipt, read from its grey pixels. A port of the checks the backend runs
 * after the upload (Backend/src/basketiq/pipeline/preprocess.py `_otsu_threshold`/`_paper_box`, quality.py),
 * so that the camera can tell the person what to do before the photo is taken.
 *
 * The paper is the bright part of the frame (Otsu threshold): the columns that are bright in at least half
 * the share of the brightest column, and the rows of those columns that are 20 % bright. The print is what
 * is clearly darker than the paper inside it.
 */

const MIN_PAPER_WIDTH = 600; // backend quality.MIN_PAPER_WIDTH: pixels the receipt must span in the photo
export const ANALYSIS_SIDE = 1200; // backend quality: the blur check looks at a thumbnail of this size
const DARK_MEAN_MAX = 70; // backend quality.DARK_MEAN_MAX
const PAPER_DARK_MAX = 120; // live: paper (the bright part) no brighter than this is in too little light
const BLUR_VARIANCE_MIN = 60; // backend quality.BLUR_VARIANCE_MIN (Laplacian variance on the thumbnail)
const PAPER_MIN_FILL = 0.5; // backend preprocess.PAPER_MIN_FILL
const PAPER_MIN_ROW_FILL = 0.2; // backend preprocess.PAPER_MIN_ROW_FILL
const PAPER_MIN_AREA = 0.02; // backend preprocess.PAPER_MIN_AREA
const PAPER_MAX_AREA = 0.95; // backend preprocess.PAPER_MAX_AREA
const INK_SHARE = 0.6; // print is darker than this share of the paper's mean grey
const INK_MIN_COLUMN = 0.01; // a column with less print than this share of the paper height has none
const EDGE_MARGIN = 0.015; // of the frame: paper this close to an edge touches it
const TEXT_FILLS_FRAME = 0.75; // print spanning this share of the frame width: the camera is too close

/** In order of priority: the first one is what the person should fix first. */
const HINTS = ["too_dark", "no_receipt", "bad_background", "cut_side", "too_close", "cut_ends", "too_far", "blurry"] as const;
export type Hint = (typeof HINTS)[number] | "ok";

export interface AnalyzeOptions {
  /** A part of a long receipt: its top and bottom may be cut (the other parts hold them). */
  part: boolean;
  /** Narrowest paper, as a share of the frame width, that still gives MIN_PAPER_WIDTH pixels in the photo. */
  minPaperFrac: number;
}

/** The share of the frame width the paper needs, for a photo `photoWidth` pixels wide; `margin` keeps the
 * live guidance a little above the backend's limit. */
export function minPaperFrac(photoWidth: number, margin = 1): number {
  return photoWidth > 0 ? Math.min(1, (MIN_PAPER_WIDTH * margin) / photoWidth) : 1;
}

/** Grey levels (ITU-R BT.601) of RGBA pixels, written into `out` when it has the right size. */
export function toGray(rgba: Uint8ClampedArray, out?: Uint8Array): Uint8Array {
  const gray = out?.length === rgba.length / 4 ? out : new Uint8Array(rgba.length / 4);
  for (let i = 0, j = 0; j < gray.length; i += 4, j++) {
    gray[j] = (rgba[i]! * 299 + rgba[i + 1]! * 587 + rgba[i + 2]! * 114) / 1000;
  }
  return gray;
}

/** Otsu's threshold (backend `_otsu_threshold`), with the mean grey of the frame and of its bright part. */
function levels(gray: Uint8Array): { threshold: number; mean: number; brightMean: number } {
  const counts = new Float64Array(256);
  for (let i = 0; i < gray.length; i++) counts[gray[i]!]!++;
  let total = 0;
  let sum = 0;
  for (let level = 0; level < 256; level++) {
    total += counts[level]!;
    sum += level * counts[level]!;
  }
  let weight = 0;
  let below = 0; // sum of the levels up to this one
  let best = 0;
  let threshold = 0;
  let weightAt = 0;
  let belowAt = 0;
  for (let level = 0; level < 256; level++) {
    weight += counts[level]!;
    below += level * counts[level]!;
    const rest = total - weight;
    if (weight === 0 || rest === 0) continue;
    const between = (sum * weight - below * total) ** 2 / (weight * rest);
    if (between > best) {
      best = between;
      threshold = level;
      weightAt = weight;
      belowAt = below;
    }
  }
  const bright = total - weightAt;
  return { threshold, mean: total ? sum / total : 0, brightMean: bright ? (sum - belowAt) / bright : 0 };
}

function laplacianVariance(gray: Uint8Array, w: number, h: number): number {
  let n = 0;
  let sum = 0;
  let squares = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = gray[i - w]! + gray[i + w]! + gray[i - 1]! + gray[i + 1]! - 4 * gray[i]!;
      n++;
      sum += lap;
      squares += lap * lap;
    }
  }
  return n ? squares / n - (sum / n) ** 2 : 0;
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function paperBox(gray: Uint8Array, w: number, h: number, threshold: number): Box | null {
  const colFill = new Float64Array(w);
  let best = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (gray[y * w + x]! > threshold && ++colFill[x]! > best) best = colFill[x]!;
    }
  }
  let left = -1;
  let right = -1;
  for (let x = 0; x < w; x++) {
    if (best > 0 && colFill[x]! > PAPER_MIN_FILL * best) {
      if (left < 0) left = x;
      right = x + 1;
    }
  }
  if (left < 0) return null;
  let top = -1;
  let bottom = -1;
  for (let y = 0; y < h; y++) {
    let bright = 0;
    for (let x = left; x < right; x++) if (gray[y * w + x]! > threshold) bright++;
    if (bright > PAPER_MIN_ROW_FILL * (right - left)) {
      if (top < 0) top = y;
      bottom = y + 1;
    }
  }
  return top < 0 ? null : { left, top, right, bottom };
}

/** Columns of the print inside the paper: [first, last + 1], or null without print. */
function printSpan(gray: Uint8Array, w: number, box: Box, threshold: number): [number, number] | null {
  let paperSum = 0;
  let paperCount = 0;
  for (let y = box.top; y < box.bottom; y++) {
    for (let x = box.left; x < box.right; x++) {
      const v = gray[y * w + x]!;
      if (v > threshold) {
        paperSum += v;
        paperCount++;
      }
    }
  }
  if (!paperCount) return null;
  const ink = (paperSum / paperCount) * INK_SHARE;
  const perColumn = new Uint32Array(box.right - box.left);
  for (let y = box.top; y < box.bottom; y++) {
    for (let x = box.left; x < box.right; x++) if (gray[y * w + x]! < ink) perColumn[x - box.left]!++;
  }
  const minInk = INK_MIN_COLUMN * (box.bottom - box.top);
  const first = perColumn.findIndex((count) => count > minInk);
  if (first < 0) return null;
  const last = perColumn.findLastIndex((count) => count > minInk);
  return [box.left + first, box.left + last + 1];
}

/** The paper in a frame and how it sits: one measurement for the live advice and for a photo taken. */
function measure(gray: Uint8Array, w: number, h: number) {
  const { threshold, mean, brightMean } = levels(gray);
  const box = paperBox(gray, w, h, threshold);
  const area = box ? ((box.right - box.left) * (box.bottom - box.top)) / (w * h) : 0;
  const mx = EDGE_MARGIN * w;
  const my = EDGE_MARGIN * h;
  return {
    mean,
    brightMean,
    box,
    area,
    plausible: area >= PAPER_MIN_AREA && area <= PAPER_MAX_AREA,
    paperFrac: box ? (box.right - box.left) / w : 0,
    print: box && area >= PAPER_MIN_AREA ? printSpan(gray, w, box, threshold) : null,
    atLeft: !!box && box.left <= mx,
    atRight: !!box && box.right >= w - mx,
    atEnds: !!box && (box.top <= my || box.bottom >= h - my),
    blurry: laplacianVariance(gray, w, h) < BLUR_VARIANCE_MIN,
  };
}

/** Live advice on a camera frame `w` × `h` (see ANALYSIS_SIDE): the problems, the most important first; empty
 * when it is good. */
export function analyzeFrame(gray: Uint8Array, w: number, h: number, options: AnalyzeOptions): Hint[] {
  const m = measure(gray, w, h);
  const found = new Set<Hint>();
  // The backend looks at the whole photo; live, a small receipt on a dark table is not a dark photo, so
  // the light is judged on the paper.
  if (m.brightMean < PAPER_DARK_MAX) found.add("too_dark");
  if (m.blurry) found.add("blurry");
  if (!m.box || m.area < PAPER_MIN_AREA) return ordered(found.add("no_receipt"));
  // Out of focus, the print fades into the paper: then the blur is what to fix, not the aim.
  if (!m.print && !(m.plausible && m.blurry)) return ordered(found.add("no_receipt"));
  if (m.atLeft && m.atRight) {
    // Bright from side to side: the receipt fills the width (too close) or the surface is as bright as it.
    if (m.print) found.add((m.print[1] - m.print[0]) / w >= TEXT_FILLS_FRAME ? "too_close" : "bad_background");
  } else if (m.atLeft || m.atRight) {
    found.add("cut_side");
  } else if (m.paperFrac < options.minPaperFrac) {
    found.add("too_far");
  }
  if (!options.part && m.atEnds) found.add("cut_ends");
  return ordered(found);
}

export interface StillCheck {
  /** What the backend would warn about the photo (`too_dark`, `too_far`, `blurry`); empty when nothing. */
  warnings: Hint[];
  /** The whole receipt is in the photo: a plausible paper with print that touches none of the edges, so no
   * other part is asked for. */
  whole: boolean;
}

export const NO_CHECK: StillCheck = { warnings: [], whole: false };

/** The check of a photo already taken (or a screenshot, a scan) `w` × `h`: only what the backend measures,
 * and whether it holds the whole receipt. `minPaperFrac` as in AnalyzeOptions. */
export function checkStill(gray: Uint8Array, w: number, h: number, minPaperFrac: number): StillCheck {
  const m = measure(gray, w, h);
  const found = new Set<Hint>();
  if (m.mean < DARK_MEAN_MAX) found.add("too_dark");
  if (m.blurry) found.add("blurry");
  // Without a plausible paper the whole image is the receipt.
  if ((m.plausible ? m.paperFrac : 1) < minPaperFrac) found.add("too_far");
  const inside = !m.atLeft && !m.atRight && !m.atEnds;
  return { warnings: ordered(found), whole: m.plausible && inside && m.print !== null };
}

function ordered(found: Set<Hint>): Hint[] {
  return HINTS.filter((hint) => found.has(hint));
}
