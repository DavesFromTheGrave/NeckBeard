// superM0D (hackathon build; formerly NECKBEARD) — boot scene.
// Touch-first: the pointer/finger IS the hunted cursor.
// World is a scrollable feed; camera follows via edge-push + wheel.
window.NB = window.NB || {};

// Strip near-black pixels so painted assets with flat BGs composite cleanly.
NB.keyBlack = function (scene, key, tol = 28) {
  if (!scene.textures.exists(key)) return;
  const src = scene.textures.get(key).getSourceImage();
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] < tol && d[i + 1] < tol && d[i + 2] < tol) d[i + 3] = 0;
  }
  ctx.putImageData(img, 0, 0);
  scene.textures.remove(key);
  scene.textures.addCanvas(key, c);
};

// Flood-fill the flat background transparent, starting from the four corners.
// Better than a global threshold for JPG cutouts: it only removes the bg that
// is CONNECTED to the edges, so interior light areas (the "superMOD" sign)
// survive. tol = color distance from the sampled corner color.
NB.keyFloodFill = function (scene, key, tol = 80) {
  if (!scene.textures.exists(key)) return;
  const src = scene.textures.get(key).getSourceImage();
  const w = src.width, h = src.height;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  // Already transparent at the corner (real alpha, not a flat-color bg)?
  // Skip entirely — flood-filling by RGB alone can't tell "already-clear
  // background" from "opaque black linework" when both sample as (0,0,0),
  // and would eat into any outline art connected to the transparent edge.
  if (d[3] < 40) { scene.textures.remove(key); scene.textures.addCanvas(key, c); return; }
  const br = d[0], bg = d[1], bb = d[2]; // top-left = background reference
  const near = (i) => (Math.abs(d[i] - br) + Math.abs(d[i + 1] - bg) + Math.abs(d[i + 2] - bb)) <= tol * 3;
  const seen = new Uint8Array(w * h);
  const stack = [0, w - 1, (h - 1) * w, h * w - 1];
  while (stack.length) {
    const px = stack.pop();
    if (seen[px]) continue;
    const i = px * 4;
    if (!near(i)) continue;
    seen[px] = 1;
    d[i + 3] = 0;
    const x = px % w, y = (px / w) | 0;
    if (x > 0) stack.push(px - 1);
    if (x < w - 1) stack.push(px + 1);
    if (y > 0) stack.push(px - w);
    if (y < h - 1) stack.push(px + w);
  }
  ctx.putImageData(img, 0, 0);
  scene.textures.remove(key);
  scene.textures.addCanvas(key, c);
};

// Death-screen "official verdict." The verdict word is a coin-flip; the reason
// is a fortune cookie pulled from a big curated pool of fake mod ban-reasons.
// (We tried quoting REAL thread comments here — they just read as random and
// weren't funny. Hand-written power-trip nonsense lands far better, and "what
// reason did IT give YOU?" is the compare-notes share hook.) The bag is
// session-shuffled so no two bans repeat until the whole pool's been spent, and
// it lives on NB — not the scene — so it survives scene.restart() (each death
// restarts the scene); a fresh page load reshuffles for a new session.
NB.BAN_VERDICTS = ['[ REMOVED ]', '[ BANNED ]'];
// Dave-curated pool (2026-07-11): 26 that earn their slot — a mix of "fits
// the game too perfectly" and actually funny. Order is his (rule 7 sits at
// slot 7 on purpose). The bag shuffles a COPY, so order only matters here.
NB.BAN_REASONS = [
  'Reason: none provided.',
  'Reason: rule 3. (you know what you did)',
  'Reason: karma farming. (ironic)',
  'Reason: reported by 1 user. (it was me)',
  'Reason: no one loves you.',
  'Reason: vote manipulation.',
  'Reason: rule 7. (we just made it up)',
  'Reason: ban evasion. (we don\'t know either)',
  'Reason: didn\'t read the sidebar.',
  'Reason: wrong opinion.',
  'Reason: started a support ticket.',
  'Reason: you seemed happy.',
  'Reason: posted cringe.',
  'Reason: touched grass.',
  'Reason: happy cake day. (no exceptions)',
  'Reason: upvoted a post I don\'t agree with.',
  'Reason: posted a typo.',
  'Reason: we needed the practice.',
  'Reason: to cause emotional damage.',
  'Reason: dishonor on you. dishonor on your family.',
  'Reason: original content. we hate that.',
  'Reason: had to meet the ban quota.',
  'Reason: the magic 8-ball told us to.',
  'Reason: shitposting.',
  'Reason: showed a nipple on stream. (3-day ban)',
  'Reason: smelled like Discord.',
];
// The sidebar bit is a TWO-PARTER (Dave 2026-07-11: it's only funny as a
// callback). Drawing the setup arms the punchline for the very next ban —
// the punchline never enters the random pool on its own. Survives scene
// restarts via the storage-safe flag, so the bit lands on the next death
// even after a "run it back."
NB.BAN_SIDEBAR_SETUP = 'Reason: didn\'t read the sidebar.';
NB.BAN_SIDEBAR_PUNCH = 'Reason: read the sidebar too closely.';
NB.nextBanReason = function () {
  if (NB.flagGet('nb_sidebar_punch') === '1') {
    NB.flagSet('nb_sidebar_punch', '0');
    return NB.BAN_SIDEBAR_PUNCH;
  }
  if (!NB._banBag || !NB._banBag.length) {
    // Phaser.Utils.Array.Shuffle mutates in place — shuffle a COPY, not the pool.
    NB._banBag = Phaser.Utils.Array.Shuffle(NB.BAN_REASONS.slice());
  }
  const r = NB._banBag.pop();
  if (r === NB.BAN_SIDEBAR_SETUP) NB.flagSet('nb_sidebar_punch', '1');
  return r;
};
// The mod also slaps a MEME on your removal notice — a random "L" stamp above
// the text reason. Ids map to game/assets/memes/img/<id>.png (preloaded as
// meme-<id>, same convention as the powerup memes). A missing file just skips
// the stamp — the text reason still shows.
NB.DEATH_MEMES = ['crying-face', 'forever-alone', 'grumpy-cat', 'yao-ming', 'jackie-chan',
  'lol', 'one-punch-man', 'trollface', 'this-is-fine', 'rageface', 'y-u-no'];

class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  preload() {
    // scene.restart() (see onCaught()) reuses the SAME global TextureManager
    // as first boot — it does not reset it. door-closed/door-open/door-mod/
    // balder all get destructively reprocessed in create() (flood-filled
    // transparent from their opaque source bg). If a restart's load.image()
    // call finds the key already present, Phaser just warns and skips the
    // load, so create() ends up flood-filling an ALREADY-flood-filled canvas
    // instead of a fresh source image. Re-compositing a partially-transparent
    // image onto a new canvas re-blends its semi-transparent edge pixels each
    // pass, so every restart visibly degrades these four textures a little
    // more (fine on a hard refresh, glitchy after "tap to appeal"->restart).
    // Fix: drop any existing copy before preload's load.image() calls below,
    // so every scene start — first boot or restart — flood-fills a pristine
    // decode of the real file, never a previously-processed canvas.
    for (const k of ['door-closed', 'door-open', 'door-mod', 'balder', 'revenant-skull']) {
      if (this.textures.exists(k)) this.textures.remove(k);
    }
    for (let i = 1; i <= 6; i++) {
      // superM0D — Dave's mustache + BAN-mallet cast (2026-07-09 redesign).
      // walk is unarmed; heat pulls the mallet out (charge); zrun is the
      // red-eyed revenant. Sliced into assets/mod1 from his masters.
      this.load.image(`m1-walk-${i}`, `assets/mod1/m1-walk-${i}.png`);
      this.load.image(`m1-run-${i}`, `assets/mod1/m1-run-${i}.png`);
      this.load.image(`m1-charge-${i}`, `assets/mod1/m1-charge-${i}.png`);
      this.load.image(`m1-zrun-${i}`, `assets/mod1/m1-zrun-${i}.png`);
      if (i <= 5) this.load.image(`m1-sledge-${i}`, `assets/mod1/m1-sledge-${i}.png`);
      if (i <= 5) this.load.image(`m1-zact-${i}`, `assets/mod1/m1-zact-${i}.png`);
      if (i <= 2) this.load.image(`m1-leap-${i}`, `assets/mod1/m1-leap-${i}.png`);
      this.load.image(`m1-zwalk-${i}`, `assets/mod1/m1-zwalk-${i}.png`);   // real green-zombie walk (6, from video)
      // redditM0D — the post-ceremony tag-in (the navy-shirt replacement mod)
      this.load.image(`mod2-walk-${i}`, `assets/mod2/mod2-walk-${i}.png`);
      this.load.image(`mod2-run-${i}`, `assets/mod2/mod2-run-${i}.png`);
    }
    this.load.image('m1-crouch', 'assets/mod1/m1-crouch.png');
    this.load.image('m1-victory', 'assets/mod1/m1-victory.png');
    this.load.image('mod2-idle', 'assets/mod2/mod2-idle.png');
    this.load.image('mod2-stand', 'assets/mod2/mod2-stand.png');
    for (let i = 1; i <= 11; i++) this.load.image(`mod2-punch-${i}`, `assets/mod2/mod2-punch-${i}.png`);  // redditM0D brass-knuckle punch (Dave's hand-made strike)
    this.load.image('balder', 'assets/balder/balder-ceremony.png');
    for (let i = 1; i <= 13; i++) this.load.image(`tp-${i}`, `assets/teleport/tp-${i}.png`);  // Balder teleport — Dave's 13-frame BODY-INCLUSIVE vanish (present→detonate→gone), alpha
    // BALDER walk — Dave's new pixel cycle (bw-1..8, left-facing profile,
    // human side to camera). His only locomotion anim now; he teleports rather
    // than runs, so there's no run set. (The old bh/bz sheets below are unused
    // by the new boss — kept on disk for now, Dave to approve deleting.)
    for (let i = 1; i <= 8; i++) this.load.image(`bw-${i}`, `assets/balder-boss/bw-${i}.png`);
    for (let i = 1; i <= 8; i++) {
      this.load.image(`bh-walk-${i}`, `assets/balder-boss/bh-walk-${i}.png`);
      this.load.image(`bh-run-${i}`, `assets/balder-boss/bh-run-${i}.png`);
      this.load.image(`bz-walk-${i}`, `assets/balder-boss/bz-walk-${i}.png`);
      this.load.image(`bz-run-${i}`, `assets/balder-boss/bz-run-${i}.png`);
    }
    this.load.image('elevator', 'assets/balder/elevator.png');
    this.load.image('admin-walk', 'assets/balder/admin-walk.png');   // the floor-walk cameo
    this.load.image('admin-idol', 'assets/balder/admin-idol.png');       // the pixel idol (idle)
    this.load.image('admin-idol-sign', 'assets/balder/admin-idol-sign.png'); // + r/cursed placard (the HINT walk-by)
    // The sprite ceremony (Dave's storyboard — replaces the mid-game video):
    // closed elevator erupts → doors open → Balder appears → sucks superM0D
    // under → redditM0D rises (silhouette → reveal) → Balder rides down.
    this.load.image('elev-closed', 'assets/balder/elevator-closed.png');
    this.load.image('elev-open', 'assets/balder/elevator-open.png');
    this.load.image('elev-balder', 'assets/balder/elevator-balder.png');
    this.load.image('floor-crack', 'assets/balder/crack.png');
    for (const p of ['idle', 'cheer', 'armsup', 'pompom', 'kick', 'wink']) {
      this.load.image(`cheer-${p}`, `assets/cheer/cheer-${p}.png`);
    }
    // BALDER hero — Dave's full-body beckon master (transparent alpha, do NOT
    // flood-fill). The manifest splash when the boss arrives (boss.js).
    this.load.image('balder-hero', 'assets/balder-boss/balder-hero.png');
    // BALDER body — the split-face pixel idle (his standing/materialised pose;
    // he teleports rather than runs, so this + the teleport IS his locomotion).
    this.load.image('balder-idle', 'assets/balder-boss/balder-idle.png');
    // BALDER beaten — white-suit variant. NOT a defeat (nobody survives him):
    // if you lasted >60s before he got you, the death screen swaps this in with
    // a "thank you for playing" grace note instead of the cold meme stamp.
    this.load.image('balder-beaten', 'assets/balder-boss/balder-beaten.png');
    // superMOD's entrance: closed door (sign) -> open (void) -> he steps out
    this.load.image('door-closed', 'assets/door/door-closed.jpg');
    this.load.image('door-open', 'assets/door/door-open.jpg');
    this.load.image('door-mod', 'assets/door/door-mod.png');
    // Revenant Systems crest — replaces the snoo face inside the header/avatar
    // badge (same orange bubble, real brand art in place of the alien face).
    this.load.image('revenant-skull', 'assets/brand/revenant-skull.png');
    // meme art + audio: powerup/collectible/trap pickups (MEME_ART/MEME_AUDIO)
    // plus the death-screen stamps (DEATH_MEMES). Union so overlapping ids load
    // once; a missing file degrades to the color badge / synth fallback.
    const memeImgIds = new Set([...(NB.MEME_ART || []), ...NB.DEATH_MEMES]);
    for (const id of memeImgIds) this.load.image(`meme-${id}`, `assets/memes/img/${id}.png`);
    // audio: powerup meme voices (MEME_AUDIO) + moment/event clips (moments.js)
    const memeAudIds = new Set([...(NB.MEME_AUDIO || []), ...NB.momentAudioIds()]);
    for (const id of memeAudIds) this.load.audio(`memeaudio-${id}`, `assets/memes/audio/${id}.mp3`);
    this.load.audio('game-bed', 'assets/music/game-bed.mp3');   // corpse-party chase bed
  }

  create() {
    // (elevator art is now a real transparent PNG — no keying; black-keying it
    // would punch a hole in the dark elevator interior.)
    // All three door-reveal frames ship on an opaque white bg — flood it
    // transparent. (door-mod was missing here before — that was the white
    // box behind superMOD on every single ceremony reveal, not random damage.)
    try {
      NB.keyFloodFill(this, 'door-closed');
      NB.keyFloodFill(this, 'door-open');
      NB.keyFloodFill(this, 'door-mod');
    } catch (e) { console.warn('door key:', e); }
    // Balder art ships on an opaque light-gray bg — flood it transparent.
    try { NB.keyFloodFill(this, 'balder'); } catch (e) { console.warn('balder key:', e); }
    // Admin cameo art: flood-fill no-ops if it already has real alpha.
    try { NB.keyFloodFill(this, 'admin-walk'); } catch (e) { console.warn('admin key:', e); }
    // Revenant crest ships on an opaque white bg too — flood it transparent.
    try { NB.keyFloodFill(this, 'revenant-skull'); } catch (e) { console.warn('crest key:', e); }
    // Character frames are Dave's detailed high-res art now — smooth-filter them
    // so they DOWNSCALE crisply. The global pixelArt=NEAREST would alias detailed
    // art on downscale (shimmer/jaggies); UI + other art keep nearest.
    const LINEAR = Phaser.Textures.FilterMode.LINEAR;
    for (const p of ['m1-walk', 'm1-run', 'm1-charge', 'm1-zrun', 'm1-sledge', 'm1-zact',
                     'm1-leap', 'm1-zwalk', 'mod2-walk', 'mod2-run']) {
      for (let i = 1; i <= 6; i++) {
        if (this.textures.exists(`${p}-${i}`)) this.textures.get(`${p}-${i}`).setFilter(LINEAR);
      }
    }
    for (const k of ['m1-crouch', 'm1-victory', 'mod2-idle', 'mod2-stand']) {
      if (this.textures.exists(k)) this.textures.get(k).setFilter(LINEAR);
    }
    // (ceremony video PULLED 2026-07-11 — the sprite cutscene replaced it, so
    // no more warming a ~5MB mp4 that never plays. See codeCeremony in balder.js.)
    const W = this.scale.width, H = this.scale.height;
    this.survivalMs = 0;
    this._karmaMilestone = 0;      // last 1k-karma threshold crossed (meme trigger)
    NB._eventSound = null;         // clear any stale meme-voice ref from a prior run
    this.caught = false;
    this.ceremonyRunning = false;
    this.pickerOpen = false;       // mobile sub-drawer open → hunt frozen
    this.searchFocused = false;    // header search focused → hunt frozen (typing a destination is safe travel, like the drawer)
    this.entranceActive = false;   // frozen while the door-open reveal plays
    this.balderUsed = false;
    this.balderEligible = false;   // snapshot flip, not a live comparison at catch-time
    this.boss = null;              // BALDER (boss.js) — the gate lives in update()
    this.bossDone = false;         // one boss visit per run — and it only ends one way
    this.bossKill = false;         // caught by BALDER himself → [ ERASED ]
    this.bossThanks = false;       // lasted >BOSS_THANKS_MS vs him → grace note
    this.duoMs = 0;                // ms survived with BOTH hunters live (gate half)
    this.memeBag = {};             // run collection: meme id → count (HUD stacks ×n)
    this._bagOrder = [];           // first-grab order for the collection strip
    // Each run starts on a PRISTINE page. Wreckage + farmed-posts persist
    // WITHIN a run (across sub-travel) but reset on a new round — otherwise the
    // door opens onto a page still shattered/looted from your last life.
    if (NB.WRECK_STORE) NB.WRECK_STORE.clear();
    if (NB.FARM_STORE) NB.FARM_STORE.clear();
    this.karma = 0;   // THE score: karma farmed off posts before he shreds them

    const anim = (key, prefix, n, rate, repeat = -1) => this.anims.create({
      key, frames: Array.from({ length: n }, (_, i) => ({ key: `${prefix}-${i + 1}` })),
      frameRate: rate, repeat,
    });
    // superM0D (mustache + BAN mallet). Walk is unarmed; the mallet comes out
    // at heat 2 (charge) — greed literally arms him. Revenant = red-eye zombie.
    anim('anim-walk', 'm1-walk', 6, 8);
    anim('anim-run', 'm1-run', 6, 14);
    anim('anim-charge', 'm1-charge', 6, 12);
    this.anims.create({ key: 'anim-leap',
      frames: [{ key: 'm1-leap-1' }, { key: 'm1-leap-2' }], frameRate: 10, repeat: 0 });
    anim('anim-zwalk', 'm1-zwalk', 6, 8);   // green zombie w/ BAN, real leg cycle
    this.anims.create({ key: 'anim-climb',
      frames: [{ key: 'm1-crouch' }, { key: 'm1-leap-1' }], frameRate: 9, repeat: 0 });
    this.anims.create({ key: 'anim-crouch', frames: [{ key: 'm1-crouch' }], frameRate: 1 });
    this.anims.create({ key: 'anim-stumble', frames: [{ key: 'm1-walk-4' }], frameRate: 1 });
    this.anims.create({ key: 'anim-victory', frames: [{ key: 'm1-victory' }], frameRate: 1 });
    this.anims.create({ key: 'anim-throw',
      frames: [{ key: 'm1-sledge-2' }, { key: 'm1-sledge-3' }], frameRate: 5, repeat: 0 });
    // full sledgehammer swing: wind-up then impact (SMASH state)
    this.anims.create({ key: 'anim-sledge',
      frames: [1, 2, 3, 4, 5].map(i => ({ key: `m1-sledge-${i}` })), frameRate: 8, repeat: 0 });
    this.anims.create({ key: 'anim-ztelegraph', frames: [{ key: 'm1-zact-1' }], frameRate: 1 });
    this.anims.create({ key: 'anim-zlunge',
      frames: [{ key: 'm1-zact-3' }, { key: 'm1-zact-4' }], frameRate: 10, repeat: 0 });
    // revenant-only recovery/victory — keeps the zombie GREEN through whiffs
    // and the catch (no living-skin flicker mid-resurrection)
    this.anims.create({ key: 'anim-zstumble', frames: [{ key: 'm1-zwalk-1' }], frameRate: 1 });
    this.anims.create({ key: 'anim-zvictory', frames: [{ key: 'm1-zact-3' }], frameRate: 1 });
    // redditM0D — Dave's transparent sheets: idle + stand + 6-frame walk/run.
    // No weapon poses (he's the corporate replacement): telegraph & stumble
    // hold the deadpan stand (the squash coil sells the wind-up), the lunge
    // and vault reuse run frames, victory is him just STANDING over you.
    anim('anim2-walk', 'mod2-walk', 6, 8);
    anim('anim2-run', 'mod2-run', 6, 14);
    this.anims.create({ key: 'anim2-crouch', frames: [{ key: 'mod2-stand' }], frameRate: 1 });
    this.anims.create({ key: 'anim2-leap',
      frames: [{ key: 'mod2-run-3' }, { key: 'mod2-run-6' }], frameRate: 10, repeat: 0 });
    this.anims.create({ key: 'anim2-climb',
      frames: [{ key: 'mod2-run-2' }, { key: 'mod2-run-5' }], frameRate: 9, repeat: 0 });
    this.anims.create({ key: 'anim2-stumble', frames: [{ key: 'mod2-stand' }], frameRate: 1 });
    this.anims.create({ key: 'anim2-victory', frames: [{ key: 'mod2-idle' }], frameRate: 1 });
    this.anims.create({ key: 'anim2-throw',
      frames: [{ key: 'mod2-stand' }, { key: 'mod2-idle' }], frameRate: 5, repeat: 0 });
    this.anims.create({ key: 'anim2-sledge', frames: [{ key: 'mod2-stand' }], frameRate: 1 });
    // redditM0D's brass-knuckle punch — Dave's 11-frame hand-made strike (wind-up →
    // extend → impact flash → electric crackle). Fires during LUNGE: his lunge IS the
    // punch. repeat 0 (strike once, hold last frame); frameRate 32 lands the impact
    // frame inside the 320ms LUNGE window. Fairness is untouched — the catch check
    // still lives only inside the LUNGE window (mod.js); this only changes his look.
    this.anims.create({ key: 'anim2-punch',
      frames: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => ({ key: `mod2-punch-${i}` })), frameRate: 32, repeat: 0 });
    // Balder teleport — Dave's 13-frame purple vanish (charge → detonate → smoke),
    // keyed transparent so it composites on any Reddit theme. Forward = vanish,
    // reversed = reappear/materialise at the new spot.
    const tpFrames = Array.from({ length: 13 }, (_, k) => ({ key: `tp-${k + 1}` }));
    this.anims.create({ key: 'anim-tele-vanish', frames: tpFrames, frameRate: 22, repeat: 0 });
    this.anims.create({ key: 'anim-tele-arrive', frames: tpFrames.slice().reverse(), frameRate: 22, repeat: 0 });
    // BALDER walk — the new pixel gait (bw-1..8), looped
    this.anims.create({ key: 'anim-balder-walk',
      frames: Array.from({ length: 8 }, (_, k) => ({ key: `bw-${k + 1}` })),
      frameRate: 11, repeat: -1 });
    // old bh/bz locomotion (unused by the new boss, kept until Dave says delete)
    for (const pre of ['bh', 'bz']) {
      anim(`anim-${pre}-walk`, `${pre}-walk`, 8, 9);
      anim(`anim-${pre}-run`, `${pre}-run`, 8, 14);
    }

    this.currentSub = 'all';
    this.traveling = false;
    this.showLoading('reddit');
    NB.fetchArena('all')
      .then(data => { this.buildWorld(data); return this.hideLoading(); })
      .catch(e => {
        window.__buildErr = e.message + ' | ' + (e.stack || '');
        console.error('BUILD FAIL:', e.message, e.stack);
        return NB.fetchArena('gaming')
          .then(d => { this.buildWorld(d); return this.hideLoading(); });
      })
      .then(() => this.beginEntrance());
  }

  // The door on the freshly-loaded page: click it to let superMOD out and
  // start the round. (To make the door the title-screen start instead, move
  // this call into TitleScene — the sequence itself is unchanged.)
  beginEntrance() {
    if (!this.entranceActive || this.doorUI) return;
    const W = this.scale.width, H = this.scale.height;
    const doorH = Math.min(H * 0.6, 500);
    const img = this.add.image(W / 2, H * 0.5, 'door-closed').setDepth(18).setScrollFactor(0);
    img.setScale(doorH / img.height);
    const baseScale = img.scaleX;
    const hint = this.add.text(W / 2, H * 0.5 + doorH / 2 + 26, 'CLICK THE DOOR', {
      fontFamily: NB.FONT_ARCADE || 'Courier New', fontSize: '18px', color: '#e8c944',
    }).setOrigin(0.5).setDepth(19).setScrollFactor(0).setStroke('#000000', 5);
    this.tweens.add({ targets: img, scaleX: baseScale * 1.03, scaleY: baseScale * 1.03,
      duration: 780, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.time.addEvent({ delay: 540, loop: true, callback: () => hint.setVisible(!hint.visible) });
    img.setInteractive();
    img.once('pointerdown', () => this.runEntrance(img, hint, baseScale));
    this.doorUI = { img, hint };
    NB.playMoment(this, 'intro');   // ambient meme on the "click the door" screen
  }

  runEntrance(img, hint, baseScale) {
    if (this._entering) return;
    this._entering = true;
    NB.startBed(this);                  // click the door → the chase bed kicks in
    NB.playMoment(this, 'doorOpen');    // ...and the mod bursts out to a meme
    this.tweens.killTweensOf(img);
    hint.destroy();
    const flash = () => {
      const f = this.add.rectangle(this.scale.width / 2, this.scale.height / 2,
        this.scale.width, this.scale.height, 0xffffff, 0.45).setDepth(17).setScrollFactor(0);
      this.tweens.add({ targets: f, alpha: 0, duration: 170, onComplete: () => f.destroy() });
    };
    // beat 1 — the bolt throws, the door swings to the void
    this.cameras.main.shake(150, 0.006); flash();
    img.setScale(baseScale).setTexture('door-open');
    NB.sfx.stumble();
    this.time.delayedCall(650, () => {
      // beat 2 — he's just THERE, filling the frame
      this.cameras.main.shake(240, 0.011); flash();
      img.setTexture('door-mod');
      NB.sfx.caught();
      this.tweens.add({ targets: img, scaleX: baseScale * 1.06, scaleY: baseScale * 1.06, duration: 260 });
      this.time.delayedCall(1050, () => {
        // beat 3 — hand off to the live mod; the hunt begins
        this.tweens.add({ targets: img, alpha: 0, duration: 320, onComplete: () => img.destroy() });
        const cam = this.cameras.main;
        this.mod.sprite.setPosition(this.scale.width / 2, this.scale.height * 0.5 + cam.scrollY).setVisible(true);
        this.mod.telegraphRing.setVisible(false);
        this.mod.setState('LURK');
        this.entranceActive = false;
        this._entering = false;
        this.doorUI = null;
        this.showOnboarding();
      });
    });
  }

  // First-run onboarding: three lines while superM0D still lurks. Auto-fades —
  // no tap-to-dismiss, because tapping IS gameplay. Once per device via the
  // storage-safe flag (Reddit's sandboxed webview degrades to once per page
  // load, which suits drive-by judges fine).
  showOnboarding() {
    if (NB.flagGet('nb_onboarded')) return;
    NB.flagSet('nb_onboarded', '1');
    const W = this.scale.width, H = this.scale.height;
    const boxW = Math.min(W - 24, 560);
    const cy = H * 0.78;
    const objs = [];
    objs.push(this.add.rectangle(W / 2, cy, boxW, 128, 0x000000, 0.65)
      .setDepth(38).setScrollFactor(0).setStrokeStyle(2, 0xd13b2e, 0.9));
    const lines = [
      'FARM posts — hover one, hit the targets, steal its karma',
      'his WIND-UP is your window. RUN.',
      'memes are power. traps are traps.',
      'quiet sub? type a busier one ↑ — more posts, more karma',
    ];
    lines.forEach((t, i) => {
      const txt = this.add.text(W / 2, cy - 43 + i * 29, t, {
        fontFamily: 'Courier New', fontSize: `${Phaser.Math.Clamp(Math.round(W * 0.032), 12, 17)}px`,
        fontStyle: i === 1 ? 'bold' : 'normal',
        color: i === 1 ? '#ffe14d' : i === 3 ? '#7fd8ff' : '#ffffff',
      }).setOrigin(0.5).setDepth(38.5).setScrollFactor(0);
      if (txt.width > boxW - 20) txt.setScale((boxW - 20) / txt.width);
      objs.push(txt);
    });
    this.time.delayedCall(4200, () => objs.forEach(o => {
      if (o.active) this.tweens.add({ targets: o, alpha: 0, duration: 400, onComplete: () => o.destroy() });
    }));
  }

  // Reddit-style loading interstitial: canvas-colored cover + shimmering
  // skeleton feed + bouncing snoo. Dave: travel needs to FEEL like a page
  // load, not a blink — hideLoading() enforces a minimum on-screen time.
  showLoading(label) {
    if (this.loadingUI) this.hideLoadingNow();
    const W = this.scale.width, H = this.scale.height, R = NB.REDDIT;
    const c = (h) => Phaser.Display.Color.HexStringToColor(h).color;
    const objs = [];
    objs.push(this.add.rectangle(W / 2, H / 2, W, H, c(R.canvas)).setDepth(60).setScrollFactor(0));
    const fx = Math.max(40, W / 2 - 340), fw = Math.min(680, W - 80);
    let sy = R.headerH + 40;
    const bars = [];
    for (let i = 0; i < 4 && sy < H - 120; i++) {
      const card = this.add.graphics().setDepth(61).setScrollFactor(0);
      card.fillStyle(c(R.skeleton), 1);
      card.fillCircle(fx + 18, sy + 16, 12);
      card.fillRoundedRect(fx + 40, sy + 8, fw * 0.35, 14, 7);
      card.fillRoundedRect(fx, sy + 38, fw * 0.85, 18, 9);
      card.fillRoundedRect(fx, sy + 66, fw, 130, 12);
      objs.push(card);
      bars.push(card);
      sy += 220;
    }
    this.tweens.add({ targets: bars, alpha: 0.45, duration: 600, yoyo: true, repeat: -1 });
    const snooDot = this.add.circle(W / 2, H - 96, 14, 0xff4500).setDepth(62).setScrollFactor(0);
    objs.push(snooDot);
    this.tweens.add({ targets: snooDot, y: H - 116, duration: 380, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });
    objs.push(this.add.text(W / 2, H - 64, `loading ${label}…`, {
      fontFamily: R.font, fontSize: '15px', fontStyle: 'bold', color: R.textWeak,
    }).setOrigin(0.5).setDepth(62).setScrollFactor(0));
    this.loadingUI = { objs, t0: this.time.now };
  }

  hideLoadingNow() {
    if (!this.loadingUI) return;
    this.loadingUI.objs.forEach(o => { try { o.destroy(); } catch {} });
    this.loadingUI = null;
  }

  hideLoading(minMs = 1200) {
    if (!this.loadingUI) return Promise.resolve();
    const left = Math.max(0, minMs - (this.time.now - this.loadingUI.t0));
    return new Promise(res => this.time.delayedCall(left, () => { this.hideLoadingNow(); res(); }));
  }

  buildWorld(data, opts = {}) {
    const W = this.scale.width, H = this.scale.height;
    const firstBoot = !opts.rebuild;

    if (opts.rebuild && this.page?.dispose) this.page.dispose();

    this.page = NB.buildFakePage(this, W, H, data);
    this.cameras.main.setBounds(0, 0, W, this.page.WORLD_H);
    const feed = this.page.feed;
    this.arenaData = data;
    this.currentSub = data.subreddit || 'all';

    // persistent destruction: fresh tracker per arena, then replay every
    // scar this sub already earned this run (survives sub-travel)
    this.wreck = new NB.Wreckage(this, this.page, this.currentSub);
    this.wreck.applyStored();
    // re-mark posts already looted this run so travel-back shows them claimed
    for (const el of this.page.elements) {
      if (el.kind === 'post' && NB.FARM_STORE.has(`${this.currentSub}|${el.key}`)) this.markFarmed(el);
    }

    if (firstBoot) {
      this.playerPos = { x: feed.x + feed.w * 0.65, y: H * 0.55 };
      this.pointerScreen = { x: feed.x + feed.w * 0.65, y: H * 0.55 };
      // Cursor rides ABOVE EVERYTHING, ALWAYS (Dave's law, 2026-07-10 — "I'm
      // tired of this problem"). No more depth negotiation: death overlay
      // peaks at 42, loading interstitial at 62, nothing else goes near 1000.
      // If you add an overlay, it goes UNDER the cursor. Period.
      this.cursorGfx = this.add.graphics().setDepth(1000);
      this.input.on('pointermove', (p) => {
        this.pointerScreen.x = p.x; this.pointerScreen.y = p.y;
      });
      this.input.on('wheel', (_p, _o, _dx, dy) => {
        this.cameras.main.scrollY = Phaser.Math.Clamp(
          this.cameras.main.scrollY + dy * 0.9, 0, this.page.WORLD_H - H);
      });
      this.mod = new NB.Supermod(this, this.page, feed.x + feed.w * 0.2, H * 0.35);
      // he waits behind the door — hidden + frozen until you open it
      this.mod.sprite.setVisible(false);
      this.mod.telegraphRing.setVisible(false);
      this.mod2 = null;             // redditM0D joins post-ceremony (spawnMod2)
      this.mods = [this.mod];       // every active hunter — effects/updates iterate this
      this.entranceActive = true;
      this.hud = this.add.text(W - 22, H - 14, '★ 0', {
        fontFamily: 'Courier New', fontSize: '22px', fontStyle: 'bold', color: '#ff4500',
      }).setOrigin(1, 1).setDepth(30).setScrollFactor(0);
      // Danger/heat meter — segmented bar (was a bare number, easy to not register).
      this.heatBarG = this.add.graphics().setDepth(30).setScrollFactor(0);
      // Balder promotion-review progress — the only visible sign a second
      // chance is coming; fixes "banned right at a minute, no idea I was close."
      this.balderBarBg = this.add.rectangle(W - 22, H - 64, 120, 6, 0x000000, 0.35)
        .setOrigin(1, 0.5).setDepth(30).setScrollFactor(0);
      this.balderBarFill = this.add.rectangle(W - 142, H - 64, 0, 6, 0xffb648, 0.95)
        .setOrigin(0, 0.5).setDepth(30).setScrollFactor(0);
      // Shield status — separate from the ring on the cursor, which is easy
      // to lose track of mid-chase and gives no "you just used it" moment.
      this.shieldPill = this.add.text(W - 22, H - 78, '🛡 SHIELD READY', {
        fontFamily: 'Courier New', fontSize: '13px', fontStyle: 'bold', color: '#7ab8f5',
      }).setOrigin(1, 1).setDepth(30).setScrollFactor(0).setVisible(false);
      // THE LETTERS tracker — hidden until the first letter is found (no
      // spoiler on fresh devices); the hunt persists across runs, so this
      // restores immediately for a player mid-chain.
      this.lettersHud = this.add.text(W - 22, H - 96, '', {
        fontFamily: 'Courier New', fontSize: '14px', fontStyle: 'bold', color: '#c0392b',
      }).setOrigin(1, 1).setDepth(30).setScrollFactor(0).setVisible(false);
      this.updateLetterHUD();
      NB.syncLetters(this);   // redis truth → merge device cache → refresh HUD
      this.makeMuteButton(W, H);
      this.bindDebugKeys();
      this.bindTravelClicks();
      this.bindSubredditSearch();
      this.ready = true;
      window.__gs = this;
    } else {
      for (const m of this.mods) m.page = this.page;
      if (this.pickups) this.pickups.page = this.page;
      if (this.projectiles) {
        this.projectiles.comments = data.comments;
        this.projectiles.live.forEach(p => { p.card.destroy(); p.label.destroy(); });
        this.projectiles.live = [];
      }
    }

    if (this.pickups) {
      this.pickups.items.forEach(it => it.objs.forEach(o => o.destroy()));
      this.pickups.items = [];
    } else {
      this.pickups = new NB.Pickups(this, this.page);
    }
    if (!this.projectiles) this.projectiles = new NB.Projectiles(this, data.comments);
    if (!this.npc) this.npc = new NB.Cheerleader(this);
    if (!this.admin) this.admin = new NB.AdminCameo(this);
    this.userName = data.user;

    // page changed: an un-grabbed letter dies with it, and the "died here"
    // red pointers re-draw against THIS page's posts
    NB.clearLetter(this);
    this.drawDeathMarkers();

    if (opts.toast) this.floatText(W / 2, H * 0.22, opts.toast, '#0079d3');
  }

  // ── Collection strip: every meme grabbed this run, STACKED ×counts
  // (Dave 2026-07-11: "make sure they stack in the UI"). Top-right under the
  // header; real badge art when loaded, lettered chip when not.
  updateMemeBagHUD() {
    if (this._bagObjs) this._bagObjs.forEach(o => { try { o.destroy(); } catch {} });
    this._bagObjs = [];
    for (const id of Object.keys(this.memeBag)) {
      if (!this._bagOrder.includes(id)) this._bagOrder.push(id);
    }
    const W = this.scale.width;
    const cell = 30, size = 24;
    const cap = W < 768 ? 8 : 14;
    const ids = this._bagOrder.slice(0, cap);
    const y = (this.page ? this.page.headerH : 64) + 18;
    let x = W - 16 - ids.length * cell;
    for (const id of ids) {
      const n = this.memeBag[id] || 0;
      if (this.textures.exists(`meme-${id}`)) {
        const src = this.textures.get(`meme-${id}`).getSourceImage();
        this._bagObjs.push(this.add.image(x + cell / 2, y, `meme-${id}`)
          .setScale(size / Math.max(src.width, src.height)).setDepth(30).setScrollFactor(0));
      } else {
        this._bagObjs.push(this.add.rectangle(x + cell / 2, y, size, size,
          Phaser.Display.Color.HexStringToColor(NB.subColor(id)).color, 0.9)
          .setDepth(30).setScrollFactor(0));
        this._bagObjs.push(this.add.text(x + cell / 2, y, id[0].toUpperCase(), {
          fontFamily: 'Courier New', fontSize: '13px', fontStyle: 'bold', color: '#ffffff',
        }).setOrigin(0.5).setDepth(31).setScrollFactor(0));
      }
      if (n > 1) {
        this._bagObjs.push(this.add.text(x + cell - 3, y + size / 2 + 2, `×${n}`, {
          fontFamily: 'Courier New', fontSize: '11px', fontStyle: 'bold',
          color: '#ffb648', backgroundColor: '#000000',
        }).setOrigin(1, 1).setDepth(32).setScrollFactor(0));
      }
      x += cell;
    }
    if (this._bagOrder.length > cap) {
      this._bagObjs.push(this.add.text(W - 16, y - size / 2 - 4, `+${this._bagOrder.length - cap} more`, {
        fontFamily: 'Courier New', fontSize: '10px', color: '#8ba2ad',
      }).setOrigin(1, 1).setDepth(30).setScrollFactor(0));
    }
  }

  updateLetterHUD() {
    if (!this.lettersHud) return;
    const st = NB.lettersState();
    this.lettersHud.setText(NB.LETTER_CHAIN.map((e, i) => (st[i] ? e.letter : '·')).join(' '));
    this.lettersHud.setVisible(st.some(Boolean));
  }

  // Speaker toggle — kills meme voices + bed music only (the letter hunt is a
  // 6-7 run grind; Dave's kid wanted an off switch that survives the grind).
  // Bottom-left so it never collides with the karma star / letters HUD on the
  // right. Its bounds are checked in bindTravelClicks so a tap here can't also
  // trigger a sub-hop.
  makeMuteButton(W, H) {
    const label = () => (NB.audioMuted ? '🔇' : '🔊');
    this.muteBtn = this.add.text(18, H - 16, label(), {
      fontFamily: 'Courier New', fontSize: '22px',
    }).setOrigin(0, 1).setDepth(31).setScrollFactor(0).setAlpha(0.85)
      .setInteractive({ useHandCursor: false });
    this.muteBtn.on('pointerdown', (p, lx, ly, ev) => {
      if (ev) ev.stopPropagation();
      NB.toggleMuted(this);
      this.muteBtn.setText(label());
      this.floatText(60, H - 40, NB.audioMuted ? 'meme audio off' : 'meme audio on', '#8ba2ad');
    });
  }

  // "Died here" — faded red cursor pointers on the exact posts other players
  // were caught at (Dave: a red pointer, NOT bloodstains). Anchored by post
  // key so layout shifts don't lie; deaths on posts not in this fetch simply
  // don't draw. Stand near one and the name whispers once.
  drawDeathMarkers() {
    (this._deathMarkers || []).forEach(m => { try { m.g.destroy(); } catch {} });
    this._deathMarkers = [];
    NB.fetchDeathMarkers().then(list => {
      if (!list.length || !this.page) return;
      for (const d of list) {
        if (!d || !d.post) continue;
        const el = this.page.elements.find(e => e.kind === 'post' && e.key === d.post);
        if (!el) continue;
        const nm = d.name || 'u/lurker';
        let h = 0;
        for (let i = 0; i < nm.length; i++) h = (h * 31 + nm.charCodeAt(i)) >>> 0;
        const x = el.rect.x + 34 + (h % Math.max(1, Math.round(el.rect.width) - 78));
        const y = el.rect.y + el.rect.height - 28;
        const g = this.add.graphics().setDepth(9);
        g.fillStyle(0x99201a, 0.55);
        g.beginPath();
        g.moveTo(x, y); g.lineTo(x, y + 17); g.lineTo(x + 4.5, y + 13);
        g.lineTo(x + 8, y + 20); g.lineTo(x + 11, y + 18.5); g.lineTo(x + 7.5, y + 12);
        g.lineTo(x + 12.5, y + 12); g.closePath(); g.fillPath();
        g.lineStyle(1.2, 0x5c0f0b, 0.5); g.strokePath();
        this._deathMarkers.push({ x, y, g, name: nm, karma: d.karma || 0, whispered: false });
      }
    }).catch(() => {});
  }

  checkDeathWhispers() {
    for (const m of this._deathMarkers || []) {
      if (m.whispered) continue;
      if (Math.hypot(this.playerPos.x - m.x, this.playerPos.y - m.y) < 38) {
        m.whispered = true;
        this.floatText(m.x + 6, m.y - 14, `${m.name} died here · ${NB.fmtKarma(m.karma)}`, '#c0392b');
      }
    }
  }

  bindTravelClicks() {
    this.input.on('pointerdown', (p) => {
      if (!this.ready || this.caught || this.ceremonyRunning || this.traveling || this.entranceActive || this.pickerOpen) return;
      // speaker toggle owns its own tap — never let it fall through to travel
      if (this.muteBtn && this.muteBtn.getBounds().contains(p.x, p.y)) return;
      // mobile hamburger → open the sub drawer (checked before any travel zone)
      const mb = this.page.menuBtn;
      if (mb && mb.contains(p.x, p.y)) { this.openSubMenu(); return; }
      const cam = this.cameras.main;
      const wx = p.x, wy = p.y + cam.scrollY;
      for (const z of this.page.clickZones || []) {
        const hit = z.screen ? z.rect.contains(p.x, p.y) : z.rect.contains(wx, wy);
        if (hit) {
          this.travelToSub(z.sub, z.label);
          return;
        }
      }
    });
  }

  // Mobile side drawer — the hamburger menu, our stand-in for the desktop left
  // nav (which mobile widths don't render). Opens like Reddit's own slide-out:
  // a left panel over a scrim. Opening FREEZES the hunt (fairness — you can't be
  // caught behind a menu you can't see past); tapping a community hops there,
  // which grants the usual travel head-start (the "escape"). Tap the scrim to
  // dismiss. Mobile-only — page.menuBtn is null on desktop.
  openSubMenu() {
    if (this.pickerOpen || !this.page.menuBtn || this.traveling || this.caught || this.ceremonyRunning) return;
    this.pickerOpen = true;
    const W = this.scale.width, H = this.scale.height, R = NB.REDDIT;
    const c = (h) => Phaser.Display.Color.HexStringToColor(h).color;
    const panelW = Math.min(300, Math.round(W * 0.82));
    const objs = [];   // panel contents (these slide in); the scrim stays put
    const add = (o) => { objs.push(o); return o; };

    const scrim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.5)
      .setDepth(37).setScrollFactor(0).setInteractive().setAlpha(0);
    scrim.on('pointerdown', () => this.closeSubMenu());
    this.tweens.add({ targets: scrim, alpha: 1, duration: 200 });

    // panel (swallows taps so they don't fall through to the scrim) + right edge
    add(this.add.rectangle(0, 0, panelW, H, c(R.canvas), 1).setOrigin(0, 0)
      .setDepth(38).setScrollFactor(0).setInteractive());
    add(this.add.rectangle(panelW - 1, 0, 1, H, c(R.border), 1).setOrigin(0, 0).setDepth(38).setScrollFactor(0));
    add(this.add.text(20, 20, 'COMMUNITIES', {
      fontFamily: R.font, fontSize: '12px', fontStyle: 'bold', color: R.textWeak,
    }).setDepth(39).setScrollFactor(0));

    // navigable subs: fixed entries + recent + this page's top communities
    const items = [
      { sub: 'all', label: 'Home', icon: '🏠' },
      { sub: 'popular', label: 'Popular', icon: '📈' },
      { sub: 'news', label: 'News', icon: '📰' },
    ];
    for (const s of (NB.RECENT_SUBS || []).slice(0, 4)) items.push({ sub: s, label: `r/${s}` });
    for (const cm of ((this.arenaData && this.arenaData.popular) || []).slice(0, 16)) {
      items.push({ sub: (cm.name || '').replace(/^r\//, ''), label: cm.name });
    }
    const seen = new Set();
    const list = items.filter(it => it.sub && !seen.has(it.sub) && seen.add(it.sub));

    let ry = 48;
    for (const it of list) {
      if (ry > H - 30) break;
      const s = it.sub, l = it.label;
      const hot = add(this.add.rectangle(0, ry, panelW, 36, c(R.navActive), 0.0001).setOrigin(0, 0)
        .setDepth(38.5).setScrollFactor(0).setInteractive());
      hot.on('pointerdown', () => { this.closeSubMenu(); this.travelToSub(s, l); });
      if (it.icon) add(this.add.text(16, ry + 9, it.icon, { fontFamily: R.font, fontSize: '15px' }).setDepth(39).setScrollFactor(0));
      else add(this.add.circle(24, ry + 18, 9, c(NB.subColor(s))).setDepth(39).setScrollFactor(0));
      add(this.add.text(44, ry + 9, l, { fontFamily: R.font, fontSize: '15px', color: R.text }).setDepth(39).setScrollFactor(0));
      ry += 38;
    }

    // slide the panel + rows in from the left; the scrim stays full-screen
    objs.forEach(o => { o.x -= panelW; });
    this.tweens.add({ targets: objs, x: `+=${panelW}`, duration: 200, ease: 'Cubic.easeOut' });
    this.subMenu = { objs, scrim };
  }

  closeSubMenu() {
    if (!this.subMenu) return;
    const sm = this.subMenu;
    this.subMenu = null;
    this.pickerOpen = false;
    const all = [...sm.objs, sm.scrim];
    this.tweens.add({ targets: all, alpha: 0, duration: 130,
      onComplete: () => all.forEach(o => { try { o.destroy(); } catch {} }) });
  }

  travelToSub(sub, label, onArrive) {
    if (this.traveling) return;
    const clean = (sub || 'all').replace(/^r\//i, '');
    if (clean === this.currentSub) { if (onArrive) onArrive(); return; }
    this.traveling = true;
    NB.playMoment(this, 'travel');   // hopping subs → a travel meme
    this.showLoading(label || `r/${clean}`);
    NB.fetchArena(clean).then(data => {
      const snaps = this.mods.map(m => ({
        m, x: m.sprite.x, y: m.sprite.y, revenant: m.revenant, heat: m.heat,
      }));
      // RECENT nav section mirrors real browsing history
      if (clean !== 'all' && clean !== 'popular') {
        NB.RECENT_SUBS = [clean, ...(NB.RECENT_SUBS || []).filter(s => s !== clean)].slice(0, 4);
      }
      this.buildWorld(data, { rebuild: true, toast: `now browsing ${data.name}` });
      // The chase RE-ACQUIRES on the new page: drop any frozen lunge/telegraph
      // so nobody can land a mid-air attack the instant the load lifts, AND
      // shove every hunter back to a minimum gap — switching pages is meant to
      // buy a head start, not dump you back onto the exact spot they had you
      // pinned. Each then has to close in and telegraph (500ms) before a catch.
      const MIN_GAP = 440;
      for (const sn of snaps) {
        const m = sn.m;
        m.sprite.setPosition(sn.x, sn.y);
        m.revenant = sn.revenant;
        m.heat = sn.heat;
        if (sn.revenant) m.sprite.setTint(0xbbffbb);
        const mx = m.sprite.x - this.playerPos.x;
        const my = m.sprite.y - this.playerPos.y;
        const gap = Math.hypot(mx, my);
        if (gap < MIN_GAP) {
          const a = gap > 0.5 ? Math.atan2(my, mx) : Math.random() * Math.PI * 2;
          m.sprite.x = Phaser.Math.Clamp(
            this.playerPos.x + Math.cos(a) * MIN_GAP, 30, this.scale.width - 30);
          m.sprite.y = Phaser.Math.Clamp(
            this.playerPos.y + Math.sin(a) * MIN_GAP, this.page.headerH + 40, this.page.WORLD_H - 30);
        }
        m.stunT = 0;
        m.telegraphRing.setVisible(false);
        if (!m.frozen) m.setState('HUNT');   // a frozen superM0D stays "upstairs"
      }
      this.hideLoading().then(() => {
        this.traveling = false;
        if (onArrive) onArrive();
      });
    }).catch(e => {
      this.hideLoadingNow();
      this.traveling = false;
      this.floatText(this.scale.width / 2, this.scale.height * 0.2, `fetch failed: ${e.message}`, '#d93900');
    });
  }

  // Real <input> overlaid on the header's search box (Phaser DOM element) —
  // needed for a native mobile keyboard since this ships inside Reddit's
  // webview. Typing any subreddit browses there; a "cursed" one also
  // spawns a bonus pickup regardless of whether you were already there.
  bindSubredditSearch() {
    const bar = this.page.searchBar;
    if (!bar) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Find anything';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.style.cssText = `width:${Math.max(80, bar.w)}px;box-sizing:border-box;height:${bar.h}px;` +
      `border:none;outline:none;background:transparent;font-family:${NB.REDDIT.font};` +
      `font-size:14px;color:${NB.REDDIT.text};padding:0;`;
    this.searchInput = input;
    this.searchDom = this.add.dom(bar.x + bar.w / 2, bar.y, input).setDepth(28).setScrollFactor(0);
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        const raw = input.value;
        input.value = '';
        input.blur();
        if (raw.trim()) this.trySubredditSearch(raw);
      } else if (e.key === 'Escape') {
        input.value = '';
        input.blur();
      }
    });
    // Focusing the search to type a destination freezes the hunt — you can't
    // type AND survive otherwise (the mod walks into your parked cursor). Same
    // safe-navigation rule as the sub-drawer. Not exploitable: you can't farm
    // karma while frozen, and it won't cancel a committed catch (see `frozen`).
    input.addEventListener('focus', () => { this.searchFocused = true; });
    input.addEventListener('blur', () => { this.searchFocused = false; });
  }

  trySubredditSearch(raw) {
    const clean = raw.replace(/^r\//i, '').trim();
    if (!clean) return;
    const cursedMsg = NB.CURSED_SUBS[clean.toLowerCase()];
    this.travelToSub(clean, `r/${clean}`, cursedMsg ? () => {
      if (this.caught || !this.pickups) return;
      this.pickups.spawnCursed(this.playerPos.x, this.playerPos.y - 50);
      this.floatText(this.scale.width / 2, this.scale.height * 0.22, cursedMsg, '#2ecc71');
      // the letter hunt: cursed subs in the chain drop their letter (once);
      // revisits re-whisper the clue so a lost player can find the trail
      const li = NB.LETTER_CHAIN.findIndex(e => e.sub === clean.toLowerCase());
      if (li >= 0) {
        if (!NB.lettersState()[li]) NB.spawnLetter(this, NB.LETTER_CHAIN[li]);
        else this.floatText(this.scale.width / 2, this.cameras.main.scrollY + 120,
          NB.LETTER_CHAIN[li].clue, '#9a3fd4');
      }
    } : null);
  }

  bindDebugKeys() {
    // Alt+Shift — Huion owns Ctrl+Alt. LOCALHOST ONLY: the old comment claimed
    // the build strips these — it never did, and they shipped live to real
    // Reddit through v0.0.25 (anyone could force-spawn BALDER or instakill).
    // Dave 2026-07-11: hard-gate them to the dev server instead.
    if (!/^(localhost|127\.)/.test(location.hostname)) return;
    if (!this.input.keyboard) return;
    this.input.keyboard.on('keydown', (ev) => {
      if (!ev.altKey || !ev.shiftKey || !this.ready) return;
      const k = ev.key.toLowerCase();
      if (k === 'b' && !this.balderUsed && !this.ceremonyRunning) {
        this.balderUsed = true;
        this.survivalMs = Math.max(this.survivalMs, 61000);
        NB.playBalderCeremony(this, () => {
          if (this.caught) return;
          NB.spawnMod2(this);
          this.time.delayedCall(NB.TUNE.REVENANT_DELAY_MS, () => {
            if (!this.caught) NB.spawnRevenant(this);
          });
        });
      } else if (k === 'r' && !this.ceremonyRunning && !this.caught) {
        NB.spawnRevenant(this);
      } else if (k === 'm' && !this.ceremonyRunning && !this.caught) {
        NB.spawnMod2(this);
      } else if (k === 'y' && !this.ceremonyRunning && !this.caught) {
        NB.demoTeleport(this);
      } else if (k === 'x' && !this.ceremonyRunning && !this.caught) {
        this.bossDone = false;          // debug: force the BALDER fight, gates be damned
        NB.spawnBalder(this);
      } else if (k === 't') {
        this.survivalMs += 30000;
      } else if (k === 'd' && !this.caught) {
        this.mod.setState('CAUGHT_YOU');
        this.onCaught();
      } else if (k === 's' && this.ceremonyRunning) {
        if (NB._cutsceneWrap) { NB._cutsceneWrap.skip(); return; }
        // emergency unstick (fallback cinematic hung): revert to a live hunt
        this.ceremonyRunning = false;
        this.mod.frozen = false;
        this.mod.sprite.setVisible(true).setScale(this.mod.baseScale).setAngle(0).setAlpha(1);
        this.mod.sprite.anims.resume();
        this.mod.setState('HUNT');
        this.cameras.main.zoomTo(1, 200);
      }
    });
  }

  drawCursor(x, y) {
    const g = this.cursorGfx;
    g.clear();
    g.fillStyle(0x000000, 1);
    g.beginPath();
    g.moveTo(x, y); g.lineTo(x, y + 17); g.lineTo(x + 4.5, y + 13);
    g.lineTo(x + 8, y + 20); g.lineTo(x + 11, y + 18.5); g.lineTo(x + 7.5, y + 12);
    g.lineTo(x + 12.5, y + 12); g.closePath(); g.fillPath();
    g.lineStyle(1.5, 0xffffff, 1); g.strokePath();
  }

  floatText(x, y, msg, color) {
    const t = this.add.text(x, y, msg, {
      fontFamily: 'Courier New', fontSize: '15px', fontStyle: 'bold', color,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 1100,
      onComplete: () => t.destroy() });
  }

  onCommentHit(x, y) {
    NB.sfx.commentHit();
    this.cameras.main.shake(160, 0.007);
    if (!this.pickups.absorb()) {
      this.mods.forEach(m => m.burst(1400));   // pressure, never a catch
      this.floatText(x, y - 20, 'ratio\'d', '#e0452a');
      const v = this.add.rectangle(this.scale.width / 2, this.scale.height / 2,
        this.scale.width, this.scale.height, 0xe0452a, 0.16).setDepth(35).setScrollFactor(0);
      this.tweens.add({ targets: v, fillAlpha: 0, duration: 500, onComplete: () => v.destroy() });
    }
  }

  doYank() {
    NB.sfx.yank();
    const cam = this.cameras.main;
    const H = this.scale.height;
    const dir = Math.random() < 0.5 && cam.scrollY > 300 ? -1 : 1;
    const dest = Phaser.Math.Clamp(cam.scrollY + dir * H * 0.9, 0, this.page.WORLD_H - H);
    cam.shake(350, 0.012);
    this.tweens.add({ targets: cam, scrollY: dest, duration: 380, ease: 'Quad.easeIn' });
    for (const el of this.page.elements) this.page.shake(el, this);
    // the slam rattles a few posts loose — permanent damage, not just a shake
    if (this.wreck) {
      const posts = this.page.elements.filter(e => e.kind === 'post');
      Phaser.Utils.Array.Shuffle(posts).slice(0, 3)
        .forEach(el => this.wreck.hit(el, NB.TUNE.WRECK_YANK));
    }
    this.floatText(this.playerPos.x, this.playerPos.y - 50, 'SCROLL YANKED', '#e0452a');
  }

  onCaught() {
    if (this.caught || this.ceremonyRunning) return;
    NB.playMoment(this, 'caught');   // the grab — an impact meme
    // the promotion review: survive past the threshold and the catch is
    // intercepted. superM0D is called upstairs, redditM0D tags in HOT, and
    // REVENANT_DELAY_MS later the old mod claws back out — then it's BOTH.
    // If the ceremony explodes (a webview API we can't touch, whatever), we
    // fall THROUGH to a normal death — never a bricked run.
    // (never intercepts a BALDER kill — management doesn't save you from management)
    if (!this.balderUsed && this.balderEligible && !this.bossKill) {
      this.balderUsed = true;
      try {
        NB.playBalderCeremony(this, () => {
          if (this.caught) return;
          NB.spawnMod2(this);
          this.time.delayedCall(NB.TUNE.REVENANT_DELAY_MS, () => {
            if (!this.caught) NB.spawnRevenant(this);
          });
        });
        return;
      } catch (e) {
        console.warn('ceremony failed, proceeding to the ban:', e);
        this.ceremonyRunning = false;
      }
    }
    this.caught = true;
    NB.sfx.caught();
    NB.stopBed();                              // game over — kill the chase bed
    // record it — the name feeds the o7 swarm, the POST feeds the red-pointer
    // "died here" markers other players see on that exact card
    let deathPost = null, bestD = 1e9;
    for (const el of (this.page && this.page.elements) || []) {
      if (el.kind !== 'post') continue;
      const ddx = (el.rect.x + el.rect.width / 2) - this.playerPos.x;
      const ddy = (el.rect.y + el.rect.height / 2) - this.playerPos.y;
      const dd = Math.hypot(ddx, ddy);
      if (dd < bestD) { bestD = dd; deathPost = el.key; }
    }
    NB.postDeath(this.userName, this.karma, deathPost);
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.shake(220, 0.012);
    this.time.delayedCall(400, () => {
      const layer = [];
      // pulled once per death (onCaught is guarded, runs once per removal)
      const verdict = this.bossKill ? '[ ERASED ]' : Phaser.Utils.Array.GetRandom(NB.BAN_VERDICTS);
      const reason = this.bossKill ? 'Reason: BALDER handled it personally.' : NB.nextBanReason();
      NB.playMoment(this, 'banned');   // the [ REMOVED ] screen — a death meme
      layer.push(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.85).setDepth(40).setScrollFactor(0));

      // the mod stamps a random meme on the removal notice (the visual half of
      // the "reason"). Aspect-preserved, width-capped, floating transparent
      // over the blackout — Dave shot transparent masters for exactly this,
      // no white card behind them. memeH = 0 when no art loaded, so the text
      // layout just closes up.
      const cy = H / 2 - 8;
      let memeH = 0;
      // GRACE NOTE: survived >60s vs Balder → the white-suit Balder tips his
      // hat instead of a random L-meme stamp. He still got you ([ ERASED ]);
      // this only warms the send-off. Otherwise: the usual death meme.
      const stampKey = (this.bossThanks && this.textures.exists('balder-beaten'))
        ? 'balder-beaten' : null;
      const memeId = Phaser.Utils.Array.GetRandom(NB.DEATH_MEMES);
      const drawKey = stampKey || (this.textures.exists(`meme-${memeId}`) ? `meme-${memeId}` : null);
      if (drawKey) {
        const src = this.textures.get(drawKey).getSourceImage();
        const capH = stampKey ? Phaser.Math.Clamp(Math.round(H * 0.42), 200, 360)
                              : Phaser.Math.Clamp(Math.round(H * 0.2), 96, 168);
        const scale = Math.min(capH / src.height, (W * 0.8) / src.width);
        const dw = src.width * scale, dh = src.height * scale;
        memeH = dh;
        this.add.image(W / 2, cy, drawKey).setDisplaySize(dw, dh)
          .setDepth(41.5).setScrollFactor(0);
      }
      this.add.text(W / 2, cy - memeH / 2 - 42, verdict, {
        fontFamily: 'Courier New', fontSize: '46px', fontStyle: 'bold', color: '#ff4d4d',
      }).setOrigin(0.5).setDepth(41).setScrollFactor(0);
      this.add.text(W / 2, cy + memeH / 2 + 22, `${this.userName} · ${reason}`, {
        fontFamily: 'Courier New', fontSize: '16px', color: '#cccccc',
        align: 'center', wordWrap: { width: W - 48 },
      }).setOrigin(0.5).setDepth(41).setScrollFactor(0);
      const newBest = NB.savePersonalBest(this.karma, reason);
      NB.postScore(this.userName, this.karma, reason);   // subreddit leaderboard (redis)
      const pb = NB.getPersonalBest();
      const runLine = `${NB.fmtKarma(this.karma)} karma farmed`;
      const bestLine = newBest ? 'NEW HIGH SCORE' : `best: ${NB.fmtKarma(pb)}`;
      this.add.text(W / 2, cy + memeH / 2 + 52, runLine, {
        fontFamily: 'Courier New', fontSize: '15px', color: '#888888',
      }).setOrigin(0.5).setDepth(41).setScrollFactor(0);
      this.add.text(W / 2, cy + memeH / 2 + 78, bestLine, {
        fontFamily: 'Courier New', fontSize: newBest ? '17px' : '14px',
        fontStyle: newBest ? 'bold' : 'normal', color: newBest ? '#ff4500' : '#666666',
      }).setOrigin(0.5).setDepth(41).setScrollFactor(0);
      // the grace note — you lasted a full minute against the ending itself
      if (this.bossThanks) {
        this.add.text(W / 2, cy + memeH / 2 + 108, 'THANK YOU FOR PLAYING', {
          fontFamily: 'Courier New', fontSize: '18px', fontStyle: 'bold', color: '#ffd76a',
        }).setOrigin(0.5).setDepth(41).setScrollFactor(0);
      }
      // o7 salute swarm — real player deaths (redis) blended with flavor names.
      // Flavor shows immediately; real recent-death names swap in when the fetch
      // resolves (a new sub / offline just keeps the flavor names).
      let swarmNames = ['u/ghost_of_karma', 'u/former_lurker', 'u/deleted_2019', 'u/plz_no_ban',
                        'u/wasnt_even_posting', 'u/mobile_user_42', 'u/f_in_the_chat', this.userName];
      NB.fetchRecentDeaths().then(real => { if (real && real.length) swarmNames = [...real, this.userName]; });
      this.time.addEvent({ repeat: 18, delay: 350, callback: () => {
        const t = this.add.text(Phaser.Math.Between(40, W - 60), Phaser.Math.Between(60, H - 60),
          `${Phaser.Utils.Array.GetRandom(swarmNames)}  o7`, {
            fontFamily: 'Courier New', fontSize: `${Phaser.Math.Between(12, 17)}px`, color: '#8fd18f',
          }).setDepth(42).setAlpha(0).setScrollFactor(0);
        this.tweens.add({ targets: t, alpha: 0.9, duration: 260, yoyo: true, hold: 900,
          onComplete: () => t.destroy() });
      }});
      this.add.text(W / 2, H - 46, 'tap to appeal (denied — run it back)', {
        fontFamily: 'Courier New', fontSize: '14px', color: '#666666',
      }).setOrigin(0.5).setDepth(41).setScrollFactor(0);
      this.time.delayedCall(600, () => {
        this.input.once('pointerdown', () => this.scene.restart());
      });
    });
  }

  hitStop(ms) { this.hitStopT = Math.max(this.hitStopT || 0, ms); }

  // KARMA HEIST: stealing a fresh, not-yet-shredded post is an ACTIVE aim
  // challenge — FARM_TARGETS reticles pop up one at a time inside the card;
  // track your cursor onto each within FARM_TARGET_MS. Miss one (it expires,
  // or you leave the post) and the WHOLE sequence resets to target #1 — no
  // partial credit. That's the difficulty: it demands attention, not just
  // patience. Stealing a damaged post OR one he's right on top of = CLUTCH 2x
  // (rewards farming under his hammer, where missing a target is genuinely
  // dangerous). A post he destroys (stage 3) is karma gone forever — the race.
  farmCheck(dt) {
    const p = this.playerPos;
    for (const el of this.page.elements) {
      if (el.kind !== 'post' || !el.karma) continue;
      const fkey = `${this.currentSub}|${el.key}`;
      if (NB.FARM_STORE.has(fkey) || (this.wreck && this.wreck.stage(el) >= 3)) {
        this.clearFarmSeq(el);
        continue;
      }
      const inside = el.rect.contains(p.x, p.y);
      if (!inside) {
        if (el._farmSeq) this.resetFarmSeq(el, false);   // left the post — no float text, not a "miss"
        continue;
      }
      if (!el._farmSeq) this.startFarmSeq(el);

      const seq = el._farmSeq;
      seq.t -= dt;
      const tx = el.rect.x + seq.pts[seq.i].x, ty = el.rect.y + seq.pts[seq.i].y;
      if (Math.hypot(p.x - tx, p.y - ty) < NB.TUNE.FARM_TARGET_RADIUS) {
        seq.i++;
        NB.sfx.pickup();
        if (seq.i >= seq.pts.length) { this.completeFarm(el, fkey, p); continue; }
        seq.t = NB.TUNE.FARM_TARGET_MS;   // next target, fresh window
      } else if (seq.t <= 0) {
        this.resetFarmSeq(el, true);   // timed out — a real miss, flagged
        continue;
      }
      this.drawFarmSeq(el);
    }
  }

  // Pick FARM_TARGETS random points inside the card (inset so reticles never
  // sit under the header/edges) and start the sequence at target #1.
  startFarmSeq(el) {
    const r = el.rect, pad = 26;
    const pts = [];
    for (let i = 0; i < NB.TUNE.FARM_TARGETS; i++) {
      pts.push({
        x: Phaser.Math.Between(pad, Math.max(pad + 1, r.width - pad)),
        y: Phaser.Math.Between(pad, Math.max(pad + 1, r.height - pad)),
      });
    }
    el._farmSeq = { pts, i: 0, t: NB.TUNE.FARM_TARGET_MS };
  }

  resetFarmSeq(el, missed) {
    if (missed && el._farmSeq) {
      const r = el.rect, pt = el._farmSeq.pts[el._farmSeq.i];
      this.floatText(r.x + pt.x, r.y + pt.y - 10, 'MISSED', '#ff4d4d');
      NB.sfx.commentHit();
    }
    el._farmSeq = null;
    if (el._farmG) el._farmG.clear();
  }

  clearFarmSeq(el) {
    el._farmSeq = null;
    if (el._farmG) el._farmG.clear();
  }

  completeFarm(el, fkey, p) {
    NB.FARM_STORE.add(fkey);
    this.markFarmed(el);
    this.clearFarmSeq(el);
    const damaged = this.wreck && this.wreck.stage(el) >= 1;
    const modClose = this.mods.some(m => !m.frozen &&
      Math.hypot(m.sprite.x - p.x, m.sprite.y - p.y) < 175);
    const clutch = damaged || modClose;
    const gained = Math.round(el.karma * (clutch ? 2 : 1));
    this.karma += gained;
    NB.sfx.pickup();
    this.floatText(p.x, el.rect.y + 16, `+${NB.fmtKarma(gained)}${clutch ? '  CLUTCH!' : ''}`,
      clutch ? '#ff4500' : '#46d160');
  }

  // Current target reticle (pulses, shrinks visually as its window runs out)
  // + progress pips for completed targets in the corner.
  drawFarmSeq(el) {
    if (!el._farmG) {
      el._farmG = this.add.graphics().setDepth(9.5);
      el.objs.push(el._farmG);
    }
    const g = el._farmG, seq = el._farmSeq, r = el.rect;
    g.clear();
    if (!seq) return;

    // progress pips, top-right corner
    const n = seq.pts.length, pip = 6, gap = 5;
    let px = r.x + r.width - 16 - (n - 1) * (pip * 2 + gap);
    const py = r.y + 16;
    for (let k = 0; k < n; k++) {
      g.fillStyle(k < seq.i ? 0x46d160 : 0x000000, k < seq.i ? 0.95 : 0.3);
      g.fillCircle(px, py, pip);
      px += pip * 2 + gap;
    }

    // target reticle — shrinks as its window closes, so a miss is telegraphed
    const t = el.rect.x + seq.pts[seq.i].x, ty = r.y + seq.pts[seq.i].y;
    const frac = Phaser.Math.Clamp(seq.t / NB.TUNE.FARM_TARGET_MS, 0, 1);
    g.lineStyle(3, 0x000000, 0.3);
    g.strokeCircle(t, ty, NB.TUNE.FARM_TARGET_RADIUS + 3);
    g.lineStyle(3, 0xffb648, 0.95);
    g.strokeCircle(t, ty, NB.TUNE.FARM_TARGET_RADIUS * frac);
    g.fillStyle(0xffb648, 0.5);
    g.fillCircle(t, ty, 3);
  }

  // Danger meter, Balder progress, shield status — makes the game's existing
  // discrete/binary state (heat level, one-time promotion review, single-charge
  // shield) legible at a glance instead of a bare number or an easy-to-miss
  // ring on the cursor. No new mechanics, just visibility for what already exists.
  updateHudExtras() {
    const W = this.scale.width, H = this.scale.height;

    // heat: HEAT_MAX segments, green (calm) -> red (frenzied).
    // With two hunters live, the bar reads the angriest ACTIVE one (a frozen
    // superM0D waiting on his resurrection carries stale heat — ignore it).
    const g = this.heatBarG;
    g.clear();
    const heat = Math.max(0, ...this.mods.filter(m => !m.frozen).map(m => m.heat));
    const n = NB.TUNE.HEAT_MAX, segW = 14, segH = 8, gap = 3;
    const totalW = n * segW + (n - 1) * gap;
    let x = W - 22 - totalW;
    const y = H - 46;
    for (let i = 0; i < n; i++) {
      const filled = i < heat;
      const t = n > 1 ? i / (n - 1) : 0;
      const r = Math.round(70 + (230 - 70) * t), gr = Math.round(200 + (60 - 200) * t), b = Math.round(120 + (50 - 120) * t);
      g.fillStyle(filled ? (r << 16 | gr << 8 | b) : 0x333333, filled ? 0.95 : 0.35);
      g.fillRoundedRect(x, y, segW, segH, 2);
      x += segW + gap;
    }

    // Balder promotion review: hides once spent (one-time-per-run resource,
    // shouldn't imply it recharges); pulses in the last 10% before ready.
    if (this.balderUsed) {
      this.balderBarBg.setVisible(false);
      this.balderBarFill.setVisible(false);
    } else {
      this.balderBarBg.setVisible(true).setAlpha(1);
      this.balderBarFill.setVisible(true);
      const frac = Phaser.Math.Clamp(this.survivalMs / NB.TUNE.BALDER_SURVIVAL_MS, 0, 1);
      this.balderBarFill.width = 120 * frac;
      this.balderBarFill.setFillStyle(frac >= 1 ? 0x46d160 : 0xffb648);
      this.balderBarFill.setAlpha(frac > 0.9 ? 0.7 + 0.3 * Math.sin(this.time.now / 120) : 0.95);
    }

    // Shield: only visible today as a small ring on the cursor — easy to lose
    // track of mid-chase. This gives a persistent, fixed-position "you have a
    // save" readout distinct from that ring.
    this.shieldPill.setVisible(!!(this.pickups && this.pickups.shield));
  }

  markFarmed(el) {
    if (el._farmed) return;
    el._farmed = true;
    const r = el.rect;
    const c = this.add.circle(r.x + r.width - 20, r.y + 18, 11, 0xff4500, 0.92).setDepth(-0.5);
    const t = this.add.text(r.x + r.width - 20, r.y + 18, '↑', {
      fontFamily: 'Arial', fontSize: '13px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(-0.4);
    el.objs.push(c, t);
  }

  update(_, rawDt) {
    // The cursor draws BEFORE every early-out — death screen, hit-stop, all of
    // it. The OS cursor is hidden, so if this doesn't run the player has no
    // pointer: it must never freeze and never vanish (same law as depth 1000).
    if (this.cursorGfx && this.pointerScreen) {
      this.drawCursor(this.pointerScreen.x, this.pointerScreen.y + this.cameras.main.scrollY);
    }
    if (!this.ready || this.caught) return;
    // dt clamp: throttled/background tabs hand out second-long deltas that
    // teleport him — cap the step so time dilates instead of skipping (fairness)
    const dt = Math.min(rawDt, 50);
    if (this.hitStopT > 0) { this.hitStopT -= dt; return; } // freeze-frame beat
    const H = this.scale.height;
    const cam = this.cameras.main;

    // SIM FREEZE: while a loading interstitial is up (boot OR sub-travel) the
    // mod must not hunt or catch — the page underneath is mid-rebuild and it
    // isn't fair to die to something you can't see. Ceremony freezes too.
    // Search-focus freeze is suspended if any mod is mid-attack (LUNGE/SMASH),
    // so clicking the search bar can never cancel a committed catch.
    const searchFreeze = this.searchFocused
      && !(this.mods || []).some(m => m.state === 'LUNGE' || m.state === 'SMASH');
    const frozen = this.ceremonyRunning || !!this.loadingUI || this.entranceActive
      || this.pickerOpen || searchFreeze;

    if (!frozen) {
      this.survivalMs += dt;
      // Snapshot eligibility the instant the threshold crosses, rather than a
      // live comparison at the moment of the catch — removes any "so close"
      // edge case between when time actually passed and when a catch resolves.
      if (!this.balderEligible && !this.balderUsed && this.survivalMs > NB.TUNE.BALDER_SURVIVAL_MS) {
        this.balderEligible = true;
      }
      // edge-push scrolling: finger near top/bottom scrolls the feed. Touch
      // needs a much fatter, faster bottom zone — you're dodging with the same
      // finger you scroll with (mobile kid couldn't outrun superMOD downward).
      const py = this.pointerScreen.y;
      const touch = !this.sys.game.device.os.desktop;
      const zTop = H * 0.13;
      const zBot = H * (touch ? 0.24 : 0.13);
      const spd = touch ? 760 : 540;
      if (py < zTop) cam.scrollY -= (1 - py / zTop) * spd * dt / 1000;
      else if (py > H - zBot) cam.scrollY += (1 - (H - py) / zBot) * spd * dt / 1000;
      cam.scrollY = Phaser.Math.Clamp(cam.scrollY, 0, this.page.WORLD_H - H);
    }

    // player world position = screen pointer + camera (cursor already drawn
    // at the top of update — before any early-out)
    this.playerPos.x = this.pointerScreen.x;
    this.playerPos.y = this.pointerScreen.y + cam.scrollY;

    if (!frozen) {
      this.farmCheck(dt);              // hold-to-steal karma off posts
      for (const m of this.mods) m.update(dt, this.playerPos);
      this.pickups.update(dt, this.playerPos);
      this.projectiles.update(dt, this.playerPos);
      this.npc.update(dt);
      this.admin.update(dt);
      this.page.updateScrollbar(cam);
      const revTag = this.mod.revenant ? '  REV' : '';
      this.hud.setText(`★ ${NB.fmtKarma(this.karma)}${revTag}`);
      if (this.mod.revenant) this.hud.setColor('#3fae54');
      this.updateHudExtras();
      // (karma-milestone hype clips REMOVED 2026-07-11 — posts pay their real
      // Reddit score now, so every farm crossed a 1k line and the deck never
      // shut up. Dave: memes should be rare enough to notice.)
      // SELF-HEAL: a mod parked in CAUGHT_YOU with no death screen and no
      // ceremony means the catch path died mid-flight (this exact brick
      // happened on real Reddit when the webview blocked sessionStorage).
      // Re-run the catch — worst case it resolves to the plain death screen.
      // (frozen CAUGHT_YOU is the benched superM0D awaiting resurrection — fine)
      const stuck = this.mods.some(m => m.state === 'CAUGHT_YOU' && !m.frozen);
      this._stuckT = stuck ? (this._stuckT || 0) + dt : 0;
      if (this._stuckT > 1500) {
        this._stuckT = 0;
        console.warn('CAUGHT_YOU with no outcome — forcing the ban');
        this.onCaught();
      }
      // duo clock — time survived with BOTH hunters live at once
      if (this.mod2 && !this.mod2.frozen && this.mod.revenant && !this.mod.frozen) {
        this.duoMs += dt;
      }
      NB.updateLetterPickup(this, this.playerPos);
      this.checkDeathWhispers();
      // BALDER — the ending. THE GATE (Dave 2026-07-11: "Balder's gate IS THE
      // LETTERS. +250k karma + 30 seconds survived with the duo"): all six
      // letters found + karma ≥ gate + BOSS_DUO_MS on the duo clock.
      if (!this.boss && !this.bossDone && NB.lettersDone()
          && this.karma >= NB.TUNE.BOSS_KARMA_GATE
          && this.duoMs >= NB.TUNE.BOSS_DUO_MS) {
        NB.spawnBalder(this);
      }
      if (this.boss) this.boss.update(dt, this.playerPos);
    }
  }
}

// Wait for brand fonts to be confirmed-loaded before the first scene ever
// draws text — otherwise the title card's first paint silently falls back
// to the system font and never re-renders.
NB.fontsReady.then(() => {
  // Hidden/backgrounded tabs (headless test harnesses included) throttle
  // requestAnimationFrame to zero — forcetimer=1 drives the loop off
  // setTimeout instead so automated verification can actually observe play.
  const forceTimer = new URLSearchParams(location.search).has('forcetimer');
  // Debug/test handle on the running game (mirrors window.__gs on the active
  // GameScene) — lets the headless harness reach any scene, e.g. the title.
  window.__game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: NB.REDDIT.canvas, // matches the player's own Reddit theme
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    pixelArt: true,
    fps: forceTimer ? { forceSetTimeOut: true } : undefined,
    dom: { createContainer: true },
    scene: [TitleScene, GameScene],
  });
});
