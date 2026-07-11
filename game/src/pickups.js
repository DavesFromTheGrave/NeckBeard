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
    this.spawnT = NB.TUNE.MEME_FIRST_MS;
    this.shield = false;
    this.shieldGfx = null;
  }

  update(dt, player) {
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.items.length < NB.TUNE.MEME_MAX_ONSCREEN) {
      this.spawn();
      this.spawnT = Phaser.Math.Between(NB.TUNE.MEME_SPAWN_MIN_MS, NB.TUNE.MEME_SPAWN_MAX_MS);
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
    const scene = this.scene;
    // every hunter that's actually on the page eats the effect — a Ban Hammer
    // that only stunned one of two mods would be a dead powerup in the endgame
    const mods = (scene.mods || [scene.mod]).filter(m => !m.frozen);
    if (it.id === '__cursed') {
      NB.sfx.pickup();
      mods.forEach(md => { md.stun(3000); md.heat = 0; });
      scene.floatText(it.x, it.y, 'CURSED POWER', '#2ecc71');
      return;
    }
    const m = NB.MEMES[it.id];
    if (!m) return;
    const T = NB.TUNE;
    const good = m.cat !== 'trap';
    // Every non-trap grab feeds the run's COLLECTION (the stacking HUD strip;
    // daily challenges will read this bag later).
    if (good) {
      scene.memeBag[it.id] = (scene.memeBag[it.id] || 0) + 1;
      if (scene.updateMemeBagHUD) scene.updateMemeBagHUD();
    }
    // The meme's own captured voice (gated — voices never pile up). If it can't
    // fire (busy or no clip): a base blip for feedback + a generic "powerup"
    // hype meme (good) / the "oof" (trap).
    if (!NB.playMemeSfx(scene, it.id, 0.85)) {
      if (good) { NB.sfx.pickup(); NB.playMoment(scene, 'powerup'); }
      else NB.sfx.commentHit();
    }

    switch (m.fx) {
      case 'stun':
        mods.forEach(md => md.stun(m.big ? T.MEME_STUN_BIG_MS : T.MEME_STUN_MS)); break;
      case 'decoy':
        mods.forEach(md => md.setDecoy(it.x, it.y, T.MEME_DECOY_MS)); break;
      case 'shield':
        this.shield = true;
        if (this.shieldGfx) this.shieldGfx.destroy();
        this.shieldGfx = scene.add.circle(it.x, it.y, 24).setStrokeStyle(2.5, 0x4a90d9, 0.9).setDepth(19);
        break;
      case 'heatwipe':
        mods.forEach(md => { md.heat = 0; md.stun(T.MEME_HEATWIPE_STUN_MS); }); break;
      case 'knockback':
        mods.forEach(md => md.knockback(m.big ? T.MEME_KNOCKBACK_BIG : T.MEME_KNOCKBACK)); break;
      case 'slow':
        mods.forEach(md => md.slow(T.MEME_SLOW_MS, T.MEME_SLOW_FACTOR)); break;
      case 'score':
        break;   // collectibles ARE the collection now (was +1-3s survival — worthless post-karma-scoring)
      case 'trap':
        mods.forEach(md => { md.burst(1600); md.heat = Math.min(T.HEAT_MAX, md.heat + 1); }); break;
    }

    const color = m.fx === 'trap' ? '#e0452a'
      : m.fx === 'score' ? '#f1c40f'
      : '#ffffff';
    scene.floatText(it.x, it.y - 18, m.say || m.name, color);
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
