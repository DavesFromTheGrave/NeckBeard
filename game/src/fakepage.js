// The stage: the host subreddit re-staged as terrain. Built from NB.fetchSubreddit()
// data — post cards are climbable furniture, the feed extends into a scrollable
// world, and the page reacts to being walked on. The page is not a backdrop.
window.NB = window.NB || {};

NB.buildFakePage = function (scene, W, viewH, data) {
  const els = [];
  const pad = 16, headerH = 64;
  const PAPER = 0xf6f7f9, CARD = 0xffffff, LINE = 0xd7dadc,
        ACCENT = 0x4a6ee0, GOLD = 0xd4af37;

  function solid(x, y, w, h, kind, objs) {
    const el = { rect: new Phaser.Geom.Rectangle(x, y, w, h), kind,
                 objs, crooked: 0 };
    els.push(el);
    return el;
  }

  // ---- feed geometry from real posts --------------------------------
  const feedW = Math.min(W * 0.62, 620);
  const feedX = pad;
  let y = headerH + pad;
  for (const post of data.posts) {
    const lines = Math.ceil(post.title.length / 38);
    const cardH = 66 + lines * 18 + (post.has_image ? 46 : 0);
    const objs = [];
    objs.push(scene.add.rectangle(feedX + feedW / 2, y + cardH / 2, feedW, cardH, CARD)
      .setStrokeStyle(1, LINE).setDepth(-5));
    objs.push(scene.add.text(feedX + 14, y + 10, '▲', { fontSize: '15px', color: '#878a8c' }).setDepth(-4));
    objs.push(scene.add.text(feedX + 12, y + 30, String(post.ups), {
      fontFamily: 'Arial', fontSize: '12px', color: post.ups > 100 ? '#e0452a' : '#1a1a1b' }).setDepth(-4));
    objs.push(scene.add.text(feedX + 14, y + 48, '▼', { fontSize: '15px', color: '#878a8c' }).setDepth(-4));
    objs.push(scene.add.text(feedX + 44, y + 8, post.title, {
      fontFamily: 'Arial', fontSize: '15px', fontStyle: 'bold', color: '#1a1a1b',
      wordWrap: { width: feedW - (post.has_image ? 160 : 60) } }).setDepth(-4));
    objs.push(scene.add.text(feedX + 44, y + cardH - 22, `${post.author} · ${post.num_comments} comments`, {
      fontFamily: 'Arial', fontSize: '11px', color: '#878a8c' }).setDepth(-4));
    if (post.has_image) {
      objs.push(scene.add.rectangle(feedX + feedW - 60, y + cardH / 2, 88, cardH - 24, 0xe8eaed)
        .setStrokeStyle(1, LINE).setDepth(-4));
      objs.push(scene.add.text(feedX + feedW - 82, y + cardH / 2 - 7, 'img', {
        fontFamily: 'Arial', fontSize: '11px', color: '#a0a3a5' }).setDepth(-3));
    }
    solid(feedX, y, feedW, cardH, 'post', objs);
    y += cardH + 12;
  }
  const WORLD_H = Math.max(y + pad, viewH);

  // ---- paper base (drawn after height known, sits under everything)
  scene.add.rectangle(W / 2, WORLD_H / 2, W, WORLD_H, PAPER).setDepth(-10);

  // ---- sidebar boxes repeating down the column ----------------------
  const sbX = feedX + feedW + pad;
  const sbW = W - sbX - pad - 14; // 14 = scrollbar gutter
  if (sbW > 120) {
    const boxes = [
      { h: 128, title: 'About Community', body: `${data.name}\n1 member (you)\n∞ moderators` },
      { h: 64 + data.rules.length * 18, title: 'Community Rules', body: data.rules.join('\n') },
      { h: 60 + data.mods.length * 18, title: 'Moderators', body: data.mods.join('\n') },
    ];
    let sy = headerH + pad, bi = 0;
    while (sy + 90 < WORLD_H - pad) {
      const b = boxes[bi % boxes.length];
      if (sy + b.h > WORLD_H - pad) break;
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
      bi++;
    }
  }

  // ---- header (fixed to camera — site chrome) ------------------------
  const hdrObjs = [
    scene.add.rectangle(W / 2, headerH / 2, W, headerH, CARD).setStrokeStyle(1, LINE),
    scene.add.text(pad, headerH / 2, 'NWH', {
      fontFamily: 'Impact, sans-serif', fontSize: '28px', color: '#e0452a' }).setOrigin(0, 0.5),
    scene.add.text(pad + 78, headerH / 2, data.name, {
      fontFamily: 'Georgia, serif', fontSize: '13px', fontStyle: 'italic', color: '#878a8c' }).setOrigin(0, 0.5),
    scene.add.text(W - pad - 14, headerH / 2, `logged in as ${data.user}`, {
      fontFamily: 'Arial', fontSize: '12px', color: '#4a6ee0' }).setOrigin(1, 0.5),
  ];
  for (const o of hdrObjs) o.setDepth(25).setScrollFactor(0);
  solid(0, 0, W, headerH, 'header', []); // physics body only at world top

  // ---- the scrollbar (HE CAN GRAB THIS) ------------------------------
  const sbTrack = scene.add.rectangle(W - 7, viewH / 2, 12, viewH, 0xe4e6e8)
    .setDepth(24).setScrollFactor(0);
  const thumbH = Math.max(44, viewH * (viewH / WORLD_H));
  const sbThumb = scene.add.rectangle(W - 7, 0, 10, thumbH, 0xb0b3b6)
    .setDepth(25).setScrollFactor(0);

  return {
    elements: els,
    WORLD_H,
    headerH,
    scrollbar: { track: sbTrack, thumb: sbThumb, thumbH },

    updateScrollbar(cam) {
      const frac = cam.scrollY / Math.max(1, WORLD_H - viewH);
      sbThumb.y = thumbH / 2 + frac * (viewH - thumbH);
    },

    onFurniture(x, y2) {
      for (const el of els) {
        if (el.kind !== 'header' && el.rect.contains(x, y2)) return el;
      }
      return null;
    },

    shake(el, scene2) {
      if (el._shaking || !el.objs.length) return;
      el._shaking = true;
      const dx = Phaser.Math.Between(-NB.TUNE.ELEMENT_SHAKE_PX, NB.TUNE.ELEMENT_SHAKE_PX);
      scene2.tweens.add({
        targets: el.objs, x: `+=${dx}`, yoyo: true, duration: 45, repeat: 3,
        onComplete: () => { el._shaking = false; },
      });
      if (el.kind === 'post' && Math.abs(el.crooked) < 2.5 && Math.random() < 0.35) {
        el.crooked += Phaser.Math.FloatBetween(-0.8, 0.8);
        for (const o of el.objs) {
          scene2.tweens.add({ targets: o, angle: el.crooked, duration: 120 });
        }
      }
    },

    // Balder ceremony prop: the gold elevator (real art; black bg stripped via blend)
    makeElevator(x, groundY) {
      const elev = scene.add.sprite(x, groundY + 54, 'elevator')
        .setOrigin(0.5, 0.5).setDepth(15).setScale(1.35);
      elev.setBlendMode(Phaser.BlendModes.NORMAL);
      return [elev];
    },
  };
};
