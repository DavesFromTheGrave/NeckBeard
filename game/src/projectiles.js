// Comment projectiles — he rips a REAL comment off the page and throws it.
// Fairness: a hit never catches. It dazes (vignette + brief speed burst for him).
window.NB = window.NB || {};

NB.Projectiles = class {
  constructor(scene, comments) {
    this.scene = scene;
    this.comments = comments;
    this.live = [];
  }

  throwAt(fromX, fromY, target) {
    const c = Phaser.Utils.Array.GetRandom(this.comments);
    let txt = `${c.author}: ${c.body}`;
    // the letter-hunt whisper: sometimes the comment he throws at you IS the
    // tip (Dave: "added to the posts that are thrown (sometimes)"). Stops
    // once the hunt is finished. DRAFT wording — Dave's to swap.
    if (!NB.lettersDone() && Math.random() < 0.12) {
      txt = 'u/[deleted]: r/cursed. type it. before he sees this.';
    }
    const w = Math.min(240, 40 + txt.length * 6.2), h = 34;
    const card = this.scene.add.rectangle(fromX, fromY, w, h, 0xffffff, 1)
      .setStrokeStyle(1.5, 0x878a8c).setDepth(14);
    const label = this.scene.add.text(fromX, fromY, txt, {
      fontFamily: 'Arial', fontSize: '11px', color: '#1a1a1b',
      wordWrap: { width: w - 12 },
    }).setOrigin(0.5).setDepth(15);
    const ang = Math.atan2(target.y - fromY, target.x - fromX);
    const sp = 330;
    this.live.push({
      card, label,
      vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      spin: Phaser.Math.FloatBetween(-140, 140),
      ttl: 2600,
    });
    NB.sfx.throwWind();
  }

  update(dt, player) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      p.ttl -= dt;
      p.card.x += p.vx * dt / 1000; p.card.y += p.vy * dt / 1000;
      p.card.angle += p.spin * dt / 1000;
      p.label.setPosition(p.card.x, p.card.y).setAngle(p.card.angle);
      const hit = Phaser.Math.Distance.Between(player.x, player.y, p.card.x, p.card.y) < 30;
      if (hit || p.ttl <= 0) {
        if (hit) this.scene.onCommentHit(p.card.x, p.card.y);
        // the comment crumples where it lands
        this.scene.tweens.add({ targets: [p.card, p.label], alpha: 0, scaleY: 0.1,
          angle: '+=25', duration: 240,
          onComplete: () => { p.card.destroy(); p.label.destroy(); } });
        this.live.splice(i, 1);
      }
    }
  }
};
