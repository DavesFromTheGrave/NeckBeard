// The Balder ceremony — the promotion review, now the full video cutscene
// (revenant-cutscene.mp4: Balder rises → superM0D dragged under → Balder
// departs in the gold elevator → redditM0D tags in). First trigger per session
// plays the video (tap to skip); repeats take the 600ms fast path. The old
// code-cinematic survives as the fallback if the video can't play.
// After the ceremony superM0D is GONE — frozen + hidden — until spawnRevenant
// rises him as the zombie, REVENANT_DELAY_MS into redditM0D's solo hunt.
window.NB = window.NB || {};

NB.playBalderCeremony = function (scene, done) {
  const seen = !!NB.flagGet('nb_balder_seen');   // storage-safe (webview sandbox)
  scene.ceremonyRunning = true;
  scene.mod.freezeHard();
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    scene.ceremonyRunning = false;
    // He doesn't come back from this meeting. Frozen (no update, no catch
    // check) + hidden until spawnRevenant resurrects him.
    scene.mod.freezeHard();
    scene.mod.sprite.setVisible(false);
    NB.flagSet('nb_balder_seen', '1');
    scene.cameras.main.zoomTo(1, 200);
    done();
  };

  if (seen) {
    // fast path: the compressed suck — he's yanked under and the hunt moves on
    NB.sfx.gulp();
    scene.cameras.main.shake(240, 0.005);
    scene.tweens.add({ targets: scene.mod.sprite, y: scene.mod.sprite.y + 50,
      angle: 200, scale: 0.05, duration: 500, ease: 'Quad.easeIn' });
    scene.time.delayedCall(600, finish);
    return;
  }
  // The VIDEO is pulled (Dave's kid, 2026-07-11: it clashed with the game's
  // look — a sprite cutscene renders in-engine and can't look "off"). Always
  // the sprite ceremony now; a throw still lands straight on finish (never
  // brick the run).
  try { NB.codeCeremony(scene, finish); }
  catch (e) { console.warn('code ceremony failed:', e); finish(); }
};

// ── Balder TELEPORT — the boss's signature blink ─────────────────────────
// Dave's 13-frame purple sequence: he charges up, DETONATES into a starburst,
// then dissipates to smoke. Keyed transparent (the black bg is stripped) so it
// composites on ANY Reddit theme with a plain NORMAL blend — no additive
// washout, no ghosting. Forward (tp-1→12) is the vanish; reversed is the
// reappear/materialise. A dead-air beat sits between — never an instant kill:
// the charge-up is the tell, the silence is the dread, the re-detonation is
// the "he's HERE".
NB.balderTeleport = function (scene, sprite, tx, ty, done) {
  if (!sprite || !sprite.active) { if (done) done(); return; }
  scene.cameras.main.shake(120, 0.004);
  try { NB.sfx && NB.sfx.telegraph && NB.sfx.telegraph(); } catch (e) {}
  sprite.play('anim-tele-vanish');
  sprite.once('animationcomplete', () => {
    sprite.setVisible(false);
    // dead air — he's gone, nothing there
    scene.time.delayedCall(180, () => {
      if (!sprite.active) { if (done) done(); return; }
      sprite.setPosition(tx, ty).setVisible(true);
      scene.cameras.main.shake(210, 0.006);
      try { NB.sfx && NB.sfx.lunge && NB.sfx.lunge(); } catch (e) {}
      sprite.play('anim-tele-arrive');
      sprite.once('animationcomplete', () => { try { sprite.setTexture('tp-1'); } catch (e) {} if (done) done(); });
    });
  });
};

// Debug demo (Alt+Shift+Y): blink Balder to a random on-screen spot so the
// teleport can be watched before the boss entity is built.
NB.demoTeleport = function (scene) {
  const cam = scene.cameras.main;
  let b = scene._teleBody;
  if (!b || !b.active) {
    const x = cam.scrollX + cam.width * 0.4, y = cam.scrollY + cam.height * 0.55;
    b = scene._teleBody = scene.add.sprite(x, y, 'tp-1').setDepth(58);
    const h = cam.height * 0.6;                 // whole effect frame ~60% tall; Balder within reads ~1/3 of that
    b.setDisplaySize(h * (b.width / b.height), h);
  }
  if (scene._teleBusy) return;
  scene._teleBusy = true;
  const tx = cam.scrollX + cam.width * (0.25 + Math.random() * 0.5);
  const ty = cam.scrollY + cam.height * (0.4 + Math.random() * 0.3);
  NB.balderTeleport(scene, b, tx, ty, () => { scene._teleBusy = false; });
};

// Fullscreen DOM <video> takeover. The mp4 ships silent — meme clips fire at
// the beats instead (Dave: "just pick relevant memes"), and the chase bed
// keeps looping underneath (it ducks under each clip automatically).
NB.playCutsceneVideo = function (scene, src, onDone, onFail) {
  // beat map for revenant-cutscene.mp4 (25.5s):
  //   ~4.2s  Balder rises behind him      ~8.6s  superM0D dragged under
  //   ~19.4s the gold doors close         ~22s   redditM0D steps out of the dark
  const beats = [
    { t: 4.2, id: 'one-does-not-simply' },
    { t: 8.6, id: 'no-god-no' },
    { t: 19.4, id: 'to-be-continued' },
    { t: 22.0, moment: 'redditmod' },
  ];
  const stopClip = () => {
    try { if (NB._eventSound && NB._eventSound.isPlaying) NB._eventSound.stop(); } catch {}
  };

  const wrap = document.createElement('div');
  wrap.className = 'nb-cutscene';
  wrap.style.cssText = 'position:fixed;inset:0;background:#000;z-index:9999;';
  const v = document.createElement('video');
  v.src = src;
  v.muted = true;                 // no audio track by design
  v.playsInline = true;
  v.setAttribute('playsinline', '');
  v.preload = 'auto';
  v.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;';
  const hint = document.createElement('div');
  hint.textContent = 'tap to skip ▸▸';
  hint.style.cssText = 'position:absolute;bottom:16px;right:20px;color:#777;' +
    "font-family:'Arcade Normal','Courier New',monospace;font-size:12px;";
  wrap.appendChild(v);
  wrap.appendChild(hint);

  let ended = false;
  let watchdog = null;
  const cleanup = (ok) => {
    if (ended) return;
    ended = true;
    if (watchdog) clearTimeout(watchdog);
    stopClip();                   // a skipped cutscene shouldn't bleed audio into play
    NB._cutsceneWrap = null;
    try { v.pause(); } catch {}
    try { wrap.remove(); } catch {}
    ok ? onDone() : onFail();
  };
  v.addEventListener('timeupdate', () => {
    for (const b of beats) {
      if (!b.fired && v.currentTime >= b.t) {
        b.fired = true;
        stopClip();               // scripted beats take priority over a lingering clip
        if (b.moment) NB.playMoment(scene, b.moment);
        else NB.playMemeSfx(scene, b.id, 0.85);
      }
    }
  });
  v.addEventListener('ended', () => cleanup(true));
  v.addEventListener('error', () => cleanup(false));
  wrap.addEventListener('pointerdown', (e) => { e.stopPropagation(); cleanup(true); });
  // if 'ended' never fires (webview quirk / stalled buffer) don't hold the game hostage
  watchdog = setTimeout(() => cleanup(true), 40000);
  NB._cutsceneWrap = { skip: () => cleanup(true) };

  document.body.appendChild(wrap);
  const p = v.play();
  if (p && p.catch) p.catch(() => cleanup(false));
};

// Warm the video into the browser cache at boot so the ceremony doesn't
// stutter on first play (it triggers 60s+ into a run — plenty of lead time).
NB.warmCutscene = function () {
  if (NB._cutsceneWarm) return;
  try {
    const v = document.createElement('video');
    v.preload = 'auto';
    v.muted = true;
    v.src = 'assets/video/revenant-cutscene.mp4';
    v.load();
    NB._cutsceneWarm = v;
  } catch {}
};

// The original code-cinematic — now the fallback when the video can't play.
// Beats approved 2026-07-04: freeze → crack → gold elevator → Balder →
// Supermod sucked underground → exit → "management has been notified."
// The SPRITE CEREMONY (Dave's storyboard, 2026-07-11 — replaces the video):
// rumble+crack → closed elevator ERUPTS up → doors open → Balder appears →
// superM0D is shook → Balder sucks him under → crack closes → redditM0D rises
// from the bottom as a black SILHOUETTE, then fades to reveal (the "aaaaa"
// recognition beat) → Balder rides the elevator back down.
// Positions anchor to the current camera view (the sim is frozen, so the cam
// is static). All four elevator/crack sprites are Dave's; the silhouette
// reveal, shook, suck, dust and camera work are code. Tap skips the whole thing.
NB.codeCeremony = function (scene, finish) {
  const cam = scene.cameras.main;
  const mod = scene.mod.sprite;
  const W = scene.scale.width, H = scene.scale.height;
  const cx = cam.scrollX + W / 2;
  const groundY = cam.scrollY + H * 0.76;
  const ELEV_W = Math.min(300, Math.round(W * 0.34));
  const objs = [];   // everything the cinematic spawns, so a tap-skip wipes it all
  let over = false;
  const end = () => {
    if (over) return;
    over = true;
    objs.forEach(o => { try { o.destroy(); } catch {} });
    cam.zoomTo(1, 300, 'Sine.easeInOut');
    finish();
  };
  const t = (ms, fn) => scene.time.delayedCall(ms, fn);
  const track = (o) => { objs.push(o); return o; };
  scene.input.once('pointerdown', () => { if (scene.ceremonyRunning) end(); });

  // dark stage + slow push-in
  const shade = track(scene.add.rectangle(cx, cam.scrollY + H / 2, W, H, 0x0a0812, 0).setDepth(12));
  scene.tweens.add({ targets: shade, fillAlpha: 0.6, duration: 600 });
  cam.zoomTo(1.1, 900, 'Sine.easeInOut');

  // three elevator states stacked at the same base; alpha crossfades between
  // them. Widths matched on the gold frame so the door doesn't jump.
  const mkElev = (key, w) => track(scene.add.image(cx, groundY, key)
    .setOrigin(0.5, 1).setDepth(14)
    .setScale(w / scene.textures.get(key).getSourceImage().width).setAlpha(0));
  const eClosed = mkElev('elev-closed', ELEV_W * 1.18);   // wider: includes burst debris
  const eOpen   = mkElev('elev-open', ELEV_W);
  const eBalder = mkElev('elev-balder', ELEV_W);
  const elevH = eOpen.displayHeight;

  // crack sits at the ground IN FRONT of the elevator base (it emerges through)
  const crack = track(scene.add.image(cx, groundY, 'floor-crack').setOrigin(0.5, 0.5)
    .setDepth(16).setScale(0).setAlpha(0));
  const crackW = ELEV_W * 1.5;

  const dust = (x, y, n) => { for (let i = 0; i < n; i++) {
    if (over) return;
    const p = track(scene.add.circle(x + Phaser.Math.Between(-ELEV_W / 2, ELEV_W / 2), y,
      Phaser.Math.Between(4, 9), 0x8a8580, 0.5).setDepth(15));
    scene.tweens.add({ targets: p, y: p.y - Phaser.Math.Between(30, 80),
      x: p.x + Phaser.Math.Between(-30, 30), alpha: 0, scale: 2.4,
      duration: Phaser.Math.Between(700, 1200), onComplete: () => p.destroy() });
  }};

  // 1 — RUMBLE + crack tears open (0.4s)
  t(400, () => {
    if (over) return;
    NB.sfx.crack(); cam.shake(500, 0.007);
    crack.setScale((crackW / crack.width) * 0.5);
    scene.tweens.add({ targets: crack, alpha: 1, scaleX: crackW / crack.width,
      scaleY: crackW / crack.width, duration: 500, ease: 'Back.easeOut' });
    for (const el of scene.page.elements) {
      if (Math.abs(el.rect.centerY - groundY) < 260) scene.page.shake(el, scene);
    }
  });

  // 2 — closed elevator ERUPTS up out of the crack (1.0s)
  t(1000, () => {
    if (over) return;
    NB.sfx.ding && NB.sfx.ding();
    eClosed.setAlpha(1).y = groundY + elevH * 1.1;      // start below ground
    scene.tweens.add({ targets: eClosed, y: groundY, duration: 1100, ease: 'Back.easeOut' });
    cam.shake(600, 0.006);
    dust(cx, groundY, 14);
  });

  // 3 — doors open (2.4s): closed → open crossfade
  t(2400, () => {
    if (over) return;
    NB.sfx.ding && NB.sfx.ding();
    eOpen.y = groundY;
    scene.tweens.add({ targets: eClosed, alpha: 0, duration: 450 });
    scene.tweens.add({ targets: eOpen, alpha: 1, duration: 450 });
    dust(cx, groundY, 6);
  });

  // 4 — Balder appears in the doorway (3.1s): open → balder. superM0D shuffles
  // into frame beside the elevator, facing it.
  t(3100, () => {
    if (over) return;
    scene.tweens.add({ targets: eOpen, alpha: 0, duration: 400 });
    scene.tweens.add({ targets: eBalder, alpha: 1, duration: 400 });
    cam.zoomTo(1.16, 700, 'Sine.easeInOut');
    // superM0D staged beside the elevator, looking up at the boss
    mod.setVisible(true).setAlpha(1).setAngle(0);
    mod.setScale(scene.mod.baseScale || mod.scaleX);
    mod.x = cx - ELEV_W * 0.72; mod.y = groundY - mod.displayHeight * 0.5;
    mod.setFlipX(true);
  });

  // 5 — superM0D visibly SHOOK (4.0s): jitter + a "!"
  t(4000, () => {
    if (over) return;
    const bang = track(scene.add.text(mod.x, mod.y - mod.displayHeight * 0.6, '!', {
      fontFamily: 'Courier New', fontSize: '34px', fontStyle: 'bold', color: '#ffd23f',
    }).setOrigin(0.5).setDepth(19).setStroke('#000', 5));
    scene.tweens.add({ targets: bang, y: bang.y - 14, duration: 260, yoyo: true, repeat: 1 });
    scene.tweens.add({ targets: mod, x: mod.x + 5, duration: 55, yoyo: true, repeat: 12 });
  });

  // 6 — the SUCK (5.0s): Balder drags superM0D down into the crack
  t(5000, () => {
    if (over) return;
    NB.sfx.gulp(); cam.shake(360, 0.005);
    crack.setPosition(mod.x, groundY);                  // crack yawns under him
    scene.tweens.add({ targets: crack, scaleX: (crackW * 0.8) / crack.width,
      scaleY: (crackW * 0.8) / crack.width, duration: 300 });
    try { mod.play('anim-stumble'); } catch (e) {}
    scene.tweens.add({ targets: mod, y: groundY + 30, angle: 220, scale: 0.04,
      duration: 1000, ease: 'Quad.easeIn', onComplete: () => mod.setVisible(false) });
  });

  // 7 — crack closes back up (6.3s)
  t(6300, () => {
    if (over) return;
    scene.tweens.add({ targets: crack, alpha: 0, scaleX: 0.1, scaleY: 0.1, duration: 500 });
  });

  // 8 — redditM0D LOOMS UP from the bottom of the screen in CLOSE-UP (Dave:
  // real close, big) as a pure black SILHOUETTE. Fixed to the camera — this is
  // a foreground reveal, not a character on the floor. (6.7s)
  let rmReal, rmDark;
  t(6700, () => {
    if (over) return;
    const srcH = scene.textures.get('mod2-idle').getSourceImage().height;
    const big = (H * 1.15) / srcH;                 // towering, fills the frame
    const rx = W / 2, fromY = H + H * 1.25, toY = H * 1.1;
    rmReal = track(scene.add.sprite(rx, fromY, 'mod2-idle').setOrigin(0.5, 1)
      .setDepth(20).setScale(big).setScrollFactor(0));
    rmDark = track(scene.add.sprite(rx, fromY, 'mod2-idle').setOrigin(0.5, 1)
      .setDepth(21).setScale(big).setScrollFactor(0).setTintFill(0x000000));
    scene.tweens.add({ targets: [rmReal, rmDark], y: toY, duration: 1100, ease: 'Sine.easeOut' });
  });

  // 9 — the REVEAL (8.1s): the silhouette SLOWLY burns off — the recognition
  // "aaaaa" beat. A soft flash lands as his face resolves.
  t(8100, () => {
    if (over || !rmDark) return;
    NB.playMoment(scene, 'redditmod');
    cam.shake(260, 0.004);
    scene.tweens.add({ targets: rmDark, alpha: 0, duration: 1500, ease: 'Sine.easeInOut' });
    t(1050, () => { if (!over) cam.flash(220, 255, 220, 180); });
    const nm = track(scene.add.text(W / 2, H * 0.13, 'redditM0D', {
      fontFamily: 'Courier New', fontSize: '22px', fontStyle: 'bold', color: '#ff4500',
    }).setOrigin(0.5).setDepth(22).setScrollFactor(0).setStroke('#000', 5).setAlpha(0));
    scene.tweens.add({ targets: nm, alpha: 1, duration: 400, delay: 950 });
  });

  // 10 — redditM0D sinks back down; Balder rides the elevator DOWN (9.9s)
  t(9900, () => {
    if (over) return;
    if (rmReal) scene.tweens.add({ targets: [rmReal, rmDark], y: H + H * 1.25,
      duration: 800, ease: 'Sine.easeIn' });
    scene.tweens.add({ targets: eBalder, alpha: 0, duration: 350 });
    scene.tweens.add({ targets: eOpen, alpha: 1, duration: 350 });
    t(400, () => {
      if (over) return;
      scene.tweens.add({ targets: eOpen, alpha: 0, duration: 300 });
      scene.tweens.add({ targets: eClosed, alpha: 1, duration: 300 });
      t(350, () => {
        if (over) return;
        NB.sfx.ding && NB.sfx.ding();
        scene.tweens.add({ targets: eClosed, y: groundY + elevH * 1.1, duration: 900,
          ease: 'Sine.easeIn' });
      });
    });
  });

  // 11 — lights up, hand off to the hunt (11.6s)
  t(11600, () => {
    if (over) return;
    scene.tweens.add({ targets: shade, fillAlpha: 0, duration: 450 });
    t(450, end);
  });
};

// The tag-in: redditM0D — the replacement mod, junior and FAST. Enters right
// after the ceremony; superM0D rises again REVENANT_DELAY_MS later and then
// they BOTH hunt. Fairness is unchanged: his catch check still lives only
// inside his own LUNGE window behind a full telegraph.
NB.spawnMod2 = function (scene) {
  if (scene.mod2) return;
  NB.persistSet && NB.persistSet('nb_seen_mod2', '1');   // unlocks him on the title flip
  NB.playMoment(scene, 'redditmod');
  const cam = scene.cameras.main;
  cam.shake(420, 0.006);
  const W = scene.scale.width, T = NB.TUNE;
  // enter at a fair distance — never materialize on top of the cursor
  let x, y, tries = 0;
  do {
    x = Phaser.Math.Between(80, W - 80);
    y = Phaser.Math.Clamp(
      cam.scrollY + Phaser.Math.Between(Math.round(scene.scale.height * 0.25),
        Math.round(scene.scale.height * 0.6)),
      100, scene.page.WORLD_H - 60);
  } while (Math.hypot(x - scene.playerPos.x, y - scene.playerPos.y) < 400 && ++tries < 12);
  const m2 = new NB.Supermod(scene, scene.page, x, y + 60, {
    variant: 'mod2',
    scale: T.SPRITE_SCALE * T.MOD2_SCALE_MULT,
    speedMult: T.MOD2_SPEED_MULT,
    lungeMult: T.MOD2_LUNGE_MULT,
    rangeMult: T.MOD2_RANGE_MULT,   // Zenitsu: draws from way out, streaks in
    texture: 'mod2-idle',
  });
  m2.sprite.setScale(0.05).setAlpha(0.4);
  m2.riseFrom = { y: y + 60, toY: y };
  m2.setState('RISE');
  scene.mod2 = m2;
  scene.mods.push(m2);
  scene.floatText(x, y - 70, 'redditM0D has entered the chat', '#ff4500');
};

// After the ceremony: the comeback. He crawls out of the ground as REVENANT.
NB.spawnRevenant = function (scene) {
  if (scene.boss || scene.bossDone) return;  // BALDER took him — hell keeps its mods
  NB.persistSet && NB.persistSet('nb_seen_revenant', '1');   // unlocks him on the title flip
  NB.sfx.revenant();
  NB.playMoment(scene, 'revenant');   // "HE CAME BACK WRONG" → a zombie meme
  const cam = scene.cameras.main;
  cam.shake(600, 0.008);
  const mod = scene.mod;
  const s = mod.sprite;
  const W = scene.scale.width;
  const x = Phaser.Math.Between(80, W - 80);
  const y = Phaser.Math.Clamp(cam.scrollY + scene.scale.height * 0.4, 100, scene.page.WORLD_H - 60);
  s.setPosition(x, y + 60).setVisible(true).setScale(0.05).setAngle(0).setAlpha(0.4);
  mod.revenant = true;
  mod.frozen = false;      // ceremony freeze ends with the resurrection
  s.anims.resume();
  // state-machine-driven rise (gameplay-critical: never trust the tween manager)
  mod.riseFrom = { y: y + 60, toY: y };
  mod.setState('RISE');
  scene.floatText(x, y - 70, 'HE CAME BACK WRONG', '#3fae54');
};
