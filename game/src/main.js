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

// Flood-fill the flat background transparent, starting from the four corners.
// Better than a global threshold for JPG cutouts: it only removes the bg that
// is CONNECTED to the edges, so interior light areas (the "superMOD" sign)
// survive. tol = color distance from the sampled corner color.
NB.keyFloodFill = function (scene, key, tol = 80) {
  if (!scene.textures.exists(key)) return;
  const src = scene.textures.get(key).getSourceImage();
  const w = src.width, h = src.height;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  // Already transparent at the corner (real alpha, not a flat-color bg)?
  // Skip entirely — flood-filling by RGB alone can't tell "already-clear
  // background" from "opaque black linework" when both sample as (0,0,0),
  // and would eat into any outline art connected to the transparent edge.
  if (d[3] < 40) { scene.textures.remove(key); scene.textures.addCanvas(key, c); return; }
  const br = d[0], bg = d[1], bb = d[2]; // top-left = background reference
  const near = (i) => (Math.abs(d[i] - br) + Math.abs(d[i + 1] - bg) + Math.abs(d[i + 2] - bb)) <= tol * 3;
  const seen = new Uint8Array(w * h);
  const stack = [0, w - 1, (h - 1) * w, h * w - 1];
  while (stack.length) {
    const px = stack.pop();
    if (seen[px]) continue;
    const i = px * 4;
    if (!near(i)) continue;
    seen[px] = 1;
    d[i + 3] = 0;
    const x = px % w, y = (px / w) | 0;
    if (x > 0) stack.push(px - 1);
    if (x < w - 1) stack.push(px + 1);
    if (y > 0) stack.push(px - w);
    if (y < h - 1) stack.push(px + w);
  }
  ctx.putImageData(img, 0, 0);
  scene.textures.remove(key);
  scene.textures.addCanvas(key, c);
};

class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  preload() {
    // scene.restart() (see onCaught()) reuses the SAME global TextureManager
    // as first boot — it does not reset it. door-closed/door-open/door-mod/
    // balder all get destructively reprocessed in create() (flood-filled
    // transparent from their opaque source bg). If a restart's load.image()
    // call finds the key already present, Phaser just warns and skips the
    // load, so create() ends up flood-filling an ALREADY-flood-filled canvas
    // instead of a fresh source image. Re-compositing a partially-transparent
    // image onto a new canvas re-blends its semi-transparent edge pixels each
    // pass, so every restart visibly degrades these four textures a little
    // more (fine on a hard refresh, glitchy after "tap to appeal"->restart).
    // Fix: drop any existing copy before preload's load.image() calls below,
    // so every scene start — first boot or restart — flood-fills a pristine
    // decode of the real file, never a previously-processed canvas.
    for (const k of ['door-closed', 'door-open', 'door-mod', 'balder', 'revenant-skull']) {
      if (this.textures.exists(k)) this.textures.remove(k);
    }
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
    // superMOD's entrance: closed door (sign) -> open (void) -> he steps out
    this.load.image('door-closed', 'assets/door/door-closed.jpg');
    this.load.image('door-open', 'assets/door/door-open.jpg');
    this.load.image('door-mod', 'assets/door/door-mod.png');
    // Revenant Systems crest — replaces the snoo face inside the header/avatar
    // badge (same orange bubble, real brand art in place of the alien face).
    this.load.image('revenant-skull', 'assets/brand/revenant-skull.png');
  }

  create() {
    // (elevator art is now a real transparent PNG — no keying; black-keying it
    // would punch a hole in the dark elevator interior.)
    // All three door-reveal frames ship on an opaque white bg — flood it
    // transparent. (door-mod was missing here before — that was the white
    // box behind superMOD on every single ceremony reveal, not random damage.)
    try {
      NB.keyFloodFill(this, 'door-closed');
      NB.keyFloodFill(this, 'door-open');
      NB.keyFloodFill(this, 'door-mod');
    } catch (e) { console.warn('door key:', e); }
    // Balder art ships on an opaque light-gray bg — flood it transparent.
    try { NB.keyFloodFill(this, 'balder'); } catch (e) { console.warn('balder key:', e); }
    // Revenant crest ships on an opaque white bg too — flood it transparent.
    try { NB.keyFloodFill(this, 'revenant-skull'); } catch (e) { console.warn('crest key:', e); }
    const W = this.scale.width, H = this.scale.height;
    this.survivalMs = 0;
    this.caught = false;
    this.ceremonyRunning = false;
    this.entranceActive = false;   // frozen while the door-open reveal plays
    this.balderUsed = false;
    this.balderEligible = false;   // snapshot flip, not a live comparison at catch-time
    // Each run starts on a PRISTINE page. Wreckage + farmed-posts persist
    // WITHIN a run (across sub-travel) but reset on a new round — otherwise the
    // door opens onto a page still shattered/looted from your last life.
    if (NB.WRECK_STORE) NB.WRECK_STORE.clear();
    if (NB.FARM_STORE) NB.FARM_STORE.clear();
    this.karma = 0;   // THE score: karma farmed off posts before he shreds them

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
      })
      .then(() => this.beginEntrance());
  }

  // The door on the freshly-loaded page: click it to let superMOD out and
  // start the round. (To make the door the title-screen start instead, move
  // this call into TitleScene — the sequence itself is unchanged.)
  beginEntrance() {
    if (!this.entranceActive || this.doorUI) return;
    const W = this.scale.width, H = this.scale.height;
    const doorH = Math.min(H * 0.6, 500);
    const img = this.add.image(W / 2, H * 0.5, 'door-closed').setDepth(18).setScrollFactor(0);
    img.setScale(doorH / img.height);
    const baseScale = img.scaleX;
    const hint = this.add.text(W / 2, H * 0.5 + doorH / 2 + 26, 'CLICK THE DOOR', {
      fontFamily: NB.FONT_ARCADE || 'Courier New', fontSize: '18px', color: '#e8c944',
    }).setOrigin(0.5).setDepth(19).setScrollFactor(0).setStroke('#000000', 5);
    this.tweens.add({ targets: img, scaleX: baseScale * 1.03, scaleY: baseScale * 1.03,
      duration: 780, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.time.addEvent({ delay: 540, loop: true, callback: () => hint.setVisible(!hint.visible) });
    img.setInteractive();
    img.once('pointerdown', () => this.runEntrance(img, hint, baseScale));
    this.doorUI = { img, hint };
  }

  runEntrance(img, hint, baseScale) {
    if (this._entering) return;
    this._entering = true;
    this.tweens.killTweensOf(img);
    hint.destroy();
    const flash = () => {
      const f = this.add.rectangle(this.scale.width / 2, this.scale.height / 2,
        this.scale.width, this.scale.height, 0xffffff, 0.45).setDepth(17).setScrollFactor(0);
      this.tweens.add({ targets: f, alpha: 0, duration: 170, onComplete: () => f.destroy() });
    };
    // beat 1 — the bolt throws, the door swings to the void
    this.cameras.main.shake(150, 0.006); flash();
    img.setScale(baseScale).setTexture('door-open');
    NB.sfx.stumble();
    this.time.delayedCall(650, () => {
      // beat 2 — he's just THERE, filling the frame
      this.cameras.main.shake(240, 0.011); flash();
      img.setTexture('door-mod');
      NB.sfx.caught();
      this.tweens.add({ targets: img, scaleX: baseScale * 1.06, scaleY: baseScale * 1.06, duration: 260 });
      this.time.delayedCall(1050, () => {
        // beat 3 — hand off to the live mod; the hunt begins
        this.tweens.add({ targets: img, alpha: 0, duration: 320, onComplete: () => img.destroy() });
        const cam = this.cameras.main;
        this.mod.sprite.setPosition(this.scale.width / 2, this.scale.height * 0.5 + cam.scrollY).setVisible(true);
        this.mod.telegraphRing.setVisible(false);
        this.mod.setState('LURK');
        this.entranceActive = false;
        this._entering = false;
        this.doorUI = null;
      });
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
    // scar this sub already earned this run (survives sub-travel)
    this.wreck = new NB.Wreckage(this, this.page, this.currentSub);
    this.wreck.applyStored();
    // re-mark posts already looted this run so travel-back shows them claimed
    for (const el of this.page.elements) {
      if (el.kind === 'post' && NB.FARM_STORE.has(`${this.currentSub}|${el.key}`)) this.markFarmed(el);
    }

    if (firstBoot) {
      this.playerPos = { x: feed.x + feed.w * 0.65, y: H * 0.55 };
      this.pointerScreen = { x: feed.x + feed.w * 0.65, y: H * 0.55 };
      // Cursor must ride ABOVE all fixed chrome (header/nav/scrollbar are
      // depth 24-30) or it vanishes under every clickable surface. Below the
      // death overlay (40) and loading interstitial (60), which cover it.
      this.cursorGfx = this.add.graphics().setDepth(35);
      this.input.on('pointermove', (p) => {
        this.pointerScreen.x = p.x; this.pointerScreen.y = p.y;
      });
      this.input.on('wheel', (_p, _o, _dx, dy) => {
        this.cameras.main.scrollY = Phaser.Math.Clamp(
          this.cameras.main.scrollY + dy * 0.9, 0, this.page.WORLD_H - H);
      });
      this.mod = new NB.Supermod(this, this.page, feed.x + feed.w * 0.2, H * 0.35);
      // he waits behind the door — hidden + frozen until you open it
      this.mod.sprite.setVisible(false);
      this.mod.telegraphRing.setVisible(false);
      this.entranceActive = true;
      this.hud = this.add.text(W - 22, H - 14, '★ 0', {
        fontFamily: 'Courier New', fontSize: '22px', fontStyle: 'bold', color: '#ff4500',
      }).setOrigin(1, 1).setDepth(30).setScrollFactor(0);
      // Danger/heat meter — segmented bar (was a bare number, easy to not register).
      this.heatBarG = this.add.graphics().setDepth(30).setScrollFactor(0);
      // Balder promotion-review progress — the only visible sign a second
      // chance is coming; fixes "banned right at a minute, no idea I was close."
      this.balderBarBg = this.add.rectangle(W - 22, H - 64, 120, 6, 0x000000, 0.35)
        .setOrigin(1, 0.5).setDepth(30).setScrollFactor(0);
      this.balderBarFill = this.add.rectangle(W - 142, H - 64, 0, 6, 0xffb648, 0.95)
        .setOrigin(0, 0.5).setDepth(30).setScrollFactor(0);
      // Shield status — separate from the ring on the cursor, which is easy
      // to lose track of mid-chase and gives no "you just used it" moment.
      this.shieldPill = this.add.text(W - 22, H - 78, '🛡 SHIELD READY', {
        fontFamily: 'Courier New', fontSize: '13px', fontStyle: 'bold', color: '#7ab8f5',
      }).setOrigin(1, 1).setDepth(30).setScrollFactor(0).setVisible(false);
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
      if (!this.ready || this.caught || this.ceremonyRunning || this.traveling || this.entranceActive) return;
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
      // The chase RE-ACQUIRES on the new page: drop any frozen lunge/telegraph
      // so he can't land a mid-air attack the instant the load lifts, AND
      // shove him back to a minimum gap — switching pages is meant to buy a
      // head start, not dump you back onto the exact spot he had you pinned.
      // He then has to close the distance and telegraph (500ms) before a catch.
      const MIN_GAP = 440;
      const mx = this.mod.sprite.x - this.playerPos.x;
      const my = this.mod.sprite.y - this.playerPos.y;
      const gap = Math.hypot(mx, my);
      if (gap < MIN_GAP) {
        const a = gap > 0.5 ? Math.atan2(my, mx) : Math.random() * Math.PI * 2;
        this.mod.sprite.x = Phaser.Math.Clamp(
          this.playerPos.x + Math.cos(a) * MIN_GAP, 30, this.scale.width - 30);
        this.mod.sprite.y = Phaser.Math.Clamp(
          this.playerPos.y + Math.sin(a) * MIN_GAP, this.page.headerH + 40, this.page.WORLD_H - 30);
      }
      this.mod.stunT = 0;
      this.mod.telegraphRing.setVisible(false);
      this.mod.setState('HUNT');
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
    if (!this.balderUsed && this.balderEligible) {
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
      const newBest = NB.savePersonalBest(this.karma);
      const pb = NB.getPersonalBest();
      const runLine = `${NB.fmtKarma(this.karma)} karma farmed`;
      const bestLine = newBest ? 'NEW HIGH SCORE' : `best: ${NB.fmtKarma(pb)}`;
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

  // KARMA HEIST: stealing a fresh, not-yet-shredded post is an ACTIVE aim
  // challenge — FARM_TARGETS reticles pop up one at a time inside the card;
  // track your cursor onto each within FARM_TARGET_MS. Miss one (it expires,
  // or you leave the post) and the WHOLE sequence resets to target #1 — no
  // partial credit. That's the difficulty: it demands attention, not just
  // patience. Stealing a damaged post OR one he's right on top of = CLUTCH 2x
  // (rewards farming under his hammer, where missing a target is genuinely
  // dangerous). A post he destroys (stage 3) is karma gone forever — the race.
  farmCheck(dt) {
    const p = this.playerPos;
    for (const el of this.page.elements) {
      if (el.kind !== 'post' || !el.karma) continue;
      const fkey = `${this.currentSub}|${el.key}`;
      if (NB.FARM_STORE.has(fkey) || (this.wreck && this.wreck.stage(el) >= 3)) {
        this.clearFarmSeq(el);
        continue;
      }
      const inside = el.rect.contains(p.x, p.y);
      if (!inside) {
        if (el._farmSeq) this.resetFarmSeq(el, false);   // left the post — no float text, not a "miss"
        continue;
      }
      if (!el._farmSeq) this.startFarmSeq(el);

      const seq = el._farmSeq;
      seq.t -= dt;
      const tx = el.rect.x + seq.pts[seq.i].x, ty = el.rect.y + seq.pts[seq.i].y;
      if (Math.hypot(p.x - tx, p.y - ty) < NB.TUNE.FARM_TARGET_RADIUS) {
        seq.i++;
        NB.sfx.pickup();
        if (seq.i >= seq.pts.length) { this.completeFarm(el, fkey, p); continue; }
        seq.t = NB.TUNE.FARM_TARGET_MS;   // next target, fresh window
      } else if (seq.t <= 0) {
        this.resetFarmSeq(el, true);   // timed out — a real miss, flagged
        continue;
      }
      this.drawFarmSeq(el);
    }
  }

  // Pick FARM_TARGETS random points inside the card (inset so reticles never
  // sit under the header/edges) and start the sequence at target #1.
  startFarmSeq(el) {
    const r = el.rect, pad = 26;
    const pts = [];
    for (let i = 0; i < NB.TUNE.FARM_TARGETS; i++) {
      pts.push({
        x: Phaser.Math.Between(pad, Math.max(pad + 1, r.width - pad)),
        y: Phaser.Math.Between(pad, Math.max(pad + 1, r.height - pad)),
      });
    }
    el._farmSeq = { pts, i: 0, t: NB.TUNE.FARM_TARGET_MS };
  }

  resetFarmSeq(el, missed) {
    if (missed && el._farmSeq) {
      const r = el.rect, pt = el._farmSeq.pts[el._farmSeq.i];
      this.floatText(r.x + pt.x, r.y + pt.y - 10, 'MISSED', '#ff4d4d');
      NB.sfx.commentHit();
    }
    el._farmSeq = null;
    if (el._farmG) el._farmG.clear();
  }

  clearFarmSeq(el) {
    el._farmSeq = null;
    if (el._farmG) el._farmG.clear();
  }

  completeFarm(el, fkey, p) {
    NB.FARM_STORE.add(fkey);
    this.markFarmed(el);
    this.clearFarmSeq(el);
    const damaged = this.wreck && this.wreck.stage(el) >= 1;
    const modClose = Math.hypot(this.mod.sprite.x - p.x, this.mod.sprite.y - p.y) < 175;
    const clutch = damaged || modClose;
    const gained = Math.round(el.karma * (clutch ? 2 : 1));
    this.karma += gained;
    NB.sfx.pickup();
    this.floatText(p.x, el.rect.y + 16, `+${NB.fmtKarma(gained)}${clutch ? '  CLUTCH!' : ''}`,
      clutch ? '#ff4500' : '#46d160');
  }

  // Current target reticle (pulses, shrinks visually as its window runs out)
  // + progress pips for completed targets in the corner.
  drawFarmSeq(el) {
    if (!el._farmG) {
      el._farmG = this.add.graphics().setDepth(9.5);
      el.objs.push(el._farmG);
    }
    const g = el._farmG, seq = el._farmSeq, r = el.rect;
    g.clear();
    if (!seq) return;

    // progress pips, top-right corner
    const n = seq.pts.length, pip = 6, gap = 5;
    let px = r.x + r.width - 16 - (n - 1) * (pip * 2 + gap);
    const py = r.y + 16;
    for (let k = 0; k < n; k++) {
      g.fillStyle(k < seq.i ? 0x46d160 : 0x000000, k < seq.i ? 0.95 : 0.3);
      g.fillCircle(px, py, pip);
      px += pip * 2 + gap;
    }

    // target reticle — shrinks as its window closes, so a miss is telegraphed
    const t = el.rect.x + seq.pts[seq.i].x, ty = r.y + seq.pts[seq.i].y;
    const frac = Phaser.Math.Clamp(seq.t / NB.TUNE.FARM_TARGET_MS, 0, 1);
    g.lineStyle(3, 0x000000, 0.3);
    g.strokeCircle(t, ty, NB.TUNE.FARM_TARGET_RADIUS + 3);
    g.lineStyle(3, 0xffb648, 0.95);
    g.strokeCircle(t, ty, NB.TUNE.FARM_TARGET_RADIUS * frac);
    g.fillStyle(0xffb648, 0.5);
    g.fillCircle(t, ty, 3);
  }

  // Danger meter, Balder progress, shield status — makes the game's existing
  // discrete/binary state (heat level, one-time promotion review, single-charge
  // shield) legible at a glance instead of a bare number or an easy-to-miss
  // ring on the cursor. No new mechanics, just visibility for what already exists.
  updateHudExtras() {
    const W = this.scale.width, H = this.scale.height;

    // heat: HEAT_MAX segments, green (calm) -> red (frenzied)
    const g = this.heatBarG;
    g.clear();
    const n = NB.TUNE.HEAT_MAX, segW = 14, segH = 8, gap = 3;
    const totalW = n * segW + (n - 1) * gap;
    let x = W - 22 - totalW;
    const y = H - 46;
    for (let i = 0; i < n; i++) {
      const filled = i < this.mod.heat;
      const t = n > 1 ? i / (n - 1) : 0;
      const r = Math.round(70 + (230 - 70) * t), gr = Math.round(200 + (60 - 200) * t), b = Math.round(120 + (50 - 120) * t);
      g.fillStyle(filled ? (r << 16 | gr << 8 | b) : 0x333333, filled ? 0.95 : 0.35);
      g.fillRoundedRect(x, y, segW, segH, 2);
      x += segW + gap;
    }

    // Balder promotion review: hides once spent (one-time-per-run resource,
    // shouldn't imply it recharges); pulses in the last 10% before ready.
    if (this.balderUsed) {
      this.balderBarBg.setVisible(false);
      this.balderBarFill.setVisible(false);
    } else {
      this.balderBarBg.setVisible(true).setAlpha(1);
      this.balderBarFill.setVisible(true);
      const frac = Phaser.Math.Clamp(this.survivalMs / NB.TUNE.BALDER_SURVIVAL_MS, 0, 1);
      this.balderBarFill.width = 120 * frac;
      this.balderBarFill.setFillStyle(frac >= 1 ? 0x46d160 : 0xffb648);
      this.balderBarFill.setAlpha(frac > 0.9 ? 0.7 + 0.3 * Math.sin(this.time.now / 120) : 0.95);
    }

    // Shield: only visible today as a small ring on the cursor — easy to lose
    // track of mid-chase. This gives a persistent, fixed-position "you have a
    // save" readout distinct from that ring.
    this.shieldPill.setVisible(!!(this.pickups && this.pickups.shield));
  }

  markFarmed(el) {
    if (el._farmed) return;
    el._farmed = true;
    const r = el.rect;
    const c = this.add.circle(r.x + r.width - 20, r.y + 18, 11, 0xff4500, 0.92).setDepth(-0.5);
    const t = this.add.text(r.x + r.width - 20, r.y + 18, '↑', {
      fontFamily: 'Arial', fontSize: '13px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(-0.4);
    el.objs.push(c, t);
  }

  update(_, rawDt) {
    if (!this.ready || this.caught) return;
    // dt clamp: throttled/background tabs hand out second-long deltas that
    // teleport him — cap the step so time dilates instead of skipping (fairness)
    const dt = Math.min(rawDt, 50);
    if (this.hitStopT > 0) { this.hitStopT -= dt; return; } // freeze-frame beat
    const H = this.scale.height;
    const cam = this.cameras.main;

    // SIM FREEZE: while a loading interstitial is up (boot OR sub-travel) the
    // mod must not hunt or catch — the page underneath is mid-rebuild and it
    // isn't fair to die to something you can't see. Ceremony freezes too.
    const frozen = this.ceremonyRunning || !!this.loadingUI || this.entranceActive;

    if (!frozen) {
      this.survivalMs += dt;
      // Snapshot eligibility the instant the threshold crosses, rather than a
      // live comparison at the moment of the catch — removes any "so close"
      // edge case between when time actually passed and when a catch resolves.
      if (!this.balderEligible && !this.balderUsed && this.survivalMs > NB.TUNE.BALDER_SURVIVAL_MS) {
        this.balderEligible = true;
      }
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

    if (!frozen) {
      this.farmCheck(dt);              // hold-to-steal karma off posts
      this.mod.update(dt, this.playerPos);
      this.pickups.update(dt, this.playerPos);
      this.projectiles.update(dt, this.playerPos);
      this.npc.update(dt);
      this.page.updateScrollbar(cam);
      const revTag = this.mod.revenant ? '  REV' : '';
      this.hud.setText(`★ ${NB.fmtKarma(this.karma)}${revTag}`);
      if (this.mod.revenant) this.hud.setColor('#3fae54');
      this.updateHudExtras();
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
