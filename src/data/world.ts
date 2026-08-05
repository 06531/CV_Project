// Scenes of the scroll-worlds. Structure only — every line of prose lives
// under `portfolio.world.scenes.<id>` in messages/{locale}.json.
//
// Two kinds of scene, and the balance between them is deliberate: the real UI
// gets one short beat to prove the thing exists, then the explainers get the
// room, because what a screenshot cannot show is how the system is put
// together. `scenes/manifest.mjs` is the capture-side twin of this file.
//
// The clips are produced by `npm run assets:world`; see scripts/ for how.

import type { ProjectSlug } from '@/data/cv';

export interface WorldScene {
  /** i18n id under `portfolio.world.scenes`, and the clip's basename. */
  id: string;
  /** 'app' — frames captured off the running product. 'explainer' — off `scenes/<id>.html`. */
  kind: 'app' | 'explainer';
  clip: string;
  /** Lighter, shorter-GOP encode served to phones. */
  clipMobile: string;
  /** Shown until the video paints, and the only visual under reduced-motion. */
  poster: string;
  /** How many viewport-heights of scroll this scene occupies. */
  scroll: number;
  /**
   * 0..1 — remaps scroll to clip time so the camera settles mid-scene, right
   * where the copy peaks, and moves quicker near the seams. 0 = linear.
   */
  linger: number;
  /** Links to the portfolio entry this scene is about, if any. */
  project?: ProjectSlug;
}

const scene = (id: string, kind: WorldScene['kind'], rest: Omit<WorldScene, 'id' | 'kind' | 'clip' | 'clipMobile' | 'poster'>): WorldScene => ({
  id,
  kind,
  clip: `/world/${id}.mp4`,
  clipMobile: `/world/${id}-m.mp4`,
  poster: `/world/${id}.jpg`,
  ...rest,
});

/** The deck that opens `/portfolio` — how the work gets made, not what it is. */
export const INTRO_WORLD: WorldScene[] = [
  scene('agents', 'explainer', { scroll: 2.1, linger: 0.35 }),
  scene('agents-handoff', 'explainer', { scroll: 1.9, linger: 0.35 }),
];

/** One deck per project, played at the top of its case study. */
export const PROJECT_WORLDS: Partial<Record<ProjectSlug, WorldScene[]>> = {
  schedule: [
    // Short: the product is real, here it is. Then get out of the way.
    scene('schedule-tour', 'app', { scroll: 0.9, linger: 0.25 }),
    scene('schedule-tenancy', 'explainer', { scroll: 1.7, linger: 0.4 }),
    scene('schedule-booking', 'explainer', { scroll: 1.7, linger: 0.4 }),
  ],
  otto: [
    // TODO: put `scene('otto-tour', 'app', { scroll: 0.9, linger: 0.25 })` back
    // in front once its clips exist. Filming it needs a Chrome signed in to the
    // UAT — see REMOTES in scenes/manifest.mjs.
    scene('otto-flow', 'explainer', { scroll: 1.7, linger: 0.4 }),
    scene('otto-control', 'explainer', { scroll: 1.7, linger: 0.4 }),
  ],
};

/** Seam dissolve width, in viewport heights. */
export const WORLD_CROSSFADE = 0.12;

/**
 * Trailing band, in viewport heights, where the whole stage dissolves before
 * the sticky container lets go. Without it the last frame is still at full
 * opacity when the browser starts scrolling the stage away, and the reader
 * gets half a picture sliding over the page beneath it.
 */
export const WORLD_OUTRO_VH = 0.6;

/** Total track height, in viewport heights, including the outro band. */
export function worldHeightVh(scenes: WorldScene[]) {
  return scenes.reduce((sum, s) => sum + s.scroll, 0) + WORLD_OUTRO_VH;
}
