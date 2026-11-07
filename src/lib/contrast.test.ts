import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { KNOWN_MERCHANTS, merchantStyle } from "./merchants";

// The axe does not measure the contrast of graphics (ring and bars, 3:1) and cannot see the chips'
// text on the token pairs: this reads the tokens from styles.css and measures them in both schemes.
const css = readFileSync("src/styles.css", "utf8");

const BLOCKS = {
  light: /@theme\s*\{([^}]*)\}/.exec(css)![1]!,
  dark: /:root\[data-theme="dark"\]\s*\{([^}]*)\}/.exec(css)![1]!,
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

describe("the dark scheme (the green of the cart with its lightness raised)", () => {
  it("is the new palette: no brown or yellow backgrounds, and nothing left of the one derived from the old teal", () => {
    for (const old of ["#121a15", "#1a261f", "#eaf2ec", "#4cc38a", "#075b50", "#3f3000", "#6b5200", "#a9bbb0"]) {
      expect(BLOCKS.dark.toLowerCase(), old).not.toContain(old);
    }
    expect(token("brand", "dark")).toBe("#5fa882");
    expect(token("ground", "dark")).toBe("#101a16");
    expect(token("paper", "dark")).toBe("#1d2723");
  });

  it("the green of the dark scheme is lighter than the cart's, which stays the green of the light scheme", () => {
    expect(luminance(token("brand", "dark"))).toBeGreaterThan(luminance(token("brand", "light")));
    expect(token("brand", "light")).toBe("#1f6f4a");
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

    it(`the icon of the active item has at least 3:1 on its pill, as a graphic (the label is on the bar, not on the pill) (${scheme})`, () => {
      expect(ratio(token("brand", scheme), token("brand-pill", scheme))).toBeGreaterThanOrEqual(3);
    });

    it(`the text of the buttons and badges painted with the brand colour has at least 4.5:1 (${scheme})`, () => {
      expect(ratio(token("on-brand", scheme), token("brand", scheme))).toBeGreaterThanOrEqual(4.5);
    });

    it(`the warning: title, text and icon on its tint, and on the line being edited (${scheme})`, () => {
      expect(ratio(token("ink", scheme), token("notice", scheme)), "title").toBeGreaterThanOrEqual(4.5);
      expect(ratio(token("warn-body", scheme), token("notice", scheme)), "text").toBeGreaterThanOrEqual(4.5);
      expect(ratio(token("warn-icon", scheme), token("notice", scheme)), "icon").toBeGreaterThanOrEqual(3);
      expect(ratio(token("ink", scheme), token("editing", scheme)), "the line being edited").toBeGreaterThanOrEqual(4.5);
      expect(ratio(token("ink-soft", scheme), token("editing", scheme)), "its labels").toBeGreaterThanOrEqual(4.5);
      expect(ratio(token("brand", scheme), token("editing", scheme)), "its links").toBeGreaterThanOrEqual(4.5);
    });

    it(`what marks a value to check keeps its text readable: the mark and the badge (${scheme})`, () => {
      expect(ratio(token("ink", scheme), token("marker", scheme)), "mark").toBeGreaterThanOrEqual(4.5);
      expect(ratio(token("marker-ink", scheme), token("marker", scheme)), "badge").toBeGreaterThanOrEqual(4.5);
    });

    it(`F-184: the text on the soft backgrounds of the average card has at least 4.5:1 (${scheme})`, () => {
      expect(ratio(token("ink", scheme), token("ok-soft", scheme)), "below the average").toBeGreaterThanOrEqual(4.5);
      expect(ratio(token("ink", scheme), token("alert-soft", scheme)), "above the average").toBeGreaterThanOrEqual(4.5);
    });
  }
});
