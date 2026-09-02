// Captures the frame sequences for the scroll-worlds, driven by
// `scenes/manifest.mjs`.
//
// These are NOT screen recordings. Each scene is broken into N discrete states
// and screenshotted one at a time, so the resulting clip scrubs perfectly —
// no timing jitter, every frame reproducible.
//
//   explainer  scenes/<id>.html, stepped through window.__setFrame(i, total)
//   app        a real product, booted locally and filmed in a series of shots
//
// An app scene is cut from several shots — a named screen plus the slice of it
// to pan across — so one scene can carry a reader from the public directory to
// a signed-in dashboard instead of scrolling one page end to end. The product
// boots on dedicated ports against schedule_project's own throwaway E2E
// database (see scripts/lib/schedule-app.mjs), so it neither needs your dev
// server running nor touches your dev data.
//
// Usage: node scripts/capture-world-frames.mjs [--force] [--only=id,id] [--jobs=N]

import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { cpus } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { DEFAULT_FRAMES, SCENES, VIEWPORTS } from '../scenes/manifest.mjs';
import * as schedule from './lib/schedule-app.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRAMES = path.join(root, '.frames');

const force = process.argv.includes('--force');
const onlyArg = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];
const only = onlyArg ? new Set(onlyArg.split(',')) : null;

/**
 * How many explainer sequences to film at once.
 *
 * A full shoot is 12 scenes x 2 viewports x ~150 frames — around 3600 discrete
 * screenshots — and one at a time it is the slowest thing in this repo. Each
 * (scene, viewport) is completely independent: its own browser context, its own
 * `file://` page, its own output directory, and `__setFrame` is a pure function
 * of the frame index, so nothing one worker does can reach another.
 *
 * Measured on two scenes (4 sequences, 160 frames each): 37.6s at --jobs=1
 * against 20.7s at --jobs=4, CPU 128% -> 280%. Capped at four rather than
 * cpus-wide because at deviceScaleFactor 1.5-2 each context is a full renderer.
 *
 * TWO THINGS TO KNOW BEFORE TRUSTING A TIMING HERE:
 *
 * 1. The scenes fetch their webfonts from Google at capture time, and
 *    `waitUntil: 'networkidle'` waits for that. Four contexts asking at once
 *    takes `goto` from ~1.3s to ~5s, and one run that hit throttling stalled
 *    for 15 minutes on work that takes 20 seconds. Self-hosting the two fonts
 *    under scenes/ would remove the only external dependency in the shoot and
 *    make its wall-clock predictable. Until then, a slow shoot is usually the
 *    network, not the machine.
 *
 * 2. Desktop frames are not byte-reproducible and never were — about 16 of 160
 *    differ between any two runs, at 88-96 dB PSNR, from sub-pixel AA in the
 *    renderer. That is invisible, and these are re-encoded lossily at CRF 26
 *    afterwards. It is not caused by --jobs: serial runs differ from each other
 *    the same way. Do not treat a hash mismatch here as a regression.
 */
const jobsArg = Number(process.argv.find((a) => a.startsWith('--jobs='))?.split('=')[1]);
const JOBS = Number.isFinite(jobsArg) && jobsArg > 0
  ? Math.floor(jobsArg)
  : Math.max(1, Math.min(4, Math.floor(cpus().length / 2)));

const outDir = (id, vp) => path.join(FRAMES, `${id}-${vp.key}`);
const frameName = (i) => `${String(i + 1).padStart(4, '0')}.png`;

/** True when this sequence is already captured in full. */
function isDone(id, vp, frames) {
  const dir = outDir(id, vp);
  return existsSync(dir) && readdirSync(dir).length >= frames;
}

function prepare(id, vp) {
  const dir = outDir(id, vp);
  if (force && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Which viewports of this scene still need filming. */
function pending(scene) {
  const frames = scene.frames ?? DEFAULT_FRAMES;
  return VIEWPORTS.filter((vp) => force || !isDone(scene.id, vp, frames));
}

// ------------------------------------------------------------- explainers

/** One scene at one viewport — the unit the pool below hands out. */
async function captureExplainerViewport(browser, scene, vp) {
  const file = 'file://' + path.join(root, 'scenes', `${scene.id}.html`);
  const frames = scene.frames ?? DEFAULT_FRAMES;

  const dir = prepare(scene.id, vp);
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.dsf,
  });
  try {
    const page = await context.newPage();
    await page.goto(file, { waitUntil: 'networkidle' });
    // Web fonts must be in before the first frame or the type reflows mid-clip.
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);

    for (let i = 0; i < frames; i++) {
      await page.evaluate(([i, total]) => window.__setFrame(i, total), [i, frames]);
      await page.screenshot({ path: path.join(dir, frameName(i)) });
    }
  } finally {
    await context.close();
  }
  console.log(`  capture ${scene.id}-${vp.key} (${frames} frames)`);
}

/**
 * Every outstanding explainer sequence, filmed `JOBS` at a time.
 *
 * The pool is a shared iterator rather than a chunked split: the scenes differ
 * in frame count by 20%, and handing each worker a fixed slice leaves one of
 * them still filming while the rest have finished.
 */
async function captureExplainers(browser, scenes) {
  const jobs = [];
  for (const scene of scenes) {
    if (!existsSync(path.join(root, 'scenes', `${scene.id}.html`))) {
      throw new Error(`scenes/${scene.id}.html not found`);
    }
    for (const vp of pending(scene)) jobs.push({ scene, vp });
  }
  if (jobs.length === 0) return;

  const width = Math.min(JOBS, jobs.length);
  console.log(`  explainers: ${jobs.length} sequence(s), ${width} at a time`);

  let next = 0;
  const workers = Array.from({ length: width }, async () => {
    while (true) {
      const job = jobs[next++];
      if (!job) return;
      await captureExplainerViewport(browser, job.scene, job.vp);
    }
  });
  // `all`, not `allSettled`: a scene that fails to film is a broken shoot, and
  // finding out after the other eleven have run is the wrong time to hear it.
  await Promise.all(workers);
}

// -------------------------------------------------------------- app scenes

/**
 * Which seeded school the tour follows, and what it wears.
 *
 * Each company picks its own visual template, so this decides the clip's whole
 * palette. The tour used to follow `starlight-dance` purely to escape
 * `abc-music`'s `stage` template, a dark purple that matches nothing else on
 * the site — but that meant the film and the stills below it toured different
 * schools, and Starlight has no enrolments at all, so every number on screen
 * was a zero.
 *
 * Now both follow ABC, the one school with real bookings, and the paint is
 * changed instead of the school: `setTheme` below puts it in the same light
 * teal `academy` template the stills use. Keep this in step with
 * capture-schedule.mjs — if the two drift apart, one page shows two products.
 */
const TENANT = {
  slug: 'abc-music',
  /** Pop Piano — 6 of 10 seats taken, and the course the stills book into. */
  courseId: 2,
  owner: schedule.CREDENTIALS.owners['abc-music'],
  theme: { template: 'academy', color: '#0d9488' },
};

/**
 * Named screens a scene's `shots[].at` can ask for. Three of them need an
 * account, which is why a shot names a recipe rather than a bare URL — the
 * sign-in steps live in scripts/lib/schedule-app.mjs, shared with
 * capture-schedule.mjs.
 */
const RECIPES = {
  schedule: {
    directory: async (page) => {
      await page.goto(`${schedule.BASE}/`, { waitUntil: 'networkidle' });
      await page.waitForSelector('.company-card', { timeout: 20_000 });
    },
    company: async (page) => {
      await page.goto(`${schedule.BASE}/c/${TENANT.slug}`, { waitUntil: 'networkidle' });
      await page.waitForSelector('.cal-grid', { timeout: 20_000 });
    },
    course: async (page) => {
      await schedule.loginStudent(page);
      await page.goto(`${schedule.BASE}/courses/${TENANT.courseId}`, { waitUntil: 'networkidle' });
      await page.waitForSelector('.container .card', { timeout: 20_000 });
    },
    'teacher-courses': async (page) => {
      await schedule.loginTeacher(page, TENANT.owner);
      await schedule.openTab(page, schedule.TAB.courses);
    },
    'teacher-qr': async (page) => {
      await schedule.loginTeacher(page, TENANT.owner);
      await schedule.openTab(page, schedule.TAB.qr);
      await page.waitForSelector('canvas, svg', { timeout: 20_000 });
    },
    platform: async (page) => {
      await schedule.loginPlatform(page);
    },
  },
};

/**
 * Where a shot's pan starts and stops, in document pixels.
 *
 * `from` and `to` are CSS selectors: the pan begins with `from`'s top at the
 * top of the viewport and ends with `to`'s bottom at the bottom of it. Either
 * may be omitted for "the top of the page" / "as far as it scrolls".
 *
 * This is what keeps unwanted parts of a page out of the film entirely: the
 * company shot starts at the calendar heading, so the contact card and the
 * embedded map above it are never in frame — no DOM surgery required.
 */
async function panWindow(page, shot, tailPx) {
  return page.evaluate(
    ([fromSel, toSel, tail]) => {
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const clamp = (n) => Math.min(Math.max(n, 0), max);
      // A zero-height match counts as no match: the same markup can be laid out
      // as a table on a desktop and hidden in favour of cards on a phone, and
      // anchoring to the hidden one would pin the shot to the top of the page.
      const el = (sel) => {
        const found = sel ? document.querySelector(sel) : null;
        return found && found.getBoundingClientRect().height > 0 ? found : null;
      };

      const fromEl = el(fromSel);
      const toEl = el(toSel);
      const start = clamp(fromEl ? fromEl.getBoundingClientRect().top + window.scrollY : 0);
      const end = toEl
        ? clamp(toEl.getBoundingClientRect().bottom + window.scrollY - window.innerHeight)
        : clamp(max - tail);
      return [start, Math.max(start, end)];
    },
    [shot.from ?? null, shot.to ?? null, tailPx ?? 0],
  );
}

async function captureApp(browser, scene) {
  const recipes = RECIPES[scene.app];
  if (!recipes) throw new Error(`unknown app "${scene.app}" in scenes/manifest.mjs`);
  const shots = scene.shots ?? [];
  const total = shots.reduce((n, s) => n + s.frames, 0);
  const expected = scene.frames ?? DEFAULT_FRAMES;
  if (total !== expected) {
    throw new Error(`${scene.id}: shots add up to ${total} frames, but frames is ${expected}`);
  }

  for (const vp of pending(scene)) {
    const dir = prepare(scene.id, vp);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.dsf,
      ...schedule.CONTEXT_LOCALE,
    });
    const page = await context.newPage();

    let i = 0;
    for (const shot of shots) {
      const recipe = recipes[shot.at];
      if (!recipe) throw new Error(`${scene.id}: no "${shot.at}" screen for app "${scene.app}"`);
      await recipe(page);
      // Calendars and hero media settle a beat after the route resolves.
      await page.waitForTimeout(2000);
      await schedule.freeze(page);
      await schedule.assertNoCjk(page, `${scene.id} → ${shot.at}`);

      const [start, end] = await panWindow(page, shot, scene.tailPx);
      for (let f = 0; f < shot.frames; f++) {
        const t = shot.frames === 1 ? 1 : f / (shot.frames - 1);
        // Ease in/out so the pan starts and ends gently instead of jerking.
        const eased = t * t * (3 - 2 * t);
        await page.evaluate((y) => window.scrollTo(0, y), Math.round(start + (end - start) * eased));
        await page.waitForTimeout(16);
        await page.screenshot({ path: path.join(dir, frameName(i++)) });
      }
      console.log(
        `  shot    ${scene.id}-${vp.key} · ${shot.at} ` +
          `(${shot.frames} frames, ${Math.round(start)}→${Math.round(end)}px)`,
      );
    }

    await context.close();
    console.log(`  capture ${scene.id}-${vp.key} (${i} frames, ${shots.length} shots)`);
  }
}

// ------------------------------------------------------------------- main

async function main() {
  mkdirSync(FRAMES, { recursive: true });
  const wanted = SCENES.filter((s) => !only || only.has(s.id));
  if (wanted.length === 0) throw new Error(`--only matched no scene in scenes/manifest.mjs`);

  const todo = wanted.filter((s) => pending(s).length > 0);
  for (const scene of wanted) {
    if (!todo.includes(scene)) console.log(`  skip    ${scene.id} (already captured)`);
  }
  if (todo.length === 0) return;

  const browser = await chromium.launch();
  try {
    // Explainers first and in parallel — they are static pages with nothing
    // shared between them, and they are the bulk of a full shoot.
    await captureExplainers(browser, todo.filter((s) => s.kind === 'explainer'));

    // App scenes stay strictly serial. They all drive one booted product
    // against schedule_project's throwaway E2E database, which the boot below
    // drops and rebuilds, and they sign in and out of it as they go — two of
    // them at once would be filming each other's session.
    const apps = todo.filter((s) => s.kind === 'app');
    if (apps.length) {
      // One boot serves every app scene; the seed and the translation pass run
      // with it, so the database is fresh for the whole capture. There is only
      // one filmable product today — a second would need its own boot here to
      // go with its own entry in RECIPES.
      await schedule.bootApp();
      schedule.setTheme(TENANT.slug, TENANT.theme);
      for (const scene of apps) await captureApp(browser, scene);
    }
  } finally {
    await browser.close();
  }
}

process.on('SIGINT', () => {
  schedule.shutdown();
  process.exit(130);
});

main()
  .then(() => {
    schedule.shutdown();
    process.exit(0);
  })
  .catch((err) => {
    console.error(err.message || err);
    schedule.shutdown();
    process.exit(1);
  });
