import { ANALYSIS_SIDE, toGray } from "./analyzeFrame";
import type { Quad } from "./homography";
import { PAPER_PROBE_SIDE, paperQuad } from "./paperQuad";

/** Draws `source` (width × height) shrunk to `side` (ANALYSIS_SIDE unless said) on `canvas` and reads its grey
 * pixels into one reused buffer: the live camera does this a few times a second. */
export class GrayFrame {
  private readonly canvas = document.createElement("canvas");
  private gray?: Uint8Array;

  constructor(private readonly side = ANALYSIS_SIDE) {}

  read(source: CanvasImageSource, width: number, height: number): { gray: Uint8Array; w: number; h: number } | null {
    const scale = Math.min(1, this.side / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; // resizing reallocates the canvas: only when the size changes
      this.canvas.height = h;
    }
    const context = this.canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(source, 0, 0, w, h);
    this.gray = toGray(context.getImageData(0, 0, w, h).data, this.gray);
    return { gray: this.gray, w, h };
  }
}

/** Finds the corners of the receipt in a picture (see `paperQuad`), on a probe the size of the backend's that
 * it keeps from one picture to the next. */
export function quadFinder(): (source: CanvasImageSource, width: number, height: number) => Quad | null {
  const probe = new GrayFrame(PAPER_PROBE_SIDE);
  return (source, width, height) => {
    const frame = probe.read(source, width, height);
    return frame && paperQuad(frame.gray, frame.w, frame.h);
  };
}
