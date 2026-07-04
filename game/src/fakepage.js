// Reddit home feed — 1:1 layout recreation for the chase arena.
// Posts from the feed are climbable terrain; chrome is fixed like reddit.com.
window.NB = window.NB || {};

NB.buildFakePage = function (scene, W, viewH, data) {
  const R = NB.REDDIT;
  const els = [];
  const F = R.font;
  const isWide = W >= 768;
  const leftW = isWide ? R.leftNavW : 0;
  const rightW = isWide ? R.rightRailW : 0;
  const feedX = leftW + (isWide ? 24 : 0);
  const feedW = Math.min(R.feedMaxW, W - feedX - rightW - (isWide ? 48 : 16));
  const headerH = R.headerH;

  function solid(x, y, w, h, kind, objs) {
    const el = { rect: new Phaser.Geom.Rectangle(x, y, w, h), kind, objs, crooked: 0 };
    els.push(el);
    return el;
  }

  function txt(x, y, str, style, depth = -3) {
    return scene.add.text(x, y, str, { fontFamily: F, ...style }).setDepth(depth);
  }

  function snoo(g, cx, cy, r) {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx, cy, r);
    g.fillStyle(0xff4500, 1);
    g.fillCircle(cx, cy, r * 0.72);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx - r * 0.28, cy - r * 0.12, r * 0.22);
    g.fillCircle(cx + r * 0.28, cy - r * 0.12, r * 0.22);
    g.fillStyle(0x000000, 1);
    g.fillCircle(cx - r * 0.28, cy - r * 0.12, r * 0.09);
    g.fillCircle(cx + r * 0.28, cy - r * 0.12, r * 0.09);
    g.lineStyle(2.5, 0xff4500, 1);
    g.beginPath();
    g.moveTo(cx, cy - r * 0.55);
    g.lineTo(cx, cy - r * 1.05);
    g.strokePath();
    g.fillStyle(0xff4500, 1);
    g.fillCircle(cx, cy - r * 1.08, r * 0.14);
  }

  // ---- scrollable world base (reddit canvas gray) --------------------
  let y = headerH + 8;

  // ---- HOME feed posts -----------------------------------------------
  for (const post of data.posts) {
    const sub = post.subreddit || data.name || 'r/popular';
    const objs = [];
    const voteX = feedX + R.voteW / 2;
    const contentX = feedX + R.voteW + 8;
    const contentW = feedW - R.voteW - 16;

    const titleLines = Math.max(1, Math.ceil(post.title.length / Math.floor(contentW / 9.2)));
    const titleH = titleLines * 20;
    const metaH = 20;
    const imgH = post.has_image ? (post.image_tall ? 220 : 140) : 0;
    const actionH = 36;
    const cardH = 12 + metaH + titleH + imgH + actionH + 8;

    objs.push(scene.add.rectangle(feedX + feedW / 2, y + cardH / 2, feedW, cardH, R.card)
      .setDepth(-6));

    // vote column (left pill stack)
    objs.push(txt(voteX, y + 14, '▲', { fontSize: '18px', color: R.textWeak }, -4).setOrigin(0.5, 0));
    const score = post.ups >= 1000 ? `${(post.ups / 1000).toFixed(1)}k` : String(post.ups);
    objs.push(txt(voteX, y + 34, score, {
      fontSize: '12px', fontStyle: 'bold', color: post.ups > 500 ? R.upvote : R.text,
    }, -4).setOrigin(0.5, 0));
    objs.push(txt(voteX, y + 52, '▼', { fontSize: '18px', color: R.textWeak }, -4).setOrigin(0.5, 0));

    // subreddit icon
    const iconColor = NB.subColor(sub);
    const iconX = contentX + 10;
    const iconY = y + 18;
    objs.push(scene.add.circle(iconX, iconY, 10, Phaser.Display.Color.HexStringToColor(iconColor).color).setDepth(-4));
    objs.push(txt(iconX, iconY, NB.subAbbr(sub), {
      fontSize: '8px', fontStyle: 'bold', color: '#ffffff',
    }, -3).setOrigin(0.5));

    const meta = `${sub}  •  ${post.time || '5 hr. ago'}`;
    objs.push(txt(contentX + 24, y + 10, meta, { fontSize: '12px', color: R.meta }));
    if (post.author) {
      objs.push(txt(contentX + 24, y + 26, post.author, { fontSize: '11px', color: R.textWeak }));
    }

    objs.push(txt(contentX, y + 44, post.title, {
      fontSize: '17px', fontStyle: 'bold', color: R.text,
      wordWrap: { width: contentW },
      lineSpacing: 2,
    }));

    let cy = y + 44 + titleH + 6;
    if (post.has_image) {
      objs.push(scene.add.rectangle(contentX + contentW / 2, cy + imgH / 2, contentW, imgH, 0x0b1416)
        .setDepth(-5));
      objs.push(txt(contentX + contentW / 2, cy + imgH / 2, post.image_label || 'Image', {
        fontSize: '12px', color: '#818384',
      }).setOrigin(0.5));
      cy += imgH + 4;
    }

    const actions = [
      { label: `${post.num_comments} Comments`, x: 0 },
      { label: 'Share', x: 118 },
      { label: 'Award', x: 188 },
    ];
    for (const a of actions) {
      objs.push(txt(contentX + a.x, cy + 6, a.label, {
        fontSize: '12px', fontStyle: 'bold', color: R.textWeak,
      }));
    }

    solid(feedX, y, feedW, cardH, 'post', objs);
    y += cardH + R.postGap;
  }

  const WORLD_H = Math.max(y + 24, viewH + 200);

  scene.add.rectangle(W / 2, WORLD_H / 2, W, WORLD_H, R.canvas).setDepth(-12);

  // ---- right rail (desktop home) -------------------------------------
  if (isWide && rightW > 100) {
    const rx = feedX + feedW + 24;
    let ry = headerH + 16;
    const railItems = data.popular || [
      { name: 'r/AskReddit', members: '57.2m' },
      { name: 'r/funny', members: '66.8m' },
      { name: 'r/gaming', members: '47.3m' },
      { name: 'r/worldnews', members: '46.1m' },
      { name: 'r/todayilearned', members: '41.2m' },
    ];
    const railH = 56 + railItems.length * 36 + 20;
    const robjs = [];
    robjs.push(scene.add.rectangle(rx + rightW / 2, ry + railH / 2, rightW, railH, R.card).setDepth(-5));
    robjs.push(scene.add.rectangle(rx + rightW / 2, ry + 18, rightW, 36, R.searchBg).setDepth(-4));
    robjs.push(txt(rx + 12, ry + 10, 'POPULAR COMMUNITIES', {
      fontSize: '11px', fontStyle: 'bold', color: R.textWeak,
    }));
    let iy = ry + 44;
    for (const c of railItems) {
      const col = NB.subColor(c.name);
      robjs.push(scene.add.circle(rx + 18, iy + 10, 9, Phaser.Display.Color.HexStringToColor(col).color).setDepth(-4));
      robjs.push(txt(rx + 34, iy, c.name, { fontSize: '13px', fontStyle: 'bold', color: R.link }));
      robjs.push(txt(rx + 34, iy + 16, `${c.members} members`, { fontSize: '11px', color: R.textWeak }));
      iy += 36;
    }
    solid(rx, ry, rightW, railH, 'sidebar', robjs);

    // Reddit Premium card
    ry += railH + 16;
    const premH = 120;
    const pobjs = [];
    pobjs.push(scene.add.rectangle(rx + rightW / 2, ry + premH / 2, rightW, premH, R.card).setDepth(-5));
    pobjs.push(txt(rx + 12, ry + 12, 'Reddit Premium', { fontSize: '15px', fontStyle: 'bold', color: R.text }));
    pobjs.push(txt(rx + 12, ry + 36, 'The best of Reddit\nwith no ads', {
      fontSize: '12px', color: R.textWeak, lineSpacing: 4,
    }));
    pobjs.push(scene.add.rectangle(rx + rightW / 2, ry + premH - 22, rightW - 24, 28, R.premium)
      .setDepth(-4));
    pobjs.push(txt(rx + rightW / 2, ry + premH - 22, 'Try Now', {
      fontSize: '13px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5));
    solid(rx, ry, rightW, premH, 'sidebar', pobjs);
  }

  // ---- fixed top header (reddit.com chrome) --------------------------
  const hdrGfx = scene.add.graphics().setDepth(26).setScrollFactor(0);
  hdrGfx.fillStyle(Phaser.Display.Color.HexStringToColor(R.card).color, 1);
  hdrGfx.fillRect(0, 0, W, headerH);
  hdrGfx.lineStyle(1, Phaser.Display.Color.HexStringToColor(R.border).color, 1);
  hdrGfx.lineBetween(0, headerH, W, headerH);

  snoo(hdrGfx, isWide ? 36 : 28, headerH / 2, 14);
  const logo = scene.add.text(isWide ? 56 : 48, headerH / 2, 'reddit', {
    fontFamily: F, fontSize: '22px', fontStyle: 'bold', color: R.brandWord,
  }).setOrigin(0, 0.5).setDepth(27).setScrollFactor(0);

  const searchX = isWide ? 200 : 88;
  const searchW = isWide ? Math.min(560, W - searchX - 200) : W - searchX - 56;
  const search = scene.add.rectangle(searchX + searchW / 2, headerH / 2, searchW, 36, R.searchBg)
    .setStrokeStyle(1, R.searchBorder).setDepth(26).setScrollFactor(0);
  const searchTxt = scene.add.text(searchX + 14, headerH / 2, 'Search Reddit', {
    fontFamily: F, fontSize: '14px', color: R.textWeak,
  }).setOrigin(0, 0.5).setDepth(27).setScrollFactor(0);

  const createBtn = scene.add.circle(W - (isWide ? 120 : 72), headerH / 2, 14, R.pillBg)
    .setDepth(26).setScrollFactor(0);
  scene.add.text(W - (isWide ? 120 : 72), headerH / 2, '+', {
    fontFamily: F, fontSize: '22px', color: '#ffffff',
  }).setOrigin(0.5).setDepth(27).setScrollFactor(0);

  if (isWide) {
    scene.add.text(W - 168, headerH / 2, '◌  ◌', {
      fontFamily: F, fontSize: '18px', color: R.textWeak,
    }).setOrigin(0.5).setDepth(27).setScrollFactor(0);
  }

  scene.add.circle(W - 28, headerH / 2, 14, R.searchBg)
    .setStrokeStyle(2, R.border).setDepth(26).setScrollFactor(0);
  const avaSnoo = scene.add.graphics().setDepth(27).setScrollFactor(0);
  snoo(avaSnoo, W - 28, headerH / 2, 8);

  solid(0, 0, W, headerH, 'header', []);

  // ---- fixed left nav (desktop) --------------------------------------
  if (isWide) {
    const navGfx = scene.add.rectangle(leftW / 2, viewH / 2, leftW, viewH, R.card)
      .setDepth(24).setScrollFactor(0).setOrigin(0.5);
    navGfx.setStrokeStyle(1, R.border);
    const navItems = [
      { label: 'Home', active: true },
      { label: 'Popular', active: false },
      { label: 'Answers', active: false },
      { label: 'Explore', active: false },
      { label: 'All', active: false },
    ];
    let ny = headerH + 12;
    for (const item of navItems) {
      if (item.active) {
        scene.add.rectangle(8 + (leftW - 16) / 2, ny + 14, leftW - 16, 32, R.navActive)
          .setDepth(25).setScrollFactor(0).setOrigin(0.5);
      }
      scene.add.text(20, ny + 6, item.label, {
        fontFamily: F, fontSize: '14px',
        fontStyle: item.active ? 'bold' : 'normal',
        color: item.active ? R.navActiveText : R.text,
      }).setDepth(26).setScrollFactor(0);
      ny += 40;
    }
    scene.add.text(20, ny + 8, 'GAMES ON REDDIT', {
      fontFamily: F, fontSize: '10px', fontStyle: 'bold', color: R.textWeak,
    }).setDepth(26).setScrollFactor(0);
    solid(0, headerH, leftW, viewH - headerH, 'sidebar', []);
  }

  // ---- sort bar under header (scrolls with feed) ---------------------
  const sortY = headerH + 4;
  const sortObjs = [];
  sortObjs.push(txt(feedX, sortY, 'Hot Posts', { fontSize: '13px', fontStyle: 'bold', color: R.text }));
  sortObjs.push(txt(feedX + 90, sortY, '  ◇ Card  ▣ Classic', { fontSize: '12px', color: R.textWeak }));
  solid(feedX, sortY - 4, feedW, 28, 'chrome', sortObjs);

  // ---- scrollbar (game object — mod grabs this) ----------------------
  const sbTrack = scene.add.rectangle(W - 6, viewH / 2, 8, viewH, 0xc8ccd0)
    .setDepth(24).setScrollFactor(0);
  const thumbH = Math.max(48, viewH * (viewH / WORLD_H));
  const sbThumb = scene.add.rectangle(W - 6, 0, 6, thumbH, 0x878a8c)
    .setDepth(25).setScrollFactor(0);

  return {
    elements: els,
    WORLD_H,
    headerH,
    feed: { x: feedX, y: headerH, w: feedW },
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

    makeElevator(x, groundY) {
      const elev = scene.add.sprite(x, groundY + 54, 'elevator')
        .setOrigin(0.5, 0.5).setDepth(15).setScale(1.35);
      return [elev];
    },
  };
};