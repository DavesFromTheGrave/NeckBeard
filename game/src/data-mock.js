// Arena data — always fetched from /api/arena (local proxy or Devvit server).
window.NB = window.NB || {};

NB.fetchArena = function (sub) {
  const q = sub ? `?sub=${encodeURIComponent(sub)}` : '';
  return fetch(`/api/arena${q}`).then(r => {
    if (!r.ok) return r.json().then(j => { throw new Error(j.error || `arena ${r.status}`); });
    return r.json();
  });
};

// Back-compat alias used by main.js boot
NB.fetchSubreddit = function (sub) { return NB.fetchArena(sub); };