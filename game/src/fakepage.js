// The stage: a procedurally generated fake webpage rendered INSIDE the canvas.
// Every element is physical — Supermod climbs over them (slowed, never stopped),
// and they react when trampled. This is the Animator-vs-Animation contract:
// the page is not a backdrop, it is terrain.
window.NB = window.NB || {};

NB.buildFakePage = function (scene, W, H) {
  const els = [];   // {rect, objs[], kind, baseX, baseY, crooked}
  const g = { headerH: 64, pad: 16 };

  const PAPER = 0xf6f7f9, CARD = 0xffffff, INK = 0x1a1a1b,
        LINE = 0xd7dadc, ACCENT = 0x4a6ee0, MUTED = 0x878a8c;

  scene.add.rectangle(W / 2, H / 2, W, H, PAPER).setDepth(-10);

  function solid(x, y, w, h, kind, objs) {
    const el = { rect: new Phaser.Geom.Rectangle(x, y, w, h), kind,
                 objs, baseX: x, baseY: y, crooked: 0 };
    els.push(el);
    return el;
  }

  // ---- header bar (site chrome — solid wall of the world)
  const hdr = scene.add.rectangle(W / 2, g.headerH / 2, W, g.headerH, CARD)
    .setStrokeStyle(1, LINE).setDepth(-5);
  const logo = scene.add.text(g.pad, g.headerH / 2, 'NWH', {
    fontFamily: 'Impact, sans-serif', fontSize: '28px', color: '#e0452a',
  }).setOrigin(0, 0.5).setDepth(-4);
  const tag = scene.add.text(g.pad + 78, g.headerH / 2, 'the front page of what remains', {
    fontFamily: 'Georgia, serif', fontSize: '12px', fontStyle: 'italic', color: '#878a8c',
  }).setOrigin(0, 0.5).setDepth(-4);
  const searchBox = scene.add.rectangle(W * 0.55, g.headerH / 2, W * 0.3, 32, PAPER)
    .setStrokeStyle(1, LINE).setDepth(-4);
  const searchTxt = scene.add.text(W * 0.55 - W * 0.15 + 10, g.headerH / 2, 'search…', {
    fontFamily: 'Arial', fontSize: '13px', color: '#a0a3a5',
  }).setOrigin(0, 0.5).setDepth(-4);
  solid(0, 0, W, g.headerH, 'header', [hdr, logo, tag, searchBox, searchTxt]);

  // ---- feed posts (left column ~64% width)
  const feedW = Math.min(W * 0.62, 620);
  const feedX = g.pad;
  let y = g.headerH + g.pad;
  const titles = [
    'You will not believe what the mods did this time',
    'DAE remember when this place had people?',
    '[SERIOUS] Last human spotted, upvote to scare him',
    'Top 10 cursors that escaped (number 7 will be banned)',
    'PSA: breathing in this subreddit requires approval',
  ];
  let ti = 0;
  while (y < H - 140) {
    const cardH = Phaser.Math.Between(96, 150);
    if (y + cardH > H - g.pad) break;
    const objs = [];
    objs.push(scene.add.rectangle(feedX + feedW / 2, y + cardH / 2, feedW, cardH, CARD)
      .setStrokeStyle(1, LINE).setDepth(-5));
    // vote gutter
    objs.push(scene.add.text(feedX + 14, y + 14, '▲', { fontSize: '16px', color: '#878a8c' }).setDepth(-4));
    objs.push(scene.add.text(feedX + 12, y + 36, String(Phaser.Math.Between(0, 3)), {
      fontFamily: 'Arial', fontSize: '13px', color: '#1a1a1b' }).setDepth(-4));
    objs.push(scene.add.text(feedX + 14, y + 56, '▼', { fontSize: '16px', color: '#878a8c' }).setDepth(-4));
    // title + body lines
    objs.push(scene.add.text(feedX + 44, y + 12, titles[ti++ % titles.length], {
      fontFamily: 'Arial', fontSize: '15px', fontStyle: 'bold', color: '#1a1a1b',
      wordWrap: { width: feedW - 60 } }).setDepth(-4));
    const lines = Math.floor((cardH - 58) / 14);
    for (let li = 0; li < lines; li++) {
      objs.push(scene.add.rectangle(feedX + 44 + (feedW - 100) / 2,
        y + 52 + li * 14, feedW - 100 - Phaser.Math.Between(0, 120), 7, LINE).setDepth(-4));
    }
    // occasional image block (prime climbing furniture)
    if (cardH > 120) {
      objs.push(scene.add.rectangle(feedX + feedW - 62, y + cardH / 2, 92, cardH - 28, 0xe8eaed)
        .setStrokeStyle(1, LINE).setDepth(-4));
      objs.push(scene.add.text(feedX + feedW - 86, y + cardH / 2 - 8, 'img', {
        fontFamily: 'Arial', fontSize: '12px', color: '#a0a3a5' }).setDepth(-3));
    }
    solid(feedX, y, feedW, cardH, 'post', objs);
    y += cardH + 12;
  }

  // ---- sidebar (right column)
  const sbX = feedX + feedW + g.pad;
  const sbW = W - sbX - g.pad;
  if (sbW > 120) {
    let sy = g.headerH + g.pad;
    const boxes = [
      { h: 130, title: 'About Community', body: 'r/whatremains\n1 member (you)\n∞ moderators' },
      { h: 110, title: 'Community Rules', body: '1. No breathing\n2. No cursors\n3. See rule 1' },
      { h: 90, title: 'Moderators', body: 'u/SUPERMOD_9000\n…and 12,847 others' },
    ];
    for (const b of boxes) {
      if (sy + b.h > H - g.pad) break;
      const objs = [];
      objs.push(scene.add.rectangle(sbX + sbW / 2, sy + b.h / 2, sbW, b.h, CARD)
        .setStrokeStyle(1, LINE).setDepth(-5));
      objs.push(scene.add.rectangle(sbX + sbW / 2, sy + 16, sbW, 32, ACCENT).setDepth(-4));
      objs.push(scene.add.text(sbX + 10, sy + 8, b.title, {
        fontFamily: 'Arial', fontSize: '13px', fontStyle: 'bold', color: '#ffffff' }).setDepth(-3));
      objs.push(scene.add.text(sbX + 10, sy + 40, b.body, {
        fontFamily: 'Arial', fontSize: '12px', color: '#5a5d5f', lineSpacing: 5 }).setDepth(-3));
      solid(sbX, sy, sbW, b.h, 'sidebar', objs);
      sy += b.h + 12;
    }
  }

  // ---- API for physics + AvA reactions -------------------------------
  return {
    elements: els,
    // terrain query: is this point on page furniture?
    onFurniture(x, y2) {
      for (const el of els) {
        if (el.rect.contains(x, y2)) return el;
      }
      return null;
    },
    // the trample: furniture shudders under his weight
    shake(el, scene2) {
      if (el._shaking) return;
      el._shaking = true;
      const dx = Phaser.Math.Between(-NB.TUNE.ELEMENT_SHAKE_PX, NB.TUNE.ELEMENT_SHAKE_PX);
      scene2.tweens.add({
        targets: el.objs, x: `+=${dx}`, yoyo: true, duration: 45, repeat: 3,
        onComplete: () => { el._shaking = false; },
      });
      // posts get progressively crooked — the page remembers being walked on
      if (el.kind === 'post' && Math.abs(el.crooked) < 2.5 && Math.random() < 0.35) {
        el.crooked += Phaser.Math.FloatBetween(-0.8, 0.8);
        for (const o of el.objs) {
          scene2.tweens.add({ targets: o, angle: el.crooked, duration: 120 });
        }
      }
    },
  };
};
