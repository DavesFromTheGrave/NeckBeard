// Supermod — the state machine, ported from the extension's proven physics.
// FAIRNESS IS STRUCTURAL: the catch check runs ONLY inside the LUNGE window,
// and LUNGE is reachable ONLY through a full TELEGRAPH. Comment hits and the
// scrollbar yank reposition and pressure — they NEVER catch.
window.NB = window.NB || {};

NB.Supermod = class {
  constructor(scene, page, x, y) {
    this.scene = scene;
    this.page = page;
    this.sprite = scene.add.sprite(x, y, 'walk-1')
      .setScale(NB.TUNE.SPRITE_SCALE).setDepth(10);
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
    this.revenant = false;
    this.frozen = false;
    this.speedBurstT = 0;
    this.climbCd = 0;
    this.climbData = null;
    this.distraction = null;   // set by the Cheerleader NPC while she's on screen
    this.telegraphRing = scene.add.circle(x, y, 46)
      .setStrokeStyle(3, 0xe0452a).setVisible(false).setDepth(9);
    this.sprite.play('anim-walk');
  }

  anim(kind) {
    const rev = this.revenant;
    const map = {
      walk: rev ? 'anim-zwalk' : 'anim-walk',
      hunt: rev ? 'anim-zwalk' : (this.heat >= 2 ? 'anim-charge' : 'anim-run'),
      telegraph: rev ? 'anim-ztelegraph' : 'anim-crouch',
      lunge: rev ? 'anim-zlunge' : 'anim-leap',
      climb: rev ? 'anim-zwalk' : 'anim-climb',
      stumble: 'anim-stumble',
      victory: 'anim-victory',
      throw: 'anim-throw',
    };
    this.sprite.play(map[kind]);
  }

  setState(s) {
    this.state = s;
    this.stateT = 0;
    switch (s) {
      case 'LURK': this.anim('walk'); break;
      case 'HUNT': this.anim('hunt'); break;
      case 'TELEGRAPH': {
        this.anim('telegraph');
        NB.sfx.telegraph();
        this.telegraphRing.setVisible(true).setStrokeStyle(3, this.revenant ? 0x3fae54 : 0xe0452a);
        this.scene.tweens.add({ targets: this.telegraphRing, scale: { from: 1.4, to: 0.7 },
          alpha: { from: 0.4, to: 1 }, duration: this.telegraphMs() });
        break;
      }
      case 'LUNGE': this.anim('lunge'); NB.sfx.lunge(); break;
      case 'CLIMB': this.anim('climb'); NB.sfx.vault(); this.telegraphRing.setVisible(false); break;
      case 'THROW': this.anim('throw'); break;
      case 'YANK': this.anim('hunt'); break;
      case 'STUMBLE': this.anim('stumble'); NB.sfx.stumble(); this.telegraphRing.setVisible(false); break;
      case 'RISE': this.anim('walk'); break;
      case 'CAUGHT_YOU': this.anim('victory'); this.telegraphRing.setVisible(false); break;
    }
  }

  telegraphMs() {
    // Revenant is faster but the fairness floor is inviolable
    return this.revenant ? Math.max(360, NB.TUNE.TELEGRAPH_MS - 90) : NB.TUNE.TELEGRAPH_MS;
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
    if (this.speedBurstT > 0) this.speedBurstT -= dt;
    if (this.climbCd > 0) this.climbCd -= dt;

    const tgt = this.target(player);
    const dx = tgt.x - s.x, dy = tgt.y - s.y;
    const dist = Math.hypot(dx, dy);
    const realDist = Math.hypot(player.x - s.x, player.y - s.y);

    this.heat = Math.min(T.HEAT_MAX, Math.floor(this.scene.survivalMs / 1000 / T.HEAT_RAMP_S));

    // terrain: incidental slow while atop a card (the discrete vault is its own state)
    const el = this.page.onFurniture(s.x, s.y + s.displayHeight * 0.3);
    const onCard = !!el && this.state !== 'LUNGE' && this.state !== 'CLIMB';
    if (onCard) {
      this.page.shake(el, this.scene);
      s.setAngle(Math.sin(this.stateT / 90) * T.CLIMB_BOB_DEG);
    } else if (this.state !== 'STUMBLE' && this.state !== 'CLIMB') {
      s.setAngle(0);
    }
    let mult = onCard ? T.CLIMB_MULT : 1;
    if (this.speedBurstT > 0) mult *= 1.35;
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
        if (dist < T.LUNGE_RANGE) { this.setState('TELEGRAPH'); break; }
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
        s.x += this.lungeVec.x * T.LUNGE_SPEED * dt / 1000;
        s.y += this.lungeVec.y * T.LUNGE_SPEED * dt / 1000;
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
          this.setState('CAUGHT_YOU');
          this.scene.onCaught();
          return;
        }
        if (this.stateT >= T.LUNGE_MS) this.setState('STUMBLE');
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
        if (k >= 1) { s.setAngle(0); this.climbCd = T.VAULT_CD; this.climbData = null; this.setState('HUNT'); }
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
        s.setScale(0.05 + (T.SPRITE_SCALE * 1.06 - 0.05) * ease);
        s.setAlpha(0.4 + 0.6 * ease);
        if (this.riseFrom) s.y = this.riseFrom.y + (this.riseFrom.toY - this.riseFrom.y) * ease;
        if (k >= 1) {
          s.setTint(0xbbffbb);
          this.setState('HUNT');
        }
        break;
      }
      case 'CAUGHT_YOU':
        break;
    }

    if (this.state !== 'CAUGHT_YOU') s.setFlipX((tgt.x - s.x) < 0);
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
};
