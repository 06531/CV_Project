// Runs every verification check against one server, and reports all of them.
//
// The checks each boot their own browser but they all want the same production
// server, so this starts it once, runs them in turn, and shuts it down. Before
// this, `npm run check` chained npm scripts that each assumed somebody had
// already run `next start -p 3001` in another terminal.
//
// A failing check does not stop the run. Finding out that the mobile film is
// broken only after fixing the desktop one, one round trip at a time, is the
// slow way to do it — so every check runs and the summary at the end lists all
// of them.
//
// Individual checks are still their own npm scripts (`npm run check:case` and
// friends) for when you are iterating on one; those want a server you started.
//
// Usage: node scripts/check-all.mjs [--only=index,case,assets]

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './lib/serve.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const onlyArg = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];
const only = onlyArg ? new Set(onlyArg.split(',')) : null;

/**
 * `group` is what `--only` matches on, so one flag covers both viewports.
 *
 * Both decks play themselves, so both are checked by case-check.mjs — the
 * index deck under `--only=index`, a case study's under `--only=case`. They
 * are separate groups because they are separate decks with separate failures,
 * not because they are watched differently.
 */
const CHECKS = [
  { name: 'index   desktop', group: 'index', script: 'case-check.mjs', args: (o) => [`${o}/en/portfolio`, 'desktop'] },
  { name: 'index   mobile', group: 'index', script: 'case-check.mjs', args: (o) => [`${o}/en/portfolio`, 'mobile'] },
  { name: 'case    desktop', group: 'case', script: 'case-check.mjs', args: (o) => [`${o}/en/portfolio/schedule`, 'desktop'] },
  { name: 'case    mobile', group: 'case', script: 'case-check.mjs', args: (o) => [`${o}/en/portfolio/schedule`, 'mobile'] },
  { name: 'assets', group: 'assets', script: 'asset-check.mjs', args: (o) => [o] },
];

const wanted = CHECKS.filter((c) => !only || only.has(c.group));
if (wanted.length === 0) {
  console.error(`--only matched nothing. Groups: ${[...new Set(CHECKS.map((c) => c.group))].join(', ')}`);
  process.exit(1);
}

/** Inherits stdio: each check's own output is the useful part when it fails. */
function run(script, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(root, 'scripts', script), ...args], {
      cwd: root,
      stdio: 'inherit',
    });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

const { origin, stop } = await serve();

const results = [];
try {
  for (const check of wanted) {
    console.log(`\n${'='.repeat(64)}\n${check.name}\n${'='.repeat(64)}`);
    const code = await run(check.script, check.args(origin));
    results.push({ ...check, code });
  }
} finally {
  await stop();
}

console.log(`\n${'='.repeat(64)}`);
for (const r of results) console.log(`${r.code === 0 ? 'PASS' : 'FAIL'}  ${r.name}`);

const failed = results.filter((r) => r.code !== 0);
if (failed.length) {
  console.error(`\n${failed.length} of ${results.length} checks failed.`);
  process.exit(1);
}
console.log(`\nAll ${results.length} checks passed.`);
