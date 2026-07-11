// Dev server: static game files + /api/arena subreddit proxy (zero browser deps).
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { buildArena } = require('./reddit-fetch');

// Real home-LAN IPv4(s) so other devices on the same router can reach the game.
// Deliberately EXCLUDES link-local (169.254.x) dead adapters and 172.x virtual
// switches (Hyper-V/WSL). Prefers 192.168.x, then 10.x — the normal home ranges.
function lanAddrs() {
  const out = [];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces || []) {
      if (i.family !== 'IPv4' || i.internal) continue;
      if (i.address.startsWith('169.254.') || i.address.startsWith('172.')) continue;
      out.push(i.address);
    }
  }
  const rank = (ip) => ip.startsWith('192.168.') ? 0 : ip.startsWith('10.') ? 1 : 2;
  return out.sort((a, b) => rank(a) - rank(b));
}

const ROOT = __dirname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png',
               '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
               '.json': 'application/json', '.css': 'text/css',
               '.otf': 'font/otf', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2' };
const arenaCache = new Map();
const CACHE_MS = 90_000;
const UA = 'NeckbeardHackathon/1.0 (Games with a Hook; +https://revenantsystems.net)';

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
  if (hit && Date.now() - hit.t < CACHE_MS) return sendJson(res, 200, { ...hit.data, popular: MOCK_JOINED });

  try {
    const data = await buildArena(sub);
    arenaCache.set(key, { t: Date.now(), data });
    sendJson(res, 200, { ...data, popular: MOCK_JOINED });
  } catch (e) {
    console.error('arena error', sub, e.message);
    // pullpush flakes in waves (429/502) and used to hard-brick local dev at
    // boot. Serve the stale cache if one exists, else the canned offline
    // arena — the stage set must never go dark. (Real Reddit uses Reddit's
    // own API server-side, never this path.)
    if (hit) return sendJson(res, 200, { ...hit.data, popular: MOCK_JOINED });
    sendJson(res, 200, { ...cannedArena(sub), popular: MOCK_JOINED });
  }
}

// Deterministic offline arena — the local-dev life raft when pullpush is
// down. Neutral filler titles (stage-set dressing, same idea as MOCK_JOINED).
const CANNED_TITLES = [
  ['What is a skill everyone should learn before 30?', 48210, 5120],
  ['My cat learned to open the fridge and now nothing is safe', 31800, 2210],
  ['TIL honey never spoils if stored sealed', 27400, 1430],
  ['This intersection has been under construction for 11 years', 19850, 3980],
  ['I built a mechanical keyboard out of an old typewriter', 15200, 890],
  ['What screams "I peaked in high school"?', 41200, 7600],
  ['The way this bridge fog rolled in this morning', 8900, 240],
  ['My grandfather\'s toolbox, untouched since 1988', 23100, 1120],
  ['Update: the HOA lost. We kept the flamingos.', 52400, 4310],
  ['Physics teacher demonstrates conservation of momentum, regrets it', 17300, 950],
  ['A wild fox follows my mail carrier every day', 26800, 1500],
  ['What is the most useless fact you know?', 33500, 9100],
];
function cannedArena(subRaw) {
  const sub = (subRaw || 'all').toLowerCase().replace(/^r\//, '');
  const isHome = sub === 'all' || sub === 'home' || sub === '';
  const listing = isHome ? 'all' : sub;
  const posts = CANNED_TITLES.map(([title, ups, com], i) => ({
    id: `canned-${listing}-${i}`,
    subreddit: listing,
    author: `u/local_${i}`,
    time: `${((i * 37) % 55) + 4} min. ago`,
    title, ups, num_comments: com,
    has_image: false, image_url: null, image_label: 'image', image_tall: false,
  }));
  return {
    mode: isHome ? 'home' : 'sub',
    subreddit: listing,
    name: isHome ? 'reddit' : `r/${listing}`,
    user: 'u/you',
    posts,
    comments: posts.slice(0, 8).map(p => ({ author: p.author, body: p.title.slice(0, 120) })),
    source: 'canned',
  };
}

// Local stand-in for the Devvit "player's own subscriptions" list — prod
// swaps arena `popular` for getSubscribedSubredditsForCurrentUser().
const MOCK_JOINED = [
  { name: 'r/neckbeard_dev', members: 'home turf' },
  { name: 'r/programming', members: '6.4m' }, { name: 'r/synthesizers', members: '412k' },
  { name: 'r/blacksmithing', members: '1.1m' }, { name: 'r/homelab', members: '2.3m' },
  { name: 'r/cats', members: '4.8m' }, { name: 'r/mechanicalkeyboards', members: '1.3m' },
  { name: 'r/woodworking', members: '3.1m' }, { name: 'r/retrogaming', members: '900k' },
  { name: 'r/coffee', members: '2.0m' }, { name: 'r/DIY', members: '22m' },
  { name: 'r/pcmasterrace', members: '11m' }, { name: 'r/gardening', members: '6.7m' },
  { name: 'r/whisky', members: '480k' }, { name: 'r/vinyl', members: '1.9m' },
  { name: 'r/hiking', members: '2.4m' },
];

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

// Image proxy: fetch reddit-hosted images server-side and serve same-origin,
// so the canvas can use them without CORS taint. Host-allowlisted (no SSRF).
const IMG_HOSTS = /(^|\.)(redd\.it|redditmedia\.com|imgur\.com|redditstatic\.com)$/i;
async function handleImg(req, res) {
  const u = parseQuery(req.url).u;
  let url;
  try { url = new URL(u); } catch { res.writeHead(400); return res.end('bad url'); }
  if (url.protocol !== 'https:' || !IMG_HOSTS.test(url.hostname)) {
    res.writeHead(403); return res.end('host not allowed');
  }
  try {
    const r = await fetch(url.href, { headers: { 'User-Agent': UA } });
    if (!r.ok) { res.writeHead(502); return res.end('img fetch failed'); }
    const buf = Buffer.from(await r.arrayBuffer());
    res.writeHead(200, {
      'Content-Type': r.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(buf);
  } catch (e) {
    res.writeHead(502); res.end('img error');
  }
}

// "Who died here" — in-memory stand-in for the Devvit redis sorted set (local
// dev has no subreddit context, so it's one global list). Unique by name,
// newest last, capped like the real thing.
const deaths = [];
function recordDeath(name, karma, post) {
  const n = (name || 'u/lurker').toString().slice(0, 40);
  const i = deaths.findIndex(d => d.name === n);
  if (i >= 0) deaths.splice(i, 1);
  deaths.push({
    name: n,
    karma: Math.max(0, Math.floor(Number(karma) || 0)),
    post: post ? String(post).slice(0, 120) : null,   // → the red "died here" pointer
    t: Date.now(),
  });
  if (deaths.length > 50) deaths.splice(0, deaths.length - 50);
}
function readBody(req) {
  return new Promise((resolve) => {
    let d = '';
    req.on('data', c => { d += c; if (d.length > 1e5) { d = ''; req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}
async function handleDeath(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'POST only' });
  const body = await readBody(req);
  recordDeath(body.name, body.karma, body.post);
  sendJson(res, 200, { ok: true });
}
function handleDeathsRecent(req, res) {
  const recent = deaths.slice(-24).reverse();
  sendJson(res, 200, {
    names: recent.map(d => d.name),
    deaths: recent.map(d => ({ name: d.name, karma: d.karma || 0, post: d.post || null })),
  });
}

// Karma leaderboard — in-memory stand-in for the Devvit redis version.
// Best run per name; only a higher karma replaces an entry.
const scores = new Map();   // name -> { karma, reason }
async function handleScore(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'POST only' });
  const body = await readBody(req);
  let name = (body.name || 'u/lurker').toString().slice(0, 40);
  if (!/^u\//i.test(name)) name = `u/${name.replace(/^\/?u\//i, '')}`;
  const karma = Math.max(0, Math.floor(Number(body.karma) || 0));
  const reason = (body.reason || '').toString().slice(0, 80);
  if (karma <= 0) return sendJson(res, 400, { ok: false, error: 'no karma' });
  const prev = scores.get(name);
  if (!prev || karma > prev.karma) scores.set(name, { karma, reason });
  sendJson(res, 200, { ok: true, best: Math.max(karma, prev ? prev.karma : 0) });
}
function handleLeaderboard(req, res) {
  const rows = [...scores.entries()]
    .map(([name, v]) => ({ name, karma: v.karma, reason: v.reason }))
    .sort((a, b) => b.karma - a.karma)
    .slice(0, 10);
  sendJson(res, 200, { sub: 'local_dev', scores: rows });
}

const handler = (req, res) => {
  if (req.url.startsWith('/api/arena')) return handleArena(req, res);
  if (req.url.startsWith('/api/img')) return handleImg(req, res);
  if (req.url.startsWith('/api/deaths/recent')) return handleDeathsRecent(req, res);
  if (req.url.startsWith('/api/death')) return handleDeath(req, res);
  if (req.url.startsWith('/api/score')) return handleScore(req, res);
  if (req.url.startsWith('/api/leaderboard')) return handleLeaderboard(req, res);
  serveStatic(req, res);
};

// Bind ONLY to loopback (you) + the real home-LAN address(es) (your son on the
// same router). NOT 0.0.0.0 — no virtual/VPN adapters, nothing else.
const PORT = 4181;
const hosts = ['127.0.0.1', ...lanAddrs()];
for (const host of hosts) {
  http.createServer(handler).listen(PORT, host, () => {
    const label = host === '127.0.0.1' ? '(you)' : '(share this with your son)';
    console.log(`neckbeard on http://${host}:${PORT}  ${label}`);
  });
}