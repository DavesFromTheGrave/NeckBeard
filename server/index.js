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

  let user = 'u/you';
  try {
    const name = await reddit.getCurrentUsername();
    if (name) user = `u/${name}`;
  } catch { /* logged-out lurker */ }

  return {
    mode: 'sub',
    subreddit: sub,
    name: `r/${sub}`,
    user,
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

app.get('/api/arena', async (c) => {
  const sub = c.req.query('sub') || 'all';
  const key = `${context.subredditName}|${sub.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < CACHE_MS) return c.json(hit.data);
  try {
    const data = await buildArena(sub);
    cache.set(key, { t: Date.now(), data });
    return c.json(data);
  } catch (e) {
    return c.json({ error: e.message, sub }, 502);
  }
});

// Moderator menu item (devvit.json): creates the game post in this subreddit.
app.post('/internal/menu/post-create', async (c) => {
  try {
    const post = await reddit.submitCustomPost({
      title: 'NECKBEARD — survive the feed. he never stops.',
      textFallback: { text: 'This post is a game. Open it on new Reddit or the app to play.' },
    });
    return c.json({ navigateTo: post.url });
  } catch (e) {
    return c.json({ showToast: `post failed: ${e.message}` }, 500);
  }
});

// "Who died here" — every catch records the player in a per-subreddit sorted
// set (score = death time). The death screen reads the most recent back for the
// o7 swarm. Unique by name (a re-death just bumps the timestamp); trimmed to the
// newest DEATHS_MAX so it can't grow unbounded.
const DEATHS_MAX = 50;
const deathsKey = () => `deaths:${context.subredditName || 'unknown'}`;

app.post('/api/death', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    let name = (body.name || 'u/lurker').toString().slice(0, 40);
    if (!/^u\//i.test(name)) name = `u/${name.replace(/^\/?u\//i, '')}`;
    const key = deathsKey();
    await redis.zAdd(key, { member: name, score: Date.now() });
    await redis.zRemRangeByRank(key, 0, -(DEATHS_MAX + 1));   // keep newest DEATHS_MAX
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

app.get('/api/deaths/recent', async (c) => {
  try {
    const rows = await redis.zRange(deathsKey(), 0, 23, { by: 'rank', reverse: true });
    return c.json({ names: rows.map(r => r.member) });
  } catch (e) {
    return c.json({ names: [], error: e.message });
  }
});

app.get('/health', (c) => c.json({ ok: true, sub: context.subredditName }));

serve({ fetch: app.fetch, createServer, port: getServerPort() });
