// Title screen = Dave's NECKBEARD-INTRO art, shown whole (contain-fit,
// NEVER scaled past 1:1 — his brush strokes are composition, not texture).
// The five blank HIGH SCORE lines in the art are the real top-5 list;
// scores are drawn onto them at image-relative coordinates.
// Skipped when ?autostart=1 (boot test / dev).
window.NB = window.NB || {};
NB.HERO3_UNLOCK = 10000;   // best karma needed to unlock the throne hero (#3) in the rotation

NB.autostart = function () {
  try { return new URLSearchParams(location.search).has('autostart'); } catch { return false; }
};

// Image-relative anchors for the HIGH SCORE panel lines (fractions of the
// art's width/height, measured off the source PNG).
const SCORE_LINES = [
  { x: 0.845, y: 0.208 },
  { x: 0.845, y: 0.266 },
  { x: 0.845, y: 0.322 },
  { x: 0.845, y: 0.380 },
  { x: 0.845, y: 0.440 },
];

class TitleScene extends Phaser.Scene {
  constructor() { super('title'); }

  preload() {
    this.load.image('intro-art', 'assets/title/neckbeard-intro.png');
    // portrait heroes: rotate #1/#2, #3 (throne) unlocks at HERO3_UNLOCK karma.
    // Missing files just no-op (loader logs + skips) — panels render on black
    // until Dave drops hero-1/2/3.png into assets/title/.
    this.load.on('loaderror', () => {});   // swallow the not-yet-present hero 404s
    for (let i = 1; i <= 3; i++) this.load.image(`title-hero-${i}`, `assets/title/hero-${i}.png`);
    // The "meet the moderators" flip needs all three mods' WALK frames on the
    // title (GameScene loads them too, but Title runs first). superM0D always;
    // redditM0D + BALDUR stay locked-silhouette until the player's reached them.
    for (let i = 1; i <= 6; i++) this.load.image(`m1-walk-${i}`, `assets/mod1/m1-walk-${i}.png`);
    for (let i = 1; i <= 6; i++) this.load.image(`mod2-walk-${i}`, `assets/mod2/mod2-walk-${i}.png`);
    for (let i = 1; i <= 6; i++) this.load.image(`m1-zwalk-${i}`, `assets/mod1/m1-zwalk-${i}.png`);
    for (let i = 1; i <= 13; i++) this.load.image(`bhw-${i}`, `assets/baldur-boss/bhw-${i}.png`);
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000).setDepth(0);
    // The page hides the OS cursor (#game{cursor:none}) so the GAME can draw its
    // own — but the title had none, so the mouse vanished here. Draw it on the
    // title too: the cursor must NEVER disappear on any screen.
    this.titleCursor = this.add.graphics().setDepth(1000).setScrollFactor(0);  // above everything, same law as GameScene

    const go = () => {
      if (this.started) return;
      this.started = true;
      // unlock audio on this gesture so the door-screen meme + bed can sound
      try { if (this.sound.context && this.sound.context.state === 'suspended') this.sound.context.resume(); } catch {}
      this.scene.start('game');
    };

    // The intro PNG is landscape; on a portrait phone (H > W) contain-fit
    // shrinks it to a postage stamp with dead black bars top and bottom.
    // Portrait gets its own art-free arcade text layout instead. Desktop and
    // any landscape viewport keep Dave's painted title card.
    if (H > W) { this._layout = 'portrait'; this.createPortrait(W, H); }
    else { this._layout = 'landscape'; this.createLandscape(W, H); }

    // Reddit's post size switcher (mobile/desktop/fullscreen) resizes the
    // webview AFTER boot. GameScene builds itself fresh on start, but the
    // title laid out once and stayed small — re-create it whenever the
    // viewport really changes (swaps portrait ↔ landscape too). The listener
    // dies with the scene, so a mid-run resize can't restart the title
    // behind a live game.
    this._onResize = () => {
      if (this.started) return;
      const w = this.scale.width, h = this.scale.height;
      if (Math.abs(w - W) < 2 && Math.abs(h - H) < 2) return;
      clearTimeout(this._resizeT);
      this._resizeT = setTimeout(() => { if (!this.started) this.scene.restart(); }, 180);
    };
    this.scale.on('resize', this._onResize);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this._onResize);
      clearTimeout(this._resizeT);
    });

    // Speaker toggle on the title too (same mute as in-game). Its own tap must
    // NOT start the game, so `go` runs off input.on with a bounds check rather
    // than input.once (which the button tap would otherwise consume).
    const mlabel = () => (NB.audioMuted ? '🔇' : '🔊');
    this.muteBtn = this.add.text(18, H - 16, mlabel(), {
      fontFamily: 'Courier New', fontSize: '22px',
    }).setOrigin(0, 1).setDepth(1001).setScrollFactor(0).setAlpha(0.85)
      .setInteractive({ useHandCursor: false });
    this.muteBtn.on('pointerdown', (p, lx, ly, ev) => {
      if (ev) ev.stopPropagation();
      // unlock audio context on this gesture so an unmute is audible right away
      try { if (this.sound.context && this.sound.context.state === 'suspended') this.sound.context.resume(); } catch {}
      NB.toggleMuted(null);
      this.muteBtn.setText(mlabel());
    });

    if (NB.autostart()) {
      this.time.delayedCall(50, go);
      return;
    }
    this.input.on('pointerdown', (p) => {
      if (this.muteBtn && this.muteBtn.getBounds().contains(p.x, p.y)) return;
      // the moderator-flip arrows own their taps — don't start the game
      if ((this.modArrows || []).some(a => a.getBounds().contains(p.x, p.y))) return;
      go();
    });
    this.input.keyboard?.once('keydown', go);
  }

  update() {
    const g = this.titleCursor;
    if (!g) return;
    const p = this.input.activePointer;
    const x = p.x, y = p.y;
    g.clear();
    g.fillStyle(0x000000, 1);
    g.beginPath();
    g.moveTo(x, y); g.lineTo(x, y + 17); g.lineTo(x + 4.5, y + 13);
    g.lineTo(x + 8, y + 20); g.lineTo(x + 11, y + 18.5); g.lineTo(x + 7.5, y + 12);
    g.lineTo(x + 12.5, y + 12); g.closePath(); g.fillPath();
    g.lineStyle(1.5, 0xffffff, 1); g.strokePath();
  }

  // Desktop/landscape: functional board (right) + an ANIMATED superMOD pacing
  // on the left, so you see who you're up against. Same features as mobile.
  createLandscape(W, H) {
    const u = { arcade: NB.FONT_ARCADE || 'Courier New', data: NB.FONT_ACCENT || 'Georgia, serif' };
    const pad = Math.round(H * 0.05);

    // hero background (same cohesive look as mobile), dimmed for contrast
    const best = NB.getPersonalBest();
    const pool = best >= NB.HERO3_UNLOCK ? [1, 2, 3] : [1, 2];
    const heroKey = `title-hero-${Phaser.Utils.Array.GetRandom(pool)}`;
    if (this.textures.exists(heroKey)) {
      // top-anchored cover-fit: fills the screen, crops feet off the BOTTOM if
      // anything — never the face (Dave: the old fit cut the image off badly).
      const hero = this.add.image(W / 2, 0, heroKey).setOrigin(0.5, 0).setDepth(0);
      hero.setScale(Math.max(W / hero.width, H / hero.height)).setAlpha(0.5);
      this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.45).setDepth(0.5);
    } else {
      this.add.rectangle(W / 2, H / 2, W, H, 0x000000).setDepth(0);
    }

    // LEFT — animated superMOD (feet planted) + directions + start
    const leftW = W * 0.4 - pad;
    const leftCx = pad + leftW / 2;
    this.drawMod(leftCx, H * 0.58, H * 0.46);

    // directions — the PC side had none
    this.add.text(leftCx, H * 0.66, 'HOW TO PLAY', {
      fontFamily: NB.FONT_SOUL || 'Georgia, serif',
      fontSize: `${Phaser.Math.Clamp(Math.round(W * 0.028), 14, 24)}px`, color: '#d13b2e',
    }).setOrigin(0.5).setDepth(3).setStroke('#000000', 4);
    const howto = 'FARM posts for karma — hover a post, hit its targets.\n'
      + 'superMOD ALWAYS winds up before he lunges. RUN then.\n'
      + 'grab memes to fight back · skip the trap memes\n'
      + 'type a busier sub up top for more posts. it never ends.\n'
      // the letter-hunt entry tip (DRAFT wording — Dave's to swap)
      + 'they whisper about r/cursed. type it and see.';
    this.add.text(leftCx, H * 0.71, howto, {
      fontFamily: u.data, fontSize: `${Phaser.Math.Clamp(Math.round(W * 0.019), 11, 16)}px`,
      color: '#f6eeca', align: 'center', lineSpacing: 4, wordWrap: { width: leftW - 8 },
    }).setOrigin(0.5, 0).setDepth(3).setStroke('#000000', 3);

    const p1y = H - pad - Math.round(H * 0.05);
    const start = this.add.text(leftCx, p1y, 'PLAYER 1 START', {
      fontFamily: u.arcade, fontSize: `${Phaser.Math.Clamp(Math.round(W * 0.03), 14, 28)}px`, color: '#ffe14d',
    }).setOrigin(0.5).setDepth(3).setStroke('#000000', 5);
    if (start.width > leftW) start.setScale(leftW / start.width);
    this.time.addEvent({ delay: 530, loop: true, callback: () => start.setVisible(!start.visible) });

    // RIGHT — the real board
    const bx = W * 0.43, bw = W - bx - pad;
    this.drawBoard(bx, pad, bw, H - pad * 2);
  }

  // A dark red-bordered panel over the hero — shared chrome.
  drawPanel(x, y, w, h) {
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x000000, 0.62); g.fillRect(x, y, w, h);
    g.lineStyle(3, 0xd13b2e, 1); g.strokeRect(x, y, w, h);
    return g;
  }

  // Animated superMOD: cycles the walk frames in place with a gentle pace + bob.
  // "Meet the moderators" — the pixel WALK of each mod, flip through with ◄ ►.
  // superM0D is always shown; redditM0D + BALDUR are black-silhouette "???"
  // teases until the player has actually reached them (persisted flags set in
  // spawnMod2 / spawnBaldur). Pure showcase — no gameplay, no character select.
  drawMod(cx, cy, targetH) {
    const P = (k) => (NB.persistGet && NB.persistGet(k) === '1');
    const MODS = [
      { name: 'superM0D', pre: 'm1-walk', n: 6, unlocked: true },
      { name: 'redditM0D', pre: 'mod2-walk', n: 6, unlocked: P('nb_seen_mod2') },
      { name: 'REVENANT superM0D', pre: 'm1-zwalk', n: 6, unlocked: P('nb_seen_revenant') },
      { name: 'BALDUR', pre: 'bhw', n: 13, unlocked: P('nb_seen_baldur') },
    ].filter(m => this.textures.exists(`${m.pre}-1`));
    if (!MODS.length) return null;
    this._modIdx = 0;

    const spr = this.add.sprite(cx, cy, `${MODS[0].pre}-1`).setOrigin(0.5, 0.5).setDepth(1);
    const label = this.add.text(cx, cy - targetH * 0.62, '', {
      fontFamily: NB.FONT_ARCADE || 'Courier New', fontSize: `${Phaser.Math.Clamp(Math.round(targetH * 0.07), 12, 22)}px`,
      color: '#e8c944',
    }).setOrigin(0.5).setDepth(2).setStroke('#000', 4);
    // gentle bob + pace, shared across whichever mod is shown
    this.tweens.add({ targets: spr, y: cy - 6, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: spr, x: cx + 18, duration: 950, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    let frame = 1;
    this.time.addEvent({ delay: 135, loop: true, callback: () => {
      const m = MODS[this._modIdx];
      if (!m || !m.unlocked) return;                 // locked = a still silhouette
      frame = frame % m.n + 1;
      if (this.textures.exists(`${m.pre}-${frame}`)) spr.setTexture(`${m.pre}-${frame}`);
    }});

    const render = () => {
      const m = MODS[this._modIdx];
      frame = 1;
      spr.setTexture(`${m.pre}-1`);
      const srcH = this.textures.get(`${m.pre}-1`).getSourceImage().height || 512;
      spr.setScale(targetH / srcH);
      if (m.unlocked) { spr.clearTint(); label.setText(m.name).setColor('#e8c944'); }
      else { spr.setTintFill(0x000000); label.setText('? ? ?').setColor('#7a6f4a'); }
    };
    render();

    // ◄ ► arrows flanking the mod. Only shown if there's more than one mod to
    // flip to (including locked teases). They own their taps (see the go-guard).
    this.modArrows = [];
    if (MODS.length > 1) {
      const ay = cy, ax = targetH * 0.52;
      const mk = (dx, glyph) => {
        const a = this.add.text(cx + dx, ay, glyph, {
          fontFamily: NB.FONT_ARCADE || 'Courier New', fontSize: `${Phaser.Math.Clamp(Math.round(targetH * 0.12), 22, 44)}px`,
          color: '#e8c944',
        }).setOrigin(0.5).setDepth(3).setStroke('#000', 5).setInteractive({ useHandCursor: false });
        a.on('pointerdown', (p, lx, ly, ev) => {
          if (ev) ev.stopPropagation();
          this._modIdx = (this._modIdx + (dx < 0 ? MODS.length - 1 : 1)) % MODS.length;
          render();
        });
        this.modArrows.push(a);
        return a;
      };
      mk(-ax, '◄'); mk(ax, '►');
    }
    return spr;
  }

  // The High Score board, drawn into an arbitrary rect (Points | Player | Ban
  // Reason, 10 rows, subreddit label). Device saves first; redis swaps in.
  drawBoard(x, y, w, h) {
    const soul = NB.FONT_SOUL || 'Georgia, serif';
    const data = NB.FONT_ACCENT || 'Georgia, serif';
    const RED = '#d13b2e', CREAM = '#f6eeca', CREAM_HI = '#fff2c0', CREAM_DIM = '#cabf93';
    const redLine = 0xd13b2e;
    const cx = x + w / 2;
    this.drawPanel(x, y, w, h);
    this.add.text(cx, y + h * 0.055, 'High Score', {
      fontFamily: soul, fontSize: `${Phaser.Math.Clamp(Math.round(w * 0.085), 22, 48)}px`, color: RED,
    }).setOrigin(0.5).setDepth(3);
    const subLabel = this.add.text(cx, y + h * 0.115, 'this device', {
      fontFamily: data, fontSize: `${Phaser.Math.Clamp(Math.round(w * 0.032), 10, 15)}px`, color: CREAM_DIM,
    }).setOrigin(0.5).setDepth(3);
    const colP = x + w * 0.14, colN = x + w * 0.45, colR = x + w * 0.795;
    const div1 = x + w * 0.27, div2 = x + w * 0.62;
    const headY = y + h * 0.175;
    const hsz = `${Phaser.Math.Clamp(Math.round(w * 0.04), 11, 17)}px`;
    this.add.text(colP, headY, 'Points', { fontFamily: soul, fontSize: hsz, color: CREAM_DIM }).setOrigin(0.5).setDepth(3);
    this.add.text(colN, headY, 'Player', { fontFamily: soul, fontSize: hsz, color: CREAM_DIM }).setOrigin(0.5).setDepth(3);
    this.add.text(colR, headY, 'Ban Reason', { fontFamily: soul, fontSize: hsz, color: CREAM_DIM }).setOrigin(0.5).setDepth(3);
    const g = this.add.graphics().setDepth(3);
    g.lineStyle(1.5, redLine, 0.7);
    g.lineBetween(x + 8, headY + 15, x + w - 8, headY + 15);
    g.lineBetween(div1, headY + 15, div1, y + h - 10);
    g.lineBetween(div2, headY + 15, div2, y + h - 10);
    const ROWS = 10;
    const bodyTop = headY + 22, rowH = (y + h - 8 - bodyTop) / ROWS;
    const psz = Phaser.Math.Clamp(Math.round(w * 0.038), 11, 18);
    const rsz = Phaser.Math.Clamp(Math.round(w * 0.028), 9, 14);
    for (let i = 1; i < ROWS; i++) {
      g.lineStyle(1, redLine, 0.18);
      g.lineBetween(x + 8, bodyTop + rowH * i, x + w - 8, bodyTop + rowH * i);
    }
    const fit = (t, mw) => { if (t.width > mw) t.setScale(mw / t.width); return t; };
    const shortName = (n) => { const sn = (n || '').replace(/^u\//, ''); return sn.length > 14 ? `${sn.slice(0, 13)}…` : sn; };
    let rowObjs = [];
    const drawRows = (list) => {
      rowObjs.forEach(o => o.destroy());
      rowObjs = [];
      for (let i = 0; i < ROWS; i++) {
        const ry = bodyTop + rowH * (i + 0.5), sc = list[i];
        rowObjs.push(fit(this.add.text(colP, ry, sc ? NB.fmtKarma(sc.karma) : '—', {
          fontFamily: data, fontSize: `${psz}px`, color: sc && i === 0 ? CREAM_HI : CREAM,
        }).setOrigin(0.5).setDepth(3), w * 0.24));
        if (!sc) continue;
        rowObjs.push(fit(this.add.text(colN, ry, sc.name ? shortName(sc.name) : 'you', {
          fontFamily: data, fontSize: `${rsz}px`, color: sc.name ? CREAM : CREAM_DIM,
        }).setOrigin(0.5).setDepth(3), w * 0.31));
        const rt = this.add.text(colR, ry, sc.reason || 'none provided', {
          fontFamily: data, fontSize: `${rsz}px`, color: CREAM,
          align: 'center', wordWrap: { width: w * 0.33 },
        }).setOrigin(0.5).setDepth(3);
        if (rt.height > rowH - 4) rt.setScale((rowH - 4) / rt.height);
        rowObjs.push(rt);
      }
    };
    drawRows(NB.getTopScores());
    NB.fetchLeaderboard().then(remote => {
      if (!this.scene.isActive()) return;
      if (remote.scores.length) drawRows(remote.scores);
      if (remote.sub) subLabel.setText(`r/${remote.sub} — this subreddit's board`);
    });
  }

  // Portrait mobile: rotating hero art (behind) + three red-on-black panels —
  // PLAYER 1 START (arcade font), a High Score board with Points | Ban Reason,
  // and How to Play. Everything but PLAYER 1 START uses the Sell Your Soul font.
  createPortrait(W, H) {
    const cx = W / 2;
    const arcade = NB.FONT_ARCADE || 'Courier New';
    const soul = NB.FONT_SOUL || 'Georgia, serif';        // headers (letters only — no digits!)
    const data = NB.FONT_ACCENT || 'Georgia, serif';      // numbers + reasons (digit-safe)
    const RED = '#d13b2e', BRIGHT = '#ff6a54';
    const CREAM = '#f6eeca', CREAM_HI = '#fff2c0', CREAM_DIM = '#cabf93';   // off-white, yellow tint — box content
    const redLine = 0xd13b2e;
    const pad = Math.round(W * 0.045);
    const pw = W - pad * 2;

    // hero background: random #1/#2; #3 (throne) joins once best >= HERO3_UNLOCK.
    const best = NB.getPersonalBest();
    const pool = best >= NB.HERO3_UNLOCK ? [1, 2, 3] : [1, 2];
    const heroKey = `title-hero-${Phaser.Utils.Array.GetRandom(pool)}`;
    if (this.textures.exists(heroKey)) {
      const hero = this.add.image(cx, H / 2, heroKey).setDepth(0);
      hero.setScale(Math.max(W / hero.width, H / hero.height)).setAlpha(0.55);   // cover-fit
      this.add.rectangle(cx, H / 2, W, H, 0x000000, 0.32).setDepth(0.5);          // dim for contrast
    }

    // red-bordered panel over a dark interior (so text reads over the hero)
    const panel = (y, h) => {
      const g = this.add.graphics().setDepth(2);
      g.fillStyle(0x000000, 0.6); g.fillRect(pad, y, pw, h);
      g.lineStyle(3, redLine, 1); g.strokeRect(pad, y, pw, h);
      return g;
    };
    const fit = (t, maxW) => { if (t.width > maxW) t.setScale(maxW / t.width); return t; };

    // ---- HIGH SCORE board (Points | Player | Ban Reason) — TOP panel ----
    // A REAL communal board (subreddit redis) — ten spots, arcade style.
    const p1h = Math.round(H * 0.075);
    const hsY = pad;
    // Compact top strip so the How-to-Play panel below has room for LARGE,
    // readable directions (the priority). Board shows the top 5 here.
    const hsH = Math.round(H * 0.24);
    panel(hsY, hsH);
    this.add.text(cx, hsY + Math.round(H * 0.028), 'High Score', {
      fontFamily: soul, fontSize: `${Phaser.Math.Clamp(Math.round(W * 0.08), 20, 42)}px`, color: RED,
    }).setOrigin(0.5).setDepth(3);
    // whose board this is — device saves until the subreddit fetch lands
    const subLabel = this.add.text(cx, hsY + Math.round(H * 0.058), 'this device', {
      fontFamily: data, fontSize: `${Phaser.Math.Clamp(Math.round(W * 0.032), 10, 14)}px`, color: CREAM_DIM,
    }).setOrigin(0.5).setDepth(3);
    const colP = pad + pw * 0.14, colN = pad + pw * 0.45, colR = pad + pw * 0.795;
    const div1 = pad + pw * 0.27, div2 = pad + pw * 0.62;
    const headY = hsY + Math.round(H * 0.09);
    const hsz = `${Math.round(W * 0.042)}px`;
    this.add.text(colP, headY, 'Points', { fontFamily: soul, fontSize: hsz, color: CREAM_DIM }).setOrigin(0.5).setDepth(3);
    this.add.text(colN, headY, 'Player', { fontFamily: soul, fontSize: hsz, color: CREAM_DIM }).setOrigin(0.5).setDepth(3);
    this.add.text(colR, headY, 'Ban Reason', { fontFamily: soul, fontSize: hsz, color: CREAM_DIM }).setOrigin(0.5).setDepth(3);
    const g = this.add.graphics().setDepth(3);
    g.lineStyle(1.5, redLine, 0.7);
    g.lineBetween(pad + 8, headY + 15, pad + pw - 8, headY + 15);          // header underline
    g.lineBetween(div1, headY + 15, div1, hsY + hsH - 10);                 // column dividers
    g.lineBetween(div2, headY + 15, div2, hsY + hsH - 10);
    const ROWS = 5;
    const bodyTop = headY + 22, rowH = (hsY + hsH - 8 - bodyTop) / ROWS;
    const psz = Phaser.Math.Clamp(Math.round(W * 0.04), 12, 16);
    const rsz = Phaser.Math.Clamp(Math.round(W * 0.032), 11, 14);
    for (let i = 1; i < ROWS; i++) {   // static row separators
      g.lineStyle(1, redLine, 0.18);
      g.lineBetween(pad + 8, bodyTop + rowH * i, pad + pw - 8, bodyTop + rowH * i);
    }
    const shortName = (n) => {
      const s = (n || '').replace(/^u\//, '');
      return s.length > 14 ? `${s.slice(0, 13)}…` : s;
    };
    // Device saves draw instantly; the subreddit's redis leaderboard swaps in
    // when the fetch lands (offline / local dev keeps the device board).
    let rowObjs = [];
    const drawRows = (list) => {
      rowObjs.forEach(o => o.destroy());
      rowObjs = [];
      for (let i = 0; i < ROWS; i++) {
        const ry = bodyTop + rowH * (i + 0.5), sc = list[i];
        rowObjs.push(fit(this.add.text(colP, ry, sc ? NB.fmtKarma(sc.karma) : '—', {
          fontFamily: data, fontSize: `${psz}px`, color: sc && i === 0 ? CREAM_HI : CREAM,
        }).setOrigin(0.5).setDepth(3), pw * 0.24));
        if (!sc) continue;
        rowObjs.push(fit(this.add.text(colN, ry, sc.name ? shortName(sc.name) : 'you', {
          fontFamily: data, fontSize: `${rsz}px`, color: sc.name ? CREAM : CREAM_DIM,
        }).setOrigin(0.5).setDepth(3), pw * 0.31));
        const rt = this.add.text(colR, ry, sc.reason || 'none provided', {
          fontFamily: data, fontSize: `${rsz}px`, color: CREAM,
          align: 'center', wordWrap: { width: pw * 0.33 },
        }).setOrigin(0.5).setDepth(3);
        if (rt.height > rowH - 4) rt.setScale((rowH - 4) / rt.height);
        rowObjs.push(rt);
      }
    };
    drawRows(NB.getTopScores());
    NB.fetchLeaderboard().then(remote => {
      if (!this.scene.isActive()) return;
      if (remote.scores.length) drawRows(remote.scores);
      if (remote.sub) subLabel.setText(`r/${remote.sub} — this subreddit's board`);
    });

    // ---- PLAYER 1 START (arcade, blinking YELLOW, bottom of the page) ----
    const p1Y = H - pad - p1h;
    panel(p1Y, p1h);
    const start = fit(this.add.text(cx, p1Y + p1h / 2, 'PLAYER 1 START', {
      fontFamily: arcade, fontSize: `${Phaser.Math.Clamp(Math.round(W * 0.05), 13, 24)}px`, color: '#ffe14d',
    }).setOrigin(0.5).setDepth(3), pw - 18);
    this.time.addEvent({ delay: 530, loop: true, callback: () => start.setVisible(!start.visible) });

    // ---- HOW TO PLAY (middle — start panel now owns the bottom edge) ----
    const htY = hsY + hsH + Math.round(H * 0.018);
    const htH = H - htY - pad - p1h - Math.round(H * 0.018);
    panel(htY, htH);
    this.add.text(cx, htY + Math.round(H * 0.03), 'How to Play', {
      fontFamily: soul, fontSize: `${Phaser.Math.Clamp(Math.round(W * 0.072), 20, 40)}px`, color: RED,
    }).setOrigin(0.5).setDepth(3);
    const howto =
      'SUPER MOD DOESN\'T STOP.\n\n' +
      'AS HE\'S CHASING YOU THROUGH REDDIT, HE WILL DESTROY THE POSTS THAT YOU NEED TO FARM KARMA.\n\n' +
      'TO FARM KARMA YOU MUST PASS A THREE TARGET QTE.\n\n' +
      'EACH POST IS WORTH ITS ACTUAL KARMA AMOUNT.\n\n' +
      'MEMES ARE YOUR POWER UPS — GRAB THEM WHEN YOU SEE THEM.';
    const htTxt = this.add.text(cx, htY + Math.round(H * 0.078), howto, {
      fontFamily: data, fontSize: `${Phaser.Math.Clamp(Math.round(W * 0.056), 22, 28)}px`, color: CREAM,
      align: 'center', lineSpacing: 4, wordWrap: { width: pw - 30 },
    }).setOrigin(0.5, 0).setDepth(3);
    const maxTxtH = htH - Math.round(H * 0.1);
    if (htTxt.height > maxTxtH) htTxt.setScale(maxTxtH / htTxt.height);   // shrink to fit the panel
  }
}
