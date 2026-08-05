// One screenshot of one URL, desktop or phone. Handy for eyeballing a change
// against a running dev server without opening a browser.
//
// Usage: node scripts/shot.mjs <out.png> <url> [desktop|mobile]

import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium, devices } from 'playwright';

const [out, url, mode] = process.argv.slice(2);
if (!out || !url) {
  console.error('usage: node scripts/shot.mjs <out.png> <url> [desktop|mobile]');
  process.exit(1);
}

mkdirSync(path.dirname(path.resolve(out)), { recursive: true });

const viewport =
  mode === 'mobile' ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } };

const browser = await chromium.launch();
const context = await browser.newContext(viewport);
const page = await context.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.screenshot({ path: out });
await browser.close();
