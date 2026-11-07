/**
 * Regenerates the static favicons from the shared mark geometry:
 *   src/app/icon.svg    — adapts to light/dark browser tabs
 *   src/app/favicon.ico — 16/32/48 px PNGs for older browsers and crawlers
 *
 * Run after changing src/components/layout/brand-mark.ts:
 *   npx tsx scripts/generate-brand-assets.mts
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { chromium } from "playwright";

import {
  BRAND_COLORS,
  MARK_BODY,
  MARK_HEAD,
  MARK_RING,
  MARK_SHAFT,
  MARK_VIEWBOX,
  markSvg,
} from "../src/components/layout/brand-mark.ts";

const root = resolve(import.meta.dirname, "..");

const { navy, violet, white, violetLight } = BRAND_COLORS;
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}">
<style>.g{fill:${navy};stroke:${navy}}.a{fill:${violet};stroke:${violet}}@media (prefers-color-scheme:dark){.g{fill:${white};stroke:${white}}.a{fill:${violetLight};stroke:${violetLight}}}</style>
<path class="g" d="${MARK_RING.d}" style="fill:none" stroke-width="${MARK_RING.strokeWidth}" stroke-linecap="round"/>
<path class="g" d="${MARK_BODY}" stroke-width="1.5" stroke-linejoin="round"/>
<path class="a" d="${MARK_SHAFT.d}" style="fill:none" stroke-width="${MARK_SHAFT.strokeWidth}" stroke-linecap="round"/>
<path class="a" d="${MARK_HEAD}" stroke-width="2" stroke-linejoin="round"/>
</svg>
`;
writeFileSync(resolve(root, "src/app/icon.svg"), iconSvg);

// Render PNGs with a headless browser, then pack them into an ICO container.
const sizes = [16, 32, 48];
const browser = await chromium.launch();
const pngs: Buffer[] = [];
for (const size of sizes) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<body style="margin:0;background:transparent">${markSvg({ g: navy, arrow: violet, size })}</body>`,
  );
  pngs.push(await page.screenshot({ omitBackground: true }));
  await page.close();
}
await browser.close();

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = sizes.map((size, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(size, 0);
  e.writeUInt8(size, 1);
  e.writeUInt16LE(1, 4); // colour planes
  e.writeUInt16LE(32, 6); // bits per pixel
  e.writeUInt32LE(pngs[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return e;
});
writeFileSync(resolve(root, "src/app/favicon.ico"), Buffer.concat([header, ...entries, ...pngs]));

console.log("Wrote src/app/icon.svg and src/app/favicon.ico");
