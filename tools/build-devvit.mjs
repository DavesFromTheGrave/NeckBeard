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

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dest, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

rim(path.join(ROOT, 'dist'));
copyDir(GAME, CLIENT);

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

fs.mkdirSync(SERVER, { recursive: true });
fs.copyFileSync(path.join(GAME, 'reddit-fetch.js'), path.join(SERVER, 'reddit-fetch.cjs'));

const serverEntry = `const { Hono } = require('hono');
const { serve } = require('@hono/node-server');
const { createServer, getServerPort, reddit } = require('@devvit/web/server');
const { buildArenaViaDevvit } = require('./reddit-fetch.cjs');

const app = new Hono();
const cache = new Map();
const CACHE_MS = 90_000;

app.get('/api/arena', async (c) => {
  const sub = c.req.query('sub') || 'all';
  const key = sub.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < CACHE_MS) return c.json(hit.data);
  // buildArenaViaDevvit never throws — it falls back to a static mock arena
  // internally, so this route always returns 200 with playable data.
  const data = await buildArenaViaDevvit(reddit, sub);
  cache.set(key, { t: Date.now(), data });
  return c.json(data);
});

app.get('/health', (c) => c.json({ ok: true }));

serve({ fetch: app.fetch, createServer, port: getServerPort() });
`;
fs.writeFileSync(path.join(SERVER, 'index.cjs'), serverEntry);

console.log('devvit build ok → dist/client + dist/server');