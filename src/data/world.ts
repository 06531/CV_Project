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
  /** Frame one. Shown behind the clip until the video paints. */
  poster: string;
  /**
   * Last frame — the finished board, not the empty stage the film opens on.
   * This is the scene under reduced motion, where nothing is going to draw
   * itself and a still has to carry the whole explanation on its own.
   */
  still: string;
  /** Links to the portfolio entry this scene is about, if any. */
  project?: ProjectSlug;
}

const scene = (
  id: string,
  kind: WorldScene['kind'],
  /** Only `project` is left here, and no deck sets it today: a scene inside a
   *  case study is already on that project's page. */
  rest: Omit<WorldScene, 'id' | 'kind' | 'clip' | 'clipMobile' | 'poster' | 'still'> = {},
): WorldScene => ({
  id,
  kind,
  clip: `/world/${id}.mp4`,
  clipMobile: `/world/${id}-m.mp4`,
  poster: `/world/${id}.jpg`,
  still: `/world/${id}-still.jpg`,
  ...rest,
});

/** The deck that opens `/portfolio` — how the work gets made, not what it is. */
export const INTRO_WORLD: WorldScene[] = [
  scene('agents', 'explainer'),
  scene('agents-handoff', 'explainer'),
  // The first two both have a person in them. This one is the work that runs
  // when there isn't one.
  scene('agents-unattended', 'explainer'),
];

/** One deck per project, played at the top of its case study. */
export const PROJECT_WORLDS: Partial<Record<ProjectSlug, WorldScene[]>> = {
  schedule: [
    // The product is real, here it is — six screens, cut rather than panned,
    // from the public directory through to the platform admin. Longer than the
    // single page it replaced, but still the shortest of the three.
    scene('schedule-tour', 'app'),
    scene('schedule-tenancy', 'explainer'),
    scene('schedule-booking', 'explainer'),
  ],
  // Explainers for the strictest reason of the five: SMC is a client's
  // production contact centre, so there is nothing here it would be right to
  // film. Every id, queue and path in the three is invented.
  smc: [
    scene('smc-chat', 'explainer'),
    scene('smc-routing', 'explainer'),
    scene('smc-report', 'explainer'),
  ],
  // Explainers, for the same reason as SMC's: the platform is a former
  // employer's, and the environment that could be reached is a real customer's
  // data in a test database. The opener was a film of it once; the desk in it
  // is drawn now, folder id and all.
  otto: [
    scene('otto-desk', 'explainer'),
    scene('otto-flow', 'explainer'),
    scene('otto-control', 'explainer'),
  ],
  // All three are explainers — the kiosks run against an intranet WMS this
  // repo cannot reach, so there is no tour beat to open with. The device in
  // the first two is a mock of the real unit, drawn from its source.
  kiosk: [
    scene('kiosk-flow', 'explainer'),
    scene('kiosk-desk', 'explainer'),
    scene('kiosk-fleet', 'explainer'),
  ],
  // Explainers too, for a harder reason than the kiosks': both of Startie's
  // deployments are gone and the repo was never pushed, so the four pages of
  // the CV are the only surviving record of it.
  startie: [
    scene('startie-setup', 'explainer'),
    scene('startie-money', 'explainer'),
    scene('startie-stack', 'explainer'),
  ],
};

/**
 * Projects whose gallery is these boards rather than screenshots.
 *
 * `scripts/encode-world-clips.mjs` cuts `public/portfolio/<slug>-N.jpg` out of
 * each scene's last frame, in deck order, and `PROJECTS` in `cv.ts` builds its
 * image list off the same deck — so the pictures on the page and the pictures
 * on disk cannot drift apart, and adding a scene adds a gallery tile.
 *
 * Both entries are here for the same reason: neither system is mine to film.
 * SMC is a client's production contact centre; OTTO is a former employer's
 * platform, and the one environment that can be reached holds a real
 * customer's data however synthetic that environment is called.
 */
export const BOARD_SHOT_WORLDS = ['smc', 'otto'] as const satisfies readonly ProjectSlug[];
