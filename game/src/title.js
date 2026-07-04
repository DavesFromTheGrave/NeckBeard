// Tap-to-start title card. Skipped when ?autostart=1 (boot test / dev).
window.NB = window.NB || {};

NB.autostart = function () {
  try { return new URLSearchParams(location.search).has('autostart'); } catch { return false; }
};

class TitleScene extends Phaser.Scene {
  constructor() { super('title'); }

  preload() {
    this.load.image('walk-1', 'assets/walk/mod-walk2-1.png');
    this.load.image('cover', 'assets/cover/cover.jpg');
    this.load.image('balder-hero', 'assets/cover/balder-hero.jpg');
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d0b10).setDepth(0);
    const cx = W / 2;

    // Full-bleed cover art, full opacity — text overlays it directly with a
    // heavy black stroke for legibility instead of a panel/fade behind it.
    if (this.textures.exists('balder-hero')) {
      const hero = this.add.image(cx, H / 2, 'balder-hero').setDepth(1);
      hero.setScale(Math.max(W / hero.width, H / hero.height));
    } else if (this.textures.exists('cover')) {
      const bg = this.add.image(cx, H / 2, 'cover').setDepth(1);
      bg.setScale(Math.max(W / bg.width, H / bg.height));
    }

    this.add.text(cx, H * 0.09, 'NECKBEARD', {
      fontFamily: NB.FONT_DISPLAY, fontSize: `${Math.min(56, W * 0.1)}px`,
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(5).setStroke('#000000', 8);

    this.add.text(cx, H * 0.27, 'the mod is always watching', {
      fontFamily: NB.FONT_ACCENT, fontSize: '19px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(5).setStroke('#000000', 5);

    const pb = NB.getPersonalBest();
    const pbLine = pb > 0 ? `personal best: ${NB.fmtTime(pb)}` : 'no personal best yet';
    this.add.text(cx, H * 0.67, pbLine, {
      fontFamily: 'Courier New', fontSize: '16px', fontStyle: 'bold', color: '#ff6a3d',
    }).setOrigin(0.5).setDepth(5).setStroke('#000000', 5);

    const hint = this.add.text(cx, H * 0.78, 'tap anywhere to start', {
      fontFamily: 'Courier New', fontSize: '15px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(5).setStroke('#000000', 5);
    this.tweens.add({ targets: hint, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });

    this.add.text(cx, H * 0.89, 'move your finger\ndodge comments\ntravel subs', {
      fontFamily: 'Courier New', fontSize: '12px', color: '#e8e8e8', lineSpacing: 4, align: 'center',
    }).setOrigin(0.5, 0).setDepth(5).setStroke('#000000', 4);

    const go = () => {
      if (this.started) return;
      this.started = true;
      this.scene.start('game');
    };

    if (NB.autostart()) {
      this.time.delayedCall(50, go);
      return;
    }
    this.input.once('pointerdown', go);
    this.input.keyboard?.once('keydown', go);
  }
}