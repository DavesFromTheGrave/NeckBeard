// Scores — the score is KARMA farmed in a run. Top-5 + personal best in
// localStorage now; Devvit redis swap at /api/score later (the title screen's
// HIGH SCORE panel maps 1:1 onto the future subreddit leaderboard).
window.NB = window.NB || {};

// Posts farmed this run (`sub|key`), so a stolen post can't be re-farmed —
// persists within a run (across sub-travel), cleared on a new round.
NB.FARM_STORE = NB.FARM_STORE || new Set();

NB.SCORE_KEY = 'neckbeard_karma_best';
NB.TOP5_KEY = 'neckbeard_karma_top5';

NB.getPersonalBest = function () {
  try {
    return parseInt(localStorage.getItem(NB.SCORE_KEY) || '0', 10) || 0;
  } catch {
    return 0;
  }
};

NB.getTopScores = function () {
  try {
    const raw = JSON.parse(localStorage.getItem(NB.TOP5_KEY) || '[]');
    const list = Array.isArray(raw) ? raw.filter(n => Number.isFinite(n) && n > 0) : [];
    // seed from the old single personal best so upgrades keep history
    const pb = NB.getPersonalBest();
    if (pb > 0 && !list.includes(pb)) list.push(pb);
    return list.sort((a, b) => b - a).slice(0, 5);
  } catch {
    return [];
  }
};

// Returns true when this run set a NEW personal best (rank 1).
NB.savePersonalBest = function (ms) {
  const val = Math.floor(ms);
  if (val <= 0) return false;
  const prev = NB.getPersonalBest();
  const top = NB.getTopScores();
  top.push(val);
  try {
    localStorage.setItem(NB.TOP5_KEY, JSON.stringify(top.sort((a, b) => b - a).slice(0, 5)));
    if (val > prev) localStorage.setItem(NB.SCORE_KEY, String(val));
  } catch { /* private mode */ }
  return val > prev;
};

NB.fmtTime = function (ms) {
  return `${(ms / 1000).toFixed(1)}s`;
};

// Karma score formatting: 1234 -> "1,234", 12300 -> "12.3k"
NB.fmtKarma = function (v) {
  v = Math.round(v || 0);
  if (v >= 100000) return `${Math.round(v / 1000)}k`;
  if (v >= 10000) return `${(v / 1000).toFixed(1)}k`;
  return v.toLocaleString('en-US');
};
