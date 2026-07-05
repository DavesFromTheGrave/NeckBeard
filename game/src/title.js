// Title screen = Dave's NECKBEARD-INTRO art, shown whole (contain-fit,
// NEVER scaled past 1:1 — his brush strokes are composition, not texture).
// The five blank HIGH SCORE lines in the art are the real top-5 list;
// scores are drawn onto them at image-relative coordinates.
// Skipped when ?autostart=1 (boot test / dev).
window.NB = window.NB || {};

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
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000).setDepth(0);

    const art = this.add.image(W / 2, H / 2, 'intro-art').setDepth(1);
    // contain-fit, capped at native resolution
    const s = Math.min(W / art.width, H / art.height, 1);
    art.setScale(s);

    // the art's on-screen rect (for anchoring text to panels inside it)
    const aw = art.width * s, ah = art.height * s;
    const ax = W / 2 - aw / 2, ay = H / 2 - ah / 2;

    // top-5 survival times, handwritten onto the HIGH SCORE lines
    const scores = NB.getTopScores();
    SCORE_LINES.forEach((ln, i) => {
      if (!scores[i]) return;
      this.add.text(ax + ln.x * aw, ay + ln.y * ah, NB.fmtTime(scores[i]), {
        fontFamily: NB.FONT_ACCENT || 'Courier New',
        fontSize: `${Math.max(14, Math.round(ah * 0.034))}px`,
        color: '#ffffff',
      }).setOrigin(0.5, 1).setDepth(2);
    });

    // start cue — sits in the letterbox bar when there is one, else over the
    // bottom edge of the art with a stroke
    const barH = (H - ah) / 2;
    const hintY = barH > 30 ? H - barH / 2 : H - 26;
    const hint = this.add.text(W / 2, hintY, 'PLAYER 1  PRESS START', {
      fontFamily: NB.FONT_ARCADE || 'Courier New', fontSize: '20px', color: '#ffe14d',
    }).setOrigin(0.5).setDepth(5).setStroke('#000000', 6);
    // classic arcade attract-mode blink: hard on/off, not a fade
    this.time.addEvent({ delay: 530, loop: true, callback: () => hint.setVisible(!hint.visible) });

    const go = () => {
      if (this.started) return;
      this.started = true;
      this.scene.start('game');
    };

    if (NB.autostart()) {
      this.time.delayedCall(50, go);
      return;
    }
    this.input.once('pointerdown', go);
    this.input.keyboard?.once('keydown', go);
  }
}
