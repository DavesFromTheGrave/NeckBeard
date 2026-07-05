// Pickups — spawns memes from the registry (memes.js) onto real post cards and
// applies their effect on touch. SHIELD still absorbs one lunge (mod.js calls
// absorb()). Effects run through the mod's primitives; durations inline here
// are the tuning knobs. Cursed-sub bonus (spawnCursed) unchanged.
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
      this.spawnT = Phaser.Math.Between(5000, 9000);
    }
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
    const x = el.rect.x + Phaser.Math.Between(50, Math.max(60, el.rect.width - 30));
    const y = el.rect.y + Phaser.Math.Between(20, Math.max(30, el.rect.height - 20));
    const id = NB.randomMemeId();
    const objs = NB.drawMemeBadge(this.scene, x, y, id);
    this.scene.tweens.add({ targets: objs, y: '-=5', yoyo: true, repeat: -1, duration: 700 });
    this.items.push({ x, y, id, objs });
  }

  // The cursed-subreddit reward — stronger than a normal stun, wipes heat.
  spawnCursed(x, y) {
    const objs = [
      this.scene.add.circle(x, y, 18, 0x2ecc71, 0.95).setDepth(8).setStrokeStyle(3, 0xffffff),
      this.scene.add.text(x, y, '☠', { fontSize: '16px' }).setOrigin(0.5).setDepth(9),
    ];
    this.scene.tweens.add({ targets: objs, y: '-=6', yoyo: true, repeat: -1, duration: 500 });
    this.scene.tweens.add({ targets: objs, scale: 1.15, yoyo: true, repeat: -1, duration: 350 });
    this.items.push({ x, y, id: '__cursed', objs });
  }

  apply(it) {
    const scene = this.scene, mod = scene.mod;
    if (it.id === '__cursed') {
      NB.sfx.pickup();
      mod.stun(3000); mod.heat = 0;
      scene.floatText(it.x, it.y, 'CURSED POWER', '#2ecc71');
      return;
    }
    const m = NB.MEMES[it.id];
    if (!m) return;
    const good = m.cat !== 'trap';
    NB.playMemeSound(scene, it.id, () => (good ? NB.sfx.pickup() : NB.sfx.commentHit()));

    switch (m.fx) {
      case 'stun':
        mod.stun(m.big ? 2400 : 1600); break;
      case 'decoy':
        mod.setDecoy(it.x, it.y, 3200); break;
      case 'shield':
        this.shield = true;
        if (this.shieldGfx) this.shieldGfx.destroy();
        this.shieldGfx = scene.add.circle(it.x, it.y, 24).setStrokeStyle(2.5, 0x4a90d9, 0.9).setDepth(19);
        break;
      case 'heatwipe':
        mod.heat = 0; mod.stun(400); break;
      case 'knockback':
        mod.knockback(m.big ? 360 : 220); break;
      case 'slow':
        mod.slow(3000, 0.6); break;
      case 'score':
        scene.survivalMs += (m.score || 1) * 1000; break;
      case 'trap':
        mod.burst(1600); mod.heat = Math.min(NB.TUNE.HEAT_MAX, mod.heat + 1); break;
    }

    const color = m.fx === 'trap' ? '#e0452a'
      : m.fx === 'score' ? '#f1c40f'
      : '#ffffff';
    scene.floatText(it.x, it.y - 18, m.say || m.name, color);
    if (m.fx === 'score') scene.floatText(it.x, it.y + 6, `+${m.score || 1}s`, '#f1c40f');
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
