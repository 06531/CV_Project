// Captures the frame sequences for the scroll-worlds, driven by
// `scenes/manifest.mjs`.
//
// These are NOT screen recordings. Each scene is broken into N discrete states
// and screenshotted one at a time, so the resulting clip scrubs perfectly —
// no timing jitter, every frame reproducible.
//
//   explainer  scenes/<id>.html, stepped through window.__setFrame(i, total)
//   app        a real product, booted locally and panned top to bottom
//
// App scenes boot the product on dedicated ports against its own database, so
// they neither need your dev server running nor collide with it. Nothing is
// ever written — the pass only scrolls and screenshots.
//
// Usage: node scripts/capture-world-frames.mjs [--force] [--only=id,id]

import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { APPS, DEFAULT_FRAMES, SCENES, VIEWPORTS } from '../scenes/manifest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRAMES = path.join(root, '.frames');

const force = process.argv.includes('--force');
const onlyArg = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];
const only = onlyArg ? new Set(onlyArg.split(',')) : null;

const children = [];

function boot(name, cmd, args, opts) {
  const child = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', (d) => process.env.VERBOSE && process.stdout.write(`[${name}] ${d}`));
  child.stderr.on('data', (d) => process.env.VERBOSE && process.stderr.write(`[${name}] ${d}`));
  child.on('exit', (code) => code && console.error(`[${name}] exited with ${code}`));
  children.push(child);
  return child;
}

function shutdown() {
  for (const child of children) {
    if (child.killed) continue;
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      child.kill('SIGTERM');
    }
  }
}

async function waitFor(url, label, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${label} did not come up at ${url} within ${timeoutMs}ms`);
}

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

async function captureExplainer(browser, scene) {
  const file = 'file://' + path.join(root, 'scenes', `${scene.id}.html`);
  if (!existsSync(path.join(root, 'scenes', `${scene.id}.html`))) {
    throw new Error(`scenes/${scene.id}.html not found`);
  }
  const frames = scene.frames ?? DEFAULT_FRAMES;

  for (const vp of pending(scene)) {
    const dir = prepare(scene.id, vp);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.dsf,
    });
    const page = await context.newPage();
    await page.goto(file, { waitUntil: 'networkidle' });
    // Web fonts must be in before the first frame or the type reflows mid-clip.
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);

    for (let i = 0; i < frames; i++) {
      await page.evaluate(([i, total]) => window.__setFrame(i, total), [i, frames]);
      await page.screenshot({ path: path.join(dir, frameName(i)) });
    }

    await context.close();
    console.log(`  capture ${scene.id}-${vp.key} (${frames} frames)`);
  }
}

// -------------------------------------------------------------- app scenes

/** Boots one product and keeps it up for every app scene that needs it. */
async function bootApp(key) {
  const app = APPS[key];
  if (!app) throw new Error(`unknown app "${key}" in scenes/manifest.mjs`);
  const dir = path.resolve(root, app.dir);
  if (!existsSync(dir)) throw new Error(`${key} app not found at ${dir}`);
  try {
    execFileSync('pg_isready', { stdio: 'pipe' });
  } catch {
    throw new Error('PostgreSQL is not accepting connections — start Postgres.app and retry.');
  }

  const base = `http://localhost:${app.webPort}`;
  console.log(`Booting ${key} (${app.database}) on :${app.apiPort} / :${app.webPort} …`);
  boot('api', 'npm', ['start'], {
    cwd: path.join(dir, 'server'),
    detached: true,
    env: {
      ...process.env,
      PORT: String(app.apiPort),
      PGDATABASE: app.database,
      JWT_SECRET: 'cv-world-capture',
      CLIENT_ORIGIN: base,
    },
  });
  boot('web', 'npx', ['vite', '--port', String(app.webPort), '--strictPort'], {
    cwd: path.join(dir, 'client'),
    detached: true,
    env: { ...process.env, VITE_PROXY_TARGET: `http://localhost:${app.apiPort}` },
  });
  await waitFor(`http://localhost:${app.apiPort}/api/companies`, 'API');
  await waitFor(base, 'web');
  return base;
}

async function captureApp(browser, scene, base) {
  const app = APPS[scene.app];
  const frames = scene.frames ?? DEFAULT_FRAMES;

  for (const vp of pending(scene)) {
    const dir = prepare(scene.id, vp);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.dsf,
      locale: app.locale,
      extraHTTPHeaders: { 'Accept-Language': `${app.locale},zh;q=0.9` },
    });
    const page = await context.newPage();
    await page.goto(`${base}${app.path}`, { waitUntil: 'networkidle' });
    // Maps and calendars both settle a beat after load.
    if (app.settleSelector) await page.waitForSelector(app.settleSelector, { timeout: 20_000 });
    await page.waitForTimeout(2500);

    // Kill the app's own entrance animation so frame 1 is already settled.
    await page.addStyleTag({
      content: '*,*::before,*::after{animation:none!important;transition:none!important}',
    });

    const travel = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    );
    const span = Math.max(0, travel - (app.tailPx ?? 0));

    for (let i = 0; i < frames; i++) {
      const t = i / (frames - 1);
      // Ease in/out so the pan starts and ends gently instead of jerking.
      const eased = t * t * (3 - 2 * t);
      await page.evaluate((y) => window.scrollTo(0, y), Math.round(span * eased));
      await page.waitForTimeout(16);
      await page.screenshot({ path: path.join(dir, frameName(i)) });
    }

    await context.close();
    console.log(`  capture ${scene.id}-${vp.key} (${frames} frames, pan ${Math.round(span)}px)`);
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
  const booted = new Map();
  try {
    for (const scene of todo) {
      if (scene.kind === 'explainer') {
        await captureExplainer(browser, scene);
        continue;
      }
      if (!booted.has(scene.app)) booted.set(scene.app, await bootApp(scene.app));
      await captureApp(browser, scene, booted.get(scene.app));
    }
  } finally {
    await browser.close();
  }
}

process.on('SIGINT', () => {
  shutdown();
  process.exit(130);
});

main()
  .then(() => {
    shutdown();
    process.exit(0);
  })
  .catch((err) => {
    console.error(err.message || err);
    shutdown();
    process.exit(1);
  });
