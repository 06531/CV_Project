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
import { APPS, DEFAULT_FRAMES, REMOTES, SCENES, VIEWPORTS } from '../scenes/manifest.mjs';

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

// ----------------------------------------------------------- remote scenes

/** Every frame of the page, since these apps are framesets. */
const everyFrame = (page) => page.frames();

const allFrameText = async (page) => {
  const parts = await Promise.all(
    everyFrame(page).map((f) => f.evaluate(() => document.body?.innerText ?? '').catch(() => '')),
  );
  return parts.join('\n');
};

/**
 * Rewrites the identifying names in place, in every frame. Done in the page
 * before the shutter rather than blurring the PNG afterwards, so the originals
 * never reach a file at all.
 */
async function anonymise(page, remote) {
  const rules = (remote.anonymise ?? []).map(([f, t]) => [
    f instanceof RegExp ? { source: f.source, flags: f.flags } : f,
    t,
  ]);
  for (const frame of everyFrame(page)) {
    await frame
      .evaluate(
        ([rs, minDigits]) => {
          if (!document.body) return;

          /** Same length, different value, and the same answer every time. */
          const maskRun = (run) => {
            let h = 2166136261;
            for (let i = 0; i < run.length; i++) h = ((h ^ run.charCodeAt(i)) * 16777619) >>> 0;
            let out = '';
            while (out.length < run.length) {
              out += String(h % 10);
              h = (h * 31 + 7) >>> 0;
            }
            return out;
          };

          const digits = minDigits ? new RegExp(`\\d{${minDigits},}`, 'g') : null;
          const swap = (s) => {
            let out = rs.reduce(
              (acc, [find, to]) =>
                find.source
                  ? acc.replace(new RegExp(find.source, find.flags), to)
                  : acc.split(find).join(to),
              s,
            );
            if (digits) out = out.replace(digits, maskRun);
            return out;
          };

          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            // Rewriting script and style bodies achieves nothing and risks a lot.
            acceptNode: (n) =>
              /^(SCRIPT|STYLE)$/.test(n.parentElement?.tagName ?? '')
                ? NodeFilter.FILTER_REJECT
                : NodeFilter.FILTER_ACCEPT,
          });
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            const next = swap(n.nodeValue);
            if (next !== n.nodeValue) n.nodeValue = next;
          }
          for (const el of document.querySelectorAll('input, [title], img[alt]')) {
            if (el.value) el.value = swap(el.value);
            if (el.title) el.title = swap(el.title);
            if (el.alt) el.alt = swap(el.alt);
          }
        },
        [rules, remote.maskDigits ?? 0],
      )
      .catch(() => {});
  }

  if (!remote.maskColumns) return;
  for (const frame of everyFrame(page)) {
    await frame
      .evaluate((cols) => {
        const wanted = new Map(Object.entries(cols));
        for (const table of document.querySelectorAll('table')) {
          const heads = table.tHead?.rows?.[0]?.cells;
          if (!heads) continue;
          const targets = [];
          for (let i = 0; i < heads.length; i++) {
            const label = (heads[i].innerText || '').replace(/\s+/g, ' ').trim();
            if (wanted.has(label)) targets.push([i, wanted.get(label)]);
          }
          if (!targets.length) continue;
          // jqGrid keeps its header and body in two tables that share a column
          // order, so the body may be elsewhere in the DOM.
          const bodies = [table, ...document.querySelectorAll('.ui-jqgrid-btable')];
          for (const body of bodies) {
            const rows = body.tBodies?.[0]?.rows ?? [];
            for (let r = 0; r < rows.length; r++) {
              for (const [i, values] of targets) {
                const cell = rows[r].cells[i];
                if (!cell || !cell.innerText.trim()) continue;
                cell.textContent = values[r % values.length];
              }
            }
          }
        }
      }, remote.maskColumns)
      .catch(() => {});
  }
}

/** Refuses to go on if anything on the forbidden list is still readable. */
async function assertClean(page, remote, scene) {
  const text = await allFrameText(page);
  const left = (remote.forbidden ?? []).filter((w) => text.includes(w));
  if (left.length) {
    throw new Error(
      `anonymisation missed: ${left.join(', ')} — add rules to REMOTES.${scene.remote}`,
    );
  }
}

/**
 * Films a system we cannot boot: attach to a Chrome the reader has already
 * signed in, open a tab in that same context so it shares the session, rewrite
 * the identifying names in place, and pan down it.
 *
 * Deliberately never touches a password. See REMOTES in scenes/manifest.mjs
 * for how to start that Chrome.
 */
async function captureRemote(scene) {
  const remote = REMOTES[scene.remote];
  if (!remote) throw new Error(`unknown remote "${scene.remote}" in scenes/manifest.mjs`);
  const frames = scene.frames ?? DEFAULT_FRAMES;

  let browser;
  try {
    browser = await chromium.connectOverCDP(remote.cdp);
  } catch {
    throw new Error(
      `no debuggable Chrome on ${remote.cdp}. Start one and sign in first:\n` +
        `  open -na "Google Chrome" --args --remote-debugging-port=9222 --user-data-dir="$HOME/.chrome-otto"`,
    );
  }

  const context = browser.contexts()[0];
  if (!context) throw new Error('the debuggable Chrome has no open window');

  // Prefer a tab that is already on the system and already signed in. This app
  // keeps its session in a `jsessionid` carried on the URL, so a fresh tab —
  // even in the same context, with all the same cookies — lands back on the
  // login page. Reuse the reader's tab and leave the navigation alone.
  const origin = new URL(remote.url).origin;

  let page = null;
  for (const candidate of context.pages()) {
    if (!candidate.url().startsWith(origin)) continue;
    const text = await allFrameText(candidate);
    if (!remote.signedInText || text.includes(remote.signedInText)) {
      page = candidate;
      break;
    }
  }
  const borrowed = Boolean(page);
  if (!page) page = await context.newPage();

  try {
    for (const vp of pending(scene)) {
      const dir = prepare(scene.id, vp);
      // A CDP-attached context has a fixed deviceScaleFactor, so film at the
      // output resolution directly rather than scaling a smaller viewport up.
      await page.setViewportSize(remote.viewports[vp.key]);
      // Navigating a borrowed tab risks bouncing it back to the login page —
      // it is already where we want it.
      if (!borrowed) await page.goto(remote.url, { waitUntil: 'networkidle', timeout: 90_000 });
      await page.waitForTimeout(2500);

      const inner =
        page.frames().find((f) => f.name() === remote.frame) ?? page.mainFrame();
      if (remote.settleSelector) {
        await inner.waitForSelector(remote.settleSelector, { timeout: 30_000 });
      }
      await page.waitForTimeout(1500);

      if (remote.signedInText && !(await allFrameText(page)).includes(remote.signedInText)) {
        throw new Error(
          `that Chrome is not signed in to ${remote.url} — log in there first, then re-run`,
        );
      }

      await anonymise(page, remote);
      await assertClean(page, remote, scene);

      // Kill the app's own entrance animation so frame 1 is already settled.
      for (const f of page.frames()) {
        await f
          .addStyleTag({
            content: '*,*::before,*::after{animation:none!important;transition:none!important}',
          })
          .catch(() => {});
      }

      // The document itself may not scroll at all — this app puts its grid in
      // an inner container. Pan whatever actually moves.
      const sel = remote.scrollSelector ?? null;
      const travel = await inner.evaluate((s) => {
        const el = s ? document.querySelector(s) : null;
        return el
          ? el.scrollHeight - el.clientHeight
          : document.documentElement.scrollHeight - window.innerHeight;
      }, sel);
      const span = Math.max(0, travel - 24);
      if (span < 40) {
        console.log(`  note    ${scene.id}-${vp.key}: only ${span}px of travel — the pan will be subtle`);
      }

      for (let i = 0; i < frames; i++) {
        const t = i / (frames - 1);
        const eased = t * t * (3 - 2 * t);
        await inner.evaluate(
          ([s, y]) => {
            const el = s ? document.querySelector(s) : null;
            if (el) el.scrollTop = y;
            else window.scrollTo(0, y);
          },
          [sel, Math.round(span * eased)],
        );
        await page.waitForTimeout(16);
        // Grids like this one re-render their rows as they scroll, which puts
        // the original values straight back. Re-run the rewrite every frame
        // rather than trusting one pass at the start.
        await anonymise(page, remote);
        await page.screenshot({ path: path.join(dir, frameName(i)) });
      }
      await assertClean(page, remote, scene);

      console.log(`  capture ${scene.id}-${vp.key} (${frames} frames, pan ${Math.round(span)}px)`);
    }
  } finally {
    if (borrowed) {
      // Hand the tab back the way we found it.
      await page.setViewportSize(null).catch(() => {});
    } else {
      await page.close().catch(() => {});
    }
    // Detach only — this is the reader's browser, not ours to close.
    await browser.close();
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

  // A remote scene brings its own (already-running) browser.
  for (const scene of todo.filter((s) => s.kind === 'remote')) await captureRemote(scene);

  const rest = todo.filter((s) => s.kind !== 'remote');
  if (rest.length === 0) return;

  const browser = await chromium.launch();
  const booted = new Map();
  try {
    for (const scene of rest) {
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
