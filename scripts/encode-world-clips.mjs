// Encodes the captured frame sequences into MP4s, one pair (desktop + mobile)
// per scene in `scenes/manifest.mjs`.
//
// The GOP is set for how these clips are actually watched: AutoWorld calls
// video.play() and never seeks, so a keyframe every second is plenty. It used
// to depend on the deck — the index was dragged by the scroll, and a scrubbed
// clip seeks constantly, which costs "decode every frame since the last
// keyframe" and stutters on phones unless keyframes are 8 (desktop) or 4
// (mobile) frames apart, for 3-5x the file size. Nothing is scrubbed now, and
// those extra keyframes would be bytes nobody ever decodes.
//
// It is not a quality setting: same CRF, same resolution either way.
//
// Also emits two JPEGs per scene, and which frame each comes from is the whole
// point of having two:
//
//   <id>.jpg        frame one. Sits behind the clip until the video paints, so
//                   it has to be exactly what the film opens on.
//   <id>-still.jpg  the last frame. An explainer draws its board over the
//                   length of the clip, so frame one is a title over an empty
//                   stage — useless as a picture of the scene. This is the
//                   finished board, and it is what stands in for the scene
//                   where no film is going to play at all (reduced motion).
//
// And for the two projects with no screenshots at all — see BOARD_SHOT_WORLDS
// in src/data/world.ts — that same last frame is cropped to the board and
// written into public/portfolio/ as the project's gallery.
//
// Usage: node scripts/encode-world-clips.mjs [--force] [--only=id,id]

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCENES } from '../scenes/manifest.mjs';
import { BOARD_SHOT_WORLDS, PROJECT_WORLDS } from '../src/data/world.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRAMES = path.join(root, '.frames');
const OUT = path.join(root, 'public', 'world');
const GALLERY_OUT = path.join(root, 'public', 'portfolio');

/**
 * scene id -> the gallery tile it is also the picture for.
 *
 * Deck order is tile order, which is the same order `boardGallery` in
 * src/data/cv.ts lists them in — one list on both sides.
 */
const GALLERY = new Map(
  BOARD_SHOT_WORLDS.flatMap((slug) =>
    (PROJECT_WORLDS[slug] ?? []).map((scene, i) => [scene.id, `${slug}-${i + 1}.jpg`]),
  ),
);

/**
 * The board, cut out of the 1920x1080 frame.
 *
 * `#stage` in scenes/scene.css pads 11vh at the top and 32vh at the bottom, to
 * keep the board clear of the site's sticky header and of the scrim the
 * scroll-world lays its copy on. Nothing covers those bands in a gallery tile,
 * so an uncropped still is a board with a third of the picture empty under it.
 *
 * One rectangle for every scene rather than each board's own box, because the
 * gallery tile is a fixed `aspect-[2.56/1]` and anything else would be cropped
 * again on the page — arbitrarily. So this is the union of the six boards plus
 * a margin: the widest (otto-flow, 1550px) and the tallest (smc-routing, 557px)
 * both sit inside it with room for their shadow. Widen it if a new board grows
 * past that; a board that does not fit gets its edge cut here, silently.
 */
const BOARD_CROP = { w: 1600, h: 626, x: 160, y: 108 };

const force = process.argv.includes('--force');
const onlyArg = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];
const only = onlyArg ? new Set(onlyArg.split(',')) : null;

const FPS = 30;

/**
 * Per-viewport encode profile. `suffix` matches `src/data/world.ts`.
 *
 * The CRFs are set for what these clips actually are: flat, near-vector
 * explainer boards, which x264 encodes almost for free. Dropping the desktop
 * profile from 20 to 26 took a third off every explainer with no visible
 * difference at 2x magnification on the smallest type in the scenes — the
 * monospace chips. The real-UI captures do not behave the same way and carry
 * their own `crf` in scenes/manifest.mjs.
 */
const PROFILES = [
  { vp: 'desktop', suffix: '', scale: null, gop: 30, crf: 26 },
  { vp: 'mobile', suffix: '-m', scale: '720:-2', gop: 30, crf: 28 },
];

function ffmpeg(args) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });
}

function mb(file) {
  return (statSync(file).size / 1024 / 1024).toFixed(1);
}

/** How many of the encoded frames are keyframes — the GOP, measured. */
function keyframeCount(file) {
  const csv = execFileSync(
    'ffprobe',
    [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'frame=key_frame',
      '-of', 'csv=p=0',
      file,
    ],
    { encoding: 'utf8' },
  );
  // ffprobe sometimes emits a trailing separator per row — `1,` rather than
  // `1` — which silently made every clip look like it had no keyframes at all.
  const frames = csv.trim().split('\n').map((f) => f.trim().replace(/,+$/, ''));
  return { total: frames.length, keys: frames.filter((f) => f === '1').length };
}

try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'pipe' });
} catch {
  console.error('ffmpeg not found. Install it with `brew install ffmpeg`, then retry.');
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

const wanted = SCENES.filter((s) => !only || only.has(s.id));
if (wanted.length === 0) {
  console.error('--only matched no scene in scenes/manifest.mjs');
  process.exit(1);
}

for (const scene of wanted) {
  for (const profile of PROFILES) {
    const dir = path.join(FRAMES, `${scene.id}-${profile.vp}`);
    const dest = path.join(OUT, `${scene.id}${profile.suffix}.mp4`);

    if (!existsSync(dir) || readdirSync(dir).length === 0) {
      console.error(
        `  MISSING ${path.relative(root, dir)} — run \`npm run assets:world:capture\` first`,
      );
      process.exitCode = 1;
      continue;
    }
    if (!force && existsSync(dest)) {
      console.log(`  skip    ${path.basename(dest)} (exists)`);
      continue;
    }

    const filters = ['scale=trunc(iw/2)*2:trunc(ih/2)*2'];
    if (profile.scale) filters.unshift(`scale=${profile.scale}`);

    ffmpeg([
      '-framerate', String(FPS),
      '-i', path.join(dir, '%04d.png'),
      '-vf', filters.join(','),
      '-c:v', 'libx264',
      '-preset', 'slow',
      // A scene may ask for a lower quality: a full-resolution screen recording
      // of a dense enterprise grid costs several times what a drawn explainer
      // does, for a beat that is on screen for less than one screen of scroll.
      '-crf', String(scene.crf ?? profile.crf),
      '-g', String(profile.gop),
      '-keyint_min', String(profile.gop),
      '-sc_threshold', '0',      // don't let scene detection stretch the GOP
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-an',
      dest,
    ]);

    const { total, keys } = keyframeCount(dest);
    console.log(
      `  encode  ${path.basename(dest)} — ${mb(dest)} MB, ${total} frames, ` +
        `${keys} keyframes (every ~${(total / keys).toFixed(1)})`,
    );
  }

  // Both JPEGs come off the desktop sequence — the first frame and the last.
  const dir = path.join(FRAMES, `${scene.id}-desktop`);
  const frames = existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith('.png')).sort()
    : [];
  if (frames.length === 0) continue;

  for (const [name, frame] of [
    [`${scene.id}.jpg`, frames[0]],
    [`${scene.id}-still.jpg`, frames[frames.length - 1]],
  ]) {
    const out = path.join(OUT, name);
    if (!force && existsSync(out)) {
      console.log(`  skip    ${name} (exists)`);
      continue;
    }
    ffmpeg(['-i', path.join(dir, frame), '-q:v', '4', out]);
    console.log(`  poster  ${name} — ${mb(out)} MB`);
  }

  const tile = GALLERY.get(scene.id);
  if (!tile) continue;
  const tileOut = path.join(GALLERY_OUT, tile);
  if (!force && existsSync(tileOut)) {
    console.log(`  skip    ${tile} (exists)`);
    continue;
  }
  const { w, h, x, y } = BOARD_CROP;
  ffmpeg([
    '-i', path.join(dir, frames[frames.length - 1]),
    '-vf', `crop=${w}:${h}:${x}:${y}`,
    '-q:v', '4',
    tileOut,
  ]);
  console.log(`  gallery ${tile} — ${mb(tileOut)} MB`);
}
