// Reddit 2026 (shreddit) design tokens — BOTH themes, matched to the
// player's own Reddit appearance via prefers-color-scheme (the Reddit app
// webview reflects the app theme there). ?theme=light|dark overrides for
// testing. Spec source: Dave's live screenshots, 2026-07-05.
window.NB = window.NB || {};

NB.REDDIT_DARK = {
  mode: 'dark',
  canvas: '#0e1113',        // page background
  card: '#14181b',          // post hover / raised surfaces
  cardRaised: '#181c1f',    // rail cards, highlight tiles
  border: '#26292b',
  divider: '#1f2326',
  text: '#f0f3f4',
  textWeak: '#8ba2ad',
  meta: '#82959b',
  brand: '#ff4500',
  brandWord: '#ffffff',     // dark mode: white "reddit" wordmark
  upvote: '#d93900',
  downvote: '#6a5cff',
  link: '#6fa3ff',
  searchBg: '#1f2428',
  searchBorder: '#333638',
  navActive: '#1f2428',
  navActiveText: '#f0f3f4',
  pillBg: '#0045ac',
  btnPrimary: '#d93900',
  premium: '#ff4500',
  spoilerBg: '#000000',
  imgBg: '#000000',
  skeleton: '#1f2428',
  hudText: '#d7dadc',
  wreckCrack: '#aab6bc',
  wreckOverlay: 0x000000,
  wreckOverlayAlpha: 0.4,
  debris: [0x3a4247, 0x565f66, 0x262d31],
};

NB.REDDIT_LIGHT = {
  mode: 'light',
  canvas: '#ffffff',
  card: '#f6f8f9',
  cardRaised: '#f6f8f9',
  border: '#e3e6e8',
  divider: '#ebedef',
  text: '#181c1f',
  textWeak: '#576f76',
  meta: '#5c6c74',
  brand: '#ff4500',
  brandWord: '#ff4500',
  upvote: '#d93900',
  downvote: '#6a5cff',
  link: '#0a449b',
  searchBg: '#eaedef',
  searchBorder: '#e3e6e8',
  navActive: '#eaedef',
  navActiveText: '#181c1f',
  pillBg: '#0045ac',
  btnPrimary: '#d93900',
  premium: '#ff4500',
  spoilerBg: '#0e1113',
  imgBg: '#0e1113',
  skeleton: '#eaedef',
  hudText: '#181c1f',
  wreckCrack: '#6b7280',
  wreckOverlay: 0x0b1416,
  wreckOverlayAlpha: 0.16,
  debris: [0xc8ccd0, 0x9aa0a4, 0xe3e5e8],
};

// Shared metrics (theme-independent). Fonts bumped per Dave: "WAY too small".
const SHARED = {
  font: 'Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif',
  headerH: 64,
  feedMaxW: 756,
  leftNavW: 290,
  rightRailW: 340,
  cardRadius: 16,
  postGap: 6,
  fsTitle: 20,       // post title
  fsMeta: 14,        // sub • time row
  fsAction: 14,      // vote / comment / share row
  fsNav: 15,         // left-nav items
  fsSection: 12,     // GAMES ON REDDIT etc. headers
  fsRail: 14,        // right-rail entries
  fsBanner: 30,      // r/name on sub banner
};

NB.initTheme = function () {
  const q = new URLSearchParams(location.search).get('theme');
  const dark = q ? q === 'dark'
    : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  NB.REDDIT = Object.assign({}, SHARED, dark ? NB.REDDIT_DARK : NB.REDDIT_LIGHT);
  return NB.REDDIT;
};
NB.initTheme();

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

NB.fmtCount = function (n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
};
