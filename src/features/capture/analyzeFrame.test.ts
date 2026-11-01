import { describe, expect, it } from "vitest";
import { analyzeFrame, minPaperFrac, type AnalyzeOptions } from "./analyzeFrame";
import { stabilizer } from "./hints";

const W = 300;
const H = 400;
const LIVE: AnalyzeOptions = { mode: "live", part: false, minPaperFrac: 0.3 };

/** A frame of `background` grey with a receipt (paper 230, printed lines 30) at [left, top, right, bottom]. */
function frame(background: number, paper?: [number, number, number, number], print = true): Uint8Array {
  const gray = new Uint8Array(W * H).fill(background);
  if (!paper) return gray;
  const [left, top, right, bottom] = paper;
  const margin = Math.round((right - left) * 0.08);
  for (let y = Math.max(0, top); y < Math.min(H, bottom); y++) {
    const printed = print && y % 8 < 3; // a line of text every 8 rows
    for (let x = Math.max(0, left); x < Math.min(W, right); x++) {
      gray[y * W + x] = printed && x >= left + margin && x < right - margin && x % 5 < 3 ? 30 : 230;
    }
  }
  return gray;
}

function blur(gray: Uint8Array, radius = 4): Uint8Array {
  const out = new Uint8Array(gray.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let sum = 0;
      let n = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const yy = y + dy;
          const xx = x + dx;
          if (yy >= 0 && yy < H && xx >= 0 && xx < W) {
            sum += gray[yy * W + xx]!;
            n++;
          }
        }
      }
      out[y * W + x] = sum / n;
    }
  }
  return out;
}

const hintOf = (gray: Uint8Array, options: Partial<AnalyzeOptions> = {}) => analyzeFrame(gray, W, H, { ...LIVE, ...options })[0] ?? "ok";

describe("analyzeFrame (live guidance)", () => {
  it("a whole receipt, near enough, on a dark table: ok", () => {
    expect(hintOf(frame(80, [70, 40, 230, 360]))).toBe("ok");
  });

  it("a receipt too small in the frame: too_far", () => {
    expect(hintOf(frame(80, [125, 120, 175, 280]))).toBe("too_far");
  });

  it("a receipt overflowing both sides: too_close", () => {
    expect(hintOf(frame(80, [-20, 40, 320, 360]))).toBe("too_close");
  });

  it("a receipt off one side: cut_side", () => {
    expect(hintOf(frame(80, [150, 40, 330, 360]))).toBe("cut_side");
  });

  it("a receipt as bright as the desk: bad_background", () => {
    expect(hintOf(frame(225, [110, 40, 190, 360]))).toBe("bad_background");
  });

  it("a long receipt beyond the top and bottom: cut_ends, but fine for a part", () => {
    const long = frame(80, [70, -10, 230, 410]);
    expect(hintOf(long)).toBe("cut_ends");
    expect(hintOf(long, { part: true })).toBe("ok");
  });

  it("dim light on the paper: too_dark; a small receipt on a dark table is not", () => {
    const dim = frame(10, [70, 40, 230, 360]).map((v) => (v > 100 ? 90 : v));
    expect(hintOf(dim)).toBe("too_dark");
    expect(hintOf(frame(10, [125, 120, 175, 280]))).toBe("too_far");
    expect(hintOf(frame(10, [125, 120, 175, 280]), { mode: "still", minPaperFrac: 0.1 })).toBe("too_dark"); // as the backend
  });

  it("no paper or no print: no_receipt", () => {
    expect(hintOf(frame(160))).toBe("no_receipt"); // a wall, a floor: nothing bright to call paper
    expect(hintOf(frame(80, [70, 40, 230, 360], false))).toBe("no_receipt");
  });

  it("a shaken or out of focus frame: blurry", () => {
    expect(hintOf(blur(frame(80, [70, 40, 230, 360])))).toBe("blurry");
  });

  it("lists every problem, the most important first", () => {
    expect(analyzeFrame(blur(frame(80, [125, 120, 175, 280])), W, H, LIVE)).toEqual(["too_far", "blurry"]);
  });
});

describe("analyzeFrame (a photo already taken)", () => {
  it("reports only what the backend warns about: no framing advice", () => {
    expect(hintOf(frame(225, [110, 40, 190, 360]), { mode: "still" })).toBe("ok");
    expect(hintOf(frame(80, [150, 40, 330, 360]), { mode: "still" })).toBe("ok");
  });

  it("paper narrower than the backend's 600 px: too_far", () => {
    // 160 of 300 frame pixels: in a 1000 px photo the paper spans 533 px, in a 2000 px photo 1067 px
    const gray = frame(80, [70, 40, 230, 360]);
    expect(hintOf(gray, { mode: "still", minPaperFrac: minPaperFrac(1000) })).toBe("too_far");
    expect(hintOf(gray, { mode: "still", minPaperFrac: minPaperFrac(2000) })).toBe("ok");
  });

  it("a screenshot with no paper to cut out is measured whole", () => {
    expect(hintOf(frame(230, [0, 0, 300, 400]), { mode: "still", minPaperFrac: minPaperFrac(1080) })).toBe("ok");
  });
});

describe("stabilizer", () => {
  it("changes the shown hint only after it holds for a few frames, ok after one more", () => {
    const next = stabilizer();
    const shown = ["too_far", "too_close", "too_far", "too_close", "too_close", "too_close", "ok", "ok", "ok", "ok"].map((h) =>
      next(h as Parameters<typeof next>[0]),
    );
    expect(shown).toEqual(["too_far", "too_far", "too_far", "too_far", "too_far", "too_close", "too_close", "too_close", "too_close", "ok"]);
  });
});
