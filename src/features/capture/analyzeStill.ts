import { analyzeFrame, minPaperFrac, type Hint } from "./analyzeFrame";
import { GrayFrame } from "./frame";

/** What the backend would warn about this photo (any image: from the camera, the system camera or the
 * gallery); empty when there is nothing to say or the browser cannot decode it (HEIC on most browsers). */
export async function analyzeStill(file: Blob): Promise<Hint[]> {
  if (typeof createImageBitmap !== "function") return [];
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return [];
  }
  try {
    const frame = new GrayFrame().read(bitmap, bitmap.width, bitmap.height);
    if (!frame) return [];
    return analyzeFrame(frame.gray, frame.w, frame.h, { mode: "still", part: false, minPaperFrac: minPaperFrac(bitmap.width) });
  } finally {
    bitmap.close();
  }
}
