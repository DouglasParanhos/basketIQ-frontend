import { describe, expect, it } from "vitest";
import { homography, mapPoint, matrix3d, warp, type Quad } from "./homography";

const RECT: Quad = [
  [0, 0],
  [100, 0],
  [100, 200],
  [0, 200],
];
const SKEWED: Quad = [
  [12, 30],
  [180, 8],
  [210, 330],
  [5, 290],
];

describe("homography", () => {
  it("maps each corner of one quad onto the matching corner of the other", () => {
    const h = homography(RECT, SKEWED);
    RECT.forEach((p, i) => {
      const [x, y] = mapPoint(h, p);
      expect(x).toBeCloseTo(SKEWED[i]![0], 6);
      expect(y).toBeCloseTo(SKEWED[i]![1], 6);
    });
  });

  it("the way back undoes it", () => {
    const there = homography(RECT, SKEWED);
    const back = homography(SKEWED, RECT);
    const [x, y] = mapPoint(back, mapPoint(there, [37, 121]));
    expect(x).toBeCloseTo(37, 6);
    expect(y).toBeCloseTo(121, 6);
  });

  it("as a CSS matrix3d, column by column", () => {
    const h = homography(RECT, SKEWED);
    const values = matrix3d(h).slice("matrix3d(".length, -1).split(",").map(Number);
    expect(values).toHaveLength(16);
    // (x, y, 0, 1) times the matrix, then divided by w, lands where mapPoint does.
    const [x, y] = [37, 121];
    const col = (c: number) => values[c]! * x + values[4 + c]! * y + values[12 + c]!;
    const [mx, my] = mapPoint(h, [x, y]);
    expect(col(0) / col(3)).toBeCloseTo(mx, 6);
    expect(col(1) / col(3)).toBeCloseTo(my, 6);
  });
});

describe("warp", () => {
  it("straightens a quad of the source into the output rectangle", () => {
    // An 8 × 4 source: left half black, right half white. The quad is well inside the white half (a pixel
    // samples its neighbours): the output is all white.
    const width = 8;
    const height = 4;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        data.fill(x >= 4 ? 255 : 0, i, i + 3);
        data[i + 3] = 255;
      }
    }
    const right: Quad = [
      [5, 0],
      [8, 0],
      [8, 4],
      [5, 4],
    ];
    const out = warp({ data, width, height }, right, 3, 6);
    expect(out.length).toBe(3 * 6 * 4);
    for (let i = 0; i < out.length; i += 4) expect(out[i]).toBeGreaterThanOrEqual(250);
  });
});
