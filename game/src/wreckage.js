// Wreckage — persistent, compounding destruction of the page.
// THE RULE: once superMOD damages an element, it STAYS damaged for the whole
// play session (survives sub-travel rebuilds AND death/restart). Damage
// accrues as a float; crossing an integer threshold advances the visual stage:
//   stage 0  pristine
//   stage 1  scuffed   — crooked, hairline cracks
//   stage 2  broken    — heavy cracks, dented, text corrupts
//   stage 3  destroyed — shattered overlay, contents tumble, "[ removed ]"
// Performance: every stage change draws ONCE (one Graphics per element, a few
// static debris rects). Nothing here runs per-frame.
window.NB = window.NB || {};

// Session store: 'subreddit|kind:idx' -> accrued damage (float, capped at 3).
// Lives on window so it outlives scene restarts and page rebuilds.
NB.WRECK_STORE = NB.WRECK_STORE || new Map();

NB.Wreckage = class {
  constructor(scene, page, sub) {
    this.scene = scene;
    this.page = page;
    this.sub = sub || 'all';
    this.debrisCount = 0;
  }

  storeKey(el) { return `${this.sub}|${el.key}`; }
  dmg(el) { return NB.WRECK_STORE.get(this.storeKey(el)) || 0; }
  stage(el) { return Math.min(3, Math.floor(this.dmg(el))); }

  // Accrue damage. `fresh` hits play sfx/shake/tweens; applyStored() replays
  // silently. Chrome/header never wreck — the page frame must stay readable.
  hit(el, amount, fresh = true) {
    if (!el || !el.key || el.kind === 'header' || el.kind === 'chrome') return 0;
    const before = this.stage(el);
    const d = Math.min(3, this.dmg(el) + amount);
    NB.WRECK_STORE.set(this.storeKey(el), d);
    const after = Math.min(3, Math.floor(d));
    if (after > before) {
      for (let s = before + 1; s <= after; s++) this.applyStage(el, s, fresh);
    }
    return after;
  }

  // Re-apply stored damage after a rebuild (sub travel / restart) so the
  // wreckage is still there when you come back.
  applyStored() {
    for (const el of this.page.elements) {
      const s = this.stage(el);
      for (let i = 1; i <= s; i++) this.applyStage(el, i, false);
    }
  }

  // ---- stage visuals (draw-once, no per-frame cost) --------------------
  applyStage(el, stage, fresh) {
    const scene = this.scene;
    const r = el.rect;
    if (!el._crackGfx) {
      el._crackGfx = scene.add.graphics().setDepth(-1);
      el.objs.push(el._crackGfx); // page.dispose() cleans it with the card
    }
    const g = el._crackGfx;
    // deterministic per element so re-applies look identical
    const seed = this.hashKey(el.key);
    const rnd = this.mulberry(seed + stage * 7919);

    if (stage === 1) {
      this.drawCracks(g, r, 2, 0x9aa0a4, 0.65, rnd);
      this.tiltContents(el, (rnd() - 0.5) * 2.4, fresh);
      if (fresh) NB.sfx.commentHit();
    } else if (stage === 2) {
      this.drawCracks(g, r, 5, 0x6b7280, 0.8, rnd);
      // dent: dark scuffed blotch where he's been working the card over
      g.fillStyle(0x0b1416, 0.09);
      const bx = r.x + r.width * (0.2 + rnd() * 0.5);
      const by = r.y + r.height * (0.25 + rnd() * 0.4);
      g.fillEllipse(bx, by, 60 + rnd() * 70, 30 + rnd() * 30);
      this.corruptText(el, 0.18, seed);
      this.tiltContents(el, (rnd() - 0.5) * 5, fresh);
      this.dimContents(el, 0.85);
      if (fresh) NB.sfx.crack();
    } else if (stage === 3) {
      this.drawCracks(g, r, 9, 0x374151, 0.9, rnd);
      g.fillStyle(0x0b1416, 0.16);
      g.fillRoundedRect(r.x, r.y, r.width, r.height, NB.REDDIT.cardRadius);
      this.corruptText(el, 0.45, seed);
      this.dimContents(el, 0.55);
      this.tumbleContents(el, fresh, rnd);
      this.spawnDebris(el, rnd);
      const stamp = scene.add.text(r.x + r.width / 2, r.y + r.height / 2,
        '[ removed ]', {
          fontFamily: 'Courier New', fontSize: '15px', fontStyle: 'bold',
          color: '#d93900',
        }).setOrigin(0.5).setAngle((rnd() - 0.5) * 10).setDepth(-0.5).setAlpha(0.9);
      el.objs.push(stamp);
      if (fresh) {
        NB.sfx.crack();
        scene.cameras.main.shake(200, 0.008);
        this.burstFX(r.x + r.width / 2, r.y + r.height / 2);
      }
    }
  }

  drawCracks(g, r, count, color, alpha, rnd) {
    g.lineStyle(1.5, color, alpha);
    for (let c = 0; c < count; c++) {
      let x = r.x + rnd() * r.width;
      let y = r.y + rnd() * r.height * 0.4;
      g.beginPath();
      g.moveTo(x, y);
      const segs = 3 + Math.floor(rnd() * 3);
      for (let s = 0; s < segs; s++) {
        x += (rnd() - 0.5) * 46;
        y += 10 + rnd() * 26;
        g.lineTo(
          Phaser.Math.Clamp(x, r.x + 4, r.x + r.width - 4),
          Math.min(y, r.y + r.height - 4));
      }
      g.strokePath();
    }
  }

  // Only tilt Text/shape contents — Graphics panels rotate around canvas
  // origin (not the card), so they stay put and the cracks carry the damage.
  tiltContents(el, deg, fresh) {
    for (const o of el.objs) {
      if (o.type === 'Graphics') continue;
      if (fresh) this.scene.tweens.add({ targets: o, angle: deg, duration: 140 });
      else o.setAngle(deg);
    }
  }

  dimContents(el, alpha) {
    for (const o of el.objs) {
      if (o.type === 'Graphics') continue;
      if (o.setAlpha) o.setAlpha(alpha);
    }
  }

  // Moderation damage in the game's own language: the text itself breaks.
  corruptText(el, frac, seed) {
    const glyphs = '▓▒░#/\\%&';
    for (const o of el.objs) {
      if (o.type !== 'Text' || !o.text) continue;
      let out = '';
      for (let i = 0; i < o.text.length; i++) {
        const ch = o.text[i];
        const roll = this.mulberry(seed + i * 131 + o.text.length)();
        out += (ch !== ' ' && ch !== '\n' && roll < frac)
          ? glyphs[Math.floor(roll * 1e4) % glyphs.length] : ch;
      }
      o.setText(out);
    }
  }

  // Stage 3: contents drop to the bottom of the card and lie there.
  tumbleContents(el, fresh, rnd) {
    const floorY = el.rect.y + el.rect.height - 14;
    for (const o of el.objs) {
      if (o.type === 'Graphics' || o === el._crackGfx) continue;
      const ang = (rnd() - 0.5) * 70;
      const ty = Math.max(o.y, floorY - rnd() * 10);
      if (fresh) {
        this.scene.tweens.add({ targets: o, y: ty, angle: ang,
          duration: 320 + rnd() * 200, ease: 'Bounce.easeOut' });
      } else {
        o.y = ty; o.setAngle(ang);
      }
    }
  }

  // A few static chunks along the bottom edge — the lasting mess. Capped so
  // a long rampage can't accumulate unbounded objects.
  spawnDebris(el, rnd) {
    const T = NB.TUNE;
    const n = 4 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      if (this.debrisCount >= T.WRECK_DEBRIS_MAX) return;
      const x = el.rect.x + 10 + rnd() * (el.rect.width - 20);
      const y = el.rect.y + el.rect.height - 4 - rnd() * 8;
      const shade = [0xc8ccd0, 0x9aa0a4, 0xe3e5e8][Math.floor(rnd() * 3)];
      const chunk = this.scene.add.rectangle(x, y, 4 + rnd() * 8, 3 + rnd() * 5, shade)
        .setAngle(rnd() * 90).setDepth(-0.8);
      el.objs.push(chunk);
      this.debrisCount++;
    }
  }

  // One-shot impact burst (transient — tweens out, leaves no objects behind).
  burstFX(x, y) {
    for (let i = 0; i < 8; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 140;
      const p = this.scene.add.rectangle(x, y, 5, 5,
        [0xffffff, 0xc8ccd0, 0xff4500][i % 3]).setDepth(16);
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(ang) * sp, y: y + Math.sin(ang) * sp + 30,
        angle: 180 + Math.random() * 180, alpha: 0,
        duration: 420 + Math.random() * 200, ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  // ---- tiny deterministic PRNG (so stored damage re-renders identically) --
  hashKey(key) {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return h;
  }
  mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
};
