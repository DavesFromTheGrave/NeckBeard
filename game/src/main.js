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
    anim('anim-walk', 'walk', 6, 8);
    anim('anim-run', 'run', 6, 14);
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
    // full sledgehammer swing: wind-up 1-3, impact 4-5 (SMASH state)
    this.anims.create({ key: 'anim-sledge',
      frames: [1, 2, 3, 4, 5].map(i => ({ key: `sledge-${i}` })), frameRate: 8, repeat: 0 });
    this.anims.create({ key: 'anim-ztelegraph', frames: [{ key: 'zattack-3' }], frameRate: 1 });
    this.anims.create({ key: 'anim-zlunge', frames: [{ key: 'zattack-4' }, { key: 'zattack-5' }], frameRate: 10, repeat: 0 });

    this.currentSub = 'all';
    this.traveling = false;
    this.showLoading('reddit');
    NB.fetchArena('all')
      .then(data => { this.buildWorld(data); return this.hideLoading(); })
      .catch(e => {
        window.__buildErr = e.message + ' | ' + (e.stack || '');
        console.error('BUILD FAIL:', e.message, e.stack);
        return NB.fetchArena('gaming')
          .then(d => { this.buildWorld(d); return this.hideLoading(); });
      });
  }

  // Reddit-style loading interstitial: canvas-colored cover + shimmering
  // skeleton feed + bouncing snoo. Dave: travel needs to FEEL like a page
  // load, not a blink — hideLoading() enforces a minimum on-screen time.
  showLoading(label) {
    if (this.loadingUI) this.hideLoadingNow();
    const W = this.scale.width, H = this.scale.height, R = NB.REDDIT;
    const c = (h) => Phaser.Display.Color.HexStringToColor(h).color;
    const objs = [];
    objs.push(this.add.rectangle(W / 2, H / 2, W, H, c(R.canvas)).setDepth(60).setScrollFactor(0));
    const fx = Math.max(40, W / 2 - 340), fw = Math.min(680, W - 80);
    let sy = R.headerH + 40;
    const bars = [];
    for (let i = 0; i < 4 && sy < H - 120; i++) {
      const card = this.add.graphics().setDepth(61).setScrollFactor(0);
      card.fillStyle(c(R.skeleton), 1);
      card.fillCircle(fx + 18, sy + 16, 12);
      card.fillRoundedRect(fx + 40, sy + 8, fw * 0.35, 14, 7);
      card.fillRoundedRect(fx, sy + 38, fw * 0.85, 18, 9);
      card.fillRoundedRect(fx, sy + 66, fw, 130, 12);
      objs.push(card);
      bars.push(card);
      sy += 220;
    }
    this.tweens.add({ targets: bars, alpha: 0.45, duration: 600, yoyo: true, repeat: -1 });
    const snooDot = this.add.circle(W / 2, H - 96, 14, 0xff4500).setDepth(62).setScrollFactor(0);
    objs.push(snooDot);
    this.tweens.add({ targets: snooDot, y: H - 116, duration: 380, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });
    objs.push(this.add.text(W / 2, H - 64, `loading ${label}…`, {
      fontFamily: R.font, fontSize: '15px', fontStyle: 'bold', color: R.textWeak,
    }).setOrigin(0.5).setDepth(62).setScrollFactor(0));
    this.loadingUI = { objs, t0: this.time.now };
  }

  hideLoadingNow() {
    if (!this.loadingUI) return;
    this.loadingUI.objs.forEach(o => { try { o.destroy(); } catch {} });
    this.loadingUI = null;
  }

  hideLoading(minMs = 1200) {
    if (!this.loadingUI) return Promise.resolve();
    const left = Math.max(0, minMs - (this.time.now - this.loadingUI.t0));
    return new Promise(res => this.time.delayedCall(left, () => { this.hideLoadingNow(); res(); }));
  }

  buildWorld(data, opts = {}) {
    const W = this.scale.width, H = this.scale.height;
    const firstBoot = !opts.rebuild;

    if (opts.rebuild && this.page?.dispose) this.page.dispose();

    this.page = NB.buildFakePage(this, W, H, data);
    this.cameras.main.setBounds(0, 0, W, this.page.WORLD_H);
    const feed = this.page.feed;
    this.arenaData = data;
    this.currentSub = data.subreddit || 'all';

    // persistent destruction: fresh tracker per arena, then replay every
    // scar this sub already earned — wreckage survives travel AND death
    this.wreck = new NB.Wreckage(this, this.page, this.currentSub);
    this.wreck.applyStored();

    if (firstBoot) {
      this.playerPos = { x: feed.x + feed.w * 0.65, y: H * 0.55 };
      this.pointerScreen = { x: feed.x + feed.w * 0.65, y: H * 0.55 };
      this.cursorGfx = this.add.graphics().setDepth(20);
      this.input.on('pointermove', (p) => {
        this.pointerScreen.x = p.x; this.pointerScreen.y = p.y;
      });
      this.input.on('wheel', (_p, _o, _dx, dy) => {
        this.cameras.main.scrollY = Phaser.Math.Clamp(
          this.cameras.main.scrollY + dy * 0.9, 0, this.page.WORLD_H - H);
      });
      this.mod = new NB.Supermod(this, this.page, feed.x + feed.w * 0.2, H * 0.35);
      this.hud = this.add.text(W - 22, H - 12, '0.0s', {
        fontFamily: 'Courier New', fontSize: '18px', color: NB.REDDIT.hudText,
      }).setOrigin(1, 1).setDepth(30).setScrollFactor(0);
      this.bindDebugKeys();
      this.bindTravelClicks();
      this.bindSubredditSearch();
      this.ready = true;
      window.__gs = this;
    } else {
      this.mod.page = this.page;
      if (this.pickups) this.pickups.page = this.page;
      if (this.projectiles) {
        this.projectiles.comments = data.comments;
        this.projectiles.live.forEach(p => { p.card.destroy(); p.label.destroy(); });
        this.projectiles.live = [];
      }
    }

    if (this.pickups) {
      this.pickups.items.forEach(it => it.objs.forEach(o => o.destroy()));
      this.pickups.items = [];
    } else {
      this.pickups = new NB.Pickups(this, this.page);
    }
    if (!this.projectiles) this.projectiles = new NB.Projectiles(this, data.comments);
    if (!this.npc) this.npc = new NB.Cheerleader(this);
    this.userName = data.user;

    if (opts.toast) this.floatText(W / 2, H * 0.22, opts.toast, '#0079d3');
  }

  bindTravelClicks() {
    this.input.on('pointerdown', (p) => {
      if (!this.ready || this.caught || this.ceremonyRunning || this.traveling) return;
      const cam = this.cameras.main;
      const wx = p.x, wy = p.y + cam.scrollY;
      for (const z of this.page.clickZones || []) {
        const hit = z.screen ? z.rect.contains(p.x, p.y) : z.rect.contains(wx, wy);
        if (hit) {
          this.travelToSub(z.sub, z.label);
          return;
        }
      }
    });
  }

  travelToSub(sub, label, onArrive) {
    if (this.traveling) return;
    const clean = (sub || 'all').replace(/^r\//i, '');
    if (clean === this.currentSub) { if (onArrive) onArrive(); return; }
    this.traveling = true;
    this.showLoading(label || `r/${clean}`);
    NB.fetchArena(clean).then(data => {
      const modSnap = {
        x: this.mod.sprite.x, y: this.mod.sprite.y,
        state: this.mod.state, revenant: this.mod.revenant,
        heat: this.mod.heat,
      };
      // RECENT nav section mirrors real browsing history
      if (clean !== 'all' && clean !== 'popular') {
        NB.RECENT_SUBS = [clean, ...(NB.RECENT_SUBS || []).filter(s => s !== clean)].slice(0, 4);
      }
      this.buildWorld(data, { rebuild: true, toast: `now browsing ${data.name}` });
      this.mod.sprite.setPosition(modSnap.x, modSnap.y);
      this.mod.revenant = modSnap.revenant;
      this.mod.heat = modSnap.heat;
      if (modSnap.revenant) this.mod.sprite.setTint(0xbbffbb);
      this.hideLoading().then(() => {
        this.traveling = false;
        if (onArrive) onArrive();
      });
    }).catch(e => {
      this.hideLoadingNow();
      this.traveling = false;
      this.floatText(this.scale.width / 2, this.scale.height * 0.2, `fetch failed: ${e.message}`, '#d93900');
    });
  }

  // Real <input> overlaid on the header's search box (Phaser DOM element) —
  // needed for a native mobile keyboard since this ships inside Reddit's
  // webview. Typing any subreddit browses there; a "cursed" one also
  // spawns a bonus pickup regardless of whether you were already there.
  bindSubredditSearch() {
    const bar = this.page.searchBar;
    if (!bar) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Find anything';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.style.cssText = `width:${Math.max(80, bar.w)}px;box-sizing:border-box;height:${bar.h}px;` +
      `border:none;outline:none;background:transparent;font-family:${NB.REDDIT.font};` +
      `font-size:14px;color:${NB.REDDIT.text};padding:0;`;
    this.searchInput = input;
    this.searchDom = this.add.dom(bar.x + bar.w / 2, bar.y, input).setDepth(28).setScrollFactor(0);
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        const raw = input.value;
        input.value = '';
        input.blur();
        if (raw.trim()) this.trySubredditSearch(raw);
      }
    });
  }

  trySubredditSearch(raw) {
    const clean = raw.replace(/^r\//i, '').trim();
    if (!clean) return;
    const cursedMsg = NB.CURSED_SUBS[clean.toLowerCase()];
    this.travelToSub(clean, `r/${clean}`, cursedMsg ? () => {
      if (this.caught || !this.pickups) return;
      this.pickups.spawnCursed(this.playerPos.x, this.playerPos.y - 50);
      this.floatText(this.scale.width / 2, this.scale.height * 0.22, cursedMsg, '#2ecc71');
    } : null);
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
    // the slam rattles a few posts loose — permanent damage, not just a shake
    if (this.wreck) {
      const posts = this.page.elements.filter(e => e.kind === 'post');
      Phaser.Utils.Array.Shuffle(posts).slice(0, 3)
        .forEach(el => this.wreck.hit(el, NB.TUNE.WRECK_YANK));
    }
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
      const newBest = NB.savePersonalBest(this.survivalMs);
      const pb = NB.getPersonalBest();
      const runLine = `you lasted ${NB.fmtTime(this.survivalMs)}`;
      const bestLine = newBest ? 'NEW PERSONAL BEST' : `best: ${NB.fmtTime(pb)}`;
      this.add.text(W / 2, H / 2 + 22, runLine, {
        fontFamily: 'Courier New', fontSize: '15px', color: '#888888',
      }).setOrigin(0.5).setDepth(41).setScrollFactor(0);
      this.add.text(W / 2, H / 2 + 48, bestLine, {
        fontFamily: 'Courier New', fontSize: newBest ? '17px' : '14px',
        fontStyle: newBest ? 'bold' : 'normal', color: newBest ? '#ff4500' : '#666666',
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

  hitStop(ms) { this.hitStopT = Math.max(this.hitStopT || 0, ms); }

  update(_, rawDt) {
    if (!this.ready || this.caught) return;
    // dt clamp: throttled/background tabs hand out second-long deltas that
    // teleport him — cap the step so time dilates instead of skipping (fairness)
    const dt = Math.min(rawDt, 50);
    if (this.hitStopT > 0) { this.hitStopT -= dt; return; } // freeze-frame beat
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

// Wait for brand fonts to be confirmed-loaded before the first scene ever
// draws text — otherwise the title card's first paint silently falls back
// to the system font and never re-renders.
NB.fontsReady.then(() => {
  // Hidden/backgrounded tabs (headless test harnesses included) throttle
  // requestAnimationFrame to zero — forcetimer=1 drives the loop off
  // setTimeout instead so automated verification can actually observe play.
  const forceTimer = new URLSearchParams(location.search).has('forcetimer');
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: NB.REDDIT.canvas, // matches the player's own Reddit theme
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    pixelArt: true,
    fps: forceTimer ? { forceSetTimeOut: true } : undefined,
    dom: { createContainer: true },
    scene: [TitleScene, GameScene],
  });
});
