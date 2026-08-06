// Drives a scroll-world past a running dev server and reports whether it
// actually scrubs — plus the thing that is easiest to get wrong: the outro.
// A sticky stage only travels for (track height − its own height), so if the
// scenes are spread over the full track the last frame is still at full
// opacity when the browser starts scrolling it away, and the reader gets half
// a picture sliding over the page beneath.
//
// Usage: node scripts/world-check.mjs [outDir] [url] [desktop|mobile]

import { mkdirSync } from 'node:fs';
import { chromium, devices } from 'playwright';

const OUT = process.argv[2] ?? '.shots';
const URL = process.argv[3] ?? 'http://localhost:3000/en/portfolio/schedule';
const MODE = process.argv[4] ?? 'desktop';

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  ...(MODE === 'mobile' ? devices['iPhone 13'] : { viewport: { width: 1440, height: 900 } }),
  // Headless Chromium reports `prefers-reduced-motion: reduce`, and ScrollWorld
  // honours that by never building a <video> at all — so without this the check
  // silently measures the poster fallback and reports no clips and no fade.
  reducedMotion: 'no-preference',
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

const geom = await page.evaluate(() => {
  const section = document.querySelector('section[aria-label]');
  const stage = document.querySelector('[data-stage]');
  if (!section || !stage) return null;
  return { track: section.offsetHeight, stage: stage.offsetHeight, top: section.offsetTop };
});
if (!geom) {
  console.error('no scroll-world on this page (already seen this session?)');
  await browser.close();
  process.exit(1);
}
const travel = geom.track - geom.stage;
console.log(
  `track ${geom.track}px · stage ${geom.stage}px · sticky travel ${travel}px ` +
    `(~${(travel / geom.stage).toFixed(2)} screens)`,
);

const sample = () =>
  page.evaluate(() => ({
    t: [...document.querySelectorAll('video')].map((v) => +v.currentTime.toFixed(2)),
    stage: +(getComputedStyle(document.querySelector('[data-stage]')).opacity ?? 1),
  }));

const rows = [];
for (const frac of [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 0.96, 1]) {
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(geom.top + travel * frac));
  await page.waitForTimeout(900);
  rows.push({ frac, ...(await sample()) });
  await page.screenshot({ path: `${OUT}/world-${String(Math.round(frac * 100)).padStart(3, '0')}.png` });
}
console.table(rows);

// The outro's whole job: fully faded before the sticky container lets go.
const end = rows.at(-1);
console.log(`stage opacity at the seam: ${end.stage} ${end.stage < 0.02 ? '✓' : '✗ still visible'}`);

// Scrubbing back must run the clip backwards, not just re-seek forwards.
await page.evaluate((y) => window.scrollTo(0, y), Math.round(geom.top + travel * 0.2));
await page.waitForTimeout(1200);
console.log('after scrolling back to 0.20:', (await sample()).t);

// Content below reachable and clickable once the world is done?
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/world-after.png`, fullPage: false });
console.log(
  'content below clickable:',
  await page.evaluate(() => {
    const a = document.querySelector('a[href]:not([href^="#"])');
    if (!a) return 'no link';
    const r = a.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, Math.min(r.top + 8, innerHeight - 5));
    return a.contains(top) ? 'yes' : 'BLOCKED by ' + (top?.className || top?.tagName);
  }),
);

console.log('page errors:', errors.length ? errors : 'none');
await browser.close();
