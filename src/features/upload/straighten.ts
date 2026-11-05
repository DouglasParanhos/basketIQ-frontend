import { edgeLengths, lerpPoint, scaleQuad, warp, type Quad } from "../capture/homography";

const PAPER_PADDING = 0.02; // backend preprocess.PAPER_PADDING: kept around the straightened receipt

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** The receipt inside `corners` (shares of the image) as an upright rectangle, as the backend's
 * `flatten_paper` makes it: as big as its longer edges, with a margin. `maxSide` shrinks the image first
 * (a preview). */
export function straighten(image: HTMLImageElement, corners: Quad, maxSide = Infinity): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const full = document.createElement("canvas");
  full.width = Math.round(image.naturalWidth * scale);
  full.height = Math.round(image.naturalHeight * scale);
  const context = full.getContext("2d")!;
  context.drawImage(image, 0, 0, full.width, full.height);
  const quad = scaleQuad(corners, full.width, full.height);
  const { width, height } = edgeLengths(quad);
  const [padX, padY] = [PAPER_PADDING * width, PAPER_PADDING * height];
  const out = document.createElement("canvas");
  out.width = Math.round(width + 2 * padX);
  out.height = Math.round(height + 2 * padY);
  // The output's corners, inside the margin, map onto the receipt's: extend the quad by the margin.
  const outer = padQuad(quad, padX / width, padY / height);
  const pixels = warp(context.getImageData(0, 0, full.width, full.height), outer, out.width, out.height);
  full.width = 0; // free the copy of the photo now
  out.getContext("2d")!.putImageData(new ImageData(pixels, out.width, out.height), 0, 0);
  return out;
}

/** `quad` grown by `x` of its width on the left and right and `y` of its height above and below, along its
 * own edges: first along the top and bottom edges, then along the sides. */
function padQuad([tl, tr, br, bl]: Quad, x: number, y: number): Quad {
  const [topLeft, topRight] = [lerpPoint(tl, tr, -x), lerpPoint(tl, tr, 1 + x)];
  const [bottomLeft, bottomRight] = [lerpPoint(bl, br, -x), lerpPoint(bl, br, 1 + x)];
  return [lerpPoint(topLeft, bottomLeft, -y), lerpPoint(topRight, bottomRight, -y), lerpPoint(topRight, bottomRight, 1 + y), lerpPoint(topLeft, bottomLeft, 1 + y)];
}
