// The capture-side twin of `src/data/world.ts`: what to film, and from where.
//
// `kind` decides the source:
//   explainer  scenes/<id>.html, stepped through `window.__setFrame(i, total)`
//   app        a real product booted locally, panned top to bottom
//
// Frame sequences land in `.frames/<id>-<viewport>/`, clips in `public/world/`.
// Both stages are idempotent — they skip what already exists unless `--force`.

/** @typedef {{ id: string, kind: 'app' | 'explainer', frames?: number, app?: string }} SceneSpec */

/** @type {SceneSpec[]} */
export const SCENES = [
  // /portfolio's opener — how the work gets made, in two beats.
  { id: 'agents', kind: 'explainer', frames: 160 },
  { id: 'agents-handoff', kind: 'explainer', frames: 160 },

  // Multi-tenant course scheduling platform.
  { id: 'schedule-tour', kind: 'app', app: 'schedule', frames: 140 },
  { id: 'schedule-tenancy', kind: 'explainer', frames: 140 },
  { id: 'schedule-booking', kind: 'explainer', frames: 140 },
];

/**
 * Products we can boot locally to film. Each entry owns its own ports and
 * database so a capture never collides with — or writes to — your dev setup.
 */
export const APPS = {
  schedule: {
    /** Relative to this repo's root. */
    dir: '../schedule_project',
    apiPort: 4100,
    webPort: 5273,
    /** The dev database — its light company theme is the look we want. */
    database: 'schedule_app',
    /** Page to pan down. */
    path: '/c/abc-music',
    /** Wait for these before the first frame. */
    settleSelector: '.cal-grid, .course-grid',
    locale: 'zh-TW',
    /** Leave headroom at the bottom so the last frames aren't dead space. */
    tailPx: 40,
  },
};

export const VIEWPORTS = [
  // Rendered at a modest CSS viewport and scaled up by deviceScaleFactor, so
  // the output is still 1920x1080 / 720x1280 but the page lays out narrower —
  // text reads bigger in the clip, and the page is proportionally taller, which
  // gives the camera a real distance to travel instead of a 400px nudge.
  { key: 'desktop', width: 1280, height: 720, dsf: 1.5 },
  { key: 'mobile', width: 360, height: 640, dsf: 2 },
];

export const DEFAULT_FRAMES = 140;

export const byId = (id) => SCENES.find((s) => s.id === id);
