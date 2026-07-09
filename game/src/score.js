// Scores — the score is KARMA farmed in a run. Top-5 + personal best in
// localStorage now; Devvit redis swap at /api/score later (the title screen's
// HIGH SCORE panel maps 1:1 onto the future subreddit leaderboard).
window.NB = window.NB || {};

// Posts farmed this run (`sub|key`), so a stolen post can't be re-farmed —
// persists within a run (across sub-travel), cleared on a new round.
NB.FARM_STORE = NB.FARM_STORE || new Set();

NB.SCORE_KEY = 'neckbeard_karma_best';
NB.TOP5_KEY = 'neckbeard_karma_top5';

// A score entry is { karma, reason } — the run's karma plus the ban reason that
// ended it (shown in the title's Points | Ban Reason board). Old saves stored
// bare numbers; normScore upgrades them on read so history survives.
function normScore(e) {
  if (typeof e === 'number' && e > 0) return { karma: Math.floor(e), reason: '' };
  if (e && typeof e === 'object' && Number.isFinite(e.karma) && e.karma > 0) {
    return { karma: Math.floor(e.karma), reason: String(e.reason || '') };
  }
  return null;
}

NB.getTopScores = function () {
  try {
    const raw = JSON.parse(localStorage.getItem(NB.TOP5_KEY) || '[]');
    const list = (Array.isArray(raw) ? raw : []).map(normScore).filter(Boolean);
    return list.sort((a, b) => b.karma - a.karma).slice(0, 5);
  } catch {
    return [];
  }
};

NB.getPersonalBest = function () {
  try {
    const top = NB.getTopScores();
    const fromTop = top.length ? top[0].karma : 0;
    const legacy = parseInt(localStorage.getItem(NB.SCORE_KEY) || '0', 10) || 0;
    return Math.max(fromTop, legacy);
  } catch {
    return 0;
  }
};

// Returns true when this run set a NEW personal best (rank 1).
NB.savePersonalBest = function (karma, reason) {
  const val = Math.floor(karma);
  if (val <= 0) return false;
  const prev = NB.getPersonalBest();
  const top = NB.getTopScores();
  top.push({ karma: val, reason: String(reason || '').replace(/^Reason:\s*/i, '').trim() });
  try {
    localStorage.setItem(NB.TOP5_KEY, JSON.stringify(top.sort((a, b) => b.karma - a.karma).slice(0, 5)));
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
