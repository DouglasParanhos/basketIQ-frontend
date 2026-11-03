import type { Page } from "@playwright/test";

/**
 * What a phone's rear camera would see: a synthetic receipt (no personal data) on a dark table, on a light
 * desk, far, too close, too long for one photo. The page's `getUserMedia` returns a stream of a canvas with
 * the scene, so the in-app camera analyses it exactly as it would a real picture.
 */

const WIDTH = 1080; // a phone's rear camera in portrait: 600 px of paper need 61 % of this width
const HEIGHT = 1920;

/** Paper box (x, y, width, height) in the frame, and the surface it lies on. */
interface Scene {
  paper: readonly [number, number, number, number];
  surface: "dark" | "light";
}

export const SCENES = {
  framed: { paper: [190, 140, 700, 1640], surface: "dark" },
  far: { paper: [390, 610, 300, 700], surface: "dark" },
  lightDesk: { paper: [240, 200, 600, 1520], surface: "light" },
  tooClose: { paper: [-60, 120, 1200, 1700], surface: "dark" },
  tooLong: { paper: [190, -60, 700, 2040], surface: "dark" },
} as const satisfies Record<string, Scene>;

export type SceneName = keyof typeof SCENES;

/** A browser without the camera API: «Fotografar» and «Adicionar outra parte» open the phone's own camera
 * (a native picker), as on a page that cannot have the in-app camera. */
export async function noCamera(page: Page): Promise<void> {
  await page.addInitScript(() => Reflect.deleteProperty(Navigator.prototype, "mediaDevices"));
}

export async function fakeCamera(page: Page, scene: SceneName): Promise<void> {
  await page.addInitScript(installCamera, { scene: SCENES[scene], width: WIDTH, height: HEIGHT });
}

/** Runs in the page before its scripts: draws the scene and serves it as the camera. */
function installCamera({ scene, width, height }: { scene: Scene; width: number; height: number }): void {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const surface = scene.surface === "dark" ? ([42, 40, 38] as const) : ([228, 223, 216] as const);
  const pixels = ctx.createImageData(width, height);
  let seed = 7;
  const grain = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 16; // reproducible
  for (let i = 0; i < pixels.data.length; i += 4) {
    const n = grain();
    pixels.data[i] = surface[0] + n;
    pixels.data[i + 1] = surface[1] + n;
    pixels.data[i + 2] = surface[2] + n;
    pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);

  const [x, y, w, h] = scene.paper;
  ctx.fillStyle = "#f4f3ef";
  ctx.fillRect(x, y, w, h);
  const size = Math.round(w / 22);
  ctx.fillStyle = "#1f1f1f";
  ctx.font = `bold ${size}px monospace`;
  ctx.textBaseline = "top";
  const lines = ["SUPER MERCADO", "FATURA SIMPLIFICADA", "", ...Array.from({ length: 40 }, (_, i) => `PRODUTO ${i + 1}`)];
  lines.forEach((line, i) => {
    const top = y + w * 0.08 + i * size * 1.6;
    if (top + size > y + h) return;
    ctx.textAlign = "left";
    ctx.fillText(line, x + w * 0.07, top);
    if (line.startsWith("PRODUTO")) {
      ctx.textAlign = "right";
      ctx.fillText(`${(i % 9) + 1},${String((i * 37) % 100).padStart(2, "0")} A`, x + w * 0.93, top);
    }
  });

  // A canvas stream sends frames only when the canvas changes: touch one pixel a few times a second.
  const corner = ctx.getImageData(0, 0, 1, 1);
  setInterval(() => ctx.putImageData(corner, 0, 0), 100);
  navigator.mediaDevices.getUserMedia = async () => canvas.captureStream(10);
}
