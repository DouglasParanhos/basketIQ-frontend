import { ANALYSIS_SIDE, toGray } from "./analyzeFrame";

/** Draws `source` (width × height) shrunk to ANALYSIS_SIDE on `canvas` and reads its grey pixels into one
 * reused buffer: the live camera does this a few times a second. */
export class GrayFrame {
  private readonly canvas = document.createElement("canvas");
  private gray?: Uint8Array;

  read(source: CanvasImageSource, width: number, height: number): { gray: Uint8Array; w: number; h: number } | null {
    const scale = Math.min(1, ANALYSIS_SIDE / Math.max(width, height));
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
