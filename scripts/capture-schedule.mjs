// Captures portfolio screenshots of the Multi-tenant Course Scheduling Platform
// (~/Documents/schedule_project) at desktop and mobile viewports.
//
// Booting, seeding and signing in all live in ./lib/schedule-app.mjs, shared
// with the scroll-world capture so the stills and the clip show the same app,
// the same data and the same language. This file only decides what to shoot.
//
// Requires PostgreSQL to be running.
//
// Usage: node scripts/capture-schedule.mjs [--force] [--headed]

import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';
import * as app from './lib/schedule-app.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'public', 'portfolio', 'schedule');

const force = process.argv.includes('--force');
const headed = process.argv.includes('--headed');

const VIEWPORTS = [
  { key: 'desktop', options: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 } },
  { key: 'mobile', options: { ...devices['iPhone 13'] } },
];

/** One captured screen: navigate/act, then shoot. */
const SCREENS = [
  {
    name: 'directory',
    async run(page) {
      await page.goto(`${app.BASE}/`);
      await page.waitForSelector('.company-card, .card', { timeout: 15_000 });
    },
  },
  {
    name: 'company-calendar',
    async run(page) {
      await page.goto(`${app.BASE}/c/abc-music`);
      await page.waitForSelector('.cal-grid, .course-grid', { timeout: 15_000 });
    },
  },
  {
    name: 'student-booking',
    async run(page) {
      await app.loginStudent(page);
      await page.goto(`${app.BASE}/courses/2`);
      await page.waitForSelector('.card', { timeout: 15_000 });
      await app.logout(page);
    },
  },
  {
    name: 'teacher-overview',
    async run(page) {
      await app.loginTeacher(page);
      await app.openTab(page, app.TAB.overview);
    },
  },
  {
    name: 'teacher-courses',
    async run(page) {
      await app.loginTeacher(page);
      await app.openTab(page, app.TAB.courses);
    },
  },
  {
    name: 'teacher-calendar',
    async run(page) {
      await app.loginTeacher(page);
      await app.openTab(page, app.TAB.calendar);
      await page.waitForSelector('.cal-grid', { timeout: 15_000 });
    },
  },
  {
    name: 'teacher-qr',
    async run(page) {
      await app.loginTeacher(page);
      await app.openTab(page, app.TAB.qr);
      await page.waitForSelector('canvas, svg', { timeout: 15_000 });
    },
  },
  {
    name: 'teacher-staff',
    async run(page) {
      await app.loginTeacher(page);
      await app.openTab(page, app.TAB.staff);
    },
  },
  {
    name: 'platform',
    async run(page) {
      await app.loginPlatform(page);
    },
  },
];

async function capture() {
  const browser = await chromium.launch({ headless: !headed });
  try {
    for (const { key, options } of VIEWPORTS) {
      const context = await browser.newContext({ ...options, ...app.CONTEXT_LOCALE });
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
          await app.assertNoCjk(page, `${key}-${screen.name}`);
          await page.screenshot({ path: dest, type: 'jpeg', quality: 82 });
          console.log(`  capture ${key}-${screen.name}.jpg`);
        } catch (err) {
          console.error(`  FAILED  ${key}-${screen.name}: ${err.message}`);
          process.exitCode = 1;
        }
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  if (!force && readdirSync(OUT).length >= SCREENS.length * VIEWPORTS.length) {
    console.log('Screenshots already present — pass --force to re-capture.');
    return;
  }

  await app.bootApp();
  console.log('Capturing …');
  await capture();
}

process.on('SIGINT', () => {
  app.shutdown();
  process.exit(130);
});

main()
  .then(() => {
    app.shutdown();
    process.exit(process.exitCode ?? 0);
  })
  .catch((err) => {
    console.error(err.message || err);
    app.shutdown();
    process.exit(1);
  });
