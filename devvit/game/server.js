// Dev server: static game files + /api/arena subreddit proxy (zero browser deps).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { buildArena } = require('./reddit-fetch');

const ROOT = __dirname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png',
               '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
               '.json': 'application/json', '.css': 'text/css',
               '.otf': 'font/otf', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2' };
const arenaCache = new Map();
const CACHE_MS = 90_000;

function parseQuery(raw) {
  const q = {};
  for (const part of (raw.split('?')[1] || '').split('&')) {
    if (!part) continue;
    const [k, v] = part.split('=');
    q[decodeURIComponent(k)] = decodeURIComponent(v || '');
  }
  return q;
}

function sendJson(res, code, obj) {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(obj));
}

async function handleArena(req, res) {
  const sub = parseQuery(req.url).sub || 'all';
  const key = sub.toLowerCase();
  const hit = arenaCache.get(key);
  if (hit && Date.now() - hit.t < CACHE_MS) return sendJson(res, 200, hit.data);

  try {
    const data = await buildArena(sub);
    arenaCache.set(key, { t: Date.now(), data });
    sendJson(res, 200, data);
  } catch (e) {
    console.error('arena error', sub, e.message);
    sendJson(res, 502, { error: e.message, sub });
  }
}

function serveStatic(req, res) {
  const url = req.url.split('?')[0];
  const file = path.join(ROOT, url === '/' ? 'index.html' : url);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('nope'); }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store, must-revalidate',
    });
    res.end(data);
  });
}

http.createServer((req, res) => {
  if (req.url.startsWith('/api/arena')) return handleArena(req, res);
  serveStatic(req, res);
}).listen(4181, () => console.log('neckbeard-devvit on :4181 (api: /api/arena?sub=gaming)'));