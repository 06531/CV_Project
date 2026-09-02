/* Shared runtime for every explainer scene of the scroll-worlds.
   Loaded by each scenes/<id>.html before its own <script>.

   A scene must render as a pure function of `p` (0..1) — no CSS animations, no
   timers, no randomness — so Playwright can step through it frame by frame and
   get a deterministic, scrubbable clip. `defineScene` is what enforces the
   shape of that: the scene hands over a paint function, and everything around
   it (the frame -> p arithmetic, replaying on resize, the marker the capture
   script reads) is the same in all twelve and lives here.

   Deliberately NOT here: `reveal()`. Eleven scenes define one, but three of
   them default the lift to 12px and eight to 14px, so there is no shared
   implementation to lift — only two that look alike. Hoisting one of them
   would silently restyle the other group. Same for `wirePaths()`, which differs
   per scene in what it connects. */

/* eslint-env browser */

/** Clamp x into [a, b]. */
// eslint-disable-next-line no-unused-vars
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/** Smoothstep over an arbitrary window of the timeline. */
// eslint-disable-next-line no-unused-vars
const seg = (p, from, to) => {
  const x = clamp((p - from) / (to - from), 0, 1);
  return x * x * (3 - 2 * x);
};

/** getElementById, at the length it deserves. */
// eslint-disable-next-line no-unused-vars
const $ = (id) => document.getElementById(id);

/**
 * Install a scene's paint function as `window.__setFrame(i, total)`.
 *
 * `paint(p)` receives the position through the clip, 0..1. It is called once
 * immediately — a scene that has never been painted is an empty stage, and the
 * capture script screenshots whatever is on screen — and again on resize, which
 * is why the last frame asked for is remembered.
 *
 * `document.documentElement.dataset.frame` is set after every paint. It is not
 * used by the scene; it is a marker, so a human stepping through a scene in a
 * browser can see which frame they are looking at.
 */
// eslint-disable-next-line no-unused-vars
function defineScene(paint) {
  let last = { i: 0, total: 2 };

  window.__setFrame = function (i, total) {
    last = { i, total };
    // `total` of 1 would divide by zero; a single-frame scene is frame 0.
    const p = total > 1 ? clamp(i / (total - 1), 0, 1) : 0;
    paint(p);
    document.documentElement.dataset.frame = String(i);
  };

  window.__setFrame(0, 2);
  window.addEventListener('resize', () => window.__setFrame(last.i, last.total));
}
