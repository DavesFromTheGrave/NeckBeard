// Copies the plain-JS Phaser game into dist/client + bundles a minimal Devvit server.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const GAME = path.join(ROOT, 'game');
const CLIENT = path.join(ROOT, 'dist', 'client');
const SERVER = path.join(ROOT, 'dist', 'server');

// IDEMPOTENT BUILD — devvit playtest's watcher sees dist/ writes as source
// changes; a delete-and-rewrite build loops it forever (rebuild → upload →
// "AppVersion already exists" → EADDRINUSE). Only touch files whose bytes
// actually changed so a no-op rebuild makes zero writes.
function writeIfChanged(dest, buf) {
  const data = typeof buf === 'string' ? Buffer.from(buf) : buf;
  if (fs.existsSync(dest)) {
    const old = fs.readFileSync(dest);
    if (old.equals(data)) return false;
  }
  fs.writeFileSync(dest, data);
  return true;
}

function copyFileIfChanged(src, dest) {
  return writeIfChanged(dest, fs.readFileSync(src));
}

// Dev-only stuff must NOT ship in the client bundle (node_modules alone
// would blow the upload size).
const CLIENT_EXCLUDE = new Set([
  'node_modules', 'package.json', 'package-lock.json',
  'server.js', 'reddit-fetch.js', 'test-boot.mjs',
]);

function copyDir(src, dest, exclude) {
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    if (exclude && exclude.has(ent.name)) continue;
    const s = path.join(src, ent.name);
    const d = path.join(dest, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else copyFileIfChanged(s, d);
  }
}

copyDir(GAME, CLIENT, CLIENT_EXCLUDE);

const index = fs.readFileSync(path.join(CLIENT, 'index.html'), 'utf8');
writeIfChanged(path.join(CLIENT, 'game.html'), index);

// splash-client.js imports @devvit/web/client (a bare npm specifier) --
// browsers can't resolve that without bundling, so it has to go through
// esbuild same as the server entry, not be shipped as raw source.
const esbuild = await import('esbuild');
const splashResult = await esbuild.build({
  entryPoints: [path.join(ROOT, 'game', 'splash-client.js')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  outfile: path.join(CLIENT, 'splash-client.js'),
  logLevel: 'warning',
  write: false,
});
for (const f of splashResult.outputFiles) writeIfChanged(f.path, Buffer.from(f.contents));

writeIfChanged(path.join(CLIENT, 'splash.html'), `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>superM0D</title>
<style>
  *{box-sizing:border-box}body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(160deg,#1a1a1b 0%,#2d1b2e 55%,#1a1a1b 100%);color:#fff;font-family:Courier New,monospace}
  .card{text-align:center;padding:24px;max-width:420px}
  h1{margin:0 0 8px;font-size:28px;letter-spacing:1px}
  p{margin:0;color:#d7dadc;font-size:14px;line-height:1.5}
  #play-button{margin-top:18px;background:#ff4500;color:#fff;border:none;border-radius:20px;
  padding:12px 28px;font-family:Courier New,monospace;font-size:14px;font-weight:bold;
  letter-spacing:0.5px;cursor:pointer;}
  #play-button:active{background:#d93900}
</style></head><body>
<div class="card">
  <h1>superM0D</h1>
  <p>Survive inside the feed. The mod never stops chasing your finger.</p>
  <button id="play-button">expand to play</button>
</div>
<script src="splash-client.js"></script>
</body></html>`);

// Real Devvit server lives in server/ (ESM source). The sandbox does NOT
// npm-install anything — hono/@devvit must be BUNDLED into one file
// (matches Reddit's own template: esbuild, cjs, node).
const result = await esbuild.build({
  entryPoints: [path.join(ROOT, 'server', 'index.js')],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'es2023',
  outfile: path.join(SERVER, 'index.js'),
  logLevel: 'warning',
  write: false, // we diff-write to keep the playtest watcher quiet
});
fs.mkdirSync(SERVER, { recursive: true });
for (const f of result.outputFiles) writeIfChanged(f.path, Buffer.from(f.contents));

console.log('devvit build ok → dist/client + dist/server');