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
    // hold the mod's gaze while she's on stage
    this.scene.mod.distraction = { x: this.sprite.x, y: this.sprite.y };
    const m = this.scene.mod.sprite;
    // bail JUST outside his telegraph range so he never gets to wind up at her
    if (Phaser.Math.Distance.Between(m.x, m.y, this.sprite.x, this.sprite.y) < NB.TUNE.LUNGE_RANGE + 24) {
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
    // opposite side from the mod so the diversion actually pulls him across
    const x = scene.mod.sprite.x < W / 2 ? W - 64 : 64;
    this.sprite = scene.add.sprite(x, y, 'cheer-idle').setScale(1).setDepth(11);
    this.sprite.setFlipX(x > W / 2);
    this.active = true;
    this.lifeT = Phaser.Math.Between(4500, 6800);
    this.poseT = 0; this.poseI = 0;
    NB.sfx.cheer();
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
    scene.mod.distraction = null;
    if (this.sprite) {
      const s = this.sprite;
      scene.floatText(s.x, s.y - 64, why === 'banned' ? 'BANNED \u{1F494}' : 'o7', '#ff6ec7');
      scene.tweens.add({ targets: s, alpha: 0, y: s.y - 22, scale: 0.6, duration: 420,
        onComplete: () => s.destroy() });
    }
    this.sprite = null;
    this.active = false;
    this.spawnT = Phaser.Math.Between(15000, 25000);
    if (why === 'banned') this.scene.mod.burst(1100);   // he's annoyed he got played
  }
};
