// Contextual meme-audio layer + the looping bed.
// At key game moments a random meme voice-clip fires. NO PILE-UP: if a meme
// clip is already playing, new ones are skipped until it ends (the base synth
// sfx in sfx.js are separate and unaffected — those still layer freely).
// The bed (game-bed.mp3) loops the whole run and DUCKS when a clip punches in.
// Ids map to game/assets/memes/audio/<id>.mp3 (loaded as memeaudio-<id>);
// the bed loads as 'game-bed'. Dave picks WHEN; the pools are the WHICH.
window.NB = window.NB || {};

// ONE CHAOS POOL (Dave, 2026-07-10: "I want every meme able to launch
// everywhere"). Every shipped clip is eligible at every moment — the moment
// name only marks WHEN something fires, never WHICH. Excluded by explicit
// order only: 'yakety-sax' and the ENTIRE dat boi meme — 'oh-shit-waddup',
// 'dat-boi', AND 'here-com-dat-boi' are all the same banned soundbite under
// different ids (Dave caught it live 2026-07-10; do not re-add any of them).
// With a 57-clip shuffle cycle nothing repeats until all 57 have played
// (the "OH BABY A TRIPLE 10x a run" fix, taken to its logical extreme).
NB.MOMENT_SFX_ALL = [
  'aint-nobody', 'all-your-base', 'anime-wow', 'another-one', 'back-up-terry',
  'badger-badger', 'banana-phone', 'bing-bing-bong', 'bruh', 'carl-kills',
  'challenging-me', 'combo-breaker', 'damn-boy', 'do-it', 'fbi-open-up',
  'fuck-this-shit', 'gnome', 'gta-wasted', 'ha-ha', 'hell-naw',
  'jason-bourne', 'jebaited', 'jeopardy', 'john-cena', 'kaboom', 'keyboard-cat',
  'lol-u-died', 'look-at-this-dude', 'lotta-damage', 'my-name-is-jeff', 'no-god-no',
  'notice-me-senpai', 'nyan-cat', 'oh-baby-a-triple', 'one-does-not-simply', 'over-9000',
  'overdrive', 'piece-of-garbage', 'rickroll', 'run-meme-song', 'sad-tune', 'sheesh',
  'shoop-da-whoop', 'shuffling', 'stonks', 'that-escalated', 'they-ask-you',
  'this-is-fine', 'this-is-sparta', 'to-be-continued', 'trogdor', 'ultimate-showdown',
  'we-got-him', 'wednesday', 'why-are-you-running', 'xp-startup', 'zombies-laugh',
];

// Every clip id the moment layer needs preloaded.
NB.momentAudioIds = function () { return NB.MOMENT_SFX_ALL.slice(); };

// The one gated meme-voice player. Plays memeaudio-<id> unless another clip is
// already going. Returns true only if it actually started one.
NB._eventSound = null;
NB.playMemeSfx = function (scene, id, volume) {
  if (!scene || !scene.sound || !id) return false;
  if (NB._eventSound && NB._eventSound.isPlaying) return false;   // busy → skip
  const key = `memeaudio-${id}`;
  if (!scene.cache.audio.exists(key)) return false;               // no such clip
  try {
    // resume a still-suspended context (autoplay unlock can lag the first gesture)
    if (scene.sound.context && scene.sound.context.state === 'suspended') scene.sound.context.resume();
    const s = scene.sound.add(key, { volume: volume == null ? 0.8 : volume });
    const clear = () => { if (NB._eventSound === s) NB._eventSound = null; };
    s.once('complete', () => { clear(); try { s.destroy(); } catch {} });
    s.once('stop', clear);
    s.play();
    NB._eventSound = s;
    NB.duckBed(scene);
    return true;
  } catch { return false; }
};

// Fire a clip for a moment — ONE global SHUFFLED CYCLE. Every moment draws
// from the same session-shuffled deck of all 57 clips; nothing repeats until
// the whole deck has played, then it reshuffles (guarding the boundary so the
// same clip can't play back-to-back across cycles). The `moment` arg is kept
// for the call sites but no longer picks the pool.
NB._momentQ = null;
NB._lastGlobalId = null;
NB._pickMomentId = function (_moment) {
  let q = NB._momentQ;
  if (!q || !q.length) {
    q = NB.MOMENT_SFX_ALL.slice();
    for (let i = q.length - 1; i > 0; i--) {           // Fisher-Yates
      const j = (Math.random() * (i + 1)) | 0; [q[i], q[j]] = [q[j], q[i]];
    }
    // boundary guard: don't let the new cycle open with what just played
    if (q.length > 1 && q[0] === NB._lastGlobalId) [q[0], q[1]] = [q[1], q[0]];
    NB._momentQ = q;
  }
  return q.shift();
};
NB.playMoment = function (scene, moment) {
  if (NB._eventSound && NB._eventSound.isPlaying) return;
  const id = NB._pickMomentId(moment);
  if (id && NB.playMemeSfx(scene, id, 0.78)) NB._lastGlobalId = id;
};

// --- the looping bed (corpse-party) ---
NB._bed = null;
NB.startBed = function (scene) {
  if (NB._bed && NB._bed.isPlaying) return;
  if (!scene || !scene.cache || !scene.cache.audio.exists('game-bed')) return;
  try {
    if (scene.sound.context && scene.sound.context.state === 'suspended') scene.sound.context.resume();
    NB._bed = scene.sound.add('game-bed', { loop: true, volume: 0.4 }); NB._bed.play();
  } catch {}
};
NB.stopBed = function () {
  // kill any in-flight duck tween FIRST — a tween touching a destroyed sound
  // hits Phaser's nulled volumeNode ("reading 'gain'") every frame
  try { if (NB._duckTween) { NB._duckTween.stop(); } } catch {}
  NB._duckTween = null;
  try { if (NB._bed) { NB._bed.stop(); NB._bed.destroy(); } } catch {}
  NB._bed = null;
};
NB.duckBed = function (scene) {
  if (!NB._bed || !NB._bed.isPlaying) return;
  try {
    NB._bed.setVolume(0.12);
    if (scene && scene.tweens) {
      try { if (NB._duckTween) NB._duckTween.stop(); } catch {}
      NB._duckTween = scene.tweens.add({ targets: NB._bed, volume: 0.4, duration: 800, delay: 200 });
    }
  } catch {}
};
