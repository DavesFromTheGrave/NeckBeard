// Fetches live subreddit listings for local dev (`npm run dev:game`, plain
// Node, no Devvit context available). Tries reddit.com JSON first; falls back
// to pullpush.io when Reddit serves the bot wall (common on datacenter IPs);
// falls back to static MOCK_ARENA if both are unreachable, so /api/arena never
// hard-fails and the game always boots into something playable.
//
// The packaged Devvit server (tools/build-devvit.mjs) does NOT use this raw
// scraper — it calls buildArenaViaDevvit() below with the platform's own
// authenticated `reddit` client (@devvit/web/server), which isn't subject to
// the bot-wall/rate-limit problems a public scrape hits.

const UA = 'NeckbeardHackathon/1.0 (Games with a Hook entry; +https://revenantsystems.net)';

function timeAgo(utc) {
  const s = Math.max(1, Math.floor(Date.now() / 1000 - utc));
  if (s < 3600) return `${Math.floor(s / 60)} min. ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr. ago`;
  return `${Math.floor(s / 86400)} d. ago`;
}

function cleanSub(sub) {
  const s = (sub || 'all').replace(/^\/?r\//i, '').trim() || 'all';
  return s.replace(/[^a-zA-Z0-9_]/g, '');
}

function mapPost(d, forceSub) {
  const sub = forceSub ? `r/${forceSub}` : `r/${d.subreddit}`;
  const preview = d.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, '&');
  const thumb = d.thumbnail;
  const hasImage = !!(preview || (thumb && thumb.startsWith('http')));
  return {
    id: d.id,
    subreddit: sub,
    author: `u/${d.author}`,
    time: timeAgo(d.created_utc),
    title: d.title || '(untitled)',
    ups: d.ups ?? 0,
    num_comments: d.num_comments ?? 0,
    has_image: hasImage,
    image_url: preview || (thumb?.startsWith('http') ? thumb : null),
    image_label: preview ? 'i.redd.it' : (d.domain || 'image'),
    image_tall: hasImage && (d.post_hint === 'image' || (d.title?.length || 0) < 80),
  };
}

async function fetchRedditJson(path) {
  const url = `https://www.reddit.com${path}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  const text = await res.text();
  if (!text.trim().startsWith('{') && !text.trim().startsWith('[')) {
    throw new Error('reddit bot wall');
  }
  return JSON.parse(text);
}

async function fetchPullpushSub(sub, limit) {
  const base = 'https://api.pullpush.io/reddit/search/submission/?sort=desc&sort_type=created_utc';
  const url = sub === 'all'
    ? `${base}&size=${limit}`
    : `${base}&subreddit=${encodeURIComponent(sub)}&size=${limit}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`pullpush ${res.status}`);
  const json = await res.json();
  return (json.data || []).map(p => mapPost({
    id: p.id,
    subreddit: p.subreddit,
    author: p.author,
    created_utc: p.created_utc,
    title: p.title,
    ups: p.score,
    num_comments: p.num_comments,
    thumbnail: p.thumbnail,
    preview: p.preview,
    post_hint: p.post_hint,
    domain: p.domain,
  }, sub === 'all' ? null : sub));
}

async function fetchPullpushComments(sub, limit) {
  const url = `https://api.pullpush.io/reddit/search/comment/?subreddit=${encodeURIComponent(sub)}&sort=desc&sort_type=created_utc&size=${limit}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data || []).filter(c => c.body && c.body.length > 2).slice(0, limit).map(c => ({
    author: `u/${c.author}`,
    body: c.body.slice(0, 180),
  }));
}

async function fetchListing(sub, limit = 15) {
  const path = `/r/${sub}/hot.json?limit=${limit}&raw_json=1`;
  try {
    const json = await fetchRedditJson(path);
    const kids = json?.data?.children || [];
    const posts = kids.filter(c => c.kind === 't3').map(c => mapPost(c.data, sub === 'all' ? null : sub));
    if (posts.length) return posts;
  } catch { /* try fallback */ }
  let posts = await fetchPullpushSub(sub, limit);
  if (!posts.length && sub === 'all') {
    const subs = ['AskReddit', 'gaming', 'funny', 'worldnews', 'todayilearned'];
    const chunks = await Promise.all(subs.map(s => fetchPullpushSub(s, 4)));
    posts = chunks.flat().sort((a, b) => (b.ups || 0) - (a.ups || 0)).slice(0, limit);
  }
  return posts;
}

async function fetchCommentsForSub(sub, limit = 12) {
  try {
    const json = await fetchRedditJson(`/r/${sub}/comments.json?limit=${limit}&raw_json=1`);
    const flat = [];
    const walk = (node) => {
      if (!node || flat.length >= limit) return;
      if (node.kind === 't1' && node.data?.body) {
        flat.push({ author: `u/${node.data.author}`, body: node.data.body.slice(0, 180) });
      }
      for (const c of node.data?.replies?.data?.children || []) walk(c);
    };
    for (const c of json?.[1]?.data?.children || []) walk(c);
    if (flat.length) return flat;
  } catch { /* fall through */ }
  return fetchPullpushComments(sub, limit);
}

const POPULAR = [
  { name: 'r/AskReddit', members: '57.2m' },
  { name: 'r/funny', members: '66.8m' },
  { name: 'r/gaming', members: '47.3m' },
  { name: 'r/worldnews', members: '46.1m' },
  { name: 'r/todayilearned', members: '41.2m' },
  { name: 'r/mildlyinteresting', members: '24.1m' },
  { name: 'r/memes', members: '35.4m' },
];

function arenaFrom(listingSub, isHome, posts, comments) {
  return {
    mode: isHome ? 'home' : 'sub',
    subreddit: listingSub,
    name: isHome ? 'reddit' : `r/${listingSub}`,
    user: 'u/you',
    posts,
    comments: comments.length ? comments : posts.slice(0, 6).map(p => ({
      author: p.author,
      body: p.title.slice(0, 120),
    })),
    popular: POPULAR,
  };
}

// Last-resort offline arena — used only when every live source fails, so a
// bad network (or a Reddit/pullpush outage) degrades to "playable demo data"
// instead of a boot failure.
function mockPost(i, sub) {
  const titles = [
    'This community never sleeps, apparently', 'PSA: read the sidebar before posting',
    'Finally beat my personal best', 'Unpopular opinion incoming', 'Found this in the wild, thoughts?',
    'Daily discussion thread', 'Can we talk about this for a second', 'Mods asleep, post pixelated mod',
    'The state of this sub right now', 'Someone had to say it',
  ];
  const authors = ['u/throwaway_acct', 'u/regular_poster', 'u/lurker_no_more', 'u/old_account_2011', 'u/new_here_be_nice'];
  return {
    id: `mock_${sub}_${i}`,
    subreddit: `r/${sub}`,
    author: authors[i % authors.length],
    time: `${(i + 1) * 7} min. ago`,
    title: titles[i % titles.length],
    ups: 1200 - i * 63,
    num_comments: 340 - i * 19,
    has_image: false,
    image_url: null,
    image_label: null,
    image_tall: false,
  };
}

function buildMockArena(subRaw) {
  const sub = cleanSub(subRaw);
  const isHome = sub === 'all' || sub === 'home' || sub === '';
  const listingSub = isHome ? 'all' : sub;
  const posts = Array.from({ length: 12 }, (_, i) => mockPost(i, listingSub));
  const comments = posts.slice(0, 6).map((p, i) => ({
    author: `u/commenter_${i}`,
    body: 'offline demo data — live subreddit fetch was unavailable',
  }));
  return { ...arenaFrom(listingSub, isHome, posts, comments), source: 'mock' };
}

async function buildArena(subRaw) {
  const sub = cleanSub(subRaw);
  const isHome = sub === 'all' || sub === 'home' || sub === '';
  const listingSub = isHome ? 'all' : sub;
  try {
    const [posts, comments] = await Promise.all([
      fetchListing(listingSub, 15),
      fetchCommentsForSub(isHome ? 'all' : sub, 12),
    ]);
    if (!posts.length) throw new Error(`no posts for r/${listingSub}`);
    return { ...arenaFrom(listingSub, isHome, posts, comments), source: 'live' };
  } catch (e) {
    console.warn(`buildArena: live fetch failed for r/${listingSub} (${e.message}), using mock arena`);
    return buildMockArena(subRaw);
  }
}

// Devvit-native path: uses the platform's own authenticated Reddit API client
// (requires `permissions: { reddit: true }` in devvit.json) instead of public
// scraping. `redditClient` is injected (the `reddit` export from
// `@devvit/web/server`) so this file has no hard dependency on Devvit
// packages and keeps working under plain Node for local dev.
async function buildArenaViaDevvit(redditClient, subRaw) {
  const sub = cleanSub(subRaw);
  const isHome = sub === 'all' || sub === 'home' || sub === '';
  const listingSub = isHome ? 'all' : sub;
  try {
    const hotPosts = await redditClient.getHotPosts({ subredditName: listingSub, limit: 15 }).all();
    if (!hotPosts.length) throw new Error(`no posts for r/${listingSub}`);

    const posts = hotPosts.map(p => ({
      id: p.id,
      subreddit: `r/${p.subredditName}`,
      author: `u/${p.authorName}`,
      time: timeAgo(Math.floor(p.createdAt.getTime() / 1000)),
      title: p.title || '(untitled)',
      ups: p.score ?? 0,
      num_comments: p.numberOfComments ?? 0,
      has_image: !!p.thumbnail?.url,
      image_url: p.thumbnail?.url ?? null,
      image_label: 'i.redd.it',
      image_tall: !!p.thumbnail?.url && (p.title?.length || 0) < 80,
    }));

    // getComments() is per-post (there's no subreddit-wide "recent comments"
    // call on RedditAPIClient), so pull a few from the top posts and flatten.
    const commentBatches = await Promise.all(
      hotPosts.slice(0, 4).map(p => redditClient.getComments({ postId: p.id, limit: 4 }).all().catch(() => []))
    );
    const comments = commentBatches.flat()
      .filter(c => c.body && c.body.length > 2)
      .slice(0, 12)
      .map(c => ({ author: `u/${c.authorName}`, body: c.body.slice(0, 180) }));

    return { ...arenaFrom(listingSub, isHome, posts, comments), source: 'live' };
  } catch (e) {
    console.warn(`buildArenaViaDevvit: fetch failed for r/${listingSub} (${e.message}), using mock arena`);
    return buildMockArena(subRaw);
  }
}

module.exports = { buildArena, buildArenaViaDevvit, buildMockArena, cleanSub };