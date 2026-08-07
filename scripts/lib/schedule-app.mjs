// Booting and driving the Multi-tenant Course Scheduling Platform
// (~/Documents/schedule_project) for capture.
//
// Two scripts film that app — `capture-schedule.mjs` for the portfolio stills
// and `capture-world-frames.mjs` for the scroll-world clip — and they need the
// same things: a seeded database, a running API and web server, and a way to
// sign in as a teacher, a student or the platform admin. This is that, once.
//
// It reuses the E2E harness schedule_project already ships (`e2e/seed-e2e.ts`,
// its own `schedule_app_e2e` database and ports) rather than inventing a
// parallel setup. Nothing in that repo is modified: we run its existing scripts
// and write only to its throwaway E2E database.
//
// Requires PostgreSQL to be running.

import { spawn, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO_EN, DEMO_EN_TARGETS } from './demo-en.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const APP_DIR = path.resolve(root, '..', 'schedule_project');
export const DB = 'schedule_app_e2e';
export const API_PORT = 4100;
export const WEB_PORT = 5273;
export const BASE = `http://localhost:${WEB_PORT}`;

/**
 * The app picks its language off the browser. Both capture scripts film it in
 * English — see demo-en.mjs for why the seeded rows are translated to match.
 */
export const CONTEXT_LOCALE = {
  locale: 'en-US',
  extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
};

/** Seeded demo credentials, documented in schedule_project/README.md. */
export const CREDENTIALS = {
  /** Company owners, keyed by slug — every seeded teacher shares one password. */
  owners: {
    'abc-music': { email: 'wang@abc.com', password: 'teach1234' },
    'starlight-dance': { email: 'ho@starlight.com', password: 'teach1234' },
  },
  student: { phone: '51234567', password: 'demo1234' },
  platform: { user: 'admin', password: 'admin123' },
};

/** Tab order in TeacherDashboardPage for an owner account. */
export const TAB = { overview: 0, courses: 1, calendar: 2, qr: 3, staff: 4, audit: 5 };

// ------------------------------------------------------------- processes

const children = [];

function boot(name, cmd, args, opts) {
  const child = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', (d) => process.env.VERBOSE && process.stdout.write(`[${name}] ${d}`));
  child.stderr.on('data', (d) => process.env.VERBOSE && process.stderr.write(`[${name}] ${d}`));
  child.on('exit', (code) => code && console.error(`[${name}] exited with ${code}`));
  children.push(child);
  return child;
}

/** Stops everything this module started. Safe to call more than once. */
export function shutdown() {
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

// -------------------------------------------------------------- database

export function checkPostgres() {
  try {
    execFileSync('pg_isready', { stdio: 'pipe' });
  } catch {
    throw new Error('PostgreSQL is not accepting connections — start Postgres.app and retry.');
  }
}

function psql(sql) {
  return execFileSync('psql', ['-d', DB, '-v', 'ON_ERROR_STOP=1', '-q', '-f', '-'], {
    input: sql,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'inherit'],
  });
}

/** Runs schedule_project's own E2E seed: create, migrate, fill `schedule_app_e2e`. */
export function seed() {
  if (!existsSync(APP_DIR)) throw new Error(`schedule_project not found at ${APP_DIR}`);
  const e2e = path.join(APP_DIR, 'e2e');
  if (!existsSync(path.join(e2e, 'node_modules'))) {
    execFileSync('npm', ['install'], { cwd: e2e, stdio: 'inherit' });
  }
  // From scratch every time, because anglicise() leaves the database in a state
  // their seed cannot re-enter: the category list is planted by the migration
  // only when the table is empty, and seed.ts then resolves each demo course
  // against it by name. Once we have renamed 鋼琴 to Piano, a re-seed onto the
  // same database fails to find it. Dropping first also makes the capture
  // reproducible rather than dependent on whatever ran last.
  console.log(`Recreating ${DB} …`);
  execFileSync('dropdb', ['--if-exists', DB], { stdio: 'inherit' });
  execFileSync('npm', ['run', 'seed'], { cwd: e2e, stdio: 'inherit' });
}

const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;

/**
 * Rewrites the seeded Chinese demo rows to English, in place. Runs after
 * `seed()` and before anything boots, so the app itself is never touched — it
 * just serves what is in the table. See demo-en.mjs.
 */
export function anglicise() {
  const values = Object.entries(DEMO_EN)
    .map(([zh, en]) => `(${lit(zh)}, ${lit(en)})`)
    .join(',\n    ');
  // One VALUES list serves every column: matching is by exact equality, so a
  // pair that belongs to another table simply never matches here.
  const map = `(VALUES\n    ${values}\n  ) AS m(zh, en)`;

  const statements = DEMO_EN_TARGETS.flatMap(({ table, columns, json, key }) =>
    json
      ? [
          `UPDATE ${table} t SET ${json} = jsonb_set(t.${json}, '{${key}}', to_jsonb(m.en))
             FROM ${map} WHERE t.${json} ->> '${key}' = m.zh;`,
        ]
      : columns.map(
          (col) => `UPDATE ${table} t SET ${col} = m.en FROM ${map} WHERE t.${col} = m.zh;`,
        ),
  );

  console.log(`Translating ${DB} demo data to English …`);
  psql(`BEGIN;\n${statements.join('\n')}\nCOMMIT;`);
  assertDbEnglish();
}

/**
 * Refuses to go on if any Chinese survived. The map is keyed by exact strings,
 * so a demo row added upstream would otherwise slip into an English clip
 * unnoticed — this sweeps every text and JSON column in the database instead of
 * only the ones we thought to list.
 */
export function assertDbEnglish() {
  psql(`
DO $$
DECLARE r record; n bigint; bad text := '';
BEGIN
  FOR r IN
    SELECT c.table_name, c.column_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name
       AND t.table_type = 'BASE TABLE'
     WHERE c.table_schema = 'public'
       AND c.data_type IN ('text', 'character varying', 'json', 'jsonb')
  LOOP
    EXECUTE format('SELECT count(*) FROM %I WHERE %I::text ~ ''[一-鿿]''',
                   r.table_name, r.column_name) INTO n;
    IF n > 0 THEN bad := bad || format(E'\\n  %s.%s (%s rows)', r.table_name, r.column_name, n); END IF;
  END LOOP;
  IF bad <> '' THEN
    RAISE EXCEPTION E'Chinese demo data left after anglicise():%\\n  add the missing strings to scripts/lib/demo-en.mjs', bad;
  END IF;
END $$;`);
}

/**
 * Repaints a seeded school's brand — the per-company `theme` the product lets
 * an owner pick, which drives the whole admin, not just an accent.
 *
 * Why a capture would want to: `abc-music` ships as `stage`, a dark purple, and
 * it is also the only seeded school with any enrolments. So the shot that shows
 * the product with real numbers in it is the one that does not match the rest
 * of the site, and the schools that do match have dashboards reading zero. This
 * lets a capture keep the data and change the paint, instead of choosing.
 *
 * Demo data only, in the throwaway e2e database, after `seed()` and before
 * anything boots — the app is never touched, it just serves what is in the
 * table. `anglicise()` rewrites the same rows for the same reason.
 */
export function setTheme(slug, { template, color }) {
  psql(`
UPDATE companies
   SET theme = jsonb_set(
                 jsonb_set(theme::jsonb, '{template}', to_jsonb(${lit(template)}::text)),
                 '{color}', to_jsonb(${lit(color)}::text))::json
 WHERE slug = ${lit(slug)};`);
}

// ------------------------------------------------------------------ boot

/** Seeds, translates, then brings up the API and Vite. Returns the web origin. */
export async function bootApp() {
  checkPostgres();
  seed();
  anglicise();

  console.log(`Booting the schedule app on :${API_PORT} / :${WEB_PORT} …`);
  boot('api', 'npm', ['start'], {
    cwd: path.join(APP_DIR, 'server'),
    detached: true,
    env: {
      ...process.env,
      PORT: String(API_PORT),
      PGDATABASE: DB,
      JWT_SECRET: 'cv-capture',
      CLIENT_ORIGIN: BASE,
    },
  });
  boot('web', 'npx', ['vite', '--port', String(WEB_PORT), '--strictPort'], {
    cwd: path.join(APP_DIR, 'client'),
    detached: true,
    env: { ...process.env, VITE_PROXY_TARGET: `http://localhost:${API_PORT}` },
  });

  await waitFor(`http://localhost:${API_PORT}/api/companies`, 'API');
  await waitFor(BASE, 'web');
  return BASE;
}

// --------------------------------------------------------------- signing in

/**
 * Drops whatever token the previous screen left behind. The capture scripts
 * move between a student, a teacher and the platform admin on one page, and the
 * app keeps each session in localStorage — without this, signing in as the next
 * one lands on the previous one's home.
 */
async function resetSession(page) {
  if (!page.url().startsWith(BASE)) return;
  await page.evaluate(() => localStorage.clear());
}

export async function loginTeacher(page, owner = CREDENTIALS.owners['abc-music']) {
  if (page.url().includes('/teacher/manage')) return;
  await resetSession(page);
  await page.goto(`${BASE}/teacher/login`);
  const form = page.locator('form.form-card');
  await form.locator('input[type=email]').fill(owner.email);
  await form.locator('input[type=password]').fill(owner.password);
  await form.locator('button[type=submit]').click();
  await page.waitForURL(/\/teacher$/, { timeout: 20_000 });
  // The hub opens on the profile tab; the company list (with the buttons that
  // switch into a company) lives under the second tab. The button's label is
  // translated, hence both locales in the pattern.
  await page.locator('.tabs button').nth(1).click();
  await page.getByRole('button', { name: /管理|Manage/ }).first().click();
  await page.waitForURL(/\/teacher\/manage/, { timeout: 20_000 });
  await page.waitForSelector('.tabs button', { timeout: 15_000 });
}

export async function loginStudent(page) {
  await resetSession(page);
  await page.goto(`${BASE}/login`);
  const form = page.locator('form.form-card');
  await form.locator('input[type=tel]').fill(CREDENTIALS.student.phone);
  await form.locator('input[type=password]').fill(CREDENTIALS.student.password);
  await form.locator('button[type=submit]').click();
  await page.waitForURL(/\/(my|)$/, { timeout: 20_000 });
}

export async function loginPlatform(page) {
  await resetSession(page);
  await page.goto(`${BASE}/platform/login`);
  const form = page.locator('form.form-card');
  await form.locator('input[type=text]').first().fill(CREDENTIALS.platform.user);
  await form.locator('input[type=password]').fill(CREDENTIALS.platform.password);
  await form.locator('button[type=submit]').click();
  await page.waitForURL(/\/platform$/, { timeout: 20_000 });
  await page.waitForSelector('.admin-table, .card', { timeout: 15_000 });
}

export async function logout(page) {
  await page.evaluate(() => localStorage.clear());
}

export async function openTab(page, index) {
  await page.locator('.tabs button').nth(index).click();
  await page.waitForTimeout(600);
}

// ------------------------------------------------------------- shutter prep

/**
 * Makes the page reproducible frame to frame: no entrance animations, no
 * transitions, and every hero video parked on its first frame. Without the last
 * one a themed hero keeps playing between screenshots and two "identical"
 * frames differ.
 */
export async function freeze(page) {
  await page.addStyleTag({
    content: '*,*::before,*::after{animation:none!important;transition:none!important}',
  });
  await page.evaluate(() => {
    for (const v of document.querySelectorAll('video')) {
      v.pause();
      v.currentTime = 0;
    }
  });
}

/**
 * Last line of defence for the English capture. `client/src/i18n/locales/en.json`
 * carries no CJK at all and the language switcher reads "EN" under this locale,
 * so anything Chinese on screen means a demo string got past anglicise() — or
 * the app fell back to another locale entirely.
 */
export async function assertNoCjk(page, where) {
  const text = await page.evaluate(() => document.body?.innerText ?? '');
  const hits = [...new Set(text.match(/[㐀-鿿぀-ヿ]+/g) ?? [])];
  if (hits.length) {
    throw new Error(
      `Chinese text on screen at "${where}": ${hits.slice(0, 12).join(', ')}\n` +
        '  add the missing strings to scripts/lib/demo-en.mjs',
    );
  }
}
