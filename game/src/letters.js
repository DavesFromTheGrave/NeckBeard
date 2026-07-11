// THE LETTERS — six cursed subreddits each hide one letter of B-A-L-D-E-R.
// Dave (2026-07-11): "Balder's gate IS THE LETTERS. +250k karma + 30 seconds
// survived with the duo." All six letters + the karma gate + the duo timer
// arm the ending (trigger lives in main.js update; numbers in tunables).
//
// The hunt: r/cursed is the tipped entry (a line in How to Play, and
// sometimes a thrown comment whispers it). Each letter's pickup floats the
// clue to the NEXT sub in the chain. Letters persist across runs on the
// device (NB.persistGet/Set — degrades to per-page-load where Reddit walls
// storage off).
//
// ⚠ CLUE TEXT AND SUB ORDER = DRAFT. Dave owns the words — swap freely, the
// wiring doesn't care. Subs must exist in NB.CURSED_SUBS (data-mock.js) so
// the normal cursed bonus also fires on arrival.
window.NB = window.NB || {};

NB.LETTER_CHAIN = [
  { sub: 'cursed',          letter: 'B', clue: 'the comments are worse. (r/cursedcomments)' },
  { sub: 'cursedcomments',  letter: 'A', clue: 'you should SEE what they post. (r/cursedimages)' },
  { sub: 'cursedimages',    letter: 'L', clue: 'reading it does damage. (r/ihadastroke)' },
  { sub: 'ihadastroke',     letter: 'D', clue: 'something stirs where it should not. (r/oddlyterrifying)' },
  { sub: 'oddlyterrifying', letter: 'E', clue: 'the last one is pure poison. (r/shitposting)' },
  { sub: 'shitposting',     letter: 'R', clue: 'the name is complete. he knows you know.' },
];

NB.lettersState = function () {
  const raw = NB.persistGet('nb_letters') || '';
  return NB.LETTER_CHAIN.map(e => raw.includes(e.letter));
};
NB.lettersDone = function () { return NB.lettersState().every(Boolean); };
NB.collectLetter = function (letter) {
  const raw = NB.persistGet('nb_letters') || '';
  if (!raw.includes(letter)) NB.persistSet('nb_letters', raw + letter);
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

// Touch = collect. Persists, floats the count + the clue to the next sub,
// refreshes the HUD tracker. Called from the main update loop.
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
