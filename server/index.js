// Devvit production server — the REAL hook.
// Arena data comes from Reddit's first-party server API (no external fetch:
// the sandbox blocks it, and this is better anyway — the arena is built from
// the actual subreddit the post lives in).
// Local dev keeps using game/server.js + reddit-fetch.js; this file only
// runs inside Devvit.
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createServer, getServerPort, context, reddit, redis } from '@devvit/web/server';

const app = new Hono();

function timeAgo(date) {
  const s = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (s < 3600) return `${Math.floor(s / 60)} min. ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr. ago`;
  return `${Math.floor(s / 86400)} d. ago`;
}

function cleanSub(sub) {
  const s = (sub || '').replace(/^\/?r\//i, '').trim();
  return s.replace(/[^a-zA-Z0-9_]/g, '');
}

// p.thumbnail is Reddit's tiny fixed-size crop (often ~140x105) — stretched
// to fill a 190-300px-tall feed card it looks blocky. Some posts render fine
// and others "really low res" because gallery/image posts have a real
// full-size image available (via .gallery or getEnrichedThumbnail()) while
// link/text posts only ever had the small thumbnail to begin with — the
// inconsistency IS the bug. Prefer the highest-res source available, and
// only fall back to the raw thumbnail when nothing better exists.
async function mapPost(p) {
  let img = null;
  const gallery = (() => { try { return p.gallery; } catch { return []; } })();
  if (gallery && gallery.length && gallery[0]?.url) {
    img = gallery[0].url;
  } else {
    try {
      const enriched = await p.getEnrichedThumbnail();
      if (enriched?.image?.url) img = enriched.image.url;
    } catch { /* not all posts have one — fall through */ }
  }
  if (!img && p.thumbnail?.url && p.thumbnail.url.startsWith('http')) img = p.thumbnail.url;
  const hasImage = !!img;
  return {
    id: p.id,
    subreddit: `r/${p.subredditName}`,
    author: `u/${p.authorName}`,
    time: timeAgo(p.createdAt),
    title: p.title || '(untitled)',
    ups: p.score ?? 0,
    num_comments: p.numberOfComments ?? 0,
    has_image: hasImage,
    image_url: img,
    image_label: hasImage ? 'i.redd.it' : 'image',
    image_tall: hasImage && (p.title?.length || 0) < 80,
  };
}

async function buildArena(subRaw) {
  const host = context.subredditName;
  const requested = cleanSub(subRaw);
  // default / 'all' / 'home' = the subreddit this post lives in. THE hook:
  // the arena IS the community that's playing it.
  const isHost = !requested || requested === 'all' || requested === 'home'
    || requested.toLowerCase() === (host || '').toLowerCase();
  const sub = isHost ? host : requested;

  const raw = await reddit.getHotPosts({ subredditName: sub, limit: 25 }).all();
  // keep the arena clean: no NSFW cards, no stickied mod posts, and not the
  // game's own post
  const posts = await Promise.all(raw
    .filter(p => !p.isNsfw?.() && !p.nsfw && !p.stickied && p.id !== context.postId)
    .slice(0, 15)
    .map(mapPost));
  if (!posts.length) throw new Error(`no posts for r/${sub}`);

  // real comments become his projectiles — pulled from the top few posts
  const comments = [];
  for (const p of raw.slice(0, 4)) {
    if (comments.length >= 12) break;
    try {
      const cs = await reddit.getComments({ postId: p.id, limit: 4, depth: 1 }).all();
      for (const c of cs) {
        if (c.body && c.body.length > 2 && c.body !== '[removed]' && c.body !== '[deleted]') {
          comments.push({ author: `u/${c.authorName}`, body: c.body.slice(0, 180) });
        }
        if (comments.length >= 12) break;
      }
    } catch { /* comment fetch is best-effort */ }
  }

  return {
    mode: 'sub',
    subreddit: sub,
    name: `r/${sub}`,
    user: 'u/you',   // per-USER identity is injected in the handler — never cached
    posts,
    comments: comments.length ? comments : posts.slice(0, 6).map(p => ({
      author: p.author, body: p.title.slice(0, 120),
    })),
    popular: [
      { name: `r/${host}`, members: 'home turf' },
      { name: 'r/AskReddit', members: '57.2m' },
      { name: 'r/funny', members: '66.8m' },
      { name: 'r/gaming', members: '47.3m' },
      { name: 'r/todayilearned', members: '41.2m' },
    ],
    source: 'devvit',
  };
}

const cache = new Map();
const CACHE_MS = 90_000;

function fmtMembers(n) {
  if (!Number.isFinite(n) || n <= 0) return 'joined';
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}m`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(n);
}

// The player's OWN communities — superM0D isn't wrecking reddit, he's
// wrecking THEIR reddit. Sidebar + burger drawer read arena `popular`, so
// swapping it here personalizes both with zero client changes. Logged-out
// lurkers keep the stock list.
async function myCommunities() {
  try {
    // Fetch a big pool and SHUFFLE — power users follow hundreds of subs, so a
    // fixed top-N is a samey slice. A shuffled sample makes different corners
    // of THEIR reddit show up each load (it's all theirs to get wrecked).
    const subs = await reddit.getSubscribedSubredditsForCurrentUser({ limit: 200 }).all();
    const pool = subs.filter(s => s && !s.nsfw && s.name && !/^u_/.test(s.name));
    for (let i = pool.length - 1; i > 0; i--) {           // Fisher-Yates
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const mine = pool.slice(0, 16)
      .map(s => ({ name: `r/${s.name}`, members: fmtMembers(s.numberOfSubscribers) }));
    return mine.length ? mine : null;
  } catch { return null; }
}

app.get('/api/arena', async (c) => {
  const sub = c.req.query('sub') || 'all';
  const key = `${context.subredditName}|${sub.toLowerCase()}`;
  const hit = cache.get(key);
  let data = (hit && Date.now() - hit.t < CACHE_MS) ? hit.data : null;
  try {
    if (!data) {
      data = await buildArena(sub);
      cache.set(key, { t: Date.now(), data });
    }
    // Per-USER fields go on AFTER the shared cache — identity and subs must
    // never leak between players on a warm instance.
    const out = { ...data };
    try {
      const name = await reddit.getCurrentUsername();
      if (name) out.user = `u/${name}`;
    } catch { /* logged-out lurker */ }
    const mine = await myCommunities();
    if (mine) {
      const host = context.subredditName;
      out.popular = [
        { name: `r/${host}`, members: 'home turf' },
        ...mine.filter(m => m.name.toLowerCase() !== `r/${(host || '').toLowerCase()}`),
      ];
    }
    return c.json(out);
  } catch (e) {
    return c.json({ error: e.message, sub }, 502);
  }
});

// Moderator menu item (devvit.json): creates the game post in this subreddit.
app.post('/internal/menu/post-create', async (c) => {
  try {
    const post = await reddit.submitCustomPost({
      title: 'superM0D: MA! Someone\'s touching my subreddit!',
      textFallback: { text: 'This post is a game. Open it on new Reddit or the app to play.' },
    });
    return c.json({ navigateTo: post.url });
  } catch (e) {
    return c.json({ showToast: `post failed: ${e.message}` }, 500);
  }
});

// "Who died here" — every catch records the player in a per-subreddit sorted
// set (score = death time). The death screen reads the most recent back for
// the o7 swarm, and the client draws red "died here" pointers on the exact
// POSTS people were caught at. Members are JSON {n,k,p} (name, karma, post
// key); legacy plain-name members from older versions still parse (no post →
// no marker, name still swarms). Unique per (name,post); trimmed to newest
// DEATHS_MAX so it can't grow unbounded.
const DEATHS_MAX = 50;
const deathsKey = () => `deaths:${context.subredditName || 'unknown'}`;
const parseDeath = (member) => {
  try {
    const j = JSON.parse(member);
    if (j && j.n) return { name: j.n, karma: j.k || 0, post: j.p || null };
  } catch { /* legacy plain-name member */ }
  return { name: member, karma: 0, post: null };
};

app.post('/api/death', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    let name = (body.name || 'u/lurker').toString().slice(0, 40);
    if (!/^u\//i.test(name)) name = `u/${name.replace(/^\/?u\//i, '')}`;
    const karma = Math.max(0, Math.floor(Number(body.karma) || 0));
    const post = body.post ? String(body.post).slice(0, 120) : null;
    const key = deathsKey();
    // one entry per (name, post): re-dying on the same card bumps time/karma
    const rows = await redis.zRange(key, 0, -1, { by: 'rank' });
    for (const r of rows) {
      const d = parseDeath(r.member);
      if (d.name === name && d.post === post) await redis.zRem(key, [r.member]);
    }
    await redis.zAdd(key, { member: JSON.stringify({ n: name, k: karma, p: post }), score: Date.now() });
    await redis.zRemRangeByRank(key, 0, -(DEATHS_MAX + 1));   // keep newest DEATHS_MAX
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

app.get('/api/deaths/recent', async (c) => {
  try {
    const rows = await redis.zRange(deathsKey(), 0, 23, { by: 'rank', reverse: true });
    const parsed = rows.map(r => parseDeath(r.member));
    return c.json({
      names: [...new Set(parsed.map(d => d.name))],
      deaths: parsed,
    });
  } catch (e) {
    return c.json({ names: [], deaths: [], error: e.message });
  }
});

// THE LETTERS — per-player hunt progress (B-A-L-D-E-R). Reddit's webview
// walls off localStorage, and the whole multi-run hunt (nobody meets Balder
// before ~run six — the retention design) dies if letters forget between
// sessions. Redis is the truth; the device cache is just warm startup.
const lettersKey = () => `letters:${context.userId || 'anon'}`;

app.get('/api/letters', async (c) => {
  try {
    if (!context.userId) return c.json({ letters: '' });
    return c.json({ letters: (await redis.get(lettersKey())) || '' });
  } catch (e) {
    return c.json({ letters: '', error: e.message });
  }
});

app.post('/api/letters', async (c) => {
  try {
    if (!context.userId) return c.json({ ok: false, error: 'no user' }, 400);
    const body = await c.req.json().catch(() => ({}));
    const ch = (body.letter || '').toString().slice(0, 1).toUpperCase();
    if (!'BALDER'.includes(ch) || !ch) return c.json({ ok: false, error: 'bad letter' }, 400);
    const key = lettersKey();
    const cur = (await redis.get(key)) || '';
    const next = cur.includes(ch) ? cur : cur + ch;
    await redis.set(key, next);
    return c.json({ ok: true, letters: next });
  } catch (e) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

// Karma leaderboard — best run per player, per subreddit. Sorted set holds
// name -> best karma; a hash holds the ban reason that ended that best run.
// Only a HIGHER karma replaces an entry. Trimmed to the top SCORES_MAX.
// (Webviews can't persist localStorage on Reddit — this IS the high-score
// system there; the local board is just the offline fallback.)
const SCORES_MAX = 50;
const scoresKey = () => `scores:${context.subredditName || 'unknown'}`;
const reasonsKey = () => `scorereasons:${context.subredditName || 'unknown'}`;

app.post('/api/score', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    let name = (body.name || 'u/lurker').toString().slice(0, 40);
    if (!/^u\//i.test(name)) name = `u/${name.replace(/^\/?u\//i, '')}`;
    const karma = Math.max(0, Math.floor(Number(body.karma) || 0));
    const reason = (body.reason || '').toString().slice(0, 80);
    if (karma <= 0) return c.json({ ok: false, error: 'no karma' }, 400);
    const key = scoresKey();
    const prev = await redis.zScore(key, name).catch(() => null);
    if (prev != null && prev >= karma) return c.json({ ok: true, best: prev });
    await redis.zAdd(key, { member: name, score: karma });
    await redis.hSet(reasonsKey(), { [name]: reason });
    await redis.zRemRangeByRank(key, 0, -(SCORES_MAX + 1));   // keep the top SCORES_MAX
    return c.json({ ok: true, best: karma });
  } catch (e) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

app.get('/api/leaderboard', async (c) => {
  try {
    const rows = await redis.zRange(scoresKey(), 0, 9, { by: 'rank', reverse: true });
    const names = rows.map(r => r.member);
    let reasons = [];
    if (names.length) reasons = await redis.hMGet(reasonsKey(), names).catch(() => []);
    return c.json({
      sub: context.subredditName || '',
      scores: rows.map((r, i) => ({
        name: r.member,
        karma: Math.floor(r.score),
        reason: (reasons && reasons[i]) || '',
      })),
    });
  } catch (e) {
    return c.json({ sub: context.subredditName || '', scores: [], error: e.message });
  }
});

app.get('/health', (c) => c.json({ ok: true, sub: context.subredditName }));

serve({ fetch: app.fetch, createServer, port: getServerPort() });
