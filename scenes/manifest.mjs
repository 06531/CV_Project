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

  // TDS eDOC (OTTO). The tour films a system we cannot boot locally, so it
  // attaches to a browser you have already signed in — see REMOTES.
  { id: 'otto-tour', kind: 'remote', remote: 'otto', frames: 140, crf: 27 },
  { id: 'otto-flow', kind: 'explainer', frames: 140 },
  { id: 'otto-control', kind: 'explainer', frames: 140 },
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

/**
 * Systems we cannot boot locally, filmed through a browser you have already
 * signed in yourself. Start it with:
 *
 *   open -na "Google Chrome" --args --remote-debugging-port=9222 \
 *     --user-data-dir="$HOME/.chrome-otto"
 *
 * …log in there once, then run the capture. No password ever reaches this repo.
 *
 * `anonymise` runs in the page before the first frame. The UAT data is already
 * synthetic, so this only rewrites the names that would otherwise identify a
 * real customer, office or account.
 */
export const REMOTES = {
  otto: {
    cdp: 'http://localhost:9222',
    url: 'https://tlkboxuat.tradelinksig.com/scm-sms/home.do',
    /** The app is a frameset; everything worth filming is in this one. */
    frame: 'main-frame',
    /** The document grid has painted by the time this exists. */
    settleSelector: '.ui-jqgrid-bdiv',
    /** The grid body scrolls, the document does not — pan this instead. */
    scrollSelector: '.ui-jqgrid-bdiv',
    /**
     * Filmed at the aspect the scroll-world will show it at, so `object-cover`
     * has nothing to crop. 1920x1080 lost the folder tree off the left edge on
     * a 16:10 screen; a desktop app squeezed into a phone-width viewport lost
     * half the grid off the right.
     */
    viewports: { desktop: { width: 1728, height: 1080 }, mobile: { width: 1200, height: 2133 } },
    /** Sanity check: if we are looking at the CAS login page, stop. */
    signedInText: 'Shipment Management',
    /** Applied to every text node in every frame, in order. */
    anonymise: [
      ['Oi-China', 'Test-China'],
      ['Oi China', 'Test-China'],
      ['Oi Bangladesh', 'Test Bangladesh'],
      ['Oi Turkey', 'Test Turkey'],
      ['New Light', 'Demo Trader'],
      ['newlight', 'demo'],
      // Any party id, not just the ones this account happens to show.
      [/\b\d{4,6}\.TL\b/g, '10042.TL'],
    ],
    /**
     * Digit runs this long or longer are rewritten to same-length nonsense.
     * The named rules above cannot reach the party number buried inside a
     * composite key like `3HKTLK000000000048968000005FNY`; this can.
     */
    maskDigits: 5,
    /**
     * Whole columns replaced, rather than values matched. A blocklist only
     * catches the names you already know about, and this grid turned out to
     * carry partner and customer names nobody listed. Cells are filled from
     * these lists by row index, so the column still looks like data.
     */
    maskColumns: {
      Office: ['Test HK', 'Test Shanghai', 'Test Dhaka', 'Test Izmir'],
      'Customer Code': ['TST', 'DMO', 'EXM'],
      'Party ID Name': ['Demo Trader', 'Demo Exports Ltd', 'Demo Logistics'],
    },
    /** Nothing from this list may survive into a frame. */
    forbidden: [
      'Oi-China', 'Oi China', 'Oi Bangladesh', 'Oi Turkey', 'Oi ',
      'MELCOSA', 'OAGN', 'MANTRA',
      '48968', '48009', 'newlight', 'New Light',
    ],
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
