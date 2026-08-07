// Drives a scroll-world past a running dev server and reports whether it
// actually scrubs — plus the thing that is easiest to get wrong: the outro.
// A sticky stage only travels for (track height − its own height), so if the
// scenes are spread over the full track the last frame is still at full
// opacity when the browser starts scrolling it away, and the reader gets half
// a picture sliding over the page beneath.
//
// Covers the 'scrub' half of the scroll-world only. The case studies play
// themselves and have no sticky stage to measure — case-check.mjs is theirs.
//
// Usage: node scripts/world-check.mjs [outDir] [url] [desktop|mobile]

import { mkdirSync } from 'node:fs';
import { chromium, devices } from 'playwright';

const OUT = process.argv[2] ?? '.shots';
// The portfolio index is the only scrub deck left, and 3001 is where the
// project's own verification runs: `next dev` does not hot-reload
// messages/*.json, so copy has to be checked against a production build.
const URL = process.argv[3] ?? 'http://localhost:3001/en/portfolio';
const MODE = process.argv[4] ?? 'desktop';

/** Everything that went wrong, so one run reports all of it and then fails. */
const failures = [];

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

try {
  await page.goto(URL, { waitUntil: 'networkidle' });
} catch (err) {
  console.error(
    `cannot reach ${URL}\n  ${err.message.split('\n')[0]}\n` +
      '  start the server first: npx next start -p 3001',
  );
  await browser.close();
  process.exit(1);
}
await page.waitForTimeout(3000);

const geom = await page.evaluate(() => {
  const section = document.querySelector('section[aria-label]');
  const stage = document.querySelector('[data-stage]');
  if (!section || !stage) return null;
  return { track: section.offsetHeight, stage: stage.offsetHeight, top: section.offsetTop };
});
if (!geom) {
  console.error(
    `no scrub deck at ${URL}\n` +
      '  A case study plays itself and has no sticky stage — check those with\n' +
      '    npm run check:case -- <url> [desktop|mobile]\n' +
      '  A scrub deck also collapses to a Replay button once watched, and that\n' +
      '  flag is per browser session, so a fresh context should always see it.',
  );
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

// Scrolling forward has to move the film forward. Summed across clips, so a
// handover from one scene to the next still reads as progress.
const total = (r) => r.t.reduce((sum, x) => sum + x, 0);
if (!rows.some((r) => total(r) > 0)) failures.push('no clip ever advanced — nothing is scrubbing');
const stalled = rows.slice(1).filter((r, i) => total(r) < total(rows[i]) - 0.05);
if (stalled.length) {
  failures.push(`scrub ran backwards at ${stalled.map((r) => r.frac).join(', ')}`);
}

// The outro's whole job: fully faded before the sticky container lets go.
const end = rows.at(-1);
console.log(`stage opacity at the seam: ${end.stage} ${end.stage < 0.02 ? '✓' : '✗ still visible'}`);
if (!(end.stage < 0.02)) failures.push(`stage still visible at the seam (opacity ${end.stage})`);

// Scrubbing back must run the clip backwards, not just re-seek forwards.
await page.evaluate((y) => window.scrollTo(0, y), Math.round(geom.top + travel * 0.2));
await page.waitForTimeout(1200);
const back = await sample();
console.log('after scrolling back to 0.20:', back.t);
if (total(back) >= total(end)) failures.push('scrolling back did not rewind the film');

// Content below reachable and clickable once the world is done?
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/world-after.png`, fullPage: false });
const reachable = await page.evaluate(() => {
  const a = document.querySelector('a[href]:not([href^="#"])');
  if (!a) return 'no link';
  const r = a.getBoundingClientRect();
  const top = document.elementFromPoint(r.left + r.width / 2, Math.min(r.top + 8, innerHeight - 5));
  return a.contains(top) ? 'yes' : 'BLOCKED by ' + (top?.className || top?.tagName);
});
console.log('content below clickable:', reachable);
if (reachable !== 'yes') failures.push(`content below the world is ${reachable}`);

console.log('page errors:', errors.length ? errors : 'none');
if (errors.length) failures.push(`page errors: ${errors.join(' | ')}`);

await browser.close();

// Exit non-zero on failure. This used to print its verdicts and exit 0
// regardless, which made `npm run check:world` a check that could not fail —
// and CLAUDE.md requires running it after every scroll-world change.
if (failures.length) {
  console.error(`\nFAIL (${MODE})\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`\nOK (${MODE})`);
