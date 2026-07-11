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
  // Every stage has a landing pad: video → code-cinematic → straight finish.
  // A ceremony that throws must NEVER brick the run.
  const cinematic = () => {
    try { NB.codeCeremony(scene, finish); }
    catch (e) { console.warn('code ceremony failed:', e); finish(); }
  };
  try {
    NB.playCutsceneVideo(scene, 'assets/video/revenant-cutscene.mp4', finish, cinematic);
  } catch (e) {
    console.warn('cutscene video failed:', e);
    cinematic();
  }
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
NB.codeCeremony = function (scene, finish) {
  const cam = scene.cameras.main;
  const mod = scene.mod.sprite;
  const W = scene.scale.width;
  const groundY = Math.min(mod.y + 60, scene.page.WORLD_H - 40);
  const elevX = Phaser.Math.Clamp(mod.x < W / 2 ? mod.x + 190 : mod.x - 190, 90, W - 90);
  const objs = [];   // everything the cinematic spawns, so a tap-skip wipes it all
  let over = false;
  const end = () => {
    if (over) return;
    over = true;
    objs.forEach(o => { try { o.destroy(); } catch {} });
    finish();
  };
  scene.input.once('pointerdown', () => { if (scene.ceremonyRunning) end(); });

  // 1 — freeze + lens (0.8s)
  const shade = scene.add.rectangle(cam.scrollX + W / 2, cam.scrollY + scene.scale.height / 2,
    W, scene.scale.height, 0x1a1428, 0).setDepth(12);
  objs.push(shade);
  scene.tweens.add({ targets: shade, fillAlpha: 0.28, duration: 700 });
  cam.zoomTo(1.12, 800, 'Sine.easeInOut');

  const t = (ms, fn) => scene.time.delayedCall(ms, fn);

  // ~7s total (Dave spec). Timings tuned for jam pacing.
  // 2 — the crack (at 0.5s)
  t(500, () => {
    if (over) return;
    NB.sfx.crack();
    cam.shake(420, 0.006);
    const crackG = scene.add.graphics().setDepth(13);
    objs.push(crackG);
    crackG.lineStyle(4, 0x0d0b08, 1);
    let cx = elevX - 60, cy = groundY + 8;
    crackG.beginPath(); crackG.moveTo(cx, cy);
    for (let i = 0; i < 7; i++) {
      cx += Phaser.Math.Between(12, 26);
      cy += Phaser.Math.Between(-7, 7);
      crackG.lineTo(cx, cy);
    }
    crackG.strokePath();
    for (const el of scene.page.elements) {
      if (Math.abs(el.rect.centerY - groundY) < 220) scene.page.shake(el, scene);
    }
  });

  // 3 — the elevator rises (at 1.2s)
  t(1200, () => {
    if (over) return;
    NB.sfx.ding();
    const elev = scene.page.makeElevator(elevX, groundY + 120);
    objs.push(...elev);
    for (const o of elev) {
      scene.tweens.add({ targets: o, y: o.y - 120, duration: 1300, ease: 'Sine.easeOut' });
    }
  });

  // 4 — Balder RISES up out of the elevator into the doorway (at 2.8s)
  t(2800, () => {
    if (over) return;
    const balder = scene.add.sprite(elevX, groundY + 130, 'balder').setDepth(18).setAlpha(0);
    objs.push(balder);
    balder.setScale(210 / balder.height);   // real art -> doorway-sized
    scene.tweens.add({ targets: balder, y: groundY - 6, alpha: 1, duration: 1000, ease: 'Sine.easeOut' });
    // cigar smoke off the head
    scene.time.addEvent({ repeat: 5, delay: 300, callback: () => {
      if (over) return;
      const puff = scene.add.circle(balder.x + 14, balder.y - balder.displayHeight * 0.42,
        Phaser.Math.Between(3, 5), 0xbbbbbb, 0.5).setDepth(19);
      scene.tweens.add({ targets: puff, y: puff.y - 24, alpha: 0, scale: 2, duration: 900,
        onComplete: () => puff.destroy() });
    }});
    // 6 — exit: sinks back down into the elevator (at 5.4s overall)
    t(2600, () => {
      if (over) return;
      scene.tweens.add({ targets: balder, y: groundY + 130, alpha: 0, duration: 900,
        ease: 'Sine.easeIn' });
    });
  });

  // 5 — the suck (at 4.2s)
  t(4200, () => {
    if (over) return;
    NB.sfx.gulp();
    cam.shake(300, 0.004);
    const under = scene.add.graphics().setDepth(13);
    objs.push(under);
    under.lineStyle(4, 0x0d0b08, 1);
    under.beginPath(); under.moveTo(mod.x - 34, mod.y + 40);
    under.lineTo(mod.x, mod.y + 46); under.lineTo(mod.x + 34, mod.y + 40);
    under.strokePath();
    scene.mod.sprite.play('anim-stumble');
    scene.tweens.add({
      targets: mod, y: mod.y + 70, angle: 200, scale: 0.05, duration: 1100,
      ease: 'Quad.easeIn',
      onComplete: () => mod.setVisible(false),
    });
  });

  // 6b — elevator descends (at 6.5s)
  t(6500, () => {
    if (over) return;
    NB.sfx.ding();
  });

  // 7 — color back, the line, then the tag-in takes over (at 7.0s)
  t(7000, () => {
    if (over) return;
    scene.tweens.add({ targets: shade, fillAlpha: 0, duration: 500 });
    cam.zoomTo(1, 500, 'Sine.easeInOut');
    const note = scene.add.text(W / 2, 92, 'management has been notified.', {
      fontFamily: 'Courier New', fontSize: '16px', color: '#9a3fd4',
    }).setOrigin(0.5).setDepth(30).setScrollFactor(0).setAlpha(0);
    objs.push(note);
    scene.tweens.add({ targets: note, alpha: 1, duration: 400, yoyo: true, hold: 1400 });
    t(1200, end);
  });
};

// The tag-in: redditM0D — the replacement mod, junior and FAST. Enters right
// after the ceremony; superM0D rises again REVENANT_DELAY_MS later and then
// they BOTH hunt. Fairness is unchanged: his catch check still lives only
// inside his own LUNGE window behind a full telegraph.
NB.spawnMod2 = function (scene) {
  if (scene.mod2) return;
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
