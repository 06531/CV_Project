// The capture side of the scroll-worlds: what to film, and from where.
//
// `kind` decides the source:
//   explainer  scenes/<id>.html, stepped through `window.__setFrame(i, total)`
//   app        a real product booted locally, cut from a list of `shots`;
//              each names a screen defined in scripts/capture-world-frames.mjs
//              and, optionally, the `from`/`to` slice of it to pan across
//
// There used to be a third kind, `remote`: a system we cannot boot, filmed
// through a browser you had signed in yourself, with an anonymisation pass over
// every frame. OTTO was its only user and is drawn now, so the kind, its
// REMOTES table and the ~250 lines that drove it are gone with it.
//
// Frame sequences land in `.frames/<id>-<viewport>/`, clips in `public/world/`.
// Both stages are idempotent — they skip what already exists unless `--force`.
//
// This file used to be a hand-kept twin of `src/data/world.ts` and carried its
// own `playback` field per scene, with a comment shouting that it MUST MATCH
// THE PAGE. Nothing checked that it did. The page is imported instead, and the
// guard at the bottom fails the import if the two sides disagree about which
// scenes exist.
//
// Node ≥22 strips the types out of `world.ts` on its own, so this is a plain
// import. It prints a MODULE_TYPELESS_PACKAGE_JSON perf warning because the
// package is not `"type": "module"`; that is cosmetic and only affects these
// scripts, never the Next build, which does not read this file at all.

import { INTRO_WORLD, PROJECT_WORLDS } from '../src/data/world.ts';

/**
 * @typedef {{ at: string, frames: number, from?: string, to?: string }} Shot
 * @typedef {{ id: string, kind: 'app' | 'explainer', frames?: number,
 *             app?: string, shots?: Shot[], tailPx?: number,
 *             crf?: number }} SceneSpec
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
  // length is a multiple of 8, which is what the desktop GOP was back when a
  // deck could be dragged by the scroll: each cut landed on a keyframe. Every
  // deck plays itself now, so that buys nothing — and costs nothing either.
  {
    // `crf` applies to both viewports. A screen recording of a real product
    // costs several times what a drawn board does at the same quality setting,
    // so the two real-UI scenes are dialled back further than the profile
    // default — see scripts/encode-world-clips.mjs.
    id: 'schedule-tour', kind: 'app', app: 'schedule', frames: 144, tailPx: 40, crf: 27,
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

  // SMC. Explainers for the strictest reason of the five: it is a client's
  // production contact centre and the current job, so there is nothing here it
  // would be right to film even if it could be reached. Drawn from the CV's
  // own description, with every id, queue, path and figure invented.
  { id: 'smc-chat', kind: 'explainer', frames: 160 },
  { id: 'smc-routing', kind: 'explainer', frames: 150 },
  { id: 'smc-report', kind: 'explainer', frames: 150 },

  // TDS eDOC. The opener used to be a film of the real thing, taken off a UAT
  // environment through a signed-in browser and scrubbed of names frame by
  // frame. It is a drawn board now, for the same reason SMC's three are: the
  // system is a former employer's and the data in that environment is a real
  // customer's, however synthetic the environment itself is.
  { id: 'otto-desk', kind: 'explainer', frames: 150 },
  { id: 'otto-flow', kind: 'explainer', frames: 140 },
  { id: 'otto-control', kind: 'explainer', frames: 140 },

  // CMHK's warehouse kiosks. No tour: the app talks to two hard-coded intranet
  // hosts, half its screens only exist because a socket pushed something to
  // them, and two of its modules are native-only — so there is nothing to film
  // even with the source in hand. Drawn from the source instead.
  { id: 'kiosk-flow', kind: 'explainer', frames: 160 },
  { id: 'kiosk-desk', kind: 'explainer', frames: 150 },
  { id: 'kiosk-fleet', kind: 'explainer', frames: 140 },

  // Startie. Nothing left to film: both deployments are gone (ems.s7yr0.com
  // and api.s7yr0.com no longer resolve) and the repo was never pushed. These
  // are drawn from the four CV pages, which carry the settings rail, the VIP
  // tiers and a full architecture diagram between them.
  { id: 'startie-setup', kind: 'explainer', frames: 160 },
  { id: 'startie-money', kind: 'explainer', frames: 150 },
  { id: 'startie-stack', kind: 'explainer', frames: 140 },
];

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

// ------------------------------------------------- derived from the page

/**
 * Every scene the site shows, from both decks.
 *
 * Nothing is scrubbed any more — the index opener plays itself just like a case
 * study does — so this no longer decides a keyframe density. It is the page's
 * half of the cross-check below.
 */
const SHOWN = new Set(
  [...INTRO_WORLD, ...Object.values(PROJECT_WORLDS).flat()].map((s) => s.id),
);

// A scene has to exist on both sides or it is a mistake in one of them, and
// both mistakes are quiet. Checked here, at import, so any script that touches
// the manifest reports it before doing an hour of work.
{
  const shot = new Set(SCENES.map((s) => s.id));
  const shown = SHOWN;
  const missing = [...shown].filter((id) => !shot.has(id));
  const orphaned = [...shot].filter((id) => !shown.has(id));
  const problems = [
    ...missing.map((id) => `  '${id}' is in src/data/world.ts but has no capture recipe here`),
    ...orphaned.map((id) => `  '${id}' is filmed here but no deck in src/data/world.ts shows it`),
  ];
  if (problems.length) {
    throw new Error(`scenes/manifest.mjs and src/data/world.ts disagree:\n${problems.join('\n')}`);
  }
}
