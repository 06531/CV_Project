// Captures portfolio screenshots of the Multi-tenant Course Scheduling Platform
// (~/Documents/schedule_project) at desktop and mobile viewports.
//
// That repo already ships an E2E harness with a dedicated database and ports
// (see e2e/seed-e2e.ts and e2e/playwright.config.ts), so this script reuses it
// rather than inventing its own: seed `schedule_app_e2e`, boot the API on 4100
// and Vite on 5273, drive Chromium, tear everything down. Nothing inside
// schedule_project is modified — we only run its existing scripts.
//
// Requires PostgreSQL to be running.
//
// Usage: node scripts/capture-schedule.mjs [--force] [--headed]

import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.resolve(root, '..', 'schedule_project');
const OUT = path.join(root, 'public', 'portfolio', 'schedule');

const API_PORT = 4100;
const WEB_PORT = 5273;
const BASE = `http://localhost:${WEB_PORT}`;
const DB = 'schedule_app_e2e';

const force = process.argv.includes('--force');
const headed = process.argv.includes('--headed');

const VIEWPORTS = [
  { key: 'desktop', options: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 } },
  { key: 'mobile', options: { ...devices['iPhone 13'] } },
];

// Seeded demo credentials, documented in schedule_project/README.md.
const TEACHER = { email: 'wang@abc.com', password: 'teach1234' };
const STUDENT = { phone: '51234567', password: 'demo1234' };
const PLATFORM = { user: 'admin', password: 'admin123' };

// Tab order in TeacherDashboardPage for an owner account.
const TAB = { overview: 0, courses: 1, calendar: 2, qr: 3, staff: 4, audit: 5 };

const children = [];

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: 'inherit', ...opts });
}

function boot(name, cmd, args, opts) {
  const child = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', (d) => process.env.VERBOSE && process.stdout.write(`[${name}] ${d}`));
  child.stderr.on('data', (d) => process.env.VERBOSE && process.stderr.write(`[${name}] ${d}`));
  child.on('exit', (code) => code && console.error(`[${name}] exited with ${code}`));
  children.push(child);
  return child;
}

async function waitFor(url, label, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${label} did not come up at ${url} within ${timeoutMs}ms`);
}

function checkPostgres() {
  try {
    execFileSync('pg_isready', { stdio: 'pipe' });
  } catch {
    console.error(
      'PostgreSQL is not accepting connections. Start Postgres.app (or pg_ctl) and retry.',
    );
    process.exit(1);
  }
}

/** One captured screen: navigate/act, then shoot. */
const SCREENS = [
  {
    name: 'directory',
    async run(page) {
      await page.goto(`${BASE}/`);
      await page.waitForSelector('.company-card, .card', { timeout: 15_000 });
    },
  },
  {
    name: 'company-calendar',
    async run(page) {
      await page.goto(`${BASE}/c/abc-music`);
      await page.waitForSelector('.cal-grid, .course-grid', { timeout: 15_000 });
    },
  },
  {
    name: 'student-booking',
    async run(page) {
      await loginStudent(page);
      await page.goto(`${BASE}/courses/2`);
      await page.waitForSelector('.card', { timeout: 15_000 });
      await logout(page);
    },
  },
  {
    name: 'teacher-overview',
    async run(page) {
      await loginTeacher(page);
      await openTab(page, TAB.overview);
    },
  },
  {
    name: 'teacher-courses',
    async run(page) {
      await loginTeacher(page);
      await openTab(page, TAB.courses);
    },
  },
  {
    name: 'teacher-calendar',
    async run(page) {
      await loginTeacher(page);
      await openTab(page, TAB.calendar);
      await page.waitForSelector('.cal-grid', { timeout: 15_000 });
    },
  },
  {
    name: 'teacher-qr',
    async run(page) {
      await loginTeacher(page);
      await openTab(page, TAB.qr);
      await page.waitForSelector('canvas, svg', { timeout: 15_000 });
    },
  },
  {
    name: 'teacher-staff',
    async run(page) {
      await loginTeacher(page);
      await openTab(page, TAB.staff);
    },
  },
  {
    name: 'platform',
    async run(page) {
      await page.goto(`${BASE}/platform/login`);
      const form = page.locator('form.form-card');
      await form.locator('input[type=text]').first().fill(PLATFORM.user);
      await form.locator('input[type=password]').fill(PLATFORM.password);
      await form.locator('button[type=submit]').click();
      await page.waitForURL(/\/platform$/, { timeout: 20_000 });
      await page.waitForSelector('.admin-table, .card', { timeout: 15_000 });
    },
  },
];

async function loginTeacher(page) {
  if (page.url().includes('/teacher/manage')) return;
  await page.goto(`${BASE}/teacher/login`);
  const form = page.locator('form.form-card');
  await form.locator('input[type=email]').fill(TEACHER.email);
  await form.locator('input[type=password]').fill(TEACHER.password);
  await form.locator('button[type=submit]').click();
  await page.waitForURL(/\/teacher$/, { timeout: 20_000 });
  // The hub opens on the profile tab; the company list (with the "管理 ▸"
  // buttons that switch into a company) lives under the second tab.
  await page.locator('.tabs button').nth(1).click();
  await page.getByRole('button', { name: /管理/ }).first().click();
  await page.waitForURL(/\/teacher\/manage/, { timeout: 20_000 });
  await page.waitForSelector('.tabs button', { timeout: 15_000 });
}

async function loginStudent(page) {
  await page.goto(`${BASE}/login`);
  const form = page.locator('form.form-card');
  await form.locator('input[type=tel]').fill(STUDENT.phone);
  await form.locator('input[type=password]').fill(STUDENT.password);
  await form.locator('button[type=submit]').click();
  await page.waitForURL(/\/(my|)$/, { timeout: 20_000 });
}

async function logout(page) {
  await page.evaluate(() => localStorage.clear());
}

async function openTab(page, index) {
  const tabs = page.locator('.tabs button');
  await tabs.nth(index).click();
  await page.waitForTimeout(600);
}

async function capture() {
  const browser = await chromium.launch({ headless: !headed });
  try {
    for (const { key, options } of VIEWPORTS) {
      const context = await browser.newContext({
        ...options,
        locale: 'zh-TW',
        // The app detects the browser language; without this it renders in English.
        extraHTTPHeaders: { 'Accept-Language': 'zh-TW,zh;q=0.9' },
      });
      const page = await context.newPage();

      for (const screen of SCREENS) {
        const dest = path.join(OUT, `${key}-${screen.name}.jpg`);
        if (!force && existsSync(dest)) {
          console.log(`  skip    ${key}-${screen.name}.jpg (exists)`);
          continue;
        }
        try {
          await screen.run(page);
          // Let the page-enter animation settle before shooting.
          await page.waitForTimeout(900);
          await page.screenshot({ path: dest, type: 'jpeg', quality: 82 });
          console.log(`  capture ${key}-${screen.name}.jpg`);
        } catch (err) {
          console.error(`  FAILED  ${key}-${screen.name}: ${err.message}`);
        }
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }
}

function shutdown() {
  for (const child of children) {
    if (!child.killed) {
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch {
        child.kill('SIGTERM');
      }
    }
  }
}

async function main() {
  if (!existsSync(APP)) {
    console.error(`schedule_project not found at ${APP}`);
    process.exit(1);
  }
  checkPostgres();
  mkdirSync(OUT, { recursive: true });

  if (!force && readdirSync(OUT).length >= SCREENS.length * VIEWPORTS.length) {
    console.log('Screenshots already present — pass --force to re-capture.');
    return;
  }

  console.log(`Seeding ${DB} …`);
  if (!existsSync(path.join(APP, 'e2e', 'node_modules'))) {
    sh('npm', ['install'], { cwd: path.join(APP, 'e2e') });
  }
  sh('npm', ['run', 'seed'], { cwd: path.join(APP, 'e2e') });

  console.log('Booting API + web …');
  boot('api', 'npm', ['start'], {
    cwd: path.join(APP, 'server'),
    detached: true,
    env: {
      ...process.env,
      PORT: String(API_PORT),
      PGDATABASE: DB,
      JWT_SECRET: 'cv-portfolio-capture',
      CLIENT_ORIGIN: BASE,
    },
  });
  boot('web', 'npx', ['vite', '--port', String(WEB_PORT), '--strictPort'], {
    cwd: path.join(APP, 'client'),
    detached: true,
    env: { ...process.env, VITE_PROXY_TARGET: `http://localhost:${API_PORT}` },
  });

  await waitFor(`http://localhost:${API_PORT}/api/companies`, 'API');
  await waitFor(BASE, 'web');

  console.log('Capturing …');
  await capture();
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
    console.error(err);
    shutdown();
    process.exit(1);
  });
