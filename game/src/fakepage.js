// Reddit home feed — 1:1 layout recreation for the chase arena.
// Posts from the feed are climbable terrain; chrome is fixed like reddit.com.
window.NB = window.NB || {};

NB.buildFakePage = function (scene, W, viewH, data) {
  const R = NB.REDDIT;
  const els = [];
  const spawned = [];
  const clickZones = [];
  const F = R.font;
  const isSub = data.mode === 'sub';
  const track = (o) => { spawned.push(o); return o; };
  const zone = (rect, sub, label, screen = false) => {
    clickZones.push({ rect, sub: sub.replace(/^r\//i, ''), label: label || sub, screen });
  };
  const isWide = W >= 768;
  const leftW = isWide ? R.leftNavW : 0;
  const rightW = isWide ? R.rightRailW : 0;
  const feedX = leftW + (isWide ? 24 : 0);
  const feedW = Math.min(R.feedMaxW, W - feedX - rightW - (isWide ? 48 : 16));
  const headerH = R.headerH;

  // Deterministic per-build key (kind + build order) — the wreckage store
  // uses it so damage survives dispose/rebuild when you travel back here.
  const kindCounts = {};
  function solid(x, y, w, h, kind, objs) {
    const idx = kindCounts[kind] = (kindCounts[kind] || 0) + 1;
    const el = {
      rect: new Phaser.Geom.Rectangle(x, y, w, h),
      kind, objs, crooked: 0, key: `${kind}:${idx}`,
    };
    els.push(el);
    return el;
  }

  function txt(x, y, str, style, depth = -3) {
    return track(scene.add.text(x, y, str, { fontFamily: F, ...style }).setDepth(depth));
  }

  // Current reddit.com cards are consistently rounded — scene.add.rectangle
  // can't do corners, so this is a Graphics-based drop-in replacement.
  function roundedPanel(cx, cy, w, h, color, depth = -6, radius = R.cardRadius, stroke = null) {
    const g = scene.add.graphics().setDepth(depth);
    const colorNum = typeof color === 'string' ? Phaser.Display.Color.HexStringToColor(color).color : color;
    g.fillStyle(colorNum, 1);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, radius);
    if (stroke) {
      g.lineStyle(stroke.width || 1, Phaser.Display.Color.HexStringToColor(stroke.color).color, 1);
      g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, radius);
    }
    return g;
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

  let y = headerH + 8;

  // ---- subreddit banner (when viewing a single sub) ------------------
  if (isSub) {
    const subName = data.name || `r/${data.subreddit}`;
    const bannerH = 72;
    const bobjs = [];
    bobjs.push(track(roundedPanel(feedX + feedW / 2, y + bannerH / 2, feedW, bannerH, R.card, -6)));
    const col = NB.subColor(subName);
    bobjs.push(track(scene.add.circle(feedX + 28, y + bannerH / 2, 18,
      Phaser.Display.Color.HexStringToColor(col).color).setDepth(-5)));
    bobjs.push(txt(feedX + 28, y + bannerH / 2, NB.subAbbr(subName), {
      fontSize: '12px', fontStyle: 'bold', color: '#fff',
    }, -4).setOrigin(0.5));
    bobjs.push(txt(feedX + 54, y + 18, subName, { fontSize: '20px', fontStyle: 'bold', color: R.text }));
    bobjs.push(txt(feedX + 54, y + 42, '1 online · live threads from this community', {
      fontSize: '12px', color: R.textWeak,
    }));
    bobjs.push(track(roundedPanel(feedX + feedW - 52, y + bannerH / 2, 72, 30, R.pillBg, -4, 15)));
    bobjs.push(txt(feedX + feedW - 52, y + bannerH / 2, 'Joined', {
      fontSize: '12px', fontStyle: 'bold', color: '#fff',
    }, -3).setOrigin(0.5));
    solid(feedX, y, feedW, bannerH, 'chrome', bobjs);
    y += bannerH + 8;
  }

  // ---- feed posts (home = multi-sub, sub = single community) -------
  // Current reddit.com moved the vote arrows out of a left column and into a
  // horizontal pill in the bottom action bar — content spans the full card.
  for (const post of data.posts) {
    const sub = post.subreddit || data.name || 'r/popular';
    const objs = [];
    const pad = 14;
    const contentX = feedX + pad;
    const contentW = feedW - pad * 2;

    const titleLines = Math.max(1, Math.ceil(post.title.length / Math.floor(contentW / 9.2)));
    const titleH = titleLines * 20;
    const metaH = 20;
    const imgH = post.has_image ? (post.image_tall ? 220 : 140) : 0;
    const actionH = 34;
    const cardH = 14 + metaH + titleH + 6 + imgH + (post.has_image ? 8 : 0) + actionH + 14;

    objs.push(roundedPanel(feedX + feedW / 2, y + cardH / 2, feedW, cardH, R.card, -6));

    // subreddit icon + meta row
    const iconColor = NB.subColor(sub);
    const iconX = contentX + 10;
    const iconY = y + 14 + 10;
    objs.push(scene.add.circle(iconX, iconY, 10, Phaser.Display.Color.HexStringToColor(iconColor).color).setDepth(-4));
    objs.push(txt(iconX, iconY, NB.subAbbr(sub), {
      fontSize: '8px', fontStyle: 'bold', color: '#ffffff',
    }, -3).setOrigin(0.5));

    const meta = isSub
      ? `${post.author || 'u/anonymous'}  •  ${post.time || '5 hr. ago'}`
      : `${sub}  •  ${post.time || '5 hr. ago'}`;
    objs.push(txt(contentX + 26, iconY, meta, { fontSize: '12px', color: R.meta }).setOrigin(0, 0.5));
    if (!isSub) {
      zone(new Phaser.Geom.Rectangle(contentX + 26, iconY - 9, 160, 18), sub, sub, false);
    }

    let cy = y + 14 + metaH + 6;
    objs.push(txt(contentX, cy, post.title, {
      fontSize: '17px', fontStyle: 'bold', color: R.text,
      wordWrap: { width: contentW },
      lineSpacing: 2,
    }));
    cy += titleH + 6;

    if (post.has_image) {
      objs.push(roundedPanel(contentX + contentW / 2, cy + imgH / 2, contentW, imgH, 0x0b1416, -5, 8));
      objs.push(txt(contentX + contentW / 2, cy + imgH / 2, post.image_label || 'Image', {
        fontSize: '12px', color: '#818384',
      }).setOrigin(0.5));
      cy += imgH + 8;
    }

    // bottom action bar: horizontal vote pill + comments/share/award
    const score = post.ups >= 1000 ? `${(post.ups / 1000).toFixed(1)}k` : String(post.ups);
    const voteW = 76;
    const ay = cy + actionH / 2 - 2;
    objs.push(roundedPanel(contentX + voteW / 2, ay, voteW, 26, R.searchBg, -4, 13));
    objs.push(txt(contentX + 14, ay, '▲', { fontSize: '13px', color: R.textWeak }, -3).setOrigin(0.5));
    objs.push(txt(contentX + voteW / 2, ay, score, {
      fontSize: '12px', fontStyle: 'bold', color: post.ups > 500 ? R.upvote : R.text,
    }, -3).setOrigin(0.5));
    objs.push(txt(contentX + voteW - 14, ay, '▼', { fontSize: '13px', color: R.textWeak }, -3).setOrigin(0.5));

    const actions = [
      { label: `💬 ${post.num_comments}`, x: voteW + 16 },
      { label: 'Share', x: voteW + 104 },
      { label: 'Award', x: voteW + 172 },
    ];
    for (const a of actions) {
      objs.push(txt(contentX + a.x, ay, a.label, {
        fontSize: '12px', fontStyle: 'bold', color: R.textWeak,
      }).setOrigin(0, 0.5));
    }

    solid(feedX, y, feedW, cardH, 'post', objs);
    y += cardH + R.postGap;
  }

  const WORLD_H = Math.max(y + 24, viewH + 200);

  track(scene.add.rectangle(W / 2, WORLD_H / 2, W, WORLD_H, R.canvas).setDepth(-12));

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
    robjs.push(roundedPanel(rx + rightW / 2, ry + railH / 2, rightW, railH, R.card, -5));
    robjs.push(roundedPanel(rx + rightW / 2, ry + 18, rightW, 36, R.searchBg, -4, 8));
    robjs.push(txt(rx + 12, ry + 10, 'POPULAR COMMUNITIES', {
      fontSize: '11px', fontStyle: 'bold', color: R.textWeak,
    }));
    let iy = ry + 44;
    for (const c of railItems) {
      const col = NB.subColor(c.name);
      robjs.push(track(scene.add.circle(rx + 18, iy + 10, 9, Phaser.Display.Color.HexStringToColor(col).color).setDepth(-4)));
      robjs.push(txt(rx + 34, iy, c.name, { fontSize: '13px', fontStyle: 'bold', color: R.link }));
      robjs.push(txt(rx + 34, iy + 16, `${c.members} members`, { fontSize: '11px', color: R.textWeak }));
      zone(new Phaser.Geom.Rectangle(rx + 8, iy, rightW - 16, 34), c.name, c.name, false);
      iy += 36;
    }
    solid(rx, ry, rightW, railH, 'sidebar', robjs);

    // Reddit Premium card
    ry += railH + 16;
    const premH = 120;
    const pobjs = [];
    pobjs.push(roundedPanel(rx + rightW / 2, ry + premH / 2, rightW, premH, R.card, -5));
    pobjs.push(txt(rx + 12, ry + 12, 'Reddit Premium', { fontSize: '15px', fontStyle: 'bold', color: R.text }));
    pobjs.push(txt(rx + 12, ry + 36, 'The best of Reddit\nwith no ads', {
      fontSize: '12px', color: R.textWeak, lineSpacing: 4,
    }));
    pobjs.push(roundedPanel(rx + rightW / 2, ry + premH - 22, rightW - 24, 28, R.premium, -4, 14));
    pobjs.push(txt(rx + rightW / 2, ry + premH - 22, 'Try Now', {
      fontSize: '13px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5));
    solid(rx, ry, rightW, premH, 'sidebar', pobjs);
  }

  // ---- fixed top header (reddit.com chrome) --------------------------
  zone(new Phaser.Geom.Rectangle(8, 8, 120, headerH - 16), 'all', 'Home', true);
  const hdrGfx = track(scene.add.graphics().setDepth(26).setScrollFactor(0));
  hdrGfx.fillStyle(Phaser.Display.Color.HexStringToColor(R.card).color, 1);
  hdrGfx.fillRect(0, 0, W, headerH);
  hdrGfx.lineStyle(1, Phaser.Display.Color.HexStringToColor(R.border).color, 1);
  hdrGfx.lineBetween(0, headerH, W, headerH);

  snoo(hdrGfx, isWide ? 36 : 28, headerH / 2, 14);
  track(scene.add.text(isWide ? 56 : 48, headerH / 2, 'reddit', {
    fontFamily: F, fontSize: '22px', fontStyle: 'bold', color: R.brandWord,
  }).setOrigin(0, 0.5).setDepth(27).setScrollFactor(0));

  // Real input overlaid by main.js (bindSubredditSearch) sits on top of this
  // box — typing a subreddit here both browses there and can trigger a
  // cursed-sub pickup. Just the icon + box here; no placeholder text (the
  // real <input>'s own placeholder covers that).
  const searchX = isWide ? 200 : 88;
  const searchW = isWide ? Math.min(560, W - searchX - 200) : W - searchX - 56;
  track(roundedPanel(searchX + searchW / 2, headerH / 2, searchW, 36, R.searchBg, 26, 18,
    { width: 1, color: R.searchBorder }).setScrollFactor(0));
  const searchIcon = track(scene.add.graphics().setDepth(27).setScrollFactor(0));
  searchIcon.lineStyle(1.6, Phaser.Display.Color.HexStringToColor(R.textWeak).color, 1);
  searchIcon.strokeCircle(searchX + 20, headerH / 2 - 2, 6);
  searchIcon.lineBetween(searchX + 24.5, headerH / 2 + 2.5, searchX + 28, headerH / 2 + 6);

  track(scene.add.circle(W - (isWide ? 120 : 72), headerH / 2, 14, R.pillBg)
    .setDepth(26).setScrollFactor(0));
  track(scene.add.text(W - (isWide ? 120 : 72), headerH / 2, '+', {
    fontFamily: F, fontSize: '22px', color: '#ffffff',
  }).setOrigin(0.5).setDepth(27).setScrollFactor(0));

  if (isWide) {
    track(scene.add.text(W - 168, headerH / 2, '◌  ◌', {
      fontFamily: F, fontSize: '18px', color: R.textWeak,
    }).setOrigin(0.5).setDepth(27).setScrollFactor(0));
  }

  track(scene.add.circle(W - 28, headerH / 2, 14, R.searchBg)
    .setStrokeStyle(2, R.border).setDepth(26).setScrollFactor(0));
  const avaSnoo = track(scene.add.graphics().setDepth(27).setScrollFactor(0));
  snoo(avaSnoo, W - 28, headerH / 2, 8);

  solid(0, 0, W, headerH, 'header', []);

  // ---- fixed left nav (desktop) --------------------------------------
  if (isWide) {
    const navGfx = track(scene.add.rectangle(leftW / 2, viewH / 2, leftW, viewH, R.card)
      .setDepth(24).setScrollFactor(0).setOrigin(0.5));
    navGfx.setStrokeStyle(1, R.border);
    const navItems = [
      { label: 'Home', sub: 'all', active: !isSub && (data.subreddit === 'all' || data.mode === 'home') },
      { label: 'Popular', sub: 'popular', active: data.subreddit === 'popular' },
      { label: 'All', sub: 'all', active: false },
      { label: 'Gaming', sub: 'gaming', active: data.subreddit === 'gaming' },
      { label: 'AskReddit', sub: 'AskReddit', active: data.subreddit === 'AskReddit' },
    ];
    let ny = headerH + 12;
    for (const item of navItems) {
      if (item.active) {
        track(roundedPanel(8 + (leftW - 16) / 2, ny + 14, leftW - 16, 32, R.navActive, 25, 8).setScrollFactor(0));
      }
      track(scene.add.text(20, ny + 6, item.label, {
        fontFamily: F, fontSize: '14px',
        fontStyle: item.active ? 'bold' : 'normal',
        color: item.active ? R.navActiveText : R.text,
      }).setDepth(26).setScrollFactor(0));
      zone(new Phaser.Geom.Rectangle(8, ny, leftW - 8, 36), item.sub, item.label, true);
      ny += 40;
    }
    track(scene.add.text(20, ny + 8, 'GAMES ON REDDIT', {
      fontFamily: F, fontSize: '10px', fontStyle: 'bold', color: R.textWeak,
    }).setDepth(26).setScrollFactor(0));
    solid(0, headerH, leftW, viewH - headerH, 'sidebar', []);
  }

  // ---- sort bar under header: segmented tabs (Best/Hot/New/Top/Rising) --
  const sortY = headerH + 6;
  const sortObjs = [];
  const tabs = ['Best', 'Hot', 'New', 'Top', 'Rising'];
  let tabX = feedX;
  for (const tab of tabs) {
    const active = tab === 'Hot';
    if (active) sortObjs.push(roundedPanel(tabX + 28, sortY + 10, 56, 26, R.navActive, -4, 13));
    sortObjs.push(txt(tabX + 28, sortY + 10, tab, {
      fontSize: '13px', fontStyle: active ? 'bold' : 'normal',
      color: active ? R.navActiveText : R.textWeak,
    }, -3).setOrigin(0.5));
    tabX += 64;
  }
  solid(feedX, sortY - 4, feedW, 32, 'chrome', sortObjs);

  // ---- scrollbar (game object — mod grabs this) ----------------------
  const sbTrack = track(scene.add.rectangle(W - 6, viewH / 2, 8, viewH, 0xc8ccd0)
    .setDepth(24).setScrollFactor(0));
  const thumbH = Math.max(48, viewH * (viewH / WORLD_H));
  const sbThumb = track(scene.add.rectangle(W - 6, 0, 6, thumbH, 0x878a8c)
    .setDepth(25).setScrollFactor(0));

  return {
    elements: els,
    WORLD_H,
    headerH,
    feed: { x: feedX, y: headerH, w: feedW },
    clickZones,
    scrollbar: { track: sbTrack, thumb: sbThumb, thumbH },
    searchBar: { x: searchX + 34, y: headerH / 2, w: searchW - 44, h: 24 },

    dispose() {
      for (const el of els) el.objs.forEach(o => { try { o.destroy(); } catch {} });
      for (const o of spawned) { try { o.destroy(); } catch {} }
      els.length = 0;
      spawned.length = 0;
      clickZones.length = 0;
    },

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