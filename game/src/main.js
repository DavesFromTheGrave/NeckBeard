// Neckbeard (hackathon build) — boot scene.
// Touch-first: the pointer/finger IS the hunted cursor.
window.NB = window.NB || {};

class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  preload() {
    const load = (dir, base, n) => {
      for (let i = 1; i <= n; i++) this.load.image(`${base}-${i}`, `assets/${dir}/mod-${base}2-${i}.png`);
    };
    load('walk', 'walk', 6);
    load('run', 'run', 6);
    for (let i = 1; i <= 6; i++) this.load.image(`charge-${i}`, `assets/charge/mod-charge-${i}.png`);
    for (let i = 1; i <= 6; i++) this.load.image(`leap-${i}`, `assets/leap/mod-leap-${i}.png`);
    for (let i = 1; i <= 6; i++) this.load.image(`pose-${i}`, `assets/poses/mod-pose2-${i}.png`);
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.survivalMs = 0;
    this.caught = false;

    // animations
    const anim = (key, prefix, n, rate, repeat = -1) => this.anims.create({
      key, frames: Array.from({ length: n }, (_, i) => ({ key: `${prefix}-${i + 1}` })),
      frameRate: rate, repeat,
    });
    anim('anim-walk', 'walk', 6, 7);
    anim('anim-run', 'run', 6, 11);
    anim('anim-charge', 'charge', 6, 12);
    anim('anim-leap', 'leap', 6, 14, 0);
    this.anims.create({ key: 'anim-crouch', frames: [{ key: 'pose-1' }], frameRate: 1 });
    this.anims.create({ key: 'anim-stumble', frames: [{ key: 'pose-5' }], frameRate: 1 });
    this.anims.create({ key: 'anim-victory', frames: [{ key: 'pose-2' }], frameRate: 1 });

    // the stage
    this.page = NB.buildFakePage(this, W, H);

    // the player: a drawn cursor that rides the real pointer
    this.playerPos = { x: W * 0.7, y: H * 0.6 };
    this.cursorGfx = this.add.graphics().setDepth(20);
    this.drawCursor(this.playerPos.x, this.playerPos.y);
    this.input.on('pointermove', (p) => { this.playerPos.x = p.x; this.playerPos.y = p.y; });

    // him
    this.mod = new NB.Supermod(this, this.page, W * 0.15, H * 0.25);

    // HUD
    this.hud = this.add.text(W - 14, H - 12, '0.0s', {
      fontFamily: 'Courier New', fontSize: '18px', color: '#1a1a1b',
    }).setOrigin(1, 1).setDepth(30);
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

  onCaught() {
    if (this.caught) return;
    this.caught = true;
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.shake(220, 0.012);
    this.time.delayedCall(400, () => {
      this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.82).setDepth(40);
      this.add.text(W / 2, H / 2 - 40, '[ REMOVED ]', {
        fontFamily: 'Courier New', fontSize: '46px', fontStyle: 'bold', color: '#ff4d4d',
      }).setOrigin(0.5).setDepth(41);
      this.add.text(W / 2, H / 2 + 10, 'Reason: none provided.', {
        fontFamily: 'Courier New', fontSize: '18px', color: '#cccccc',
      }).setOrigin(0.5).setDepth(41);
      this.add.text(W / 2, H / 2 + 56, `you lasted ${(this.survivalMs / 1000).toFixed(1)}s`, {
        fontFamily: 'Courier New', fontSize: '15px', color: '#888888',
      }).setOrigin(0.5).setDepth(41);
      this.add.text(W / 2, H / 2 + 100, 'tap to appeal (denied)', {
        fontFamily: 'Courier New', fontSize: '14px', color: '#666666',
      }).setOrigin(0.5).setDepth(41);
      this.input.once('pointerdown', () => this.scene.restart());
    });
  }

  update(_, dt) {
    if (this.caught) return;
    this.survivalMs += dt;
    this.drawCursor(this.playerPos.x, this.playerPos.y);
    this.mod.update(dt, this.playerPos);
    this.hud.setText(`${(this.survivalMs / 1000).toFixed(1)}s  heat:${this.mod.heat}`);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#f6f7f9',
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  pixelArt: true,
  scene: GameScene,
});
