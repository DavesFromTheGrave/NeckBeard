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

// "Cursed" subreddits — typing one into the header search spawns a bonus
// pickup on arrival, on top of the normal travel-there behavior.
NB.CURSED_SUBS = {
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