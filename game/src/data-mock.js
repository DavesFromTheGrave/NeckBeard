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

// "Who died here" — record this death and read back recent ones for the o7
// swarm. Both best-effort: a failure just falls back to flavor names, never
// blocks the death screen. Server keys deaths per-subreddit (Devvit) / global
// (local dev stub).
NB.postDeath = function (name, karma, post) {
  try {
    fetch('/api/death', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, karma: Math.round(karma || 0), post: post || null }),
    }).catch(() => {});
  } catch { /* best-effort */ }
};
NB.fetchRecentDeaths = function () {
  return fetch('/api/deaths/recent')
    .then(r => (r.ok ? r.json() : { names: [] }))
    .then(d => (Array.isArray(d.names) ? d.names : []))
    .catch(() => []);
};
// Full death records (name + karma + which post they died on) — feeds the
// red-pointer "died here" markers drawn on the posts themselves. Older
// server entries have no post and are simply skipped by the renderer.
NB.fetchDeathMarkers = function () {
  return fetch('/api/deaths/recent')
    .then(r => (r.ok ? r.json() : { deaths: [] }))
    .then(d => (Array.isArray(d.deaths) ? d.deaths : []))
    .catch(() => []);
};

// Karma leaderboard — best-effort like deaths. On Reddit this is the ONLY
// persistent high-score store (webview storage is sandboxed away); locally
// the title board just keeps the device's saves if these fail.
NB.postScore = function (name, karma, reason) {
  if (!(karma > 0)) return;   // zero-karma runs don't chart (server 400s them anyway)
  try {
    fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        karma: Math.round(karma || 0),
        reason: (reason || '').toString().replace(/^Reason:\s*/i, '').slice(0, 80),
      }),
    }).catch(() => {});
  } catch { /* best-effort */ }
};
NB.fetchLeaderboard = function () {
  return fetch('/api/leaderboard')
    .then(r => (r.ok ? r.json() : {}))
    .then(d => ({
      sub: (d && d.sub) || '',
      scores: (d && Array.isArray(d.scores)) ? d.scores : [],
    }))
    .catch(() => ({ sub: '', scores: [] }));
};

// "Cursed" subreddits — typing one into the header search spawns a bonus
// pickup on arrival, on top of the normal travel-there behavior.
NB.CURSED_SUBS = {
  cursed: 'THE CURSE FAVORS YOU',            // the letter-chain entry (letters.js)
  cursedcomments: 'CURSED COMMENTS FOUND HIM OUT',
  cursedimages: 'A CURSED IMAGE BLINDS HIM',
  oddlyterrifying: 'SOMETHING ODDLY TERRIFYING STIRS',
  nonononoyes: 'NO NO NO NO... YES',
  whatcouldgowrong: 'WHAT COULD GO WRONG DID',
  softwaregore: 'HIS CODE THROWS AN EXCEPTION',
  crappydesign: 'CRAPPY DESIGN CONFUSES HIM',
  ihadastroke: 'READING THAT GAVE HIM A STROKE',
  facepalm: 'FACEPALM.EXE',
  shitposting: 'PURE UNFILTERED SHITPOST ENERGY',
};