import { useEffect, useRef } from "react";
import type { Quad } from "../capture/homography";
import { loadImage, straighten } from "./straighten";

const PREVIEW_SOURCE = 1000; // the photo is shrunk to this before it is straightened for the card

/** The receipt in the photo `src`, straightened by its corners (shares of the photo), as the backend will
 * read it. */
export function FlatPreview({ src, quad }: { src: string; quad: Quad }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    void loadImage(src)
      .then((image) => {
        const c = canvas.current;
        if (cancelled || !c) return;
        const flat = straighten(image, quad, PREVIEW_SOURCE);
        c.width = flat.width;
        c.height = flat.height;
        c.getContext("2d")?.drawImage(flat, 0, 0);
        flat.width = 0;
      })
      .catch(() => undefined); // the card stays empty, as a photo that does not load
    return () => {
      cancelled = true;
    };
  }, [src, quad]);
  return <canvas ref={canvas} data-flat aria-hidden className="max-h-full max-w-full" />;
}
