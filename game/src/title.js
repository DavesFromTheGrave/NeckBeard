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
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.add.rectangle(W / 2, H / 2, W, H, 0x1a1a1b).setDepth(0);

    if (this.textures.exists('cover')) {
      const bg = this.add.image(W / 2, H / 2, 'cover').setDepth(1);
      const scale = Math.max(W / bg.width, H / bg.height);
      bg.setScale(scale).setAlpha(0.42);
    }

    this.add.text(W / 2, H * 0.22, 'NECKBEARD GO', {
      fontFamily: 'Courier New', fontSize: `${Math.min(52, W * 0.07)}px`,
      fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(5).setStroke('#000000', 6);

    this.add.text(W / 2, H * 0.31, 'the mod is always watching', {
      fontFamily: 'Courier New', fontSize: '15px', color: '#d7dadc',
    }).setOrigin(0.5).setDepth(5);

    const mod = this.add.sprite(W * 0.5, H * 0.58, 'walk-1')
      .setScale(NB.TUNE.SPRITE_SCALE * 2.2).setDepth(4).setTint(0xcccccc);
    this.tweens.add({ targets: mod, x: W * 0.52, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const pb = NB.getPersonalBest();
    const pbLine = pb > 0 ? `personal best: ${NB.fmtTime(pb)}` : 'no personal best yet';
    this.add.text(W / 2, H * 0.78, pbLine, {
      fontFamily: 'Courier New', fontSize: '16px', color: '#ff4500',
    }).setOrigin(0.5).setDepth(5);

    const hint = this.add.text(W / 2, H * 0.88, 'tap anywhere to start', {
      fontFamily: 'Courier New', fontSize: '14px', color: '#818384',
    }).setOrigin(0.5).setDepth(5);
    this.tweens.add({ targets: hint, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });

    this.add.text(W / 2, H * 0.94, 'move your finger · dodge comments · travel subs', {
      fontFamily: 'Courier New', fontSize: '11px', color: '#555555',
    }).setOrigin(0.5).setDepth(5);

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