import { describe, expect, it } from "vitest";
import type { Point, Quad } from "./homography";
import { paperQuad } from "./paperQuad";

const W = 450;
const H = 800;

/** A probe of a dark desk with a receipt whose corners are `corners` (pixels): paper 235, lines of print 30. */
function scene(corners: Quad, w = W, h = H): Uint8Array {
  const gray = new Uint8Array(w * h).fill(40);
  const inside = (x: number, y: number) =>
    corners.every((a, i) => {
      const b = corners[(i + 1) % 4]!;
      return (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]) >= 0; // clockwise on screen
    });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inside(x + 0.5, y + 0.5)) continue;
      gray[y * w + x] = y % 12 < 3 && x % 7 < 4 ? 30 : 235;
    }
  }
  return gray;
}

/** Corners in the probe's pixels, from the normalised ones that paperQuad returns. */
const toPixels = (quad: Quad, w = W, h = H) => quad.map(([x, y]) => [x * w, y * h]);

function expectNear(found: Quad | null, expected: Quad, tolerance: number, w = W, h = H) {
  expect(found).not.toBeNull();
  toPixels(found!, w, h).forEach(([x, y], i) => {
    expect(Math.hypot(x! - expected[i]![0], y! - expected[i]![1])).toBeLessThanOrEqual(tolerance);
  });
}

/** A receipt `width` × `height` centred on (cx, cy) and turned `degrees` clockwise: its corners. */
function turned(cx: number, cy: number, width: number, height: number, degrees: number): Quad {
  const r = (degrees * Math.PI) / 180;
  const at = (dx: number, dy: number): Point => [cx + dx * Math.cos(r) - dy * Math.sin(r), cy + dx * Math.sin(r) + dy * Math.cos(r)];
  return [at(-width / 2, -height / 2), at(width / 2, -height / 2), at(width / 2, height / 2), at(-width / 2, height / 2)];
}

const PAPER_WIDTH = 260;
const TOLERANCE = 0.015 * PAPER_WIDTH;

describe("paperQuad (spec 017)", () => {
  it("F-226: a receipt that stands straight: its corners", () => {
    const corners: Quad = [
      [95, 60],
      [355, 60],
      [355, 740],
      [95, 740],
    ];
    expectNear(paperQuad(scene(corners), W, H), corners, TOLERANCE);
  });

  it("F-226: a turned receipt: its corners, not the box around it", () => {
    const corners = turned(225, 400, PAPER_WIDTH, 640, 10);
    expectNear(paperQuad(scene(corners), W, H), corners, TOLERANCE);
  });

  it("F-226: a receipt seen at an angle (a trapezium)", () => {
    const corners: Quad = [
      [130, 70],
      [320, 70],
      [400, 750],
      [50, 750],
    ];
    expectNear(paperQuad(scene(corners), W, H), corners, TOLERANCE);
  });

  it("F-226: a receipt lying sideways: the corners in the order they are seen", () => {
    const w = 800;
    const h = 450;
    const corners = turned(400, 225, 680, PAPER_WIDTH, 2);
    expectNear(paperQuad(scene(corners, w, h), w, h), corners, TOLERANCE, w, h);
  });

  it("F-226: no paper, no corners", () => {
    expect(paperQuad(new Uint8Array(W * H).fill(40), W, H)).toBeNull();
  });
});
