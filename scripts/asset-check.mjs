// Guards the schedule captures against the one mistake that has cost a full
// re-shoot: the tour and the stills drifting onto different tenants.
//
// The product themes itself per company, and the theme is a whole palette, not
// an accent. `abc-music` ships as `stage` — dark purple — and it is also the
// only seeded school with enrolments, so both captures follow it and repaint it
// via schedule-app.mjs `setTheme`. Forget that call, or point one capture at a
// different school, and the page silently shows two products. The signature is
// always the same: frames that are dark, purple, or both.
//
// So this measures rather than eyeballs. Nine desktop stills, nine mobile, and
// eight sampled frames from each tour clip.
//
// Reads them from a running server on purpose: a file:// <img> on about:blank
// never fires `load`, and the run hangs instead of failing.
//
// Usage: node scripts/asset-check.mjs [origin]

import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ORIGIN = (process.argv[2] ?? 'http://localhost:3001').replace(/\/$/, '');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Below this, a frame is showing a dark tenant theme rather than the light one. */
const MIN_LUMINANCE = 150;
/** Above this share of purple-ish pixels, likewise. */
const MAX_PURPLE_PCT = 15;

const stills = readdirSync(path.join(root, 'public', 'portfolio', 'schedule'))
  .filter((f) => f.endsWith('.jpg'))
  .sort()
  .map((f) => `/portfolio/schedule/${f}`);
const clips = ['/world/schedule-tour.mp4', '/world/schedule-tour-m.mp4'];

const browser = await chromium.launch();
const page = await browser.newPage();
try {
  await page.goto(`${ORIGIN}/en`, { waitUntil: 'domcontentloaded' });
} catch (err) {
  console.error(
    `cannot reach ${ORIGIN}\n  ${err.message.split('\n')[0]}\n` +
      '  start the server first: npx next start -p 3001',
  );
  await browser.close();
  process.exit(1);
}

/** Mean luminance and purple share of whatever is drawn onto the canvas. */
const MEASURE = `(ctx, w, h) => {
  const d = ctx.getImageData(0, 0, w, h).data;
  let lum = 0, purple = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    lum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // Blue and red both clearly above green — the dark 'stage' palette.
    if (b > g + 12 && r > g + 6) purple++;
    n++;
  }
  return { lum: +(lum / n).toFixed(1), purple: +((purple / n) * 100).toFixed(1) };
}`;

const rows = [];

for (const src of stills) {
  const r = await page.evaluate(
    async ([url, measureSrc]) => {
      const measure = eval(measureSrc);
      const img = new Image();
      img.src = url;
      const ok = await new Promise((res) => {
        img.onload = () => res(true);
        img.onerror = () => res(false);
      });
      if (!ok) return null;
      const c = document.createElement('canvas');
      c.width = 160;
      c.height = Math.max(1, Math.round((img.height / img.width) * 160));
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, c.width, c.height);
      return measure(ctx, c.width, c.height);
    },
    [`${ORIGIN}${src}`, MEASURE],
  );
  rows.push({ what: path.basename(src), ...(r ?? { lum: null, purple: null }) });
}

for (const src of clips) {
  const samples = await page.evaluate(
    async ([url, measureSrc]) => {
      const measure = eval(measureSrc);
      const v = document.createElement('video');
      v.src = url;
      v.muted = true;
      const ok = await new Promise((res) => {
        v.onloadedmetadata = () => res(true);
        v.onerror = () => res(false);
      });
      if (!ok) return null;
      const c = document.createElement('canvas');
      c.width = 160;
      c.height = Math.max(1, Math.round((v.videoHeight / v.videoWidth) * 160));
      const ctx = c.getContext('2d');
      const out = [];
      for (const frac of [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 0.99]) {
        v.currentTime = v.duration * frac;
        await new Promise((res) => (v.onseeked = res));
        ctx.drawImage(v, 0, 0, c.width, c.height);
        out.push({ frac, ...measure(ctx, c.width, c.height) });
      }
      return out;
    },
    [`${ORIGIN}${src}`, MEASURE],
  );
  if (!samples) {
    rows.push({ what: path.basename(src), lum: null, purple: null });
    continue;
  }
  for (const s of samples) rows.push({ what: `${path.basename(src)} @${s.frac}`, lum: s.lum, purple: s.purple });
}

await browser.close();

const failures = [];
for (const r of rows) {
  const flag =
    r.lum === null
      ? 'MISSING'
      : r.lum < MIN_LUMINANCE
        ? 'DARK'
        : r.purple > MAX_PURPLE_PCT
          ? 'PURPLE'
          : '';
  console.log(
    r.what.padEnd(34),
    String(r.lum ?? '—').padStart(7),
    String(r.purple ?? '—').padStart(7),
    flag && `  <-- ${flag}`,
  );
  if (flag) failures.push(`${r.what}: ${flag} (luminance ${r.lum}, purple ${r.purple}%)`);
}

if (failures.length) {
  console.error(
    `\nFAIL — ${failures.length} of ${rows.length} frames\n- ${failures.join('\n- ')}\n\n` +
      '  A capture that skipped setTheme() looks exactly like this. See the\n' +
      '  TENANT block in capture-world-frames.mjs and the setTheme call in\n' +
      '  capture-schedule.mjs — they have to agree.',
  );
  process.exit(1);
}
console.log(`\nOK — ${rows.length} frames, none dark, none purple`);
