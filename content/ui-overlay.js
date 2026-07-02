// All rendering lives behind a closed border: one fixed host <div> with a shadow root.
// Page CSS cannot leak in (plus an explicit font reset — hosts with weird root font rules
// can't shrink the game-over text), page CSP cannot touch canvas drawing, and the overlay is
// pointer-events:none everywhere except the two things that are actually interactive:
// the MOD door, and the game-over card. Background clicks always reach the page —
// a catch must never eat a click meant for a form.
window.NB_UI = (() => {
  const T = () => window.NB_TUNABLES;
  const reduced = () => !!(window.NB_ACCESS && window.NB_ACCESS.reducedMotion);

  let host = null, root = null;
  let spriteWrap = null, spriteCanvas = null, lastRenderKey = '';
  let doorWrap = null, dwellTimer = null;
  let tellEl = null, tellTimer = null;
  let goBackdrop = null, goKeyHandler = null, inputReadyTs = 0;

  function css() {
    const t = NB_SPRITES.TIERS.base, sc = T().SPRITE_SCALE;
    return `
      :host { all: initial; font-size: 16px; font-family: monospace; }
      * { box-sizing: border-box; }
      .nb-sprite {
        position: fixed; left: 0; top: 0; pointer-events: none;
        width: ${t.cellW * sc}px; height: ${t.cellH * sc}px;
        will-change: transform; display: none;
      }
      .nb-sprite canvas { width: 100%; height: 100%; image-rendering: pixelated; }
      .nb-door {
        position: fixed; pointer-events: auto; cursor: pointer;
        width: 80px; height: 112px; display: none;
      }
      .nb-door canvas { width: 100%; height: 100%; image-rendering: pixelated; }
      .nb-door.nb-wobble:hover { animation: nb-wobble 0.4s ease-in-out infinite; }
      @keyframes nb-wobble {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(-2deg); }
        75% { transform: rotate(2deg); }
      }
      .nb-tell {
        position: fixed; inset: 0; pointer-events: none;
        box-shadow: inset 0 0 140px rgba(120, 20, 20, 0.9);
        opacity: 0; animation: nb-flicker linear forwards;
      }
      @keyframes nb-flicker {
        0% { opacity: 0; } 20% { opacity: 0.20; } 35% { opacity: 0.04; }
        55% { opacity: 0.26; } 75% { opacity: 0.08; } 100% { opacity: 0; }
      }
      .nb-go-backdrop {
        position: fixed; inset: 0; pointer-events: none;
        background: rgba(0, 0, 0, 0.72);
        display: flex; align-items: center; justify-content: center;
      }
      .nb-go-backdrop.nb-fade { animation: nb-fadein 0.35s ease-out; }
      @keyframes nb-fadein { from { opacity: 0; } to { opacity: 1; } }
      .nb-go-card {
        pointer-events: auto; text-align: center;
        background: #101014; color: #fff;
        border: 4px solid #fff; box-shadow: 0 0 0 4px #000;
        padding: 28px 40px; max-width: 560px;
      }
      .nb-go-card.nb-shake { animation: nb-shake 0.3s linear; }
      @keyframes nb-shake {
        0%, 100% { transform: translate(0, 0); }
        20% { transform: translate(-7px, 3px); } 40% { transform: translate(6px, -4px); }
        60% { transform: translate(-5px, -3px); } 80% { transform: translate(4px, 4px); }
      }
      .nb-go-title {
        font-family: Impact, 'Arial Black', sans-serif;
        font-size: 42px; letter-spacing: 2px; color: #fff;
        text-shadow: 3px 3px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000;
        margin-bottom: 18px;
      }
      .nb-go-line { font-size: 18px; margin: 6px 0; color: #ccc; }
      .nb-go-best { font-size: 20px; margin: 10px 0; color: #e8d44c; font-weight: bold; }
      .nb-go-btn {
        margin-top: 18px; padding: 10px 22px; font: bold 15px monospace;
        background: #7a2020; color: #fff; border: 3px solid #fff; cursor: pointer;
      }
      .nb-go-btn:hover { background: #9a2828; }
      .nb-go-hint { margin-top: 12px; font-size: 12px; color: #888; }
      @media (prefers-reduced-motion: reduce) {
        * { animation: none !important; }
      }
    `;
  }

  function init() {
    if (host) return;
    host = document.createElement('div');
    host.setAttribute('data-neckbeard-overlay', '');
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
    root = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = css();
    root.appendChild(style);

    spriteWrap = document.createElement('div');
    spriteWrap.className = 'nb-sprite';
    spriteCanvas = document.createElement('canvas');
    const t = NB_SPRITES.TIERS.base;
    spriteCanvas.width = t.cellW;
    spriteCanvas.height = t.cellH;
    spriteWrap.appendChild(spriteCanvas);
    root.appendChild(spriteWrap);

    document.documentElement.appendChild(host);
  }

  // ---- Sprite ----
  function spriteShow() { spriteWrap.style.display = 'block'; lastRenderKey = ''; }
  function spriteHide() { spriteWrap.style.display = 'none'; }

  function spriteMoveTo(x, y) {
    const t = NB_SPRITES.TIERS.base, sc = T().SPRITE_SCALE;
    spriteWrap.style.transform =
      `translate3d(${Math.round(x - (t.cellW * sc) / 2)}px, ${Math.round(y - (t.cellH * sc) / 2)}px, 0)`;
  }

  function spriteRender(animName, elapsedMs, opts) {
    const frameIdx = reduced() ? 0 : NB_SPRITES.getFrame('base', animName, elapsedMs);
    const key = animName + ':' + frameIdx + ':' + (opts && opts.revenant ? 'r' : 'n');
    if (key === lastRenderKey) return; // sprite steps at 8fps; don't redraw 60 times a second
    lastRenderKey = key;
    NB_SPRITES.renderToCanvas(spriteCanvas, 'base', animName, frameIdx, opts);
  }

  // ---- The MOD door ----
  const DOOR_FONT = {
    M: ['X...X', 'XX.XX', 'X.X.X', 'X...X', 'X...X'],
    O: ['.XXX.', 'X...X', 'X...X', 'X...X', '.XXX.'],
    D: ['XXXX.', 'X...X', 'X...X', 'X...X', 'XXXX.'],
  };

  function drawDoor(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x * 2, y * 2, w * 2, h * 2); };
    // frame + slab (basement-brown)
    px(1, 1, 18, 26, '#241a12');
    px(2, 2, 16, 24, '#5a3d28');
    px(3, 3, 14, 22, '#6e4c32');
    // panels
    px(5, 12, 10, 5, '#5a3d28');
    px(5, 19, 10, 5, '#5a3d28');
    // knob
    px(15, 15, 1, 2, '#e8d44c');
    // MOD sign
    px(1, 3, 18, 7, '#d8d8c8');
    let sx = 2;
    for (const ch of ['M', 'O', 'D']) {
      const glyph = DOOR_FONT[ch];
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (glyph[r][c] === 'X') px(sx + c, 4 + r, 1, 1, '#241a12');
        }
      }
      sx += 6;
    }
  }

  function showDoor(pos, onTrigger) {
    if (!doorWrap) {
      doorWrap = document.createElement('div');
      doorWrap.className = 'nb-door';
      const c = document.createElement('canvas');
      c.width = 40; c.height = 56;
      doorWrap.appendChild(c);
      root.appendChild(doorWrap);
    }
    drawDoor(doorWrap.firstChild);
    doorWrap.classList.toggle('nb-wobble', !reduced());
    doorWrap.style.left = Math.round(pos.x - 40) + 'px';
    doorWrap.style.top = Math.round(pos.y - 56) + 'px';
    doorWrap.style.display = 'block';

    const trigger = () => { clearDwell(); onTrigger(); };
    doorWrap.onclick = trigger;
    doorWrap.onmouseenter = () => {
      clearDwell();
      dwellTimer = setTimeout(trigger, T().DOOR_HOVER_DWELL_MS); // dwell, not instant-fire
    };
    doorWrap.onmouseleave = clearDwell;
  }

  function clearDwell() {
    if (dwellTimer) { clearTimeout(dwellTimer); dwellTimer = null; }
  }

  function hideDoor() {
    clearDwell();
    if (doorWrap) { doorWrap.style.display = 'none'; doorWrap.onclick = doorWrap.onmouseenter = doorWrap.onmouseleave = null; }
  }

  // ---- Pre-spawn tell ----
  function showTell(ms) {
    hideTell();
    tellEl = document.createElement('div');
    tellEl.className = 'nb-tell';
    tellEl.style.animationDuration = ms + 'ms';
    root.appendChild(tellEl);
    tellTimer = setTimeout(hideTell, ms + 100);
  }

  function hideTell() {
    if (tellTimer) { clearTimeout(tellTimer); tellTimer = null; }
    if (tellEl) { tellEl.remove(); tellEl = null; }
  }

  // ---- Game over ----
  function fmt(ms) {
    const total = Math.max(0, Math.round(ms));
    const m = Math.floor(total / 60000);
    const s = Math.floor((total % 60000) / 1000);
    const tenths = Math.floor((total % 1000) / 100);
    return m + ':' + String(s).padStart(2, '0') + '.' + tenths;
  }

  function showCaught(info) {
    hideCaught();
    inputReadyTs = performance.now() + T().GAMEOVER_INPUT_DELAY_MS;

    goBackdrop = document.createElement('div');
    goBackdrop.className = 'nb-go-backdrop' + (reduced() ? '' : ' nb-fade');
    const card = document.createElement('div');
    card.className = 'nb-go-card' + (reduced() ? '' : ' nb-shake');

    const title = document.createElement('div');
    title.className = 'nb-go-title';
    title.textContent = "YOU'VE BEEN MODERATED";
    card.appendChild(title);

    const l1 = document.createElement('div');
    l1.className = 'nb-go-line';
    l1.textContent = 'You survived ' + fmt(info.survivalMs);
    card.appendChild(l1);

    if (info.runScore > 0 || info.runCollectibles > 0) {
      const loot = document.createElement('div');
      loot.className = 'nb-go-line';
      loot.textContent = 'Loot: ' + (info.runScore || 0) + ' pts · ' + (info.runCollectibles || 0) + ' finds';
      card.appendChild(loot);
    }
    if (info.scubaHeld) {
      const scuba = document.createElement('div');
      scuba.className = 'nb-go-line';
      scuba.textContent = 'Scuba Steve didn’t make it either.';
      card.appendChild(scuba);
    }

    if (info.isNewBest) {
      const nb = document.createElement('div');
      nb.className = 'nb-go-best';
      nb.textContent = '★ NEW PERSONAL BEST ★';
      card.appendChild(nb);
    } else {
      const l2 = document.createElement('div');
      l2.className = 'nb-go-line';
      l2.textContent = 'Personal best: ' + fmt(info.bestMs);
      card.appendChild(l2);
    }

    const btn = document.createElement('button');
    btn.className = 'nb-go-btn';
    btn.textContent = 'He returns to his basement';
    btn.onclick = () => { if (performance.now() >= inputReadyTs) { hideCaught(); info.onDismiss(); } };
    card.appendChild(btn);

    const hint = document.createElement('div');
    hint.className = 'nb-go-hint';
    hint.textContent = 'SPACE — brave another round';
    card.appendChild(hint);

    goBackdrop.appendChild(card);
    root.appendChild(goBackdrop);

    goKeyHandler = (e) => {
      if (e.code !== 'Space' || performance.now() < inputReadyTs) return;
      e.preventDefault();
      e.stopPropagation();
      hideCaught();
      info.onRetry();
    };
    document.addEventListener('keydown', goKeyHandler, true);
  }

  function hideCaught() {
    if (goKeyHandler) { document.removeEventListener('keydown', goKeyHandler, true); goKeyHandler = null; }
    if (goBackdrop) { goBackdrop.remove(); goBackdrop = null; }
  }

  // Aggressive SPA rewrites can detach the host node. Re-append the SAME node — never
  // re-init: the canvas reference must stay stable for the M2 sprite-sheet swap.
  function ensureAttached() {
    if (host && !host.isConnected) document.documentElement.appendChild(host);
  }

  // ---- Panic / fullscreen ----
  function setHiddenAll(hidden) {
    // inline style on the host itself — a class would need a :host() rule to reach it
    if (host) host.style.visibility = hidden ? 'hidden' : '';
  }

  // FX and pickups render into the same shadow root (style isolation is shared).
  function layer() { return root; }

  return {
    init, ensureAttached, layer,
    spriteShow, spriteHide, spriteMoveTo, spriteRender,
    showDoor, hideDoor, showTell, hideTell,
    showCaught, hideCaught,
    setHiddenAll,
  };
})();
