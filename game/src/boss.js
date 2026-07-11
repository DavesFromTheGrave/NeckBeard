// BALDER — the ENDING. Dave's OC: split-face demon in the black suit.
// He is not a fight and there is no win state: once he manifests, the run is
// already over — he drags BOTH mods into hell, hunts the player alone, and
// escalates until he gets you. Score = the karma you farmed before he came.
// CANON (locked 2026-07-09): his face IS his direction — moving LEFT he's the
// zombie/skull (bz sheets, drawn facing left), moving RIGHT he's human (bh
// sheets, drawn facing right). The sheets ship pre-faced; NO flipX anywhere.
//
// FAIRNESS (same structural rule as the mods' LUNGE): Balder's ONLY kill is
// the teleport-strike, and it is double-telegraphed —
//   STALK (pressure, never catches) → VANISH (charge-up burst = "he's coming")
//   → GAP (dead air, he is nowhere) → MATERIALIZE (arrival burst + red ring =
//   "he's HERE", lands OFFSET from the cursor, still can't catch) → STRIKE
//   (the ONLY catch window, 420ms) → RECOVER (whiffed = he stands there;
//   your escape window — but the next blink comes sooner).
// Pickups/stuns target scene.mods — Balder is NOT in that array. Memes don't
// stop him. He is not a mod. (scene.boss, updated behind the same sim-freeze
// gate as everything else.)
window.NB = window.NB || {};

NB.Balder = class {
  constructor(scene, x, y) {
    this.scene = scene;
    const T = NB.TUNE;
    this.bodyScale = T.SPRITE_SCALE * T.BOSS_SCALE_MULT;
    this.sprite = scene.add.sprite(x, y, 'bh-walk-1').setScale(this.bodyScale).setDepth(11);
    // strike-preview ring: shrinks onto his landing spot during MATERIALIZE
    this.ring = scene.add.circle(x, y, 56).setStrokeStyle(4, 0xc0392b)
      .setVisible(false).setDepth(10);
    this.state = 'ENTRANCE';          // arrival burst → the vacuum → the hunt
    this.stateT = 0;
    this.fightT = 0;
    this.tpCd = T.BOSS_TP_CD_START;
    this.landing = { x, y };
    this.done = false;
    this._vacuumed = false;
    this._animKey = null;
    this.playBurst('anim-tele-arrive');
    NB.sfx.lunge && NB.sfx.lunge();
    scene.cameras.main.shake(240, 0.007);
  }

  // tp-* frames are the whole EFFECT (body + burst + smoke, ~600 tall with the
  // body reading ~55% of it). Scale so his body stays body-sized and the burst
  // blooms beyond it; body sheets snap back to bodyScale after.
  // `ms` squeezes the 12-frame burst into its warning window (blink beats are
  // a half second TOTAL now); omit it for the unhurried entrance burst.
  playBurst(key, ms) {
    const target = 512 * this.bodyScale * 1.7;
    const s = this.sprite.setScale(target / 600);
    s.play(key);
    s.anims.timeScale = ms ? NB.TUNE.BOSS_TP_NATURAL_MS / ms : 1;
  }
  bodyAnim(key, frame) {
    this.sprite.anims.timeScale = 1;
    this.sprite.setScale(this.bodyScale);
    if (key) {
      if (this._animKey !== key) { this._animKey = key; this.sprite.play(key); }
    } else if (frame) {
      // static frame — always applied (a burst leaves _animKey null but the
      // sprite parked on a tp-* frame, so the guard can't be trusted here)
      this._animKey = null;
      this.sprite.stop();
      this.sprite.setTexture(frame);
    }
  }

  // The arrival beat: BOTH mods dragged into hell — the ceremony's rescue-suck
  // (shrink+spin+drag-under, balder.js) replayed as something worse. It looked
  // like management coming to save you once. From here you're alone with him.
  vacuumMods() {
    const scene = this.scene;
    NB.sfx.gulp && NB.sfx.gulp();
    scene.cameras.main.shake(340, 0.005);
    for (const m of (scene.mods || [])) {
      if (!m || m.vacuumed || !m.sprite) continue;
      m.vacuumed = true;
      m.freezeHard();                 // never updates again — hell keeps them
      const spr = m.sprite;
      const under = scene.add.graphics().setDepth(13);  // the ground gives way
      under.lineStyle(4, 0x0d0b08, 1);
      under.beginPath(); under.moveTo(spr.x - 34, spr.y + 40);
      under.lineTo(spr.x, spr.y + 46); under.lineTo(spr.x + 34, spr.y + 40);
      under.strokePath();
      scene.tweens.add({
        targets: spr, y: spr.y + 70, angle: 200, scale: 0.05, duration: 1100,
        ease: 'Quad.easeIn',
        onComplete: () => { spr.setVisible(false); under.destroy(); },
      });
    }
  }

  setState(s) {
    this.state = s;
    this.stateT = 0;
    const T = NB.TUNE, spr = this.sprite;
    switch (s) {
      case 'VANISH': {
        // charge-up = the "he's coming" tell. Committed: no movement, no catch.
        this._animKey = null;
        this.playBurst('anim-tele-vanish', T.BOSS_TP_VANISH_MS);
        NB.sfx.telegraph && NB.sfx.telegraph();
        this.scene.cameras.main.shake(120, 0.004);
        break;
      }
      case 'GAP': {
        spr.setVisible(false);        // he is NOWHERE. the dread beat.
        break;
      }
      case 'MATERIALIZE': {
        // aim decided NOW (after the dead air) — lands OFFSET from the cursor,
        // never on top: the burst + ring is your warning, not your death.
        spr.setPosition(this.landing.x, this.landing.y).setVisible(true);
        this._animKey = null;
        this.playBurst('anim-tele-arrive', T.BOSS_TP_ARRIVE_MS);
        NB.sfx.lunge && NB.sfx.lunge();
        this.scene.cameras.main.shake(200, 0.006);
        this.ring.setPosition(this.landing.x, this.landing.y)
          .setVisible(true).setScale(1.7).setAlpha(0.35);
        this.scene.tweens.add({ targets: this.ring, scale: 0.8, alpha: 1,
          duration: T.BOSS_TP_ARRIVE_MS });
        break;
      }
      case 'STRIKE': {
        // THE catch window — the only one he has.
        this.ring.setVisible(false);
        break;
      }
      case 'RECOVER': {
        // whiffed. he stands and seethes — your window to make distance.
        this.bodyAnim(null, 'bh-walk-1');
        break;
      }
    }
  }

  update(dt, player) {
    if (this.done) return;
    const T = NB.TUNE, s = this.sprite;
    this.stateT += dt;
    this.fightT += dt;

    const dx = player.x - s.x, dy = player.y - s.y;
    const dist = Math.hypot(dx, dy);

    switch (this.state) {
      case 'ENTRANCE': {
        // theater, not threat — no catch exists here. Burst lands, then the
        // mods go under while he watches, then the hunt begins.
        if (!this._vacuumed && this.stateT >= T.BOSS_TP_NATURAL_MS) {
          this._vacuumed = true;
          this.bodyAnim(null, 'bh-walk-1');
          this.vacuumMods();
        }
        if (this.stateT >= T.BOSS_ENTRANCE_MS) this.setState('STALK');
        break;
      }
      case 'STALK': {
        // pressure between blinks — face = direction, never a catch
        const run = dist > 420;
        const speed = run ? T.BOSS_RUN_SPEED : T.BOSS_WALK_SPEED;
        if (dist > 24) {
          const nx = dx / dist, ny = dy / dist;
          s.x += nx * speed * dt / 1000;
          s.y += ny * speed * dt / 1000;
          const dir = nx < 0 ? 'bz' : 'bh';          // LEFT = zombie, RIGHT = human
          this.bodyAnim(`anim-${dir}-${run ? 'run' : 'walk'}`);
        }
        this.tpCd -= dt;
        // cooldown up = he blinks. Distance doesn't save you; neither does
        // standing on top of him — the blink is how the strike ever happens.
        if (this.tpCd <= 0) this.setState('VANISH');
        break;
      }
      case 'VANISH': {
        if (this.stateT >= T.BOSS_TP_VANISH_MS) this.setState('GAP');
        break;
      }
      case 'GAP': {
        if (this.stateT >= T.BOSS_TP_GAP_MS) {
          // land on a ring around wherever the cursor is NOW
          const a = Math.random() * Math.PI * 2;
          const cam = this.scene.cameras.main;
          this.landing = {
            x: Phaser.Math.Clamp(player.x + Math.cos(a) * T.BOSS_LAND_RING,
              40, this.scene.scale.width - 40),
            y: Phaser.Math.Clamp(player.y + Math.sin(a) * T.BOSS_LAND_RING,
              cam.scrollY + 60, cam.scrollY + this.scene.scale.height - 40),
          };
          this.setState('MATERIALIZE');
        }
        break;
      }
      case 'MATERIALIZE': {
        if (this.stateT >= T.BOSS_TP_ARRIVE_MS) {
          // burst done → the grab. face whichever side you're on.
          this.bodyAnim(`anim-${dx < 0 ? 'bz' : 'bh'}-run`);
          this.setState('STRIKE');
        }
        break;
      }
      case 'STRIKE': {
        // short committed grab-step toward where you were — dodge through it
        if (dist > 8) {
          const nx = dx / dist, ny = dy / dist;
          s.x += nx * 300 * dt / 1000;
          s.y += ny * 300 * dt / 1000;
        }
        if (dist < T.CATCH_RADIUS * 1.2) {
          this.done = true;
          this.scene.bossKill = true;
          this.ring.setVisible(false);
          this.scene.onCaught();
          return;
        }
        if (this.stateT >= T.BOSS_STRIKE_MS) this.setState('RECOVER');
        break;
      }
      case 'RECOVER': {
        if (this.stateT >= T.BOSS_RECOVER_MS) {
          // escalate: blinks come faster the longer he's in the arena,
          // down to the floor — and they never stop coming.
          const k = Math.min(1, this.fightT / T.BOSS_ESCALATE_MS);
          this.tpCd = T.BOSS_TP_CD_START + (T.BOSS_TP_CD_MIN - T.BOSS_TP_CD_START) * k;
          this.setState('STALK');
        }
        break;
      }
    }
  }

  destroy() {
    try { this.sprite.destroy(); } catch (e) {}
    try { this.ring.destroy(); } catch (e) {}
  }
};

// Spawn + announce. Guarded once per run — and it only ends one way.
NB.spawnBalder = function (scene) {
  if (scene.boss || scene.bossDone || scene.caught) return;
  scene.bossDone = true;
  const cam = scene.cameras.main;
  const a = Math.random() * Math.PI * 2;
  const x = Phaser.Math.Clamp(scene.playerPos.x + Math.cos(a) * 300, 60, scene.scale.width - 60);
  const y = Phaser.Math.Clamp(scene.playerPos.y + Math.sin(a) * 300,
    cam.scrollY + 80, cam.scrollY + scene.scale.height - 60);
  scene.boss = new NB.Balder(scene, x, y);
  scene.floatText(scene.scale.width / 2, scene.scale.height * 0.3 + cam.scrollY,
    'BALDER HAS ENTERED THE CHAT', '#c0392b');
  cam.flash(300, 120, 20, 20);
  NB.playMoment(scene, 'revenant');
};
