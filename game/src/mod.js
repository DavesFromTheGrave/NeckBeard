// Supermod — the state machine, ported from the extension's proven physics.
// FAIRNESS IS STRUCTURAL: the catch check runs ONLY inside the LUNGE window,
// and LUNGE is reachable ONLY through a full 500ms TELEGRAPH. No exceptions.
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
    this.telegraphRing = scene.add.circle(x, y, 46)
      .setStrokeStyle(3, 0xe0452a).setVisible(false).setDepth(9);
    this.sprite.play('anim-walk');
  }

  setState(s) {
    this.state = s;
    this.stateT = 0;
    const spr = this.sprite;
    switch (s) {
      case 'LURK':   spr.play('anim-walk'); break;
      case 'HUNT':   spr.play(this.heat >= 2 ? 'anim-charge' : 'anim-run'); break;
      case 'TELEGRAPH':
        spr.play('anim-crouch');
        this.telegraphRing.setVisible(true);
        this.scene.tweens.add({ targets: this.telegraphRing, scale: { from: 1.4, to: 0.7 },
          alpha: { from: 0.4, to: 1 }, duration: NB.TUNE.TELEGRAPH_MS });
        break;
      case 'LUNGE':  spr.play('anim-leap'); break;
      case 'STUMBLE': spr.play('anim-stumble'); this.telegraphRing.setVisible(false); break;
      case 'CAUGHT_YOU': spr.play('anim-victory'); this.telegraphRing.setVisible(false); break;
    }
  }

  update(dt, player) {
    const T = NB.TUNE;
    this.stateT += dt;
    const s = this.sprite;
    const dx = player.x - s.x, dy = player.y - s.y;
    const dist = Math.hypot(dx, dy);

    // heat: survival makes him meaner
    this.heat = Math.min(T.HEAT_MAX, Math.floor(this.scene.survivalMs / 1000 / T.HEAT_RAMP_S));

    // terrain: blocked, never stopped
    const el = this.page.onFurniture(s.x, s.y + s.displayHeight * 0.3);
    const climbing = !!el && this.state !== 'LUNGE';
    if (climbing) {
      this.page.shake(el, this.scene);
      s.setAngle(Math.sin(this.stateT / 90) * T.CLIMB_BOB_DEG);
    } else if (this.state !== 'STUMBLE') {
      s.setAngle(0);
    }
    const terrainMult = climbing ? T.CLIMB_MULT : 1;

    switch (this.state) {
      case 'LURK': {
        // amble vaguely toward the player
        if (this.repathT <= 0) {
          this.aim = { x: player.x + Phaser.Math.Between(-180, 180),
                       y: player.y + Phaser.Math.Between(-180, 180) };
          this.repathT = 900;
        }
        this.repathT -= dt;
        this.moveToward(this.aim, T.LURK_SPEED * terrainMult, dt);
        if (this.stateT > T.LURK_MIN) this.setState('HUNT');
        break;
      }
      case 'HUNT': {
        this.repathT -= dt;
        if (this.repathT <= 0) { this.aim = { x: player.x, y: player.y }; this.repathT = T.HUNT_REPATH_MS; }
        const speed = (T.HUNT_SPEED + this.heat * T.HEAT_SPEED_BONUS) * terrainMult;
        this.moveToward(this.aim, speed, dt);
        if (dist < T.LUNGE_RANGE) this.setState('TELEGRAPH');
        break;
      }
      case 'TELEGRAPH': {
        // locked in place, winding up — the player's guaranteed reaction window
        this.telegraphRing.setPosition(s.x, s.y);
        if (this.stateT >= T.TELEGRAPH_MS) {
          const d2 = Math.max(1, dist);
          this.lungeVec = { x: dx / d2, y: dy / d2 };   // aim is FROZEN at launch
          this.telegraphRing.setVisible(false);
          this.setState('LUNGE');
        }
        break;
      }
      case 'LUNGE': {
        s.x += this.lungeVec.x * T.LUNGE_SPEED * dt / 1000;
        s.y += this.lungeVec.y * T.LUNGE_SPEED * dt / 1000;
        // THE ONLY CATCH CHECK IN THE GAME:
        if (dist < T.CATCH_RADIUS) {
          this.setState('CAUGHT_YOU');
          this.scene.onCaught();
          return;
        }
        if (this.stateT >= T.LUNGE_MS) this.setState('STUMBLE');
        break;
      }
      case 'STUMBLE': {
        s.setAngle(Math.sin(this.stateT / 60) * 6);
        if (this.stateT >= T.STUMBLE_MS) { s.setAngle(0); this.setState('HUNT'); }
        break;
      }
      case 'CAUGHT_YOU':
        break;
    }

    // face the direction of travel
    if (this.state !== 'CAUGHT_YOU') s.setFlipX(dx < 0);
    this.clamp();
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
    const W = this.scene.scale.width, H = this.scene.scale.height;
    s.x = Phaser.Math.Clamp(s.x, 30, W - 30);
    s.y = Phaser.Math.Clamp(s.y, 40, H - 30);
  }
};
