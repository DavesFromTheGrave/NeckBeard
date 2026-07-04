// Neckbeard (hackathon build) — boot scene.
// Touch-first: the pointer/finger IS the hunted cursor.
// World is a scrollable feed; camera follows via edge-push + wheel.
window.NB = window.NB || {};

// Strip near-black pixels so painted assets with flat BGs composite cleanly.
NB.keyBlack = function (scene, key, tol = 28) {
  if (!scene.textures.exists(key)) return;
  const src = scene.textures.get(key).getSourceImage();
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] < tol && d[i + 1] < tol && d[i + 2] < tol) d[i + 3] = 0;
  }
  ctx.putImageData(img, 0, 0);
  scene.textures.remove(key);
  scene.textures.addCanvas(key, c);
};

class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  preload() {
    for (let i = 1; i <= 6; i++) {
      this.load.image(`walk-${i}`, `assets/walk/mod-walk2-${i}.png`);
      this.load.image(`run-${i}`, `assets/run/mod-run2-${i}.png`);
      this.load.image(`charge-${i}`, `assets/charge/mod-charge-${i}.png`);
      this.load.image(`leap-${i}`, `assets/leap/mod-leap-${i}.png`);
      this.load.image(`pose-${i}`, `assets/poses/mod-pose2-${i}.png`);
      this.load.image(`zwalk-${i}`, `assets/zombie/zom-walk-${i}.png`);
      if (i <= 5) this.load.image(`sledge-${i}`, `assets/sledge/mod-sledge-${i}.png`);
      if (i <= 5) this.load.image(`zattack-${i}`, `assets/zattack/zom-attack-${i}.png`);
      if (i <= 6) this.load.image(`carry-${i}`, `assets/carry/mod-carry-${i}.png`);
    }
    this.load.image('balder', 'assets/balder/balder-ceremony.png');
    this.load.image('elevator', 'assets/balder/elevator.png');
    for (const p of ['idle', 'cheer', 'armsup', 'pompom', 'kick', 'wink']) {
      this.load.image(`cheer-${p}`, `assets/cheer/cheer-${p}.png`);
    }
  }

  create() {
    try { NB.keyBlack(this, 'elevator'); } catch (e) { console.warn('elevator key:', e); }
    const W = this.scale.width, H = this.scale.height;
    this.survivalMs = 0;
    this.caught = false;
    this.ceremonyRunning = false;
    this.balderUsed = false;

    const anim = (key, prefix, n, rate, repeat = -1) => this.anims.create({
      key, frames: Array.from({ length: n }, (_, i) => ({ key: `${prefix}-${i + 1}` })),
      frameRate: rate, repeat,
    });
    anim('anim-walk', 'walk', 6, 7);
    anim('anim-run', 'run', 6, 11);
    anim('anim-charge', 'charge', 6, 12);
    anim('anim-leap', 'leap', 6, 14, 0);
    anim('anim-zwalk', 'zwalk', 6, 9);
    // vault over a post card: run-up (leap 1-2) -> haul-over (leap 3-5)
    this.anims.create({ key: 'anim-climb',
      frames: [2, 3, 4, 5].map(i => ({ key: `leap-${i}` })), frameRate: 9, repeat: 0 });
    this.anims.create({ key: 'anim-crouch', frames: [{ key: 'pose-3' }], frameRate: 1 });
    this.anims.create({ key: 'anim-stumble', frames: [{ key: 'carry-6' }], frameRate: 1 });
    this.anims.create({ key: 'anim-victory', frames: [{ key: 'pose-1' }], frameRate: 1 });
    this.anims.create({ key: 'anim-throw', frames: [{ key: 'sledge-3' }, { key: 'sledge-4' }], frameRate: 5, repeat: 0 });
    this.anims.create({ key: 'anim-ztelegraph', frames: [{ key: 'zattack-3' }], frameRate: 1 });
    this.anims.create({ key: 'anim-zlunge', frames: [{ key: 'zattack-4' }, { key: 'zattack-5' }], frameRate: 10, repeat: 0 });

    // data -> stage
    NB.fetchSubreddit().then(data => this.buildWorld(data))
      .catch(e => { window.__buildErr = e.message + ' | ' + (e.stack || ''); console.error('BUILD FAIL:', e.message, e.stack); });
  }

  buildWorld(data) {
    const W = this.scale.width, H = this.scale.height;
    this.page = NB.buildFakePage(this, W, H, data);
    this.cameras.main.setBounds(0, 0, W, this.page.WORLD_H);

    this.playerPos = { x: W * 0.7, y: H * 0.6 };  // world coords
    this.pointerScreen = { x: W * 0.7, y: H * 0.6 };
    this.cursorGfx = this.add.graphics().setDepth(20);
    this.input.on('pointermove', (p) => {
      this.pointerScreen.x = p.x; this.pointerScreen.y = p.y;
    });
    this.input.on('wheel', (_p, _o, _dx, dy) => {
      this.cameras.main.scrollY = Phaser.Math.Clamp(
        this.cameras.main.scrollY + dy * 0.9, 0, this.page.WORLD_H - H);
    });

    this.mod = new NB.Supermod(this, this.page, W * 0.15, H * 0.25);
    this.pickups = new NB.Pickups(this, this.page);
    this.projectiles = new NB.Projectiles(this, data.comments);
    this.npc = new NB.Cheerleader(this);
    this.userName = data.user;

    this.hud = this.add.text(W - 22, H - 12, '0.0s', {
      fontFamily: 'Courier New', fontSize: '18px', color: '#1a1a1b',
    }).setOrigin(1, 1).setDepth(30).setScrollFactor(0);

    this.bindDebugKeys();
    this.ready = true;
    window.__gs = this; // debug/test handle (harmless in prod; Devvit strips console access anyway)
  }

  bindDebugKeys() {
    // Alt+Shift — Huion owns Ctrl+Alt. Stripped in production Devvit build.
    if (!this.input.keyboard) return;
    this.input.keyboard.on('keydown', (ev) => {
      if (!ev.altKey || !ev.shiftKey || !this.ready) return;
      const k = ev.key.toLowerCase();
      if (k === 'b' && !this.balderUsed && !this.ceremonyRunning) {
        this.balderUsed = true;
        this.survivalMs = Math.max(this.survivalMs, 61000);
        NB.playBalderCeremony(this, () => {
          this.time.delayedCall(2000, () => { if (!this.caught) NB.spawnRevenant(this); });
        });
      } else if (k === 'r' && !this.ceremonyRunning && !this.caught) {
        NB.spawnRevenant(this);
      } else if (k === 't') {
        this.survivalMs += 30000;
      } else if (k === 'd' && !this.caught) {
        this.mod.setState('CAUGHT_YOU');
        this.onCaught();
      } else if (k === 's' && this.ceremonyRunning) {
        this.ceremonyRunning = false;
        this.mod.frozen = false;
        this.mod.sprite.anims.resume();
        this.cameras.main.zoomTo(1, 200);
      }
    });
  }

  drawCursor(x, y) {
    const g = this.cursorGfx;
    g.clear();
    g.fillStyle(0x000000, 1);
    g.beginPath();
    g.moveTo(x, y); g.lineTo(x, y + 17); g.lineTo(x + 4.5, y + 13);
    g.lineTo(x + 8, y + 20); g.lineTo(x + 11, y + 18.5); g.lineTo(x + 7.5, y + 12);
    g.lineTo(x + 12.5, y + 12); g.closePath(); g.fillPath();
    g.lineStyle(1.5, 0xffffff, 1); g.strokePath();
  }

  floatText(x, y, msg, color) {
    const t = this.add.text(x, y, msg, {
      fontFamily: 'Courier New', fontSize: '15px', fontStyle: 'bold', color,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 1100,
      onComplete: () => t.destroy() });
  }

  onCommentHit(x, y) {
    NB.sfx.commentHit();
    this.cameras.main.shake(160, 0.007);
    if (!this.pickups.absorb()) {
      this.mod.burst(1400);            // pressure, never a catch
      this.floatText(x, y - 20, 'ratio\'d', '#e0452a');
      const v = this.add.rectangle(this.scale.width / 2, this.scale.height / 2,
        this.scale.width, this.scale.height, 0xe0452a, 0.16).setDepth(35).setScrollFactor(0);
      this.tweens.add({ targets: v, fillAlpha: 0, duration: 500, onComplete: () => v.destroy() });
    }
  }

  doYank() {
    NB.sfx.yank();
    const cam = this.cameras.main;
    const H = this.scale.height;
    const dir = Math.random() < 0.5 && cam.scrollY > 300 ? -1 : 1;
    const dest = Phaser.Math.Clamp(cam.scrollY + dir * H * 0.9, 0, this.page.WORLD_H - H);
    cam.shake(350, 0.012);
    this.tweens.add({ targets: cam, scrollY: dest, duration: 380, ease: 'Quad.easeIn' });
    for (const el of this.page.elements) this.page.shake(el, this);
    this.floatText(this.playerPos.x, this.playerPos.y - 50, 'SCROLL YANKED', '#e0452a');
  }

  onCaught() {
    if (this.caught || this.ceremonyRunning) return;
    // the promotion review: survive past the threshold and the catch is intercepted
    if (!this.balderUsed && this.survivalMs > NB.TUNE.BALDER_SURVIVAL_MS) {
      this.balderUsed = true;
      NB.playBalderCeremony(this, () => {
        this.time.delayedCall(Phaser.Math.Between(4000, 8000), () => {
          if (!this.caught) NB.spawnRevenant(this);
        });
      });
      return;
    }
    this.caught = true;
    NB.sfx.caught();
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.shake(220, 0.012);
    this.time.delayedCall(400, () => {
      const layer = [];
      layer.push(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.85).setDepth(40).setScrollFactor(0));
      this.add.text(W / 2, H / 2 - 64, '[ REMOVED ]', {
        fontFamily: 'Courier New', fontSize: '46px', fontStyle: 'bold', color: '#ff4d4d',
      }).setOrigin(0.5).setDepth(41).setScrollFactor(0);
      this.add.text(W / 2, H / 2 - 16, `${this.userName} · Reason: none provided.`, {
        fontFamily: 'Courier New', fontSize: '16px', color: '#cccccc',
      }).setOrigin(0.5).setDepth(41).setScrollFactor(0);
      this.add.text(W / 2, H / 2 + 22, `you lasted ${(this.survivalMs / 1000).toFixed(1)}s`, {
        fontFamily: 'Courier New', fontSize: '15px', color: '#888888',
      }).setOrigin(0.5).setDepth(41).setScrollFactor(0);
      // o7 salute swarm — DEVVIT-SWAP: real player deaths via redis + realtime
      const names = ['u/ghost_of_karma', 'u/former_lurker', 'u/deleted_2019', 'u/plz_no_ban',
                     'u/wasnt_even_posting', 'u/mobile_user_42', 'u/f_in_the_chat', this.userName];
      this.time.addEvent({ repeat: 18, delay: 350, callback: () => {
        const t = this.add.text(Phaser.Math.Between(40, W - 60), Phaser.Math.Between(60, H - 60),
          `${Phaser.Utils.Array.GetRandom(names)}  o7`, {
            fontFamily: 'Courier New', fontSize: `${Phaser.Math.Between(12, 17)}px`, color: '#8fd18f',
          }).setDepth(42).setAlpha(0).setScrollFactor(0);
        this.tweens.add({ targets: t, alpha: 0.9, duration: 260, yoyo: true, hold: 900,
          onComplete: () => t.destroy() });
      }});
      this.add.text(W / 2, H - 46, 'tap to appeal (denied — run it back)', {
        fontFamily: 'Courier New', fontSize: '14px', color: '#666666',
      }).setOrigin(0.5).setDepth(41).setScrollFactor(0);
      this.time.delayedCall(600, () => {
        this.input.once('pointerdown', () => this.scene.restart());
      });
    });
  }

  update(_, rawDt) {
    if (!this.ready || this.caught) return;
    // dt clamp: throttled/background tabs hand out second-long deltas that
    // teleport him — cap the step so time dilates instead of skipping (fairness)
    const dt = Math.min(rawDt, 50);
    const H = this.scale.height;
    const cam = this.cameras.main;

    if (!this.ceremonyRunning) {
      this.survivalMs += dt;
      // edge-push scrolling: finger near top/bottom scrolls the feed (touch-first)
      const py = this.pointerScreen.y;
      const zone = H * 0.13;
      if (py < zone) cam.scrollY -= (1 - py / zone) * 540 * dt / 1000;
      else if (py > H - zone) cam.scrollY += (1 - (H - py) / zone) * 540 * dt / 1000;
      cam.scrollY = Phaser.Math.Clamp(cam.scrollY, 0, this.page.WORLD_H - H);
    }

    // player world position = screen pointer + camera
    this.playerPos.x = this.pointerScreen.x;
    this.playerPos.y = this.pointerScreen.y + cam.scrollY;
    this.drawCursor(this.playerPos.x, this.playerPos.y);

    if (!this.ceremonyRunning) {
      this.mod.update(dt, this.playerPos);
      this.pickups.update(dt, this.playerPos);
      this.projectiles.update(dt, this.playerPos);
      this.npc.update(dt);
      this.page.updateScrollbar(cam);
      const revTag = this.mod.revenant ? '  REVENANT' : '';
      this.hud.setText(`${(this.survivalMs / 1000).toFixed(1)}s  heat:${this.mod.heat}${revTag}`);
      if (this.mod.revenant) this.hud.setColor('#3fae54');
    }
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#f6f7f9',
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  pixelArt: true,
  scene: GameScene,
});
