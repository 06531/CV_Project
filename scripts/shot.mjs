// One screenshot of one URL, desktop or phone. Handy for eyeballing a change
// against a running dev server without opening a browser.
//
// Usage: node scripts/shot.mjs <out.png> <url> [desktop|mobile]

import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { gotoOrExit, launchCheck } from './lib/browser.mjs';

const [out, url, mode] = process.argv.slice(2);
if (!out || !url) {
  console.error('usage: node scripts/shot.mjs <out.png> <url> [desktop|mobile]');
  process.exit(1);
}

mkdirSync(path.dirname(path.resolve(out)), { recursive: true });

// Same context the checks run in, motion included — a screenshot taken to
// eyeball a scroll-world is worthless if the browser told the page to hold
// still and the page obliged.
const { browser, page } = await launchCheck({ mode });
await gotoOrExit(page, url, { browser });
await page.waitForTimeout(2500);
await page.screenshot({ path: out });
await browser.close();
