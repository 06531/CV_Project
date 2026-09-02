// Shared Playwright boot for the verification scripts.
//
// The three checks and the screenshot helper all opened a browser the same way,
// and two of them carried the same twelve-line comment explaining why. Both
// pieces are load-bearing:
//
//   viewport      'mobile' has to be a real device profile, not just a narrow
//                 window — the stylesheet branches on `(hover: none) and
//                 (pointer: coarse)` as well as on width, and a resized desktop
//                 context only satisfies half of that.
//   reducedMotion Headless Chromium reports `prefers-reduced-motion: reduce`.
//                 AutoWorld honours it by never constructing a <video> at all,
//                 so a check that forgets this silently measures the stills
//                 fallback and passes with nothing to say.
//
// Usage:
//   const { browser, page, errors } = await launchCheck({ mode });
//   await gotoOrExit(page, url, { browser });

import { chromium, devices } from 'playwright';

/** Where the verification runs. `next dev` does not hot-reload messages/*.json,
 *  so copy has to be checked against a production build on its own port. */
export const CHECK_PORT = 3001;
export const CHECK_ORIGIN = `http://localhost:${CHECK_PORT}`;

/** The two shapes every check runs in. */
export function viewportOptions(mode) {
  return mode === 'mobile' ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } };
}

/**
 * A browser, a context in the requested shape, a page, and the array its
 * uncaught page errors land in. Every check asserts on that array at the end.
 */
export async function launchCheck({ mode = 'desktop', reducedMotion = 'no-preference' } = {}) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...viewportOptions(mode), reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return { browser, context, page, errors };
}

/**
 * Navigate, or explain why we cannot and stop.
 *
 * A check that cannot reach the server is not a failing check — it is a check
 * that did not run — so this exits rather than pushing onto `failures`.
 */
export async function gotoOrExit(page, url, { browser, waitUntil = 'networkidle' }) {
  try {
    await page.goto(url, { waitUntil });
  } catch (err) {
    console.error(
      `cannot reach ${url}\n  ${err.message.split('\n')[0]}\n` +
        `  start the server first: npx next start -p ${CHECK_PORT}\n` +
        '  or run `npm run check`, which starts one and shuts it down after.',
    );
    await browser.close();
    process.exit(1);
  }
}
