import { checkStill, minPaperFrac, NO_CHECK, type StillCheck } from "./analyzeFrame";
import { GrayFrame } from "./frame";

/** The check of a photo already taken (any image: from the camera, the system camera or the gallery);
 * nothing when the browser cannot decode it (HEIC on most browsers). */
export async function analyzeStill(file: Blob): Promise<StillCheck> {
  if (typeof createImageBitmap !== "function") return NO_CHECK;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return NO_CHECK;
  }
  try {
    const frame = new GrayFrame().read(bitmap, bitmap.width, bitmap.height);
    return frame ? checkStill(frame.gray, frame.w, frame.h, minPaperFrac(bitmap.width)) : NO_CHECK;
  } finally {
    bitmap.close();
  }
}
