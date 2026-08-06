// Encodes the captured frame sequences into scroll-scrubbable MP4s, one pair
// (desktop + mobile) per scene in `scenes/manifest.mjs`.
//
// The one setting that matters is `-g 8` (a keyframe every 8 frames). Scrubbing
// seeks constantly, and a seek costs "decode every frame since the last
// keyframe" — at ffmpeg's default GOP of 250 that is up to 249 frames per seek,
// which stutters badly on phones. Short GOPs trade ~3-5x file size for instant
// seeks, so the clips are kept to a few seconds each.
//
// Also emits a poster JPEG per scene: the scroll-world shows it until the video
// paints its first real frame (and it is the only visual under reduced-motion).
//
// Usage: node scripts/encode-world-clips.mjs [--force] [--only=id,id]

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCENES } from '../scenes/manifest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRAMES = path.join(root, '.frames');
const OUT = path.join(root, 'public', 'world');

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
  { vp: 'desktop', suffix: '', scale: null, gop: 8, crf: 26 },
  { vp: 'mobile', suffix: '-m', scale: '720:-2', gop: 4, crf: 28 },
];

function ffmpeg(args) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });
}

function mb(file) {
  return (statSync(file).size / 1024 / 1024).toFixed(1);
}

/** How many of the encoded frames are keyframes — the scrub-smoothness check. */
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

  // Posters come from the desktop sequence's first frame.
  const poster = path.join(OUT, `${scene.id}.jpg`);
  if (!force && existsSync(poster)) {
    console.log(`  skip    ${scene.id}.jpg (exists)`);
    continue;
  }
  const first = path.join(FRAMES, `${scene.id}-desktop`, '0001.png');
  if (!existsSync(first)) continue;
  ffmpeg(['-i', first, '-q:v', '4', poster]);
  console.log(`  poster  ${scene.id}.jpg — ${mb(poster)} MB`);
}
