// Fetches live subreddit listings for local dev. Tries reddit.com JSON first;
// falls back to pullpush.io when Reddit serves the bot wall (common on datacenter IPs).
// Devvit production replaces this with @devvit/web server reddit client.

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

async function buildArena(subRaw) {
  const sub = cleanSub(subRaw);
  const isHome = sub === 'all' || sub === 'home' || sub === '';
  const listingSub = isHome ? 'all' : sub;
  const [posts, comments] = await Promise.all([
    fetchListing(listingSub, 15),
    fetchCommentsForSub(isHome ? 'all' : sub, 12),
  ]);
  if (!posts.length) throw new Error(`no posts for r/${listingSub}`);

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
    source: 'live',
  };
}

module.exports = { buildArena, cleanSub };