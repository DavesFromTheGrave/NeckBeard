// The meme registry — every powerup/collectible/trap as data. Effects run
// through the mod's primitives (stun/decoy/shield/heatwipe/knockback/slow) +
// a survival-time bonus for collectibles. Art & audio are SWAP-LATER behind
// stable ids: drop game/assets/memes/img/<id>.png (add id to MEME_ART) or
// game/assets/memes/audio/<id>.mp3 (add id to MEME_AUDIO). Until then the game
// shows a color-coded placeholder badge + the WebAudio synth. Sourcing links:
// see MEME-SOURCING.md. IP flags there are Dave's okay/ban-hammer call.
window.NB = window.NB || {};

// Ids whose real assets have been captured & dropped in. EVERY registry entry
// must have art — Dave's rule: no color-badge "coins" in the game (yakety-sax
// was the last audio-only one; cut 2026-07-09).
// NOTE: no techno-viking, ever — the man in that video sued over its use and
// WON (personality rights). Do not re-add him. — Dave, 2026-07-09
NB.MEME_ART = [
  'banhammer', 'shoop-da-whoop', 'trogdor', 'leeroy-jenkins', 'rickroll', 'nyan-cat', 'longcat',
  'keyboard-cat', 'one-ring', 'success-kid', 'this-is-fine', 'doge', 'good-guy-greg', 'me-gusta',
  'yao-ming', 'y-u-no', 'over-9000', 'harambe', 'badger-badger', 'banana-phone', 'all-your-base',
  'gnome', 'pepe', 'forever-alone', 'ermahgerd', 'philosoraptor', 'dat-boi', 'cheezburger',
  'ultimate-showdown', 'one-does-not-simply', 'scumbag-steve', 'trollface', 'bad-luck-brian',
];
NB.MEME_AUDIO = [
  'shoop-da-whoop', 'trogdor', 'rickroll', 'nyan-cat', 'keyboard-cat', 'over-9000', 'this-is-fine',
  'ultimate-showdown', 'one-does-not-simply', 'gnome', 'banana-phone',
  'all-your-base', 'badger-badger',
  // 'dat-boi' pulled 2026-07-10 — its clip IS the banned "o shit waddup"
  // soundbite; the pickup runs on the synth fallback now. Never re-wire.
];

// fx → color, so the pickup badge tells you what it does at a glance.
NB.MEME_FX_COLOR = {
  stun: 0xe8c944, decoy: 0x9b59b6, shield: 0x4a90d9, heatwipe: 0x46d160,
  knockback: 0xdf8434, slow: 0x2fbfa8, score: 0xf1c40f, trap: 0xc0392b,
};

// cat: powerup (instant good effect) | collectible (time bonus + flavor) | trap (bad)
// fx:  stun | decoy | shield | heatwipe | knockback | slow | score | trap
NB.MEMES = {
  // ---- POWERUPS ----
  'banhammer':      { name: 'Ban Hammer', cat: 'powerup', tier: 'uncommon', fx: 'stun', say: 'BANNED.' },
  'shoop-da-whoop': { name: 'Shoop Da Whoop', cat: 'powerup', tier: 'uncommon', fx: 'stun', say: 'BLAAARGH!' },
  'trogdor':        { name: 'Trogdor', cat: 'powerup', tier: 'rare', fx: 'stun', say: 'BURNINATING THE MOD' },
  'leeroy-jenkins': { name: 'Leeroy Jenkins', cat: 'powerup', tier: 'rare', fx: 'stun', say: 'LEEEEROY JENKINS!' },
  'rickroll':       { name: 'Rick Roll', cat: 'powerup', tier: 'uncommon', fx: 'decoy', say: 'never gonna give you up' },
  'nyan-cat':       { name: 'Nyan Cat', cat: 'powerup', tier: 'rare', fx: 'decoy', say: 'nyan nyan nyan nyan' },
  'longcat':        { name: 'Longcat', cat: 'powerup', tier: 'uncommon', fx: 'decoy', say: 'looooong' },
  'keyboard-cat':   { name: 'Keyboard Cat', cat: 'powerup', tier: 'uncommon', fx: 'decoy', say: 'play him off' },
  'one-ring':       { name: 'The One Ring', cat: 'powerup', tier: 'legendary', fx: 'shield', say: 'my precious' },
  'success-kid':    { name: 'Success Kid', cat: 'powerup', tier: 'uncommon', fx: 'shield', say: 'nailed it' },
  'this-is-fine':   { name: 'This Is Fine', cat: 'powerup', tier: 'uncommon', fx: 'shield', say: 'this is fine' },
  'doge':           { name: 'Doge', cat: 'powerup', tier: 'common', fx: 'heatwipe', say: 'much calm. wow.' },
  'good-guy-greg':  { name: 'Good Guy Greg', cat: 'powerup', tier: 'uncommon', fx: 'heatwipe', say: 'takes the heat off you' },
  'me-gusta':       { name: 'Me Gusta', cat: 'powerup', tier: 'common', fx: 'heatwipe', say: 'me gusta' },
  'yao-ming':       { name: 'Yao Ming Face', cat: 'powerup', tier: 'uncommon', fx: 'knockback', say: 'bitch please' },
  'y-u-no':         { name: 'Y U No', cat: 'powerup', tier: 'common', fx: 'knockback', say: 'Y U NO STOP' },
  'over-9000':      { name: 'Over 9000', cat: 'powerup', tier: 'rare', fx: 'knockback', say: "IT'S OVER 9000!!", big: true },
  'harambe':        { name: 'Harambe', cat: 'powerup', tier: 'rare', fx: 'slow', say: 'respect. he slows.' },
  'badger-badger':  { name: 'Badger Badger Badger', cat: 'powerup', tier: 'common', fx: 'slow', say: 'badger badger badger' },
  'banana-phone':   { name: 'Banana Phone', cat: 'powerup', tier: 'common', fx: 'slow', say: 'ring ring ring' },
  'all-your-base':  { name: 'All Your Base', cat: 'powerup', tier: 'uncommon', fx: 'slow', say: 'all your base…' },

  // ---- COLLECTIBLES (instant survival-time bonus + flavor) ----
  'pepe':               { name: 'Rare Pepe', cat: 'collectible', tier: 'legendary', fx: 'score', score: 4, say: 'feels good man' },
  'forever-alone':      { name: 'Forever Alone', cat: 'collectible', tier: 'common', fx: 'score', score: 1, say: 'forever alone' },
  'ermahgerd':          { name: 'Ermahgerd', cat: 'collectible', tier: 'uncommon', fx: 'score', score: 2, say: 'ERMAHGERD' },
  'philosoraptor':      { name: 'Philosoraptor', cat: 'collectible', tier: 'uncommon', fx: 'score', score: 2, say: 'what if…' },
  'dat-boi':            { name: 'Dat Boi', cat: 'collectible', tier: 'uncommon', fx: 'score', score: 2, say: 'o shit waddup' },
  'gnome':              { name: 'Gnome', cat: 'collectible', tier: 'rare', fx: 'score', score: 3, say: 'gnomed' },
  'cheezburger':        { name: 'I Can Has Cheezburger', cat: 'collectible', tier: 'common', fx: 'score', score: 1, say: 'i can has?' },
  'ultimate-showdown':  { name: 'Ultimate Showdown', cat: 'collectible', tier: 'rare', fx: 'score', score: 3, say: 'ultimate destiny' },
  'one-does-not-simply':{ name: 'One Does Not Simply', cat: 'collectible', tier: 'uncommon', fx: 'score', score: 2, say: 'one does not simply escape' },

  // ---- TRAPS (touch = bad) ----
  'scumbag-steve':  { name: 'Scumbag Steve', cat: 'trap', tier: 'uncommon', fx: 'trap', say: 'why would you grab that' },
  'trollface':      { name: 'Trollface', cat: 'trap', tier: 'uncommon', fx: 'trap', say: 'problem?' },
  'bad-luck-brian': { name: 'Bad Luck Brian', cat: 'trap', tier: 'common', fx: 'trap', say: "it's a trap" },
};

// Weighted spawn pool (rarer = fewer tickets). Built once.
NB._memePool = null;
NB.memePool = function () {
  if (NB._memePool) return NB._memePool;
  const w = { common: 6, uncommon: 4, rare: 2, legendary: 1 };
  const pool = [];
  for (const id in NB.MEMES) {
    const n = w[NB.MEMES[id].tier] || 1;
    for (let i = 0; i < n; i++) pool.push(id);
  }
  NB._memePool = pool;
  return pool;
};

NB.randomMemeId = function () {
  const pool = NB.memePool();
  return pool[Math.floor(Math.random() * pool.length)];
};

// Short tag for the placeholder badge (derived from id — no per-entry data).
NB.memeTag = function (id) {
  const first = id.split('-')[0];
  return first.slice(0, 4).toUpperCase();
};

// Build the pickup's visual: real art if dropped in, else a color-coded badge.
NB.drawMemeBadge = function (scene, x, y, id) {
  const m = NB.MEMES[id];
  const objs = [];
  if (NB.MEME_ART.includes(id) && scene.textures.exists(`meme-${id}`)) {
    const img = scene.add.image(x, y, `meme-${id}`).setDepth(9);
    const src = scene.textures.get(`meme-${id}`).getSourceImage();
    // fit inside a ~40px box, aspect-preserved (memes aren't all square — longcat!)
    img.setScale(40 / Math.max(src.width || 40, src.height || 40));
    objs.push(img);
    return objs;
  }
  const color = NB.MEME_FX_COLOR[m.fx] || 0xbbbbbb;
  objs.push(scene.add.circle(x, y, 16, color, 0.95).setDepth(8).setStrokeStyle(2, 0xffffff));
  objs.push(scene.add.text(x, y, NB.memeTag(id), {
    fontFamily: 'Arial', fontSize: '9px', fontStyle: 'bold', color: '#101014',
  }).setOrigin(0.5).setDepth(9));
  return objs;
};

// Play a real captured clip if present, else run the synth fallback.
NB.playMemeSound = function (scene, id, fallback) {
  // muted kills the captured voice clip; the quiet synth fallback still fires
  // so a grabbed pickup keeps its blip of feedback
  if (!NB.audioMuted && NB.MEME_AUDIO.includes(id) && scene.sound && scene.cache.audio.exists(`memeaudio-${id}`)) {
    try { scene.sound.play(`memeaudio-${id}`, { volume: 0.5 }); return; } catch {}
  }
  if (typeof fallback === 'function') fallback();
};
