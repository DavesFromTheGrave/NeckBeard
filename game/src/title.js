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
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000).setDepth(0);

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
    if (H > W) this.createPortrait(W, H);
    else this.createLandscape(W, H);

    if (NB.autostart()) {
      this.time.delayedCall(50, go);
      return;
    }
    this.input.once('pointerdown', go);
    this.input.keyboard?.once('keydown', go);
  }

  createLandscape(W, H) {
    const art = this.add.image(W / 2, H / 2, 'intro-art').setDepth(1);
    // contain-fit, capped at native resolution
    const s = Math.min(W / art.width, H / art.height, 1);
    art.setScale(s);

    // the art's on-screen rect (for anchoring text to panels inside it)
    const aw = art.width * s, ah = art.height * s;
    const ax = W / 2 - aw / 2, ay = H / 2 - ah / 2;

    // top-5 karma, handwritten onto the HIGH SCORE lines. Device saves draw
    // instantly; the subreddit's redis leaderboard swaps in when it lands.
    const lineTexts = [];
    const drawScores = (list) => {
      lineTexts.forEach(t => t.destroy());
      lineTexts.length = 0;
      SCORE_LINES.forEach((ln, i) => {
        if (!list[i]) return;
        lineTexts.push(this.add.text(ax + ln.x * aw, ay + ln.y * ah, NB.fmtKarma(list[i].karma), {
          fontFamily: NB.FONT_ACCENT || 'Courier New',
          fontSize: `${Math.max(14, Math.round(ah * 0.034))}px`,
          color: '#ffffff',
        }).setOrigin(0.5, 1).setDepth(2));
      });
    };
    drawScores(NB.getTopScores());
    NB.fetchLeaderboard().then(remote => {
      if (remote.length && this.scene.isActive()) drawScores(remote);
    });

    // start cue — anchored INSIDE the art, over superMOD's tie and vest
    const hint = this.add.text(ax + aw * 0.5, ay + ah * 0.875, 'PLAYER 1  PRESS START', {
      fontFamily: NB.FONT_ARCADE || 'Courier New', fontSize: '20px', color: '#ffe14d',
    }).setOrigin(0.5).setDepth(5).setStroke('#000000', 6);
    // classic arcade attract-mode blink: hard on/off, not a fade
    this.time.addEvent({ delay: 530, loop: true, callback: () => hint.setVisible(!hint.visible) });
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

    // ---- PLAYER 1 START (arcade, blinking) ----
    const p1h = Math.round(H * 0.075);
    panel(pad, p1h);
    const start = fit(this.add.text(cx, pad + p1h / 2, 'PLAYER 1 START', {
      fontFamily: arcade, fontSize: `${Phaser.Math.Clamp(Math.round(W * 0.05), 13, 24)}px`, color: BRIGHT,
    }).setOrigin(0.5).setDepth(3), pw - 18);
    this.time.addEvent({ delay: 530, loop: true, callback: () => start.setVisible(!start.visible) });

    // ---- HIGH SCORE board (Points | Ban Reason) ----
    const hsY = pad + p1h + Math.round(H * 0.018);
    const hsH = Math.round(H * 0.45);
    panel(hsY, hsH);
    this.add.text(cx, hsY + Math.round(H * 0.032), 'High Score', {
      fontFamily: soul, fontSize: `${Phaser.Math.Clamp(Math.round(W * 0.085), 22, 46)}px`, color: RED,
    }).setOrigin(0.5).setDepth(3);
    const colP = pad + pw * 0.26, colR = pad + pw * 0.66, divX = pad + pw * 0.42;
    const headY = hsY + Math.round(H * 0.078);
    this.add.text(colP, headY, 'Points', { fontFamily: soul, fontSize: `${Math.round(W * 0.045)}px`, color: CREAM_DIM }).setOrigin(0.5).setDepth(3);
    this.add.text(colR, headY, 'Ban Reason', { fontFamily: soul, fontSize: `${Math.round(W * 0.045)}px`, color: CREAM_DIM }).setOrigin(0.5).setDepth(3);
    const g = this.add.graphics().setDepth(3);
    g.lineStyle(1.5, redLine, 0.7);
    g.lineBetween(pad + 8, headY + 15, pad + pw - 8, headY + 15);          // header underline
    g.lineBetween(divX, headY + 15, divX, hsY + hsH - 10);                 // column divider
    const bodyTop = headY + 22, rowH = (hsY + hsH - 8 - bodyTop) / 5;
    const psz = Phaser.Math.Clamp(Math.round(W * 0.05), 14, 24);
    const rsz = Phaser.Math.Clamp(Math.round(W * 0.038), 11, 18);
    for (let i = 1; i < 5; i++) {   // static row separators
      g.lineStyle(1, redLine, 0.22);
      g.lineBetween(pad + 8, bodyTop + rowH * i, pad + pw - 8, bodyTop + rowH * i);
    }
    // Device top-5 draws instantly; the subreddit's redis leaderboard swaps in
    // when the fetch lands (offline / local dev keeps the device board).
    let rowObjs = [];
    const drawRows = (list) => {
      rowObjs.forEach(o => o.destroy());
      rowObjs = [];
      for (let i = 0; i < 5; i++) {
        const ry = bodyTop + rowH * (i + 0.5), sc = list[i];
        rowObjs.push(this.add.text(colP, ry, sc ? NB.fmtKarma(sc.karma) : '—', {
          fontFamily: data, fontSize: `${psz}px`, color: sc && i === 0 ? CREAM_HI : CREAM,
        }).setOrigin(0.5).setDepth(3));
        if (sc) {
          const rt = this.add.text(colR, ry, sc.reason || sc.name || 'none provided', {
            fontFamily: data, fontSize: `${rsz}px`, color: CREAM,
            align: 'center', wordWrap: { width: pw * 0.5 },
          }).setOrigin(0.5).setDepth(3);
          if (rt.height > rowH - 6) rt.setScale((rowH - 6) / rt.height);
          rowObjs.push(rt);
        }
      }
    };
    drawRows(NB.getTopScores());
    NB.fetchLeaderboard().then(remote => {
      if (remote.length && this.scene.isActive()) drawRows(remote);
    });

    // ---- HOW TO PLAY ----
    const htY = hsY + hsH + Math.round(H * 0.018);
    const htH = H - htY - pad;
    panel(htY, htH);
    this.add.text(cx, htY + Math.round(H * 0.03), 'How to Play', {
      fontFamily: soul, fontSize: `${Phaser.Math.Clamp(Math.round(W * 0.072), 20, 40)}px`, color: RED,
    }).setOrigin(0.5).setDepth(3);
    const howto =
      'Raid posts for KARMA — hover a post and hit the 3 targets to steal its points, before superMOD wrecks it and it\'s gone forever.\n\n' +
      'Grab MEMES for power: stun him, shield yourself, drop a decoy. Skip the trap memes.\n\n' +
      'He always winds up before he lunges — that wind-up is your window to bolt.\n\n' +
      'It\'s simple. Just stay away from superMOD.';
    const htTxt = this.add.text(cx, htY + Math.round(H * 0.078), howto, {
      fontFamily: data, fontSize: `${Phaser.Math.Clamp(Math.round(W * 0.044), 13, 21)}px`, color: CREAM,
      align: 'center', lineSpacing: 5, wordWrap: { width: pw - 30 },
    }).setOrigin(0.5, 0).setDepth(3);
    const maxTxtH = htH - Math.round(H * 0.1);
    if (htTxt.height > maxTxtH) htTxt.setScale(maxTxtH / htTxt.height);   // shrink to fit the panel
  }
}
