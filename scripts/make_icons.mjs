// Writes the app icons from the Super Mercado brand icon (cart + euro coin on deep teal).
// The brand pack's SVG draws the euro as <text> (font dependent); here it is a path so the SVG
// and the PNGs look the same everywhere.
//
// Run: node scripts/make_icons.mjs   (uses the Chromium that Playwright already installs)
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
const TEAL = "#075B50";
const GREEN = "#12B76A";
const GOLD = "#FFC928";

// Cart, motion lines and coin, in the brand icon's own coordinates (x 0-346, y -3-220).
const SYMBOL = `
  <rect x="0" y="122" width="60" height="18" rx="9" fill="${GREEN}"/>
  <rect x="12" y="158" width="48" height="18" rx="9" fill="${GREEN}"/>
  <rect x="24" y="194" width="36" height="18" rx="9" fill="${GREEN}"/>
  <path d="M62 42 H92 C106 42 117 50 123 65 L151 145 Q156 158 171 158 H286 Q301 158 308 142 L333 72"
        fill="none" stroke="${GREEN}" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M143 141 H295 L282 169 H160 Z" fill="${GREEN}"/>
  <circle cx="184" cy="205" r="15" fill="#FFFFFF"/>
  <circle cx="278" cy="205" r="15" fill="#FFFFFF"/>
  <circle cx="244" cy="52" r="55" fill="${GOLD}"/>
  <path d="M262 38 A22.8 22.8 0 1 0 262 66" fill="none" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round"/>
  <path d="M224 46 H252 M224 58 H252" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round"/>`;

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">${body}</svg>\n`;

// Symbol centred on its bounding box and kept inside the maskable safe circle (80% of the size).
const PLACED = `<g transform="translate(256,256) scale(0.9) translate(-173,-108.5)">${SYMBOL}</g>`;

// "any": rounded square. FULL: full-bleed square for maskable and iOS (iOS fills transparent
// corners with black and rounds the square itself).
const ANY = svg(`<rect width="512" height="512" rx="112" fill="${TEAL}"/>${PLACED}`);
const FULL = svg(`<rect width="512" height="512" fill="${TEAL}"/>${PLACED}`);

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "icon.svg"), ANY);

const browser = await chromium.launch();
async function png(source, size, file, { opaque = false } = {}) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${source}`,
  );
  await page.screenshot({ path: join(OUT, file), omitBackground: !opaque, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
}
await png(ANY, 192, "icon-192.png");
await png(ANY, 512, "icon-512.png");
await png(FULL, 512, "icon-maskable-512.png", { opaque: true });
await png(FULL, 180, "apple-touch-icon.png", { opaque: true });
await browser.close();
console.log("icons written to", OUT);
