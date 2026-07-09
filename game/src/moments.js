// Contextual meme-audio layer + the looping bed.
// At key game moments a random meme voice-clip fires. NO PILE-UP: if a meme
// clip is already playing, new ones are skipped until it ends (the base synth
// sfx in sfx.js are separate and unaffected — those still layer freely).
// The bed (game-bed.mp3) loops the whole run and DUCKS when a clip punches in.
// Ids map to game/assets/memes/audio/<id>.mp3 (loaded as memeaudio-<id>);
// the bed loads as 'game-bed'. Dave picks WHEN; the pools are the WHICH.
window.NB = window.NB || {};

NB.MOMENT_SFX = {
  intro:       ['xp-startup', 'wednesday', 'they-ask-you', 'jeopardy'],
  doorOpen:    ['this-is-sparta', 'fbi-open-up', 'john-cena', 'oh-shit-waddup', 'that-escalated'],
  cheerleader: ['notice-me-senpai', 'anime-wow', 'oh-baby-a-triple', 'look-at-this-dude', 'damn-boy'],
  powerup:     ['combo-breaker', 'stonks', 'another-one', 'do-it'],
  karma1k:     ['stonks', 'oh-baby-a-triple', 'we-got-him', 'combo-breaker'],
  closeCall:   ['overdrive', 'why-are-you-running', 'hell-naw', 'shuffling', 'bing-bing-bong', 'challenging-me', 'sheesh', 'aint-nobody'],
  travel:      ['here-com-dat-boi', 'another-one', 'to-be-continued', 'my-name-is-jeff', 'bruh'],
  caught:      ['lotta-damage', 'kaboom', 'oh-shit-waddup', 'sheesh', 'ha-ha'],
  redditmod:   ['here-com-dat-boi', 'back-up-terry', 'jason-bourne', 'another-one'],
  revenant:    ['zombies-laugh', 'piece-of-garbage', 'carl-kills', 'oh-shit-waddup'],
  banned:      ['lol-u-died', 'gta-wasted', 'fuck-this-shit', 'piece-of-garbage', 'no-god-no', 'jebaited', 'sad-tune', 'bruh'],
  ending:      ['to-be-continued', 'sad-tune'],
};

// Every clip id the moment layer needs preloaded (union of all pools).
NB.momentAudioIds = function () {
  const s = new Set();
  for (const k in NB.MOMENT_SFX) for (const id of NB.MOMENT_SFX[k]) s.add(id);
  return [...s];
};

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

// Fire a random clip for a moment (no immediate repeat within that moment).
NB._lastMomentId = {};
NB.playMoment = function (scene, moment) {
  const pool = NB.MOMENT_SFX[moment];
  if (!pool || !pool.length) return;
  if (NB._eventSound && NB._eventSound.isPlaying) return;
  let id, tries = 0;
  do { id = pool[(Math.random() * pool.length) | 0]; }
  while (id === NB._lastMomentId[moment] && ++tries < 5 && pool.length > 1);
  if (NB.playMemeSfx(scene, id, 0.78)) NB._lastMomentId[moment] = id;
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
  try { if (NB._bed) { NB._bed.stop(); NB._bed.destroy(); } } catch {}
  NB._bed = null;
};
NB.duckBed = function (scene) {
  if (!NB._bed || !NB._bed.isPlaying) return;
  try {
    NB._bed.setVolume(0.12);
    if (scene && scene.tweens) scene.tweens.add({ targets: NB._bed, volume: 0.4, duration: 800, delay: 200 });
  } catch {}
};
