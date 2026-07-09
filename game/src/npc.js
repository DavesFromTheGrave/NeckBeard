// The Cheerleader — the last thirst-trap bot in a dead internet. She struts in,
// and the mod CANNOT resist moderating her (attention-seeking = rule violation).
// While she's up, his aggro diverts off you = your breather. He never catches
// her (she bails just before he can wind up); he just gets played, then returns
// angrier. Pure ambient distraction — no player input, emergent lulls.
window.NB = window.NB || {};

NB.Cheerleader = class {
  constructor(scene) {
    this.scene = scene;
    this.sprite = null;
    this.active = false;
    this.spawnT = 14000;          // first appearance
    this.lifeT = 0;
    this.poses = ['cheer-idle', 'cheer-cheer', 'cheer-armsup', 'cheer-pompom', 'cheer-kick', 'cheer-wink'];
    this.poseT = 0;
    this.poseI = 0;
    this.hearts = null;
  }

  // every hunter currently on the page (a frozen superM0D is "upstairs")
  activeMods() {
    return (this.scene.mods || [this.scene.mod]).filter(m => !m.frozen);
  }

  update(dt) {
    if (this.scene.ceremonyRunning) return;   // she doesn't upstage management
    if (!this.active) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) this.spawn();
      return;
    }
    this.lifeT -= dt;
    this.poseT -= dt;
    if (this.poseT <= 0) {
      this.poseI = (this.poseI + 1) % this.poses.length;
      this.sprite.setTexture(this.poses[this.poseI]);
      this.poseT = 240;
    }
    // hold EVERY mod's gaze while she's on stage — none of them can resist
    const mods = this.activeMods();
    for (const m of mods) m.distraction = { x: this.sprite.x, y: this.sprite.y };
    // bail JUST outside telegraph range so nobody gets to wind up at her
    const cornered = mods.some(m => Phaser.Math.Distance.Between(
      m.sprite.x, m.sprite.y, this.sprite.x, this.sprite.y) < NB.TUNE.LUNGE_RANGE + 24);
    if (cornered) {
      this.leave('banned');
    } else if (this.lifeT <= 0) {
      this.leave('bored');
    }
  }

  spawn() {
    const scene = this.scene;
    const W = scene.scale.width, H = scene.scale.height;
    const cam = scene.cameras.main;
    const y = cam.scrollY + Phaser.Math.Between(Math.round(H * 0.32), Math.round(H * 0.72));
    // opposite side from the (nearest active) mod so the diversion pulls him across
    const ref = this.activeMods()[0] || scene.mod;
    const x = ref.sprite.x < W / 2 ? W - 64 : 64;
    this.sprite = scene.add.sprite(x, y, 'cheer-idle').setScale(1).setDepth(11);
    this.sprite.setFlipX(x > W / 2);
    this.active = true;
    this.lifeT = Phaser.Math.Between(4500, 6800);
    this.poseT = 0; this.poseI = 0;
    NB.sfx.cheer();
    NB.playMoment(scene, 'cheerleader');   // e-girl struts in → a thirst meme
    scene.floatText(x, y - 74, 'a wild e-girl appears', '#ff6ec7');
    this.hearts = scene.time.addEvent({ delay: 480, loop: true, callback: () => {
      if (!this.sprite) return;
      const hr = scene.add.text(this.sprite.x + Phaser.Math.Between(-22, 22), this.sprite.y - 44, '♥',
        { fontSize: '14px', color: '#ff6ec7' }).setDepth(11);
      scene.tweens.add({ targets: hr, y: hr.y - 32, alpha: 0, duration: 1000, onComplete: () => hr.destroy() });
    }});
  }

  leave(why) {
    const scene = this.scene;
    if (this.hearts) { this.hearts.remove(); this.hearts = null; }
    for (const m of (scene.mods || [scene.mod])) m.distraction = null;
    if (this.sprite) {
      const s = this.sprite;
      scene.floatText(s.x, s.y - 64, why === 'banned' ? 'BANNED \u{1F494}' : 'o7', '#ff6ec7');
      scene.tweens.add({ targets: s, alpha: 0, y: s.y - 22, scale: 0.6, duration: 420,
        onComplete: () => s.destroy() });
    }
    this.sprite = null;
    this.active = false;
    this.spawnT = Phaser.Math.Between(15000, 25000);
    if (why === 'banned') this.activeMods().forEach(m => m.burst(1100));   // annoyed they got played
  }
};

// The Admin — upper management on a floor walk. Every now and then he strolls
// clean across the screen, cigar going. Pure ambience: sees everything, does
// nothing, answers to no one. (Dave: "every now and then he scrolls across.")
NB.AdminCameo = class {
  constructor(scene) {
    this.scene = scene;
    this.sprite = null;
    this.nextT = Phaser.Math.Between(28000, 55000);   // first walk-by
    this.vx = 0;
    this.puffT = 0;
  }

  update(dt) {
    const scene = this.scene;
    if (scene.ceremonyRunning) return;   // he doesn't audit the audit
    if (!this.sprite) {
      this.nextT -= dt;
      if (this.nextT <= 0) this.spawn();
      return;
    }
    const s = this.sprite;
    s.x += this.vx * dt / 1000;
    s.setAngle(Math.sin(scene.time.now / 130) * 2.5);   // unbothered stroll
    this.puffT -= dt;
    if (this.puffT <= 0) {
      this.puffT = 420;
      const px = s.x + (s.flipX ? 12 : -12), py = s.y - s.displayHeight * 0.36;
      const puff = scene.add.circle(px, py, Phaser.Math.Between(3, 5), 0xbbbbbb, 0.45).setDepth(11.5);
      scene.tweens.add({ targets: puff, y: py - 22, alpha: 0, scale: 1.8, duration: 800,
        onComplete: () => puff.destroy() });
    }
    const W = scene.scale.width;
    if ((this.vx > 0 && s.x > W + 60) || (this.vx < 0 && s.x < -60)) {
      s.destroy();
      this.sprite = null;
      this.nextT = Phaser.Math.Between(45000, 90000);
    }
  }

  spawn() {
    const scene = this.scene;
    const W = scene.scale.width, H = scene.scale.height;
    const cam = scene.cameras.main;
    const fromLeft = Math.random() < 0.5;
    const y = Phaser.Math.Clamp(
      cam.scrollY + Phaser.Math.Between(Math.round(H * 0.3), Math.round(H * 0.75)),
      120, scene.page.WORLD_H - 80);
    this.sprite = scene.add.image(fromLeft ? -50 : W + 50, y, 'admin-walk').setDepth(11);
    const targetH = 512 * NB.TUNE.SPRITE_SCALE * 1.12;   // the boss stands a head taller
    this.sprite.setScale(targetH / this.sprite.height);
    this.vx = (fromLeft ? 1 : -1) * 72;                  // management doesn't hurry
    this.sprite.setFlipX(fromLeft);                       // art faces left natively
    this.puffT = 0;
  }
};
