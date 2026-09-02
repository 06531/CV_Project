// Drops the frame sequences that have already been encoded.
//
// `.frames/` is the intermediate: ~150 PNGs per scene per viewport, and it runs
// to hundreds of megabytes once every scene has been shot. It is gitignored and
// nothing serves from it — the only reason to keep a sequence is to re-encode
// it without re-shooting, which is worth having right after a capture and worth
// nothing once the clip is out.
//
// A sequence is only removed when its clip exists AND is newer, so this can
// never delete frames that have not been encoded yet, nor frames that were
// re-shot after the last encode.
//
// Usage: node scripts/clean-frames.mjs [--dry-run]

import { readdirSync, rmSync, statSync } from 'node:fs';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRAMES = path.join(root, '.frames');
const OUT = path.join(root, 'public', 'world');

const dryRun = process.argv.includes('--dry-run');

if (!existsSync(FRAMES)) {
  console.log('no .frames — nothing to clean');
  process.exit(0);
}

/** `<id>-desktop` / `<id>-mobile`, matching capture-world-frames.mjs. */
const SUFFIX = { desktop: '.mp4', mobile: '-m.mp4' };

/** Newest mtime in a directory — a sequence is as new as its last frame. */
function newestMtime(dir) {
  return readdirSync(dir).reduce((max, f) => {
    const t = statSync(path.join(dir, f)).mtimeMs;
    return t > max ? t : max;
  }, 0);
}

function size(dir) {
  return readdirSync(dir).reduce((sum, f) => sum + statSync(path.join(dir, f)).size, 0);
}

let freed = 0;
let kept = 0;

for (const entry of readdirSync(FRAMES)) {
  const dir = path.join(FRAMES, entry);
  if (!statSync(dir).isDirectory()) continue;

  const match = entry.match(/^(.*)-(desktop|mobile)$/);
  if (!match) {
    console.log(`  keep    ${entry} (does not look like <id>-<viewport>)`);
    kept++;
    continue;
  }
  const [, id, viewport] = match;
  const clip = path.join(OUT, `${id}${SUFFIX[viewport]}`);

  if (!existsSync(clip)) {
    console.log(`  keep    ${entry} — not encoded yet`);
    kept++;
    continue;
  }
  if (statSync(clip).mtimeMs < newestMtime(dir)) {
    console.log(`  keep    ${entry} — re-shot since the clip was made, re-encode first`);
    kept++;
    continue;
  }

  const bytes = size(dir);
  freed += bytes;
  console.log(`  ${dryRun ? 'would  ' : 'remove '} ${entry} (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
  if (!dryRun) rmSync(dir, { recursive: true, force: true });
}

console.log(
  `\n${dryRun ? 'would free' : 'freed'} ${(freed / 1024 / 1024).toFixed(1)} MB · kept ${kept} sequence(s)`,
);
