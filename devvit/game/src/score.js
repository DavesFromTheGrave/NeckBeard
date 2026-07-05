// Personal best — localStorage now; Devvit redis swap at /api/score later.
window.NB = window.NB || {};

NB.SCORE_KEY = 'neckbeard_pb_ms';

NB.getPersonalBest = function () {
  try {
    return parseInt(localStorage.getItem(NB.SCORE_KEY) || '0', 10) || 0;
  } catch {
    return 0;
  }
};

NB.savePersonalBest = function (ms) {
  const prev = NB.getPersonalBest();
  const val = Math.floor(ms);
  if (val <= prev) return false;
  try { localStorage.setItem(NB.SCORE_KEY, String(val)); } catch { /* private mode */ }
  return true;
};

NB.fmtTime = function (ms) {
  return `${(ms / 1000).toFixed(1)}s`;
};