import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { edgeLengths, scaleQuad, type Quad } from "./homography";
import { paperQuad } from "./paperQuad";

// Spec 017 SC-001: the port finds the corners the backend finds, on real receipts. The probes come from
// scripts/paper_quad_parity.py and hold personal data, so they live outside the repository; without
// PARITY_DIR this test does not run.
const dir = process.env.PARITY_DIR;
const MAX_MISS = 0.02; // of the paper's width

interface Probe {
  name: string;
  w: number;
  h: number;
  quad: Quad | null;
}

describe.skipIf(!dir)("paperQuad: parity with the backend on real receipts (spec 017 SC-001)", () => {
  const probes: Probe[] = dir ? JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")) : [];
  it.each(probes.map((p) => [p.name, p] as const))("F-226: %s", (_name, { name, w, h, quad }) => {
    const gray = new Uint8Array(readFileSync(join(dir!, `${name}.gray`)));
    const found = paperQuad(gray, w, h);
    if (!quad) {
      expect(found).toBeNull();
      return;
    }
    expect(found).not.toBeNull();
    const expected = scaleQuad(quad, w, h);
    const limit = MAX_MISS * edgeLengths(expected).width;
    scaleQuad(found!, w, h).forEach(([x, y], i) => expect(Math.hypot(x - expected[i]![0], y - expected[i]![1])).toBeLessThanOrEqual(limit));
  });
});
