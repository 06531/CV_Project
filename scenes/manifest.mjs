// The capture-side twin of `src/data/world.ts`: what to film, and from where.
//
// `kind` decides the source:
//   explainer  scenes/<id>.html, stepped through `window.__setFrame(i, total)`
//   app        a real product booted locally, cut from a list of `shots`;
//              each names a screen defined in scripts/capture-world-frames.mjs
//              and, optionally, the `from`/`to` slice of it to pan across
//   remote     a system we cannot boot, filmed through a browser you signed in
//
// Frame sequences land in `.frames/<id>-<viewport>/`, clips in `public/world/`.
// Both stages are idempotent — they skip what already exists unless `--force`.

/**
 * @typedef {{ at: string, frames: number, from?: string, to?: string }} Shot
 * @typedef {{ id: string, kind: 'app' | 'explainer' | 'remote', frames?: number,
 *             app?: string, shots?: Shot[], tailPx?: number,
 *             remote?: string, crf?: number }} SceneSpec
 */

/** @type {SceneSpec[]} */
export const SCENES = [
  // /portfolio's opener — how the work gets made, in two beats.
  { id: 'agents', kind: 'explainer', frames: 160 },
  { id: 'agents-handoff', kind: 'explainer', frames: 160 },

  // Multi-tenant course scheduling platform. Cut from six shots rather than
  // panned down one page: the single page this used to film spent half the clip
  // on a contact card and an embedded map, and never left the public site.
  //
  // Most of these screens fit a desktop viewport whole, so the motion comes
  // from the cuts rather than the pans — which is the point. Every shot's
  // length is a multiple of the desktop GOP (8) so each cut lands on a keyframe
  // and scrubbing stays sharp across it; see scripts/encode-world-clips.mjs.
  {
    id: 'schedule-tour', kind: 'app', app: 'schedule', frames: 144, tailPx: 40,
    shots: [
      // Many schools, one deployment — the tenancy claim, stated visually.
      { at: 'directory', frames: 24 },
      // Starting at the calendar heading, so the contact card and the embedded
      // map above it — half of what the old single-page pan showed — are never
      // in frame.
      { at: 'company', frames: 24, from: '.row-between' },
      // What a parent actually does: read the class, take the seat.
      { at: 'course', frames: 32 },
      // Then the two sides behind a login — the school's, and the platform's.
      { at: 'teacher-courses', frames: 24 },
      { at: 'teacher-qr', frames: 16 },
      // Ending on the companies table: four tenants, four slugs, one install.
      { at: 'platform', frames: 24, to: '.admin-table' },
    ],
  },
  { id: 'schedule-tenancy', kind: 'explainer', frames: 140 },
  { id: 'schedule-booking', kind: 'explainer', frames: 140 },

  // TDS eDOC (OTTO). The tour films a system we cannot boot locally, so it
  // attaches to a browser you have already signed in — see REMOTES.
  { id: 'otto-tour', kind: 'remote', remote: 'otto', frames: 140, crf: 27 },
  { id: 'otto-flow', kind: 'explainer', frames: 140 },
  { id: 'otto-control', kind: 'explainer', frames: 140 },

  // CMHK's warehouse kiosks. No tour: the app talks to two hard-coded intranet
  // hosts, half its screens only exist because a socket pushed something to
  // them, and two of its modules are native-only — so there is nothing to film
  // even with the source in hand. Drawn from the source instead.
  { id: 'kiosk-flow', kind: 'explainer', frames: 160 },
  { id: 'kiosk-desk', kind: 'explainer', frames: 150 },
  { id: 'kiosk-fleet', kind: 'explainer', frames: 140 },
];

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
      ['43230.TL', 'Test001.TL'],
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
      '48968', '48009', 'newlight', 'New Light', '43230'
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
