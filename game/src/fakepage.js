// Reddit 2026 (shreddit) — 1:1 recreation for the chase arena, light AND
// dark, matched to the player's own Reddit theme. Spec: Dave's live
// screenshots 2026-07-05. Flat feed w/ hairline dividers (the card-on-gray
// look is two redesigns dead), "Find anything" header, full left nav,
// RECENT POSTS rail, sub pages w/ banner + highlights + rules.
// Element contract unchanged: {rect, kind, objs, crooked, key} — wreckage,
// mod, and pickups don't know the world changed.
window.NB = window.NB || {};

NB.RECENT_SUBS = NB.RECENT_SUBS || ['aliens', 'gaming'];

NB.buildFakePage = function (scene, W, viewH, data) {
  const R = NB.REDDIT;
  const dark = R.mode === 'dark';
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
  const headerH = R.headerH;
  // Reddit CENTERS the feed+rail block in the space beside the fixed left
  // nav — it does not hug the nav. Left-hugging leaves a huge dead gutter on
  // a wide monitor, which reads as "the page loaded tiny in the corner".
  let feedX, feedW;
  if (isWide) {
    const gap = 24;
    const avail = W - leftW;
    const blockNatural = R.feedMaxW + gap + rightW;
    if (avail - 48 >= blockNatural) {
      feedW = R.feedMaxW;
      feedX = leftW + (avail - (feedW + gap + rightW)) / 2;
    } else {
      feedX = leftW + 24;
      feedW = Math.max(320, avail - 48 - gap - rightW);
    }
  } else {
    feedX = 0;
    feedW = Math.min(R.feedMaxW, W - 16);
  }

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

  function col(c) {
    return typeof c === 'string' ? Phaser.Display.Color.HexStringToColor(c).color : c;
  }

  function roundedPanel(cx, cy, w, h, color, depth = -6, radius = R.cardRadius, stroke = null) {
    const g = scene.add.graphics().setDepth(depth);
    g.fillStyle(col(color), 1);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, radius);
    if (stroke) {
      g.lineStyle(stroke.width || 1, col(stroke.color), 1);
      g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, radius);
    }
    return g;
  }

  function hairline(x, y, w, depth = -6) {
    const g = scene.add.graphics().setDepth(depth);
    g.lineStyle(1, col(R.divider), 1);
    g.lineBetween(x, y, x + w, y);
    return g;
  }

  function snoo(g, cx, cy, r) {
    g.fillStyle(0xff4500, 1);
    g.fillCircle(cx, cy, r);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx - r * 0.32, cy - r * 0.05, r * 0.24);
    g.fillCircle(cx + r * 0.32, cy - r * 0.05, r * 0.24);
    g.fillStyle(0x000000, 1);
    g.fillCircle(cx - r * 0.32, cy - r * 0.05, r * 0.1);
    g.fillCircle(cx + r * 0.32, cy - r * 0.05, r * 0.1);
    g.lineStyle(2, 0xffffff, 1);
    g.beginPath();
    g.arc(cx, cy + r * 0.3, r * 0.34, 0.15 * Math.PI, 0.85 * Math.PI);
    g.strokePath();
    g.lineStyle(2.5, 0xff4500, 1);
    g.beginPath();
    g.moveTo(cx + r * 0.1, cy - r * 0.7);
    g.lineTo(cx + r * 0.45, cy - r * 1.05);
    g.strokePath();
    g.fillStyle(0xff4500, 1);
    g.fillCircle(cx + r * 0.5, cy - r * 1.08, r * 0.16);
  }

  function subAvatar(cx, cy, r, name, objs, depth = -4) {
    const c = track(scene.add.circle(cx, cy, r, col(NB.subColor(name))).setDepth(depth));
    const t = txt(cx, cy, NB.subAbbr(name), {
      fontSize: `${Math.max(8, Math.round(r * 0.85))}px`, fontStyle: 'bold', color: '#ffffff',
    }, depth + 1).setOrigin(0.5);
    if (objs) { objs.push(c, t); }
    return [c, t];
  }

  // deterministic per-sub fake stats so revisits look stable
  function subStats(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 33 + name.charCodeAt(i)) >>> 0;
    return {
      members: 40_000 + (h % 900) * 1000,
      online: 300 + (h % 97) * 21,
      year: 2008 + (h % 14),
    };
  }

  let y = headerH + 12;

  // ================= SUB BANNER (single community view) =================
  if (isSub) {
    const subName = (data.name || `r/${data.subreddit}`).replace(/^r\//, '');
    const stats = subStats(subName);
    const bannerH = 128;
    const bobjs = [];
    // banner: sub-colored gradient with pattern blocks (stand-in for the
    // real banner image — still destructible chrome)
    const bg = track(scene.add.graphics().setDepth(-7));
    const base = Phaser.Display.Color.HexStringToColor(NB.subColor(subName));
    const darker = base.clone().darken(35);
    bg.fillGradientStyle(base.color, darker.color, base.color, darker.color, 1);
    bg.fillRoundedRect(feedX, y, feedW + (isWide ? rightW + 24 : 0), bannerH - 44, 14);
    for (let i = 0; i < 7; i++) {
      bg.fillStyle(0xffffff, 0.06 + (i % 3) * 0.03);
      bg.fillRect(feedX + 20 + i * ((feedW - 40) / 7), y + 8, (feedW - 40) / 7 - 8, bannerH - 60);
    }
    bobjs.push(bg);

    // big round icon overlapping the banner edge
    const iconY = y + bannerH - 44;
    bobjs.push(track(scene.add.circle(feedX + 52, iconY, 34, col(R.canvas)).setDepth(-6)));
    subAvatar(feedX + 52, iconY, 30, subName, bobjs, -5);
    bobjs.push(txt(feedX + 96, iconY - 18, `r/${subName}`, {
      fontSize: `${R.fsBanner}px`, fontStyle: 'bold', color: R.text,
    }, -5));

    // right-side actions: + Create Post | bell | Joined
    const btnY = iconY;
    const rEdge = feedX + feedW + (isWide ? rightW + 24 : 0);
    bobjs.push(track(roundedPanel(rEdge - 60, btnY, 88, 38, R.canvas, -5, 19,
      { width: 1, color: R.border })));
    bobjs.push(txt(rEdge - 60, btnY, 'Joined', {
      fontSize: '14px', fontStyle: 'bold', color: R.text,
    }, -4).setOrigin(0.5));
    bobjs.push(track(scene.add.circle(rEdge - 128, btnY, 19, col(R.canvas))
      .setStrokeStyle(1, col(R.border)).setDepth(-5)));
    bobjs.push(txt(rEdge - 128, btnY, '🔔', { fontSize: '15px' }, -4).setOrigin(0.5));
    bobjs.push(track(roundedPanel(rEdge - 235, btnY, 150, 38, R.canvas, -5, 19,
      { width: 1, color: R.border })));
    bobjs.push(txt(rEdge - 235, btnY, '+ Create Post', {
      fontSize: '14px', fontStyle: 'bold', color: R.text,
    }, -4).setOrigin(0.5));

    solid(feedX, y, feedW, bannerH, 'chrome', bobjs);
    y += bannerH + 12;

    // ---- Community highlights: two pinned cards -----------------------
    const hlH = 96;
    const hobjs = [];
    hobjs.push(txt(feedX + 22, y, '📌 Community highlights', {
      fontSize: '15px', fontStyle: 'bold', color: R.text,
    }));
    const hlY = y + 28;
    const hlW = (feedW - 12) / 2;
    const hlTitles = [
      (data.posts[0]?.title || 'Weekly discussion thread').slice(0, 52),
      `r/${subName} is now accepting moderator applications`,
    ];
    for (let i = 0; i < 2; i++) {
      const hx = feedX + i * (hlW + 12);
      hobjs.push(track(roundedPanel(hx + hlW / 2, hlY + (hlH - 28) / 2, hlW, hlH - 28,
        R.cardRaised, -6, 12, { width: 1, color: R.border })));
      hobjs.push(track(scene.add.graphics().setDepth(-5)));
      const thumb = hobjs[hobjs.length - 1];
      thumb.fillStyle(col(NB.subColor(subName + i)), 0.85);
      thumb.fillRoundedRect(hx + 10, hlY + 10, 48, hlH - 48, 8);
      hobjs.push(txt(hx + 68, hlY + 12, hlTitles[i], {
        fontSize: '13px', fontStyle: 'bold', color: R.text,
        wordWrap: { width: hlW - 82 }, lineSpacing: 2,
      }, -4));
      hobjs.push(txt(hx + 68, hlY + hlH - 44, i === 0 ? '5 votes • 0 comments' : '📣 Announcement', {
        fontSize: '12px', color: R.textWeak,
      }, -4));
    }
    solid(feedX, y, feedW, hlH + 4, 'chrome', hobjs);
    y += hlH + 16;
  }

  // ================= SORT BAR ==========================================
  {
    const sobjs = [];
    sobjs.push(txt(feedX + 8, y + 2, 'Best ⌄', {
      fontSize: '14px', fontStyle: 'bold', color: R.textWeak,
    }));
    sobjs.push(track(roundedPanel(feedX + 92, y + 11, 40, 26, R.searchBg, -5, 13)));
    sobjs.push(txt(feedX + 92, y + 11, '▤ ⌄', { fontSize: '12px', color: R.textWeak }, -4).setOrigin(0.5));
    sobjs.push(track(hairline(feedX, y + 30, feedW)));
    solid(feedX, y - 4, feedW, 36, 'chrome', sobjs);
    y += 40;
  }

  // ================= FEED POSTS ========================================
  // 2026 shreddit: flat rows, hairline dividers, rounded pill action row.
  data.posts.forEach((post, pi) => {
    const sub = (post.subreddit || data.name || 'r/popular').replace(/^r\//, '');
    const objs = [];
    const pad = 20;
    const contentX = feedX + pad;
    const contentW = feedW - pad * 2;
    const promoted = !isSub && pi > 0 && pi % 5 === 4;   // every 5th: a Promoted unit
    const spoiler = !promoted && post.has_image && pi % 7 === 3;

    const titleLines = Math.max(1, Math.ceil(post.title.length / Math.floor(contentW / (R.fsTitle * 0.52))));
    const titleH = titleLines * (R.fsTitle + 6);
    const metaH = 26;
    const imgH = post.has_image ? (post.image_tall ? 300 : 190) : 0;
    const actionH = 44;
    const cardH = 12 + metaH + titleH + 8 + imgH + (post.has_image ? 10 : 0) + actionH + 8;

    // hover-state surface: subtle rounded card so wreckage has a body to break
    objs.push(roundedPanel(feedX + feedW / 2, y + cardH / 2, feedW, cardH - 4, R.card, -7, R.cardRadius));

    // meta row
    const iconY = y + 12 + 11;
    if (promoted) {
      objs.push(scene.add.circle(contentX + 11, iconY, 11, col('#00a87e')).setDepth(-4));
      objs.push(txt(contentX + 11, iconY, '◤', { fontSize: '10px', color: '#fff' }, -3).setOrigin(0.5));
      objs.push(txt(contentX + 30, iconY, `u/${sub}Official  •  Promoted`, {
        fontSize: `${R.fsMeta}px`, color: R.textWeak,
      }).setOrigin(0, 0.5));
    } else {
      subAvatar(contentX + 11, iconY, 11, sub, objs);
      const meta = isSub
        ? `${post.author || 'u/anonymous'}  •  ${post.time || '5 hr. ago'}`
        : `r/${sub}  •  ${post.time || '5 hr. ago'}`;
      objs.push(txt(contentX + 30, iconY, meta, {
        fontSize: `${R.fsMeta}px`, fontStyle: 'bold', color: R.textWeak,
      }).setOrigin(0, 0.5));
      if (!isSub) {
        zone(new Phaser.Geom.Rectangle(contentX + 30, iconY - 11, 190, 22), sub, `r/${sub}`, false);
      }
    }
    objs.push(txt(contentX + contentW - 8, iconY, '⋯', {
      fontSize: '18px', fontStyle: 'bold', color: R.textWeak,
    }).setOrigin(1, 0.5));

    let cy = y + 12 + metaH;
    objs.push(txt(contentX, cy, post.title, {
      fontSize: `${R.fsTitle}px`, fontStyle: 'bold', color: R.text,
      wordWrap: { width: contentW }, lineSpacing: 3,
    }));
    cy += titleH + 8;

    if (post.has_image) {
      objs.push(roundedPanel(contentX + contentW / 2, cy + imgH / 2, contentW, imgH, R.imgBg, -5, 14));
      if (spoiler) {
        objs.push(txt(contentX + 16, y + 12 + metaH - 24, '⚠ SPOILER', {
          fontSize: '12px', fontStyle: 'bold', color: R.textWeak,
        }, -4));
        objs.push(roundedPanel(contentX + contentW / 2, cy + imgH / 2, 132, 40, '#2a2d2f', -4, 20));
        objs.push(txt(contentX + contentW / 2, cy + imgH / 2, 'View spoiler', {
          fontSize: '14px', fontStyle: 'bold', color: '#ffffff',
        }, -3).setOrigin(0.5));
      } else {
        objs.push(txt(contentX + contentW / 2, cy + imgH / 2, post.image_label || 'i.redd.it', {
          fontSize: '13px', color: dark ? '#5a6a72' : '#818384',
        }).setOrigin(0.5));
      }
      cy += imgH + 10;
    }

    // action row: pill buttons (vote / comments / gift / share)
    const ay = cy + actionH / 2 - 6;
    const score = NB.fmtCount(post.ups ?? 0);
    const voteW = 96;
    objs.push(roundedPanel(contentX + voteW / 2, ay, voteW, 32, R.searchBg, -5, 16));
    objs.push(txt(contentX + 17, ay, '⇧', {
      fontSize: '16px', fontStyle: 'bold', color: R.textWeak,
    }, -4).setOrigin(0.5));
    objs.push(txt(contentX + voteW / 2, ay, score, {
      fontSize: `${R.fsAction}px`, fontStyle: 'bold', color: R.text,
    }, -4).setOrigin(0.5));
    objs.push(txt(contentX + voteW - 17, ay, '⇩', {
      fontSize: '16px', fontStyle: 'bold', color: R.textWeak,
    }, -4).setOrigin(0.5));

    const pills = [
      { label: `💬 ${NB.fmtCount(post.num_comments ?? 0)}`, w: 86 },
      { label: '🎁', w: 52 },
      { label: '↗ Share', w: 96 },
    ];
    let px = contentX + voteW + 10;
    for (const p of pills) {
      objs.push(roundedPanel(px + p.w / 2, ay, p.w, 32, R.searchBg, -5, 16));
      objs.push(txt(px + p.w / 2, ay, p.label, {
        fontSize: `${R.fsAction}px`, fontStyle: 'bold', color: R.text,
      }, -4).setOrigin(0.5));
      px += p.w + 10;
    }

    objs.push(hairline(feedX, y + cardH + 1, feedW, -7));
    const pel = solid(feedX, y, feedW, cardH, 'post', objs);
    // karma you steal off this post — scales with real engagement (ups +
    // comments + an image bonus), so juicy posts are the tempting targets.
    pel.karma = Math.max(50, (post.ups || 0) + (post.num_comments || 0) * 3 + (post.has_image ? 120 : 0));
    y += cardH + R.postGap;
  });

  const WORLD_H = Math.max(y + 40, viewH + 200);
  track(scene.add.rectangle(W / 2, WORLD_H / 2, W, WORLD_H, col(R.canvas)).setDepth(-12));

  // ================= RIGHT RAIL ========================================
  if (isWide && rightW > 100) {
    const rx = feedX + feedW + 24;
    let ry = headerH + 16;

    if (!isSub) {
      // ---- RECENT POSTS (home) ----------------------------------------
      const entries = [];
      for (let i = 0; i < Math.min(3, data.posts.length); i++) {
        const p = data.posts[(i * 3 + 1) % data.posts.length];
        entries.push({
          sub: (p.subreddit || 'r/popular').replace(/^r\//, ''),
          time: p.time || '2mo ago',
          title: i === 1 ? '[ Removed by moderator ]' : p.title,
          removed: i === 1,
          ups: p.ups ?? 0, com: p.num_comments ?? 0,
          thumb: p.has_image,
        });
      }
      const entryH = 92;
      const railH = 52 + entries.length * entryH + 8;
      const robjs = [];
      robjs.push(roundedPanel(rx + rightW / 2, ry + railH / 2, rightW, railH, R.cardRaised, -6, 14));
      robjs.push(txt(rx + 16, ry + 14, 'RECENT POSTS', {
        fontSize: `${R.fsSection}px`, fontStyle: 'bold', color: R.textWeak,
      }));
      robjs.push(txt(rx + rightW - 16, ry + 14, 'Clear', {
        fontSize: '13px', fontStyle: 'bold', color: R.link,
      }).setOrigin(1, 0));
      let ey = ry + 44;
      for (const e of entries) {
        subAvatar(rx + 26, ey + 10, 10, e.sub, robjs);
        robjs.push(txt(rx + 42, ey + 2, `r/${e.sub} • ${e.time}`, {
          fontSize: '12px', color: R.textWeak,
        }));
        robjs.push(txt(rx + 16, ey + 22, e.title.slice(0, 64), {
          fontSize: `${R.fsRail}px`, fontStyle: 'bold',
          color: e.removed ? R.textWeak : R.text,
          wordWrap: { width: rightW - (e.thumb ? 96 : 32) }, lineSpacing: 2,
        }));
        robjs.push(txt(rx + 16, ey + entryH - 24, `${NB.fmtCount(e.ups)} upvotes · ${NB.fmtCount(e.com)} comments`, {
          fontSize: '12px', color: R.textWeak,
        }));
        if (e.thumb) {
          robjs.push(track(roundedPanel(rx + rightW - 44, ey + 40, 56, 56, R.imgBg, -5, 10)));
        }
        zone(new Phaser.Geom.Rectangle(rx + 8, ey, rightW - 16, entryH - 6), e.sub, `r/${e.sub}`, false);
        ey += entryH;
      }
      solid(rx, ry, rightW, railH, 'sidebar', robjs);
      ry += railH + 16;
    } else {
      // ---- ABOUT COMMUNITY (sub view) -----------------------------------
      const subName = (data.name || `r/${data.subreddit}`).replace(/^r\//, '');
      const stats = subStats(subName);
      const desc = `A community dedicated to ${subName}. News, discussion, and everything in between. Keep it on-topic.`;
      const rules = ['Be Respectful', 'Stay On-Topic', 'Be Substantive'];
      const aboutH = 336 + rules.length * 44;
      const aobjs = [];
      aobjs.push(roundedPanel(rx + rightW / 2, ry + aboutH / 2, rightW, aboutH, R.cardRaised, -6, 14));
      let ay2 = ry + 16;
      aobjs.push(txt(rx + 16, ay2, subName.charAt(0).toUpperCase() + subName.slice(1), {
        fontSize: '16px', fontStyle: 'bold', color: R.text,
      }));
      ay2 += 26;
      aobjs.push(txt(rx + 16, ay2, desc, {
        fontSize: '13px', color: R.textWeak, wordWrap: { width: rightW - 32 }, lineSpacing: 3,
      }));
      ay2 += 66;
      aobjs.push(txt(rx + 16, ay2, `🗓 Created ${['Jan', 'Mar', 'Aug', 'Oct'][stats.year % 4]} ${(stats.year % 27) + 1}, ${stats.year}`, {
        fontSize: '13px', color: R.textWeak,
      }));
      ay2 += 22;
      aobjs.push(txt(rx + 16, ay2, '🌐 Public', { fontSize: '13px', color: R.textWeak }));
      ay2 += 30;
      aobjs.push(txt(rx + 16, ay2, NB.fmtCount(stats.members), {
        fontSize: '17px', fontStyle: 'bold', color: R.text,
      }));
      aobjs.push(txt(rx + 16, ay2 + 21, 'Members', { fontSize: '12px', color: R.textWeak }));
      aobjs.push(txt(rx + rightW / 2, ay2, NB.fmtCount(stats.online), {
        fontSize: '17px', fontStyle: 'bold', color: R.text,
      }));
      aobjs.push(txt(rx + rightW / 2, ay2 + 21, 'Online', { fontSize: '12px', color: R.textWeak }));
      ay2 += 52;
      aobjs.push(track(hairline(rx + 16, ay2, rightW - 32, -5)));
      ay2 += 14;
      aobjs.push(txt(rx + 16, ay2, 'USER FLAIR', {
        fontSize: `${R.fsSection}px`, fontStyle: 'bold', color: R.textWeak,
      }));
      ay2 += 22;
      aobjs.push(track(scene.add.circle(rx + 27, ay2 + 10, 11, col(NB.subColor(data.user || 'u/you'))).setDepth(-4)));
      aobjs.push(txt(rx + 44, ay2 + 10, (data.user || 'u/you').replace(/^u\//, ''), {
        fontSize: '14px', color: R.text,
      }).setOrigin(0, 0.5));
      ay2 += 36;
      aobjs.push(track(hairline(rx + 16, ay2, rightW - 32, -5)));
      ay2 += 14;
      aobjs.push(txt(rx + 16, ay2, `R/${subName.toUpperCase()} RULES`, {
        fontSize: `${R.fsSection}px`, fontStyle: 'bold', color: R.textWeak,
      }));
      ay2 += 26;
      rules.forEach((rule, i) => {
        aobjs.push(txt(rx + 16, ay2, `${i + 1}`, { fontSize: '14px', color: R.textWeak }));
        aobjs.push(txt(rx + 40, ay2, rule, { fontSize: '14px', color: R.text }));
        aobjs.push(txt(rx + rightW - 20, ay2, '⌄', {
          fontSize: '14px', color: R.textWeak,
        }).setOrigin(1, 0));
        ay2 += 44;
      });
      solid(rx, ry, rightW, aboutH, 'sidebar', aobjs);
      ry += aboutH + 16;
    }

    // footer links (both views)
    const fobjs = [];
    fobjs.push(txt(rx + 4, ry + 6, 'Reddit Rules   Privacy Policy   User Agreement', {
      fontSize: '12px', color: R.textWeak,
    }));
    fobjs.push(txt(rx + 4, ry + 26, `Reddit, Inc. © ${new Date().getFullYear()}. All rights reserved.`, {
      fontSize: '12px', color: R.textWeak,
    }));
    solid(rx, ry, rightW, 48, 'sidebar', fobjs);
  }

  // ================= FIXED HEADER ======================================
  const hdrGfx = track(scene.add.graphics().setDepth(26).setScrollFactor(0));
  hdrGfx.fillStyle(col(R.canvas), 1);
  hdrGfx.fillRect(0, 0, W, headerH);
  hdrGfx.lineStyle(1, col(R.border), 1);
  hdrGfx.lineBetween(0, headerH, W, headerH);

  snoo(hdrGfx, isWide ? 40 : 30, headerH / 2, 15);
  track(scene.add.text(isWide ? 62 : 50, headerH / 2, 'reddit', {
    fontFamily: F, fontSize: '26px', fontStyle: 'bold', color: R.brandWord,
  }).setOrigin(0, 0.5).setDepth(27).setScrollFactor(0));
  zone(new Phaser.Geom.Rectangle(12, 8, 140, headerH - 16), 'all', 'Home', true);

  // center search: "Find anything" + orange Ask chip (real <input> overlays)
  const searchW = isWide ? Math.min(640, W * 0.36) : W - 200;
  const searchX = W / 2 - searchW / 2;
  track(roundedPanel(W / 2, headerH / 2, searchW, 44, R.searchBg, 26, 22,
    { width: 1, color: R.searchBorder }).setScrollFactor(0));
  const searchIcon = track(scene.add.graphics().setDepth(27).setScrollFactor(0));
  searchIcon.lineStyle(1.8, col(R.textWeak), 1);
  searchIcon.strokeCircle(searchX + 24, headerH / 2 - 2, 7);
  searchIcon.lineBetween(searchX + 29, headerH / 2 + 3, searchX + 33, headerH / 2 + 7);
  track(roundedPanel(searchX + searchW - 42, headerH / 2, 64, 32, R.btnPrimary, 27, 16).setScrollFactor(0));
  track(scene.add.text(searchX + searchW - 42, headerH / 2, '✦ Ask', {
    fontFamily: F, fontSize: '13px', fontStyle: 'bold', color: '#ffffff',
  }).setOrigin(0.5).setDepth(28).setScrollFactor(0));

  // right cluster: chat, + Create, bell w/ badge, avatar
  if (isWide) {
    track(scene.add.text(W - 268, headerH / 2, '💬', {
      fontFamily: F, fontSize: '18px',
    }).setOrigin(0.5).setDepth(27).setScrollFactor(0));
    track(roundedPanel(W - 195, headerH / 2, 104, 38, R.searchBg, 26, 19).setScrollFactor(0));
    track(scene.add.text(W - 195, headerH / 2, '+ Create', {
      fontFamily: F, fontSize: '14px', fontStyle: 'bold', color: R.text,
    }).setOrigin(0.5).setDepth(27).setScrollFactor(0));
    track(scene.add.text(W - 118, headerH / 2, '🔔', {
      fontFamily: F, fontSize: '18px',
    }).setOrigin(0.5).setDepth(27).setScrollFactor(0));
    track(scene.add.circle(W - 106, headerH / 2 - 11, 8, 0xff4500).setDepth(28).setScrollFactor(0));
    track(scene.add.text(W - 106, headerH / 2 - 11, '1', {
      fontFamily: F, fontSize: '11px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(29).setScrollFactor(0));
  }
  track(scene.add.circle(W - 36, headerH / 2, 17, col(R.searchBg))
    .setStrokeStyle(1, col(R.border)).setDepth(26).setScrollFactor(0));
  const avaSnoo = track(scene.add.graphics().setDepth(27).setScrollFactor(0));
  snoo(avaSnoo, W - 36, headerH / 2, 10);

  solid(0, 0, W, headerH, 'header', []);

  // ================= FIXED LEFT NAV ====================================
  if (isWide) {
    const navGfx = track(scene.add.rectangle(leftW / 2, viewH / 2, leftW, viewH, col(R.canvas))
      .setDepth(24).setScrollFactor(0).setOrigin(0.5));
    const navLine = track(scene.add.graphics().setDepth(24).setScrollFactor(0));
    navLine.lineStyle(1, col(R.border), 1);
    navLine.lineBetween(leftW, headerH, leftW, viewH);

    let ny = headerH + 14;
    const navItem = (label, icon, sub, active = false) => {
      if (ny > viewH - 34) return;
      if (active) {
        track(roundedPanel(14 + (leftW - 28) / 2, ny + 17, leftW - 28, 38, R.navActive, 25, 10).setScrollFactor(0));
      }
      track(scene.add.text(26, ny + 8, `${icon}  ${label}`, {
        fontFamily: F, fontSize: `${R.fsNav}px`,
        fontStyle: active ? 'bold' : 'normal',
        color: active ? R.navActiveText : R.text,
      }).setDepth(26).setScrollFactor(0));
      if (sub) zone(new Phaser.Geom.Rectangle(12, ny, leftW - 20, 38), sub, label, true);
      ny += 40;
    };
    const navSection = (label) => {
      if (ny > viewH - 60) return false;
      ny += 10;
      track(scene.add.text(26, ny, label, {
        fontFamily: F, fontSize: `${R.fsSection}px`, fontStyle: 'bold', color: R.textWeak,
      }).setDepth(26).setScrollFactor(0));
      track(scene.add.text(leftW - 26, ny, '⌃', {
        fontFamily: F, fontSize: '12px', color: R.textWeak,
      }).setOrigin(1, 0).setDepth(26).setScrollFactor(0));
      ny += 26;
      return true;
    };

    navItem('Home', '🏠', 'all', !isSub);
    navItem('Popular', '📈', 'popular', data.subreddit === 'popular');
    navItem('News', '📰', 'news');
    navItem('Explore', '🧭', null);
    navItem('Start a community', '＋', null);
    ny += 6;
    const d1 = track(scene.add.graphics().setDepth(25).setScrollFactor(0));
    d1.lineStyle(1, col(R.divider), 1);
    d1.lineBetween(16, ny, leftW - 16, ny);
    ny += 4;

    if (navSection('GAMES ON REDDIT')) { /* collapsed, header only */ }
    if (navSection('REDDIT PRO')) {
      navItem('Dashboard', '📊', null);
      navItem('Trends', '📉', null);
    }
    if (navSection('RECENT')) {
      for (const s of (NB.RECENT_SUBS || []).slice(0, 3)) {
        navItem(`r/${s}`, '●', s, data.subreddit === s);
      }
    }
    if (navSection('COMMUNITIES')) {
      const comms = (data.popular || []).slice(0, 6);
      for (const c of comms) {
        const s = c.name.replace(/^r\//, '');
        if (ny > viewH - 34) break;
        track(scene.add.circle(32, ny + 17, 10, col(NB.subColor(s))).setDepth(26).setScrollFactor(0));
        track(scene.add.text(50, ny + 8, c.name, {
          fontFamily: F, fontSize: `${R.fsNav}px`, color: R.text,
        }).setDepth(26).setScrollFactor(0));
        track(scene.add.text(leftW - 26, ny + 8, '☆', {
          fontFamily: F, fontSize: '14px', color: R.textWeak,
        }).setOrigin(1, 0).setDepth(26).setScrollFactor(0));
        zone(new Phaser.Geom.Rectangle(12, ny, leftW - 20, 36), s, c.name, true);
        ny += 38;
      }
    }
    solid(0, headerH, leftW, viewH - headerH, 'sidebar', []);
  }

  // ================= SCROLLBAR (the mod grabs this) ====================
  const sbTrack = track(scene.add.rectangle(W - 6, viewH / 2, 10, viewH,
    dark ? 0x1a1e21 : 0xe8eaec).setDepth(24).setScrollFactor(0));
  const thumbH = Math.max(48, viewH * (viewH / WORLD_H));
  const sbThumb = track(scene.add.rectangle(W - 6, 0, 7, thumbH,
    dark ? 0x46505a : 0x9aa0a4).setDepth(25).setScrollFactor(0));

  return {
    elements: els,
    WORLD_H,
    headerH,
    feed: { x: feedX, y: headerH, w: feedW },
    clickZones,
    scrollbar: { track: sbTrack, thumb: sbThumb, thumbH },
    searchBar: { x: searchX + 40, y: headerH / 2, w: searchW - 120, h: 26 },

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
          if (o.type === 'Graphics') continue;
          scene2.tweens.add({ targets: o, angle: el.crooked, duration: 120 });
        }
      }
    },

    makeElevator(x, groundY) {
      const elev = scene.add.sprite(x, groundY + 54, 'elevator').setOrigin(0.5, 0.5).setDepth(14);
      elev.setScale(320 / elev.height);   // real art -> sane on-screen size
      return [elev];
    },
  };
};
