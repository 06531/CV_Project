// Drives a case study's film — the 'auto' half of the scroll-world, which
// plays itself rather than being scrubbed, and so has none of the sticky
// geometry world-check.mjs measures.
//
// Three phases, each guarding a bug this page has actually shipped:
//
//   arrival  A case study used to open on a dead Replay button, because the
//            once-per-session flag written for the index applied here too.
//   abort    play() and "we paused it ourselves" arrive down the same channel:
//            a pending play() that gets paused rejects with AbortError, and the
//            observer pauses on every scroll out. Treating that as a refusal
//            painted a Play button over a film that was running fine.
//   replay   The control becomes Replay when the film stops, and a rerun has to
//            reset all of it — clip, progress bar, label, and the last scene's
//            deliberately held copy.
//
// Usage: node scripts/case-check.mjs [url] [desktop|mobile]

import { chromium, devices } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:3001/en/portfolio/schedule';
const MODE = process.argv[3] ?? 'desktop';

const failures = [];
const fail = (phase, msg) => failures.push(`[${phase}] ${msg}`);

const browser = await chromium.launch();
const context = await browser.newContext({
  ...(MODE === 'mobile' ? devices['iPhone 13'] : { viewport: { width: 1440, height: 900 } }),
  // Headless Chromium reports `prefers-reduced-motion: reduce`, under which
  // AutoWorld builds no <video> at all and every assertion below is vacuous.
  reducedMotion: 'no-preference',
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

/** Everything the assertions need, read straight off the live page. */
const state = () =>
  page.evaluate(() => {
    const film = document.querySelector('section[aria-label]');
    const bar = film?.querySelector('[role="progressbar"]');
    const videos = [...document.querySelectorAll('video')];
    return {
      film: !!film,
      // A scrub deck renders the same landmark but hangs a sticky stage off it.
      scrub: !!document.querySelector('[data-stage]'),
      buttons: [...(film?.querySelectorAll('button') ?? [])].map((b) =>
        b.innerText.trim().replace(/\s+/g, ' '),
      ),
      playing: videos.filter((v) => !v.paused).length,
      // Which clip is running, and how far in — a rerun has to come back to 0.
      at: videos.findIndex((v) => !v.paused),
      time: +(videos.find((v) => !v.paused)?.currentTime ?? 0).toFixed(2),
      progress: bar ? Number(bar.getAttribute('aria-valuenow')) : null,
      // The scene copy blocks. Only the running scene's should be lit.
      copies: [...(film?.querySelectorAll('p.font-mono + h2') ?? [])].map(
        (h) => +(+getComputedStyle(h.parentElement).opacity).toFixed(2),
      ),
      // "1 / 3" — removed from the controls, still in the sr-only live region.
      chip: [...(film?.querySelectorAll('span') ?? [])].some((s) =>
        /^\s*\d+\s*\/\s*\d+\s*$/.test(s.textContent ?? ''),
      ),
    };
  });

const isReplay = (s) => s.buttons.some((b) => /replay|重播/i.test(b));
const isSkip = (s) => s.buttons.some((b) => /skip|跳過/i.test(b));
const isPlay = (s) => s.buttons.some((b) => /^(play|播放)$/i.test(b));

async function load(waitUntil = 'networkidle') {
  try {
    await page.goto(URL, { waitUntil });
  } catch (err) {
    console.error(
      `cannot reach ${URL}\n  ${err.message.split('\n')[0]}\n` +
        '  start the server first: npx next start -p 3001',
    );
    await browser.close();
    process.exit(1);
  }
}

// --------------------------------------------------------------- arrival

await load();
await page.waitForTimeout(2500);
let s = await state();
if (!s.film || s.scrub) {
  console.error(
    s.scrub
      ? `${URL} is a scrub deck, not a case study — it is dragged by the scroll\n` +
        '  rather than played, so none of the assertions below mean anything here.\n' +
        '    npm run check:world -- .shots <url> [desktop|mobile]'
      : `no film at ${URL} — is this a case study?`,
  );
  await browser.close();
  process.exit(1);
}
console.log('arrival  ', JSON.stringify(s));
if (s.playing < 1) fail('arrival', 'nothing playing on first visit');
if (isReplay(s)) fail('arrival', 'opened on a Replay button instead of the film');
if (s.chip) fail('arrival', 'the "n / n" scene counter is back in the controls');

// Same context, so any sessionStorage the first visit wrote is still there.
await load();
await page.waitForTimeout(2500);
s = await state();
console.log('revisit  ', JSON.stringify(s));
if (s.playing < 1) fail('arrival', 'nothing playing on a second visit in the same session');
if (isReplay(s)) fail('arrival', 'second visit opened on a Replay button — the session gate is back');

// ----------------------------------------------------------------- abort

// domcontentloaded, then scroll out fast: the opening play() has to still be
// pending for its rejection to be an AbortError. A settled promise cannot abort.
await load('domcontentloaded');
await page.waitForTimeout(150);
await page.evaluate(() => window.scrollTo(0, 4000));
await page.waitForTimeout(1200);
const away = await state();
console.log('away     ', JSON.stringify(away));
if (away.playing > 0) fail('abort', 'still decoding while scrolled off screen');

await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(2500);
const back = await state();
console.log('back     ', JSON.stringify(back));
if (back.playing !== 1) fail('abort', `expected one clip playing on return, got ${back.playing}`);
if (isPlay(back)) fail('abort', 'a Play overlay is painted over a running film (AbortError read as a refusal)');
if (!isSkip(back)) fail('abort', `control should be Skip while running, got ${JSON.stringify(back.buttons)}`);

// ---------------------------------------------------------------- replay

await load();
let ended = null;
for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(1000);
  const now = await state();
  if (isReplay(now)) {
    ended = now;
    console.log(`ended    after ~${i + 1}s`, JSON.stringify(now));
    break;
  }
}
if (!ended) {
  fail('replay', 'the film never finished, or never offered Replay');
} else {
  if (ended.progress !== 100) fail('replay', `progressbar reads ${ended.progress} at the end, want 100`);
  if (ended.copies.filter((o) => o > 0.05).length !== 1)
    fail('replay', `the last scene's copy should be the only one held: ${ended.copies}`);

  await page.locator('section[aria-label] button').first().click();
  await page.waitForTimeout(1500);
  const rerun = await state();
  console.log('rerun    ', JSON.stringify(rerun));
  if (rerun.at !== 0) fail('replay', `rerun started on clip ${rerun.at}, want the first`);
  if (!(rerun.time > 0 && rerun.time < 3)) fail('replay', `first clip is at ${rerun.time}s, want near its start`);
  if (!(rerun.progress !== null && rerun.progress < 50))
    fail('replay', `progressbar did not reset, reads ${rerun.progress}`);
  if (!isSkip(rerun)) fail('replay', 'control did not go back to Skip during the rerun');
  if (rerun.copies.filter((o) => o > 0.05).length > 1)
    fail('replay', `stale copy left over the rerun: ${rerun.copies}`);
}

if (errors.length) fail('page', errors.join(' | '));

await browser.close();

if (failures.length) {
  console.error(`\nFAIL (${MODE})\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`\nOK (${MODE})`);
