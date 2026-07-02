// The pickup engine: spawns items on the page, collects them by cursor touch, holds
// powerups in a 3-slot inventory (keys 1/2/3 to use), applies collectibles instantly.
// Inventory persists across pages (the chase does too, after all). Everything spawned is
// our own overlay element — the live page DOM is never touched.
window.NB_PICKUPS = (() => {
  const T = () => window.NB_TUNABLES;
  const S = () => window.NB_STATE;

  const WEIGHTS = { common: 45, uncommon: 28, rare: 18, legendary: 8, ultra: 1 };

  let active = [];        // {id, el, x, y, timer}
  let hud = null, hudSlots = [], hudScore = null, hudChaos = null;
  let clippySpawnedThisPage = false;
  let typedChars = 0;
  let flips = [];         // shake-to-fling-the-hat tracking
  let lastMoveSign = 0;
  let started = false;

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function persistInventory() {
    chrome.storage.local.set({ nb_inventory: S().inventory }, () => {
      if (chrome.runtime.lastError) console.warn('[Neckbeard] inventory persist failed:', chrome.runtime.lastError.message);
    });
  }

  function recordFound(id) {
    chrome.storage.local.get(['nb_collectiblesFound'], (d) => {
      if (chrome.runtime.lastError) return;
      const found = d.nb_collectiblesFound || {};
      found[id] = (found[id] || 0) + 1;
      chrome.storage.local.set({ nb_collectiblesFound: found });
    });
  }

  // ---- Spawning ----
  function eligible(kinds) {
    const host = location.hostname;
    return Object.entries(NB_ITEMS.DEFS).filter(([id, def]) =>
      kinds.includes(def.kind) &&
      !def.behavior && // behavior-gated (Clippy) never spawns from random rolls
      (!def.gate || def.gate.test(host))
    );
  }

  function weightedPick(pool) {
    const total = pool.reduce((sum, [, def]) => sum + (WEIGHTS[def.tier] || 1), 0);
    let roll = Math.random() * total;
    for (const entry of pool) {
      roll -= WEIGHTS[entry[1].tier] || 1;
      if (roll <= 0) return entry;
    }
    return pool[pool.length - 1];
  }

  function spawnPos() {
    const w = innerWidth || 1200, h = innerHeight || 800;
    for (let tries = 0; tries < 8; tries++) {
      const p = { x: 60 + Math.random() * (w - 120), y: 80 + Math.random() * (h - 160) };
      if (!S().cursor || dist(p, S().cursor) > 120) return p; // never spawn in your hand
    }
    return { x: w / 2, y: h / 2 };
  }

  function spawn(id, pos) {
    const def = NB_ITEMS.DEFS[id];
    if (!def) return;
    pos = pos || spawnPos();
    const c = document.createElement('canvas');
    c.width = 12; c.height = 12;
    NB_ITEMS.drawIcon(c, id);
    c.style.cssText = 'position:fixed;pointer-events:none;width:36px;height:36px;image-rendering:pixelated;z-index:15;' +
      'left:' + Math.round(pos.x - 18) + 'px;top:' + Math.round(pos.y - 18) + 'px;' +
      'filter:drop-shadow(0 0 4px ' + (def.tier === 'legendary' || def.tier === 'ultra' ? '#e8c944' : '#ffffff88') + ');';
    NB_UI.layer().appendChild(c);
    const entry = { id, el: c, x: pos.x, y: pos.y, timer: setTimeout(() => remove(entry), T().PICKUP_LIFETIME_MS) };
    active.push(entry);
  }

  function remove(entry) {
    clearTimeout(entry.timer);
    entry.el.remove();
    active = active.filter((e) => e !== entry);
  }

  function rollPowerup() {
    if (S().state !== 'Hunting') return;
    if (Math.random() > T().POWERUP_SPAWN_CHANCE) return;
    const pool = eligible(['powerup', 'trap']);
    if (pool.length) spawn(weightedPick(pool)[0]);
  }

  function rollCollectible() {
    if (Math.random() > T().COLLECTIBLE_SPAWN_CHANCE) return;
    const pool = eligible(['collectible']);
    if (pool.length) spawn(weightedPick(pool)[0]);
  }

  // ---- Collecting (touch with the cursor) ----
  function collect(entry) {
    const def = NB_ITEMS.DEFS[entry.id];
    remove(entry);
    if (def.kind === 'trap') {
      if (def.onTouch) def.onTouch();
      return;
    }
    if (def.kind === 'collectible') {
      const s = S();
      if (def.collect) def.collect();
      s.runScore += def.score || 0;
      s.runCollectibles++;
      recordFound(entry.id);
      NB_FX.scorePop(entry.x, entry.y, '+' + (def.score || 0));
      renderHud();
      return;
    }
    // powerup -> inventory
    const s = S();
    if (s.inventory.length >= T().INVENTORY_SLOTS) {
      NB_FX.scorePop(entry.x, entry.y, 'FULL');
      spawn(entry.id, { x: entry.x, y: entry.y }); // put it back, no free deletes
      return;
    }
    s.inventory.push(entry.id);
    persistInventory();
    renderHud();
  }

  function useSlot(idx) {
    const s = S();
    const id = s.inventory[idx];
    if (!id) return;
    const def = NB_ITEMS.DEFS[id];
    s.inventory.splice(idx, 1);
    persistInventory();
    renderHud();
    if (def && def.use) def.use();
    console.log('[Neckbeard] USED', id);
  }

  // ---- HUD ----
  function initHud() {
    hud = document.createElement('div');
    hud.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:25;pointer-events:none;display:flex;flex-direction:column;gap:4px;font-family:monospace;';
    const slotRow = document.createElement('div');
    slotRow.style.cssText = 'display:flex;gap:4px;';
    for (let i = 0; i < T().INVENTORY_SLOTS; i++) {
      const slot = document.createElement('div');
      slot.style.cssText = 'width:44px;height:44px;background:rgba(10,10,16,.8);border:2px solid #555;position:relative;';
      const key = document.createElement('div');
      key.textContent = String(i + 1);
      key.style.cssText = 'position:absolute;top:0;left:2px;font-size:10px;color:#888;';
      const c = document.createElement('canvas');
      c.width = 12; c.height = 12;
      c.style.cssText = 'width:36px;height:36px;margin:3px;image-rendering:pixelated;display:none;';
      slot.append(key, c);
      slotRow.appendChild(slot);
      hudSlots.push(c);
    }
    const chaosWrap = document.createElement('div');
    chaosWrap.style.cssText = 'width:140px;height:8px;background:rgba(10,10,16,.8);border:2px solid #555;';
    hudChaos = document.createElement('div');
    hudChaos.style.cssText = 'height:100%;width:10%;background:linear-gradient(90deg,#3fa04a,#e8c944,#c23434);';
    chaosWrap.appendChild(hudChaos);
    hudScore = document.createElement('div');
    hudScore.style.cssText = 'font-size:11px;color:#ccc;text-shadow:1px 1px 0 #000;';
    hud.append(slotRow, chaosWrap, hudScore);
    NB_UI.layer().appendChild(hud);
    setInterval(() => {
      if (hudChaos) hudChaos.style.width = Math.round(S().chaos) + '%';
      if (hudScore) hudScore.textContent = S().runScore > 0 || S().runCollectibles > 0
        ? 'score ' + S().runScore + ' · finds ' + S().runCollectibles : '';
    }, 400);
  }

  function renderHud() {
    const inv = S().inventory;
    hudSlots.forEach((c, i) => {
      if (inv[i]) { NB_ITEMS.drawIcon(c, inv[i]); c.style.display = 'block'; }
      else c.style.display = 'none';
    });
  }

  // ---- Input ----
  const inEditable = (t) => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);

  function onKey(e) {
    if (inEditable(e.target)) {
      // Clippy trigger: it looks like you're writing something
      typedChars++;
      if (!clippySpawnedThisPage && typedChars > 12 && Math.random() < 0.25) {
        clippySpawnedThisPage = true;
        const c = S().cursor || { x: innerWidth / 2, y: innerHeight / 2 };
        spawn('clippy', { x: Math.min((innerWidth || 1200) - 80, c.x + 120), y: Math.max(80, c.y - 60) });
      }
      return;
    }
    if (e.code === 'Digit1') useSlot(0);
    else if (e.code === 'Digit2') useSlot(1);
    else if (e.code === 'Digit3') useSlot(2);
  }

  function onMove(e) {
    const s = S();
    // touch-collect
    if (s.cursor) {
      for (const entry of [...active]) {
        if (dist({ x: e.clientX, y: e.clientY }, entry) <= T().PICKUP_TOUCH_RADIUS_PX) collect(entry);
      }
    }
    // shake-to-fling the Scumbag Hat
    if (s.mods && s.mods.hatOn) {
      const sign = Math.sign(e.movementX);
      if (sign !== 0 && sign !== lastMoveSign) {
        if (lastMoveSign !== 0) {
          const now = performance.now();
          flips.push(now);
          flips = flips.filter((f) => now - f < T().SHAKE_WINDOW_MS);
          if (flips.length >= T().SHAKE_FLINGS_HAT_FLIPS) {
            s.mods.hatOn = false;
            flips = [];
            NB_FX.hat(false);
            NB_FX.bubble('cursor', 'and STAY off.');
          }
        }
        lastMoveSign = sign;
      }
    }
  }

  function start() {
    if (started) return;
    started = true;
    chrome.storage.local.get(['nb_inventory'], (d) => {
      if (chrome.runtime.lastError) return;
      if (Array.isArray(d.nb_inventory)) S().inventory = d.nb_inventory.slice(0, T().INVENTORY_SLOTS);
      renderHud();
    });
    initHud();
    setInterval(rollPowerup, T().POWERUP_SPAWN_EVERY_MS);
    setInterval(rollCollectible, T().COLLECTIBLE_SPAWN_EVERY_MS);
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointermove', onMove, { passive: true });
  }

  // debug/test hooks
  return { start, spawn, collect: (id) => { const e = active.find((a) => a.id === id); if (e) collect(e); }, useSlot, active: () => active.map((a) => a.id) };
})();
