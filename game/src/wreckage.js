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

  // Threshold-based staging: the FIRST threshold is low so any real contact
  // leaves a permanent crack immediately (no invisible sub-stage gap = no
  // "it repaired" illusion). Tunable in NB.TUNE.WRECK_THRESH.
  stageForDmg(d) {
    const T = NB.TUNE.WRECK_THRESH || [0.3, 1.1, 2.1];
    let s = 0;
    for (const t of T) if (d >= t) s++;
    return s;
  }
  stage(el) { return this.stageForDmg(this.dmg(el)); }

  // Accrue damage. `fresh` hits play sfx/shake/tweens; applyStored() replays
  // silently. Chrome/header never wreck — the page frame must stay readable.
  hit(el, amount, fresh = true) {
    if (!el || !el.key || el.kind === 'header' || el.kind === 'chrome') return 0;
    const before = this.stage(el);
    const d = Math.min(3, this.dmg(el) + amount);
    NB.WRECK_STORE.set(this.storeKey(el), d);
    const after = this.stageForDmg(d);
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

    const crackCol = Phaser.Display.Color.HexStringToColor(NB.REDDIT.wreckCrack || '#6b7280').color;
    const voidCol = Phaser.Display.Color.HexStringToColor(NB.REDDIT.canvas).color;
    const imp = this.impactOf(el);   // shared impact point — fractures compound from it

    if (stage === 1) {
      // a few fine fractures radiating from where he first struck
      this.drawFractures(g, r, imp.x, imp.y, 3, Math.min(96, r.width * 0.3), crackCol, rnd);
      this.tiltContents(el, (rnd() - 0.5) * 1.8, fresh);
      if (fresh) NB.sfx.commentHit();
    } else if (stage === 2) {
      // bruise under the impact + longer forked fractures + a punched shard
      g.fillStyle(voidCol, 0.14);
      g.fillCircle(imp.x, imp.y, 22 + rnd() * 14);
      this.drawFractures(g, r, imp.x, imp.y, 5, Math.min(170, r.width * 0.55), crackCol, rnd);
      this.punchChunk(g, r, imp.x, imp.y, 11 + rnd() * 8, voidCol, crackCol, rnd);
      this.corruptText(el, 0.14, seed);
      this.tiltContents(el, (rnd() - 0.5) * 4, fresh);
      this.dimContents(el, 0.9);
      if (fresh) NB.sfx.crack();
    } else if (stage === 3) {
      // full shatter: fractures reach the edges, several chunks gone, caved in
      this.drawFractures(g, r, imp.x, imp.y, 9, Math.max(r.width, r.height), crackCol, rnd);
      const chunks = 3 + Math.floor(rnd() * 3);
      for (let i = 0; i < chunks; i++) {
        this.punchChunk(g, r,
          r.x + r.width * (0.18 + rnd() * 0.64),
          r.y + r.height * (0.18 + rnd() * 0.64),
          13 + rnd() * 15, voidCol, crackCol, rnd);
      }
      g.fillStyle(NB.REDDIT.wreckOverlay ?? 0x0b1416, NB.REDDIT.wreckOverlayAlpha ?? 0.16);
      g.fillRoundedRect(r.x, r.y, r.width, r.height, NB.REDDIT.cardRadius);
      this.corruptText(el, 0.4, seed);
      this.dimContents(el, 0.6);
      this.tumbleContents(el, fresh, rnd);
      this.spawnDebris(el, rnd);
      const stamp = scene.add.text(imp.x, imp.y, '[ removed ]', {
        fontFamily: 'Courier New', fontSize: '15px', fontStyle: 'bold', color: '#d93900',
      }).setOrigin(0.5).setAngle((rnd() - 0.5) * 8).setDepth(-0.5).setAlpha(0.92);
      el.objs.push(stamp);
      if (fresh) {
        NB.sfx.crack();
        scene.cameras.main.shake(200, 0.008);
        this.burstFX(imp.x, imp.y);
      }
    }
  }

  // Deterministic impact origin per element — all stages fracture from it.
  impactOf(el) {
    if (el._impact) return el._impact;
    const r = el.rect;
    const rnd = this.mulberry(this.hashKey(el.key) + 101);
    el._impact = {
      x: r.x + r.width * (0.3 + rnd() * 0.4),
      y: r.y + r.height * (0.28 + rnd() * 0.4),
    };
    return el._impact;
  }

  // Radial fracture: N spokes from the impact, each propagating mostly-straight
  // (small angular drift, NOT zigzag) with taper + forks + a soft under-shadow.
  drawFractures(g, r, ox, oy, count, reach, color, rnd) {
    const base = rnd() * Math.PI * 2;
    for (let s = 0; s < count; s++) {
      const ang = base + (s / count) * Math.PI * 2 + (rnd() - 0.5) * 0.4;
      this.crackWalk(g, r, ox, oy, ang, reach * (0.55 + rnd() * 0.7), color, rnd, 0);
    }
  }

  crackWalk(g, r, x, y, ang, len, color, rnd, depth) {
    let cx = x, cy = y;
    const steps = Math.max(3, Math.round(len / 13));
    const seg = len / steps;
    let w = depth === 0 ? 2.4 : 1.4;    // thick at the origin, thins to the tip
    for (let i = 0; i < steps; i++) {
      ang += (rnd() - 0.5) * 0.32;       // gentle drift = propagation, not scribble
      const nx = Phaser.Math.Clamp(cx + Math.cos(ang) * seg, r.x + 2, r.x + r.width - 2);
      const ny = Phaser.Math.Clamp(cy + Math.sin(ang) * seg, r.y + 2, r.y + r.height - 2);
      g.lineStyle(w + 1.6, 0x000000, 0.16);   // soft shadow underneath = depth
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(nx, ny); g.strokePath();
      g.lineStyle(w, color, 0.95);
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(nx, ny); g.strokePath();
      cx = nx; cy = ny;
      w = Math.max(0.5, w * 0.8);
      if (depth < 2 && i > 0 && rnd() < 0.2) {
        this.crackWalk(g, r, cx, cy, ang + (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.4),
          len * 0.38 * (1 - i / steps), color, rnd, depth + 1);
      }
      if (cx <= r.x + 2 || cx >= r.x + r.width - 2 || cy <= r.y + 2 || cy >= r.y + r.height - 2) break;
    }
  }

  // Punch a jagged shard out of the card — you see the page behind through it.
  punchChunk(g, r, cx, cy, radius, voidCol, rimCol, rnd) {
    const n = 5 + Math.floor(rnd() * 3);
    const a0 = rnd() * Math.PI * 2;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * Math.PI * 2;
      const rr = radius * (0.55 + rnd() * 0.7);
      pts.push(new Phaser.Geom.Point(
        Phaser.Math.Clamp(cx + Math.cos(a) * rr, r.x + 1, r.x + r.width - 1),
        Phaser.Math.Clamp(cy + Math.sin(a) * rr, r.y + 1, r.y + r.height - 1)));
    }
    g.fillStyle(voidCol, 1);
    g.fillPoints(pts, true);
    g.lineStyle(1.4, rimCol, 0.85);
    g.strokePoints(pts, true);
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
      const shades = NB.REDDIT.debris || [0xc8ccd0, 0x9aa0a4, 0xe3e5e8];
      const shade = shades[Math.floor(rnd() * shades.length)];
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
