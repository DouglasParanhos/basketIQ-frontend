import type { Edit } from "./edit";
import { loadImage, straighten } from "./straighten";

/** Render the edited image to a JPEG blob: the receipt straightened by its corners (when the person set
 * them), then the rotation. */
export async function renderEdit(src: string, edit: Edit): Promise<Blob> {
  const image = await loadImage(src);
  const source = edit.corners ? straighten(image, edit.corners) : image;
  if (edit.rotation === 0 && source instanceof HTMLCanvasElement) return canvasToJpeg(source);
  const turned = edit.rotation % 180 !== 0;
  const out = document.createElement("canvas");
  out.width = turned ? source.height : source.width;
  out.height = turned ? source.width : source.height;
  const ctx = out.getContext("2d")!;
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate((edit.rotation * Math.PI) / 180);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  return canvasToJpeg(out);
}

/** The picture on `canvas` as the JPEG that is uploaded (an edited part, a photo from the in-app camera). */
export function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("render failed"))), "image/jpeg", 0.92));
}
