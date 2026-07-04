// Reddit new-layout design tokens (shreddit home feed, 2025–2026).
// Matched to reddit.com: canvas gray, white cards, orangered brand, vote column.
window.NB = window.NB || {};

NB.REDDIT = {
  canvas: '#f2f4f5',
  card: '#ffffff',
  border: '#edeff1',
  text: '#1a1a1b',
  textWeak: '#576f76',
  meta: '#787c7e',
  brand: '#ff4500',
  brandWord: '#ff4500',
  upvote: '#d93900',
  downvote: '#7193ff',
  link: '#0079d3',
  searchBg: '#f6f7f8',
  searchBorder: '#edeff1',
  navActive: '#fff4e5',
  navActiveText: '#ff4500',
  pillBg: '#0079d3',
  premium: '#ff4500',
  font: 'Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif',
  headerH: 56,
  voteW: 40,
  feedMaxW: 640,
  leftNavW: 272,
  rightRailW: 312,
  cardRadius: 12,
  postGap: 10,
};

// Deterministic subreddit avatar colors (Reddit uses per-sub tints).
NB.subColor = function (name) {
  let h = 0;
  const s = (name || '').replace(/^r\//, '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const palette = ['#ff4500', '#0079d3', '#46d160', '#ffa500', '#7e53c1', '#ff585b', '#24a0ed', '#7193ff'];
  return palette[h % palette.length];
};

NB.subAbbr = function (name) {
  const s = (name || '').replace(/^r\//, '');
  return s.length <= 2 ? s.toUpperCase() : s.slice(0, 2).toUpperCase();
};