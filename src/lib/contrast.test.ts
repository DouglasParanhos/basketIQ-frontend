import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The axe does not measure the contrast of graphics (ring and bars, 3:1) and cannot see the chips'
// text on the token pairs: this reads the tokens from styles.css and measures them in both schemes.
const css = readFileSync("src/styles.css", "utf8");

/** The value of a token in the light scheme (the @theme block) or the dark one (the media query). */
function token(name: string, scheme: "light" | "dark"): string {
  const block = scheme === "light" ? css.slice(css.indexOf("@theme"), css.indexOf("@layer base")) : css.slice(css.indexOf("prefers-color-scheme: dark"), css.indexOf(":focus-visible"));
  const match = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(block);
  if (!match) throw new Error(`--color-${name} not defined for ${scheme}`);
  return match[1]!;
}

const channel = (v: number) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe("colours of the Início (spec 011, D-P3)", () => {
  for (const scheme of ["light", "dark"] as const) {
    it(`F-187: the ring and the bars have at least 3:1 against the card (${scheme})`, () => {
      const paper = token("paper", scheme);
      for (const name of ["ok", "warn", "alert", "chart"]) {
        expect(ratio(token(name, scheme), paper), `--color-${name}`).toBeGreaterThanOrEqual(3);
      }
    });

    it(`F-187: the text of each band chip has at least 4.5:1 on its tint (${scheme})`, () => {
      expect(ratio(token("warn-ink", scheme), token("warn-soft", scheme)), "warn").toBeGreaterThanOrEqual(4.5);
      expect(ratio(token("ok", scheme), token("ok-soft", scheme)), "ok").toBeGreaterThanOrEqual(4.5);
      expect(ratio(token("alert", scheme), token("alert-soft", scheme)), "alert").toBeGreaterThanOrEqual(4.5);
    });

    it(`F-184: the text on the soft backgrounds of the average card has at least 4.5:1 (${scheme})`, () => {
      expect(ratio(token("ink", scheme), token("ok-soft", scheme)), "below the average").toBeGreaterThanOrEqual(4.5);
      expect(ratio(token("ink", scheme), token("alert-soft", scheme)), "above the average").toBeGreaterThanOrEqual(4.5);
    });
  }
});
