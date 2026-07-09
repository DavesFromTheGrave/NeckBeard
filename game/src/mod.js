// Supermod — the state machine, ported from the extension's proven physics.
// FAIRNESS IS STRUCTURAL: the catch check runs ONLY inside the LUNGE window,
// and LUNGE is reachable ONLY through a full TELEGRAPH. Comment hits and the
// scrollbar yank reposition and pressure — they NEVER catch.
window.NB = window.NB || {};

NB.Supermod = class {
  // opts: variant ('mod' | 'mod2'), scale, speedMult (locomotion), lungeMult,
  // texture. Defaults reproduce the original superM0D exactly.
  constructor(scene, page, x, y, opts = {}) {
    this.scene = scene;
    this.page = page;
    this.variant = opts.variant || 'mod';
    this.baseScale = opts.scale ?? NB.TUNE.SPRITE_SCALE;
    this.speedMult = opts.speedMult || 1;
    this.lungeMult = opts.lungeMult || 1;
    // heat ramps from THIS mod's entrance, not run start — a late tag-in
    // (redditM0D) starts calm instead of inheriting 60s+ of accumulated rage
    this.heatBase = { ms: scene.survivalMs || 0, karma: scene.karma || 0 };
    this.sprite = scene.add.sprite(x, y, opts.texture || 'm1-walk-1')
      .setScale(this.baseScale).setDepth(10);
    this.state = 'LURK';
    this.stateT = 0;
    this.heat = 0;
    this.aim = { x, y };
    this.repathT = 0;
    this.lungeVec = { x: 0, y: 0 };
    this.stunT = 0;
    this.decoy = null;       // {x, y, ttl, gfx}
    this.throwCd = 6000;
    this.yankCd = 20000;
    this.smashCd = 12000;
    this.smashEl = null;
    this.smashHitDone = false;
    this.wreckTickT = 0;
    this.revenant = false;
    this.frozen = false;
    this.speedBurstT = 0;
    this.cornered = false;   // was the cursor point-blank when he wound up?
    this.slowT = 0;          // meme slow (Harambe, Yakety Sax, Banana Phone…)
    this.slowMult = 1;
    this.climbCd = 0;
    this.climbData = null;
    this.distraction = null;   // set by the Cheerleader NPC while she's on screen
    this.telegraphRing = scene.add.circle(x, y, 46)
      .setStrokeStyle(3, 0xe0452a).setVisible(false).setDepth(9);
    this.anim('walk');
  }

  anim(kind) {
    const rev = this.revenant;
    // redditM0D has his own sheet (BAN mallet mustache set); he never goes
    // revenant in this build, so no zombie branch for him.
    const map = this.variant === 'mod2' ? {
      walk: 'anim2-walk',
      hunt: 'anim2-run',
      telegraph: 'anim2-crouch',
      lunge: 'anim2-leap',
      climb: 'anim2-climb',
      stumble: 'anim2-stumble',
      victory: 'anim2-victory',
      throw: 'anim2-throw',
      smash: 'anim2-sledge',
    } : {
      walk: rev ? 'anim-zwalk' : 'anim-walk',
      hunt: rev ? 'anim-zwalk' : (this.heat >= 2 ? 'anim-charge' : 'anim-run'),
      telegraph: rev ? 'anim-ztelegraph' : 'anim-crouch',
      lunge: rev ? 'anim-zlunge' : 'anim-leap',
      climb: rev ? 'anim-zwalk' : 'anim-climb',
      stumble: rev ? 'anim-zstumble' : 'anim-stumble',
      victory: rev ? 'anim-zvictory' : 'anim-victory',
      throw: 'anim-throw',
      smash: rev ? 'anim-zlunge' : 'anim-sledge',
    };
    this.sprite.play(map[kind]);
  }

  setState(s) {
    this.state = s;
    this.stateT = 0;
    switch (s) {
      case 'LURK': this.anim('walk'); this.resetSquash(120); break;
      case 'HUNT': this.anim('hunt'); this.resetSquash(120); break;
      case 'TELEGRAPH': {
        this.anim('telegraph');
        NB.sfx.telegraph();
        this.telegraphRing.setVisible(true).setStrokeStyle(3, this.revenant ? 0x3fae54 : 0xe0452a);
        this.scene.tweens.add({ targets: this.telegraphRing, scale: { from: 1.4, to: 0.7 },
          alpha: { from: 0.4, to: 1 }, duration: this.telegraphMs() });
        // anticipation: coil down before the burst — the "held breath" beat
        this.squash(1.1, 0.86, this.telegraphMs());
        this.scene.cameras.main.zoomTo(1.045, this.telegraphMs(), 'Sine.easeIn');
        break;
      }
      case 'LUNGE': {
        this.anim('lunge'); NB.sfx.lunge();
        this.lungeMinDist = Infinity;   // closest approach this lunge → close-call meme
        this.scene.hitStop(60);
        this.scene.cameras.main.shake(140, 0.006);
        this.scene.cameras.main.zoomTo(1, 160, 'Sine.easeOut');
        this.squash(1.28, 0.82, 90); // explosive stretch on commit
        break;
      }
      case 'CLIMB':
        this.anim('climb'); NB.sfx.vault(); this.telegraphRing.setVisible(false);
        this.scene.cameras.main.shake(90, 0.004); // grabbing the edge, hauling weight up
        this.resetSquash(0);
        break;
      case 'THROW': this.anim('throw'); break;
      case 'SMASH':
        this.anim('smash');
        this.smashHitDone = false;
        this.telegraphRing.setVisible(false);
        this.squash(0.94, 1.08, NB.TUNE.SMASH_IMPACT_MS); // rears up with the hammer
        break;
      case 'YANK': this.anim('hunt'); break;
      case 'STUMBLE':
        this.anim('stumble'); NB.sfx.stumble(); this.telegraphRing.setVisible(false);
        this.scene.cameras.main.shake(90, 0.003); // the whiff
        this.resetSquash(180);
        break;
      case 'RISE': this.anim('walk'); break;
      case 'CAUGHT_YOU': this.anim('victory'); this.telegraphRing.setVisible(false); break;
    }
  }

  // Cartoon-impact squash/stretch — held pose eased back to baseline scale.
  squash(sx, sy, holdMs) {
    const s = this.sprite, B = this.baseScale;
    if (this._squashTween) this._squashTween.stop();
    s.setScale(B * sx, B * sy);
    this._squashTween = this.scene.tweens.add({
      targets: s, scaleX: B, scaleY: B,
      duration: holdMs, ease: 'Back.easeOut',
    });
  }

  resetSquash(duration) {
    const s = this.sprite, B = this.baseScale;
    if (this._squashTween) { this._squashTween.stop(); this._squashTween = null; }
    if (duration > 0) {
      this._squashTween = this.scene.tweens.add({
        targets: s, scaleX: B, scaleY: B, duration, ease: 'Sine.easeOut',
      });
    } else {
      s.setScale(B, B);
    }
  }

  telegraphMs() {
    // Cornered (you let him get point-blank) = fast telegraph, so contact is
    // dangerous — but there's STILL a windup. Revenant shaves more; fairness floor holds.
    let ms = this.cornered ? NB.TUNE.CORNER_TELEGRAPH_MS : NB.TUNE.TELEGRAPH_MS;
    if (this.revenant) ms = Math.max(200, ms - 90);
    return ms;
  }

  stun(ms) {
    if (this.state === 'CAUGHT_YOU' || this.frozen) return;
    this.stunT = ms;
    this.telegraphRing.setVisible(false);
    this.sprite.setTint(0xffe88a);
    if (this.state === 'TELEGRAPH' || this.state === 'LUNGE') this.setState('STUMBLE');
  }

  setDecoy(x, y, ttl) {
    if (this.decoy) this.decoy.gfx.forEach(g => g.destroy());
    const gfx = [
      this.scene.add.circle(x, y, 13, 0x9b59b6, 0.5).setDepth(8),
    ];
    this.decoy = { x, y, ttl, gfx };
  }

  freezeHard() {  // ceremony control
    this.frozen = true;
    this.telegraphRing.setVisible(false);
    this.sprite.anims.pause();
  }

  target(player) {
    // the cheerleader pulls his aggro, but only while he's still free-roaming —
    // once he's committed to a telegraph/lunge/vault, nothing diverts him
    if (this.distraction && (this.state === 'HUNT' || this.state === 'LURK')) return this.distraction;
    return this.decoy ? { x: this.decoy.x, y: this.decoy.y } : player;
  }

  update(dt, player) {
    if (this.frozen) return;
    const T = NB.TUNE;
    this.stateT += dt;
    const s = this.sprite;

    // timers
    if (this.stunT > 0) {
      this.stunT -= dt;
      if (this.stunT <= 0) s.clearTint(), this.revenant && s.setTint(0xbbffbb);
      else return; // fully stopped while stunned
    }
    if (this.decoy) {
      this.decoy.ttl -= dt;
      if (this.decoy.ttl <= 0) { this.decoy.gfx.forEach(g => g.destroy()); this.decoy = null; }
    }
    this.throwCd -= dt;
    this.yankCd -= dt;
    this.smashCd -= dt;
    this.wreckTickT -= dt;
    if (this.speedBurstT > 0) this.speedBurstT -= dt;
    if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0) this.slowMult = 1; }
    if (this.climbCd > 0) this.climbCd -= dt;

    const tgt = this.target(player);
    const dx = tgt.x - s.x, dy = tgt.y - s.y;
    const dist = Math.hypot(dx, dy);
    const realDist = Math.hypot(player.x - s.x, player.y - s.y);

    // heat ramps on time AND on greed — the more karma you've farmed, the
    // angrier (faster) he gets. Aggressive runs are high-score AND high-danger.
    // Measured from this mod's own entrance (heatBase), so a late tag-in ramps fresh.
    this.heat = Math.min(T.HEAT_MAX,
      Math.floor(Math.max(0, this.scene.survivalMs - this.heatBase.ms) / 1000 / T.HEAT_RAMP_S)
      + Math.floor(Math.max(0, (this.scene.karma || 0) - this.heatBase.karma) / T.KARMA_PER_HEAT));

    // terrain: incidental slow while atop a card (the discrete vault is its own state)
    const el = this.page.onFurniture(s.x, s.y + s.displayHeight * 0.3);
    const onCard = !!el && this.state !== 'LUNGE' && this.state !== 'CLIMB';
    if (onCard) {
      this.page.shake(el, this.scene);
      // trampling grinds the card down — rate-limited so it accrues, not spikes
      if (this.wreckTickT <= 0 && this.scene.wreck) {
        this.scene.wreck.hit(el, T.WRECK_TRAMPLE);
        this.wreckTickT = T.WRECK_TICK_MS;
      }
      s.setAngle(Math.sin(this.stateT / 90) * T.CLIMB_BOB_DEG);
    } else if (this.state !== 'STUMBLE' && this.state !== 'CLIMB') {
      s.setAngle(0);
    }
    let mult = onCard ? T.CLIMB_MULT : 1;
    mult *= this.speedMult;                      // per-variant (redditM0D runs 2.5x)
    if (this.speedBurstT > 0) mult *= 1.35;
    if (this.slowT > 0) mult *= this.slowMult;   // meme slow (Harambe, Yakety Sax…)
    if (this.revenant) mult *= 1.32;

    switch (this.state) {
      case 'LURK': {
        if (this.repathT <= 0) {
          this.aim = { x: tgt.x + Phaser.Math.Between(-180, 180),
                       y: tgt.y + Phaser.Math.Between(-180, 180) };
          this.repathT = 900;
        }
        this.repathT -= dt;
        this.moveToward(this.aim, T.LURK_SPEED * mult, dt);
        if (this.stateT > T.LURK_MIN) this.setState('HUNT');
        break;
      }
      case 'HUNT': {
        this.repathT -= dt;
        if (this.repathT <= 0) { this.aim = { x: tgt.x, y: tgt.y }; this.repathT = T.HUNT_REPATH_MS; }
        const speed = (T.HUNT_SPEED + this.heat * T.HEAT_SPEED_BONUS) * mult;
        this.moveToward(this.aim, speed, dt);
        if (dist < T.LUNGE_RANGE) { this.cornered = realDist < T.CORNER_RANGE; this.setState('TELEGRAPH'); break; }
        // AvA VAULT: a post card sits in his path and he isn't already on it —
        // he grabs the edge and hauls himself over. This IS Animator vs Animation.
        if (this.climbCd <= 0 && dist > 6) {
          const nx = dx / dist, ny = dy / dist;
          const footY = s.y + s.displayHeight * 0.3;
          const here = this.page.onFurniture(s.x, footY);
          const ahead = this.page.onFurniture(s.x + nx * T.VAULT_REACH, footY + ny * T.VAULT_REACH);
          if (ahead && ahead.kind === 'post' && ahead !== here) {
            this.beginVault(nx, ny, ahead);
            break;
          }
        }
        // SLEDGEHAMMER: player's out of reach and he's standing on a card —
        // so he takes his frustration out on the page. Persistent wreckage.
        if (this.heat >= 1 && this.smashCd <= 0 && onCard && el.kind === 'post'
            && realDist > T.SMASH_RANGE_MIN) {
          this.smashEl = el;
          this.setState('SMASH');
          break;
        }
        // ranged pressure: comment throw (never while close — it's a poke, not a kill)
        if (this.heat >= 1 && this.throwCd <= 0 && realDist > 260 && !this.decoy) {
          this.setState('THROW');
          break;
        }
        // the scrollbar yank
        if (this.heat >= 2 && this.yankCd <= 0) {
          this.setState('YANK');
          this.yankTargetY = s.y;
          break;
        }
        break;
      }
      case 'SMASH': {
        // committed to the swing — no catch possible, this is a breather beat
        if (!this.smashHitDone && this.stateT >= T.SMASH_IMPACT_MS) {
          this.smashHitDone = true;
          NB.sfx.smash();
          this.scene.hitStop(50);
          this.scene.cameras.main.shake(180, 0.009);
          this.squash(1.22, 0.8, 140); // the follow-through slam
          if (this.scene.wreck && this.smashEl) {
            this.scene.wreck.hit(this.smashEl, T.WRECK_SMASH);
          }
        }
        if (this.stateT >= T.SMASH_MS) {
          this.smashEl = null;
          this.smashCd = Math.max(4500, T.SMASH_CD_MS - this.heat * 800);
          this.setState('HUNT');
        }
        break;
      }
      case 'THROW': {
        if (this.stateT >= 480) {
          this.scene.projectiles.throwAt(s.x, s.y - 30, { x: player.x, y: player.y });
          this.throwCd = Math.max(3200, 7000 - this.heat * 600);
          this.setState('HUNT');
        }
        break;
      }
      case 'YANK': {
        // he sprints to the right edge and grabs the scrollbar
        const edge = { x: this.scene.scale.width - 26, y: this.yankTargetY };
        this.moveToward(edge, T.CHARGE_SPEED * mult, dt);
        if (Math.abs(s.x - edge.x) < 14 || this.stateT > 2600) {
          this.scene.doYank();
          this.yankCd = Phaser.Math.Between(16000, 26000);
          this.setState('STUMBLE'); // committed to the lever = your window
        }
        break;
      }
      case 'TELEGRAPH': {
        this.telegraphRing.setPosition(s.x, s.y);
        if (this.stateT >= this.telegraphMs()) {
          const d2 = Math.max(1, dist);
          this.lungeVec = { x: dx / d2, y: dy / d2 };
          this.telegraphRing.setVisible(false);
          this.setState('LUNGE');
        }
        break;
      }
      case 'LUNGE': {
        s.x += this.lungeVec.x * T.LUNGE_SPEED * this.lungeMult * dt / 1000;
        s.y += this.lungeVec.y * T.LUNGE_SPEED * this.lungeMult * dt / 1000;
        this.lungeMinDist = Math.min(this.lungeMinDist, realDist);   // for close-call detection
        // decoy pop: lunging into the fake cursor kills the decoy, not you
        if (this.decoy && Math.hypot(this.decoy.x - s.x, this.decoy.y - s.y) < T.CATCH_RADIUS) {
          this.decoy.gfx.forEach(g => g.destroy());
          this.scene.floatText(this.decoy.x, this.decoy.y, 'DECOY!', '#9b59b6');
          this.decoy = null;
          this.setState('STUMBLE');
          break;
        }
        // THE ONLY CATCH CHECK IN THE GAME:
        if (realDist < T.CATCH_RADIUS) {
          if (this.scene.pickups.absorb()) {
            this.setState('STUMBLE');
            this.speedBurstT = 0;
            break;
          }
          this.scene.hitStop(110); // the freeze-frame beat right as he grabs you
          this.setState('CAUGHT_YOU');
          this.scene.onCaught();
          return;
        }
        if (this.stateT >= T.LUNGE_MS) {
          // the whiff has weight: he craters whatever card he lands on
          if (this.scene.wreck) {
            const crashEl = this.page.onFurniture(s.x, s.y + s.displayHeight * 0.3);
            if (crashEl) this.scene.wreck.hit(crashEl, T.WRECK_LUNGE);
          }
          // whiffed BUT came within ~1.7 catch-radii = a genuine close call
          if (this.lungeMinDist < T.CATCH_RADIUS * 1.7) NB.playMoment(this.scene, 'closeCall');
          this.setState('STUMBLE');
        }
        break;
      }
      case 'CLIMB': {
        // committed vault — no catch possible here, this is the player's window
        const cd = this.climbData;
        const k = Math.min(1, this.stateT / T.VAULT_MS);
        const ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        s.x = cd.fromX + (cd.toX - cd.fromX) * ease;
        s.y = cd.fromY + (cd.toY - cd.fromY) * ease - Math.sin(k * Math.PI) * T.VAULT_ARC;
        s.setAngle(Math.sin(k * Math.PI) * T.VAULT_TILT_DEG * (s.flipX ? -1 : 1));
        if (k >= 1) {
          s.setAngle(0); this.climbCd = T.VAULT_CD; this.climbData = null;
          this.scene.cameras.main.shake(70, 0.003); // the landing thud
          this.setState('HUNT');
        }
        break;
      }
      case 'STUMBLE': {
        s.setAngle(Math.sin(this.stateT / 60) * 6);
        if (this.stateT >= T.STUMBLE_MS) { s.setAngle(0); this.setState('HUNT'); }
        break;
      }
      case 'RISE': {
        const k = Math.min(1, this.stateT / 1200);
        const ease = 1 - Math.pow(1 - k, 3);
        s.setScale(0.05 + (this.baseScale * 1.06 - 0.05) * ease);
        s.setAlpha(0.4 + 0.6 * ease);
        if (this.riseFrom) s.y = this.riseFrom.y + (this.riseFrom.toY - this.riseFrom.y) * ease;
        if (k >= 1) {
          if (this.revenant) s.setTint(0xbbffbb);   // grave-green is the zombie's, not the tag-in's
          this.setState('HUNT');
        }
        break;
      }
      case 'CAUGHT_YOU':
        break;
    }

    if (this.state !== 'CAUGHT_YOU') s.setFlipX((tgt.x - s.x) < 0);
    // stride reads better when run anim accelerates with heat
    if (s.anims.currentAnim) {
      const spd = this.state === 'LURK' ? 0.85
        : (this.state === 'HUNT' || this.state === 'YANK') ? 1 + this.heat * 0.18
        : 1;
      s.anims.timeScale = spd;
    }
    this.clamp();
  }

  beginVault(nx, ny, el) {
    const s = this.sprite, T = NB.TUNE;
    this.climbData = {
      fromX: s.x, fromY: s.y,
      toX: s.x + nx * T.VAULT_FORWARD,
      toY: s.y + ny * T.VAULT_FORWARD,
    };
    this.page.shake(el, this.scene);
    if (this.scene.wreck) this.scene.wreck.hit(el, NB.TUNE.WRECK_VAULT);
    this.setState('CLIMB');
  }

  moveToward(target, speed, dt) {
    const s = this.sprite;
    const dx = target.x - s.x, dy = target.y - s.y;
    const d = Math.hypot(dx, dy);
    if (d < 4) return;
    s.x += (dx / d) * speed * dt / 1000;
    s.y += (dy / d) * speed * dt / 1000;
  }

  clamp() {
    const s = this.sprite;
    s.x = Phaser.Math.Clamp(s.x, 30, this.scene.scale.width - 30);
    s.y = Phaser.Math.Clamp(s.y, 40, this.page.WORLD_H - 30);
  }

  burst(ms) { this.speedBurstT = ms; }

  // Meme powerup primitives (used by pickups via the meme registry).
  slow(ms, mult) {
    this.slowT = Math.max(this.slowT, ms);
    this.slowMult = mult;
  }

  knockback(px) {
    const s = this.sprite, p = this.scene.playerPos;
    if (!p) return;
    const dx = s.x - p.x, dy = s.y - p.y, d = Math.hypot(dx, dy) || 1;
    s.x = Phaser.Math.Clamp(s.x + (dx / d) * px, 30, this.scene.scale.width - 30);
    s.y = Phaser.Math.Clamp(s.y + (dy / d) * px, this.page.headerH + 40, this.page.WORLD_H - 30);
    // a knockback out of a wind-up wastes the attack (your reward for the timing)
    if (this.state === 'TELEGRAPH' || this.state === 'LUNGE') this.setState('STUMBLE');
  }
};
