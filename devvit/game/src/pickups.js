// Pickups — three jam-scoped items, spawned on real post cards.
// SHIELD: absorbs one lunge. STUN: freezes him. DECOY: fake cursor he chases.
window.NB = window.NB || {};

NB.Pickups = class {
  constructor(scene, page) {
    this.scene = scene;
    this.page = page;
    this.items = [];
    this.spawnT = 4000;
    this.shield = false;
    this.shieldGfx = null;
  }

  update(dt, player) {
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.items.length < 3) {
      this.spawn();
      this.spawnT = Phaser.Math.Between(6000, 11000);
    }
    // collect by touch
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if (Phaser.Math.Distance.Between(player.x, player.y, it.x, it.y) < 26) {
        this.apply(it);
        it.objs.forEach(o => o.destroy());
        this.items.splice(i, 1);
      }
    }
    if (this.shieldGfx) this.shieldGfx.setPosition(player.x, player.y + 8);
  }

  spawn() {
    const posts = this.page.elements.filter(e => e.kind === 'post');
    if (!posts.length) return;
    const el = Phaser.Utils.Array.GetRandom(posts);
    const x = el.rect.x + Phaser.Math.Between(50, el.rect.width - 30);
    const y = el.rect.y + Phaser.Math.Between(20, el.rect.height - 20);
    const kind = Phaser.Utils.Array.GetRandom(['shield', 'stun', 'decoy']);
    const color = { shield: 0x4a90d9, stun: 0xe8c944, decoy: 0x9b59b6 }[kind];
    const icon = { shield: '🛡', stun: '⚡', decoy: '👆' }[kind];
    const objs = [
      this.scene.add.circle(x, y, 15, color, 0.9).setDepth(8).setStrokeStyle(2, 0xffffff),
      this.scene.add.text(x, y, icon, { fontSize: '14px' }).setOrigin(0.5).setDepth(9),
    ];
    this.scene.tweens.add({ targets: objs, y: '-=5', yoyo: true, repeat: -1, duration: 700 });
    this.items.push({ x, y, kind, objs });
  }

  // The cursed-subreddit reward — stronger than a normal stun, and it wipes
  // heat so a close call becomes real breathing room.
  spawnCursed(x, y) {
    const objs = [
      this.scene.add.circle(x, y, 18, 0x2ecc71, 0.95).setDepth(8).setStrokeStyle(3, 0xffffff),
      this.scene.add.text(x, y, '☠', { fontSize: '16px' }).setOrigin(0.5).setDepth(9),
    ];
    this.scene.tweens.add({ targets: objs, y: '-=6', yoyo: true, repeat: -1, duration: 500 });
    this.scene.tweens.add({ targets: objs, scale: 1.15, yoyo: true, repeat: -1, duration: 350 });
    this.items.push({ x, y, kind: 'cursed', objs });
  }

  apply(it) {
    NB.sfx.pickup();
    const scene = this.scene;
    if (it.kind === 'shield') {
      this.shield = true;
      if (this.shieldGfx) this.shieldGfx.destroy();
      this.shieldGfx = scene.add.circle(it.x, it.y, 24)
        .setStrokeStyle(2.5, 0x4a90d9, 0.9).setDepth(19);
    } else if (it.kind === 'stun') {
      scene.mod.stun(1600);
      scene.floatText(it.x, it.y, 'STUNNED', '#e8c944');
    } else if (it.kind === 'decoy') {
      scene.mod.setDecoy(it.x, it.y, 3200);
      scene.floatText(it.x, it.y, 'DECOY', '#9b59b6');
    } else if (it.kind === 'cursed') {
      scene.mod.stun(3000);
      scene.mod.heat = 0;
      scene.floatText(it.x, it.y, 'CURSED POWER', '#2ecc71');
    }
  }

  // returns true if the shield ate the hit
  absorb() {
    if (!this.shield) return false;
    this.shield = false;
    NB.sfx.shieldPop();
    if (this.shieldGfx) {
      const g = this.shieldGfx;
      this.shieldGfx = null;
      this.scene.tweens.add({ targets: g, scale: 2.2, alpha: 0, duration: 260,
        onComplete: () => g.destroy() });
    }
    return true;
  }
};
