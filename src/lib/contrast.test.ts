import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { KNOWN_MERCHANTS, merchantStyle } from "./merchants";

// The axe does not measure the contrast of graphics (ring and bars, 3:1) and cannot see the chips'
// text on the token pairs: this reads the tokens from styles.css and measures them in both schemes.
const css = readFileSync("src/styles.css", "utf8");

const BLOCKS = {
  light: css.slice(css.indexOf("@theme"), css.indexOf("@layer base")),
  dark: css.slice(css.indexOf("prefers-color-scheme: dark"), css.indexOf(":focus-visible")),
};

/** The value of a token in the light scheme (the @theme block) or the dark one (the media query). */
function token(name: string, scheme: "light" | "dark"): string {
  const block = BLOCKS[scheme];
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

describe("brand colours kept in sync by hand (header of styles.css)", () => {
  it("theme-color and the colours of the icon script are the brand and the ground of the light scheme", () => {
    const html = readFileSync("index.html", "utf8");
    const icons = readFileSync("scripts/make_icons.mjs", "utf8");
    const constant = (name: string) => new RegExp(`const ${name} = "(#[0-9a-fA-F]{6})"`).exec(icons)![1]!.toLowerCase();
    expect(/name="theme-color" content="(#[0-9a-fA-F]{6})"/.exec(html)![1]!.toLowerCase(), "theme-color").toBe(token("brand", "light"));
    expect(constant("GREEN"), "GREEN of make_icons.mjs").toBe(token("brand", "light"));
    expect(constant("CREAM"), "CREAM of make_icons.mjs").toBe(token("ground", "light"));
  });
});

describe("colours of the stores (approved design)", () => {
  // The letters of the tiles are 9 to 22 px: small text, so 4.5:1 for every store (Auchan's red was darkened for it, see merchants.ts).
  for (const code of [...KNOWN_MERCHANTS, "UNKNOWN"]) {
    it(`the letters of ${code} on its tile have at least 4.5:1`, () => {
      const { letter, background } = merchantStyle(code);
      expect(ratio(letter, background)).toBeGreaterThanOrEqual(4.5);
    });
  }
});

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

    it(`approved design: the brand text and the secondary text have at least 4.5:1 on the ground, the paper (navigation bar), the pill, the mint card and the desk (${scheme})`, () => {
      const pairs: [string, string][] = [
        ["brand", "ground"],
        ["brand", "paper"],
        ["brand", "brand-pill"],
        // «EM RESUMO» of the privacy policy: the label, the text and the ticks on the mint card.
        ["ink", "brand-soft"],
        ["ink-soft", "brand-soft"],
        ["brand", "brand-soft"],
        // The tabs of Talões and Definições: the label of the tab that is not current, on the rail that holds them.
        ["ink-soft", "line"],
        ["ink-soft", "paper"],
        ["ink-soft", "ground"],
        ["ink-soft", "table"],
      ];
      for (const [text, background] of pairs) {
        expect(ratio(token(text, scheme), token(background, scheme)), `${text} on ${background}`).toBeGreaterThanOrEqual(4.5);
      }
    });

    it(`F-184: the text on the soft backgrounds of the average card has at least 4.5:1 (${scheme})`, () => {
      expect(ratio(token("ink", scheme), token("ok-soft", scheme)), "below the average").toBeGreaterThanOrEqual(4.5);
      expect(ratio(token("ink", scheme), token("alert-soft", scheme)), "above the average").toBeGreaterThanOrEqual(4.5);
    });
  }
});
