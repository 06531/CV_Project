// Starts the production server the checks run against, and stops it after.
//
// Every check needs `next start -p 3001` — not `next dev`, because dev does not
// hot-reload messages/*.json and copy has to be verified against a real build.
// That used to be the reader's job: run the checks with nothing listening and
// all five printed "start the server first" and gave up.
//
// If something is already listening on the port this attaches to it and leaves
// it alone on the way out. That is the common case while iterating — you have a
// server up in another terminal, and having `npm run check` kill it would be a
// worse surprise than starting one.

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { CHECK_ORIGIN, CHECK_PORT } from './browser.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** A 200 from the origin means the server is up and has served a real page. */
async function responds(origin, timeoutMs = 2000) {
  try {
    const res = await fetch(`${origin}/en`, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Returns `{ origin, stop }`. `stop()` is a no-op when the server was not ours.
 *
 * @param {{ port?: number, timeoutMs?: number }} [options]
 */
export async function serve({ port = CHECK_PORT, timeoutMs = 90_000 } = {}) {
  const origin = `http://localhost:${port}`;

  if (await responds(origin)) {
    console.log(`server  already listening on ${port} — using it, and leaving it running`);
    return { origin, stop: async () => {} };
  }

  if (!existsSync(path.join(root, '.next'))) {
    console.error('no .next build to serve — run `npm run build` first');
    process.exit(1);
  }

  console.log(`server  starting next start -p ${port}`);
  // Its own process group, so `stop()` can take down whatever `next start`
  // spawned underneath it rather than orphaning the listener on the port.
  const child = spawn('npx', ['next', 'start', '-p', String(port)], {
    cwd: root,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  /** Kept so a server that dies during startup can say why. */
  let log = '';
  child.stdout.on('data', (b) => (log += b));
  child.stderr.on('data', (b) => (log += b));

  let exited = null;
  child.on('exit', (code) => (exited = code));

  const stop = async () => {
    if (exited !== null) return;
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      /* already gone */
    }
  };
  // Ctrl-C during a check should not leave a server holding the port.
  const onSignal = () => {
    void stop();
    process.exit(130);
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (exited !== null) {
      console.error(`next start exited with ${exited} before serving:\n${log}`);
      process.exit(1);
    }
    if (await responds(origin)) {
      console.log(`server  up on ${port}`);
      return { origin, stop };
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  console.error(`next start did not answer on ${port} within ${timeoutMs / 1000}s:\n${log}`);
  await stop();
  process.exit(1);
}

export { CHECK_ORIGIN, CHECK_PORT };
