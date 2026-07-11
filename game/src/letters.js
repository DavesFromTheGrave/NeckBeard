// THE LETTERS — six cursed subreddits each hide one letter of B-A-L-D-E-R.
// Dave (2026-07-11): "Balder's gate IS THE LETTERS. +250k karma + 30 seconds
// survived with the duo." All six letters + the karma gate + the duo timer
// arm the ending (trigger lives in main.js update; numbers in tunables).
//
// CHAIN FLAVOR (Dave's ruling, 2026-07-11 pm): VIBE-cursed subs, not
// name-cursed — if they were all r/cursed-something, players could spam the
// famous family and skip the trail entirely. r/cursed stays as the tipped
// front door; everything after must be DECIPHERED from riddle clues that
// never name the next sub. Nobody meets Balder before their ~6th run, and
// that's the design ("I don't think that's a problem").
//
// PERSISTENCE: redis is the truth (per player, /api/letters — Reddit's
// webview walls off localStorage, and the multi-run hunt dies without a
// server memory). Device storage is a warm cache + offline fallback.
//
// ⚠ CLUE TEXT AND SUB ORDER = DRAFT. Dave owns the words — swap freely, the
// wiring doesn't care. Subs must exist in NB.CURSED_SUBS (data-mock.js) so
// the normal cursed bonus also fires on arrival.
window.NB = window.NB || {};

// DEFINITION RULED (Dave + kid, 2026-07-11): "cursed" = the deep-fried /
// nuked genre — content degraded until it feels radioactive — anchored by
// the genre's grandfather r/cursedimages. The chain ESCALATES: wrongness →
// surreal → fried → nuked, so the game's own arenas look more cursed the
// closer you get to him. Each clue is a RIDDLE about the next sub's soul —
// never its name, nothing to spam-guess.
NB.LETTER_CHAIN = [
  { sub: 'cursed',         letter: 'B', clue: 'where it all started. every picture is wrong, and nobody can say why.' },
  { sub: 'cursedimages',   letter: 'A', clue: 'the only correct caption is the sound you just made.' },
  { sub: 'hmmm',           letter: 'L', clue: 'dreams shitpost too.' },
  { sub: 'surrealmemes',   letter: 'D', clue: 'cooked until the pixels scream.' },
  { sub: 'deepfriedmemes', letter: 'E', clue: 'past burnt. past wrong. nothing survives the flash.' },
  { sub: 'nukedmemes',     letter: 'R', clue: 'the admin.' },
];

// ── state: in-session cache, seeded from device storage, trued-up by the
// server sync below. All reads go through lettersRaw so the gate check in
// the update loop stays synchronous.
NB._letters = null;
NB.lettersRaw = function () {
  return NB._letters != null ? NB._letters : (NB.persistGet('nb_letters') || '');
};
NB.lettersState = function () {
  const raw = NB.lettersRaw();
  return NB.LETTER_CHAIN.map(e => raw.includes(e.letter));
};
NB.lettersDone = function () { return NB.lettersState().every(Boolean); };

NB.collectLetter = function (letter) {
  const raw = NB.lettersRaw();
  if (raw.includes(letter)) return;
  NB._letters = raw + letter;
  NB.persistSet('nb_letters', NB._letters);
  // server is the real memory — best-effort, never blocks the game
  try {
    fetch('/api/letters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ letter }),
    }).catch(() => {});
  } catch { /* offline is fine — device cache carries it */ }
};

// Boot sync: merge server truth with whatever the device remembers, adopt
// the union, and backfill the server with anything it was missing. Fire and
// forget — the HUD refreshes when it lands.
NB.syncLetters = function (scene) {
  try {
    fetch('/api/letters')
      .then(r => (r.ok ? r.json() : { letters: '' }))
      .then(d => {
        const server = (d && typeof d.letters === 'string') ? d.letters : '';
        const local = NB.persistGet('nb_letters') || '';
        const merged = [...new Set((server + local).split(''))]
          .filter(ch => 'BALDER'.includes(ch)).join('');
        NB._letters = merged;
        NB.persistSet('nb_letters', merged);
        for (const ch of merged) {
          if (!server.includes(ch)) {
            try {
              fetch('/api/letters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ letter: ch }),
              }).catch(() => {});
            } catch { /* best-effort */ }
          }
        }
        if (scene && scene.updateLetterHUD) scene.updateLetterHUD();
      })
      .catch(() => {});
  } catch { /* offline: device cache is the fallback truth */ }
};

// Drop the letter pickup on a cursed page (called on arrival, after the
// cursed bonus spawns). One per page; cleared on travel by main.js.
NB.spawnLetter = function (scene, entry) {
  NB.clearLetter(scene);
  const W = scene.scale.width, cam = scene.cameras.main;
  const x = Phaser.Math.Between(Math.round(W * 0.3), Math.round(W * 0.7));
  const y = cam.scrollY + scene.scale.height * Phaser.Math.FloatBetween(0.38, 0.6);
  const glow = scene.add.circle(x, y, 34, 0xc0392b, 0.16).setDepth(18);
  const txt = scene.add.text(x, y, entry.letter, {
    fontFamily: NB.FONT_SOUL || 'Georgia, serif', fontSize: '54px', color: '#c0392b',
  }).setOrigin(0.5).setDepth(19).setStroke('#000000', 6);
  scene.tweens.add({ targets: [txt, glow], y: '-=8', yoyo: true, repeat: -1, duration: 800 });
  scene.tweens.add({ targets: glow, alpha: 0.32, yoyo: true, repeat: -1, duration: 640 });
  scene._letterPickup = { x, y, entry, objs: [txt, glow] };
};

NB.clearLetter = function (scene) {
  if (!scene._letterPickup) return;
  scene._letterPickup.objs.forEach(o => { try { o.destroy(); } catch {} });
  scene._letterPickup = null;
};

// Touch = collect. Persists (device + server), floats the count + the riddle
// to the next sub, refreshes the HUD tracker. Called from the update loop.
NB.updateLetterPickup = function (scene, player) {
  const L = scene._letterPickup;
  if (!L) return;
  if (Math.hypot(player.x - L.x, player.y - L.y) > 36) return;
  NB.clearLetter(scene);
  NB.collectLetter(L.entry.letter);
  NB.sfx.pickup();
  scene.cameras.main.shake(200, 0.004);
  const have = NB.lettersState().filter(Boolean).length;
  scene.floatText(L.x, L.y - 24, `${L.entry.letter} · ${have}/6`, '#c0392b');
  scene.floatText(scene.scale.width / 2, scene.cameras.main.scrollY + 96, L.entry.clue, '#9a3fd4');
  if (scene.updateLetterHUD) scene.updateLetterHUD();
  if (NB.lettersDone()) {
    scene.floatText(scene.scale.width / 2,
      scene.cameras.main.scrollY + scene.scale.height * 0.35, 'B A L D E R', '#c0392b');
    NB.playMoment(scene, 'revenant');
  }
};
