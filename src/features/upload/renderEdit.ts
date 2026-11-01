import type { Edit } from "./edit";

/** Render the edited image to a JPEG blob (rotation first, then the crop area). */
export async function renderEdit(src: string, edit: Pick<Edit, "rotation" | "area">): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
  const rad = (edit.rotation * Math.PI) / 180;
  const rotW = Math.abs(Math.cos(rad) * image.width) + Math.abs(Math.sin(rad) * image.height);
  const rotH = Math.abs(Math.sin(rad) * image.width) + Math.abs(Math.cos(rad) * image.height);
  const rotated = document.createElement("canvas");
  rotated.width = Math.round(rotW);
  rotated.height = Math.round(rotH);
  const rctx = rotated.getContext("2d")!;
  rctx.translate(rotW / 2, rotH / 2);
  rctx.rotate(rad);
  rctx.drawImage(image, -image.width / 2, -image.height / 2);

  const area = edit.area ?? { x: 0, y: 0, width: rotated.width, height: rotated.height };
  const out = document.createElement("canvas");
  out.width = Math.round(area.width);
  out.height = Math.round(area.height);
  out.getContext("2d")!.drawImage(rotated, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
  return canvasToJpeg(out);
}

/** The picture on `canvas` as the JPEG that is uploaded (an edited part, a photo from the in-app camera). */
export function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("render failed"))), "image/jpeg", 0.92));
}
