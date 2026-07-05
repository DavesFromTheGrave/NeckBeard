// Copies the plain-JS Phaser game into dist/client + bundles a minimal Devvit server.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const GAME = path.join(ROOT, 'game');
const CLIENT = path.join(ROOT, 'dist', 'client');
const SERVER = path.join(ROOT, 'dist', 'server');

function rim(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
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
    else fs.copyFileSync(s, d);
  }
}

rim(path.join(ROOT, 'dist'));
copyDir(GAME, CLIENT, CLIENT_EXCLUDE);

const index = fs.readFileSync(path.join(CLIENT, 'index.html'), 'utf8');
fs.writeFileSync(path.join(CLIENT, 'game.html'), index);
fs.writeFileSync(path.join(CLIENT, 'splash.html'), `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Neckbeard</title>
<style>
  *{box-sizing:border-box}body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(160deg,#1a1a1b 0%,#2d1b2e 55%,#1a1a1b 100%);color:#fff;font-family:Courier New,monospace}
  .card{text-align:center;padding:24px;max-width:420px}
  h1{margin:0 0 8px;font-size:28px;letter-spacing:1px}
  p{margin:0;color:#d7dadc;font-size:14px;line-height:1.5}
  .tag{margin-top:18px;color:#ff4500;font-size:12px}
</style></head><body>
<div class="card">
  <h1>NECKBEARD</h1>
  <p>Survive inside the feed. The mod never stops chasing your finger.</p>
  <p class="tag">expand to play · Games with a Hook</p>
</div>
</body></html>`);

// Real Devvit server lives in server/ (ESM — @devvit/web is ESM-only, a CJS
// require() of it dies at bundle time). It uses the first-party reddit API;
// the external-fetch reddit-fetch.js stays local-dev only.
copyDir(path.join(ROOT, 'server'), SERVER);

console.log('devvit build ok → dist/client + dist/server');