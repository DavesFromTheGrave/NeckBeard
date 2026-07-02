// The Chaos Meter — the game's single backbone stat (resist adding parallel meters).
// Ambient: it accrues by where you are and how long you camp, persists across pages in
// chrome.storage.local (nb_chaosMeterLevel), and scales his threat: speed up, lunges
// tighter, Revenant earlier. At 100 it burninates for a while, then falls back.
//
// Incentive rule (locked 2026-07-01): the cursed list is a category, never a spotlight —
// no site on it may ever pair with a reward.
window.NB_CHAOS = (() => {
  const T = () => window.NB_TUNABLES;

  let arrivedAt = Date.now(); // when we landed on this domain (Badger camp creep)
  let burnUntil = 0;
  let lastPersist = 0;
  let started = false;

  const category = () => {
    const host = location.hostname + location.pathname;
    if (T().CHAOS_CURSED.some((re) => re.test(host))) return 'cursed';
    if (T().CHAOS_WHOLESOME.some((re) => re.test(host))) return 'wholesome';
    return 'neutral';
  };

  function add(amount) {
    const s = window.NB_STATE;
    if (amount > 0 && s.mods && performance.now() < s.mods.chaosResistUntil) amount /= 2; // Rare Pepe
    s.chaos = Math.max(0, Math.min(100, s.chaos + amount));
    if (s.chaos >= 100 && !burning()) {
      burnUntil = Date.now() + T().CHAOS_BURN_MS;
      console.log('[Neckbeard] BURNINATION — the meter is full');
      if (window.NB_FX) NB_FX.burninate(T().CHAOS_BURN_MS);
    }
  }

  const burning = () => Date.now() < burnUntil;

  // Difficulty multipliers physics reads every frame.
  function mults() {
    const c = window.NB_STATE.chaos;
    return {
      speed: 1 + c / T().CHAOS_SPEED_DIV,
      lungeInterval: Math.max(0.4, 1 - c / T().CHAOS_LUNGE_DIV),
      revenantAt: Math.max(0.4, 1 - c / T().CHAOS_REV_DIV),
    };
  }

  function tick() {
    const t = T();
    const cat = category();
    // The One Ring: strongest invisibility in the game, and the meter feels it every second
    const mods = window.NB_STATE.mods;
    if (mods && performance.now() < mods.invisUntil) add(t.ITEM_RING_CHAOS_PER_S);
    if (cat === 'cursed') add(t.CHAOS_CURSED_PER_S);
    else if (cat === 'wholesome') add(t.CHAOS_WHOLESOME_PER_S);
    // Badger Badger Badger: camping one domain too long
    if (Date.now() - arrivedAt > t.CHAOS_CAMP_AFTER_MS) add(t.CHAOS_CAMP_PER_S);
    // drift home
    const s = window.NB_STATE;
    if (cat === 'neutral' && Math.abs(s.chaos - t.CHAOS_BASELINE) > 0.2) {
      s.chaos += s.chaos > t.CHAOS_BASELINE ? -t.CHAOS_DECAY_PER_S : t.CHAOS_DECAY_PER_S;
    }
    // burnination ends -> fall back
    if (burnUntil && !burning()) { burnUntil = 0; s.chaos = t.CHAOS_BURN_FALLBACK; }
    // ember tint
    if (window.NB_FX) NB_FX.chaosTint(s.chaos >= t.CHAOS_TINT_AT ? (s.chaos - t.CHAOS_TINT_AT) / (100 - t.CHAOS_TINT_AT) : 0);
    // persist occasionally
    if (Date.now() - lastPersist > 5000) {
      lastPersist = Date.now();
      chrome.storage.local.set({ nb_chaosMeterLevel: Math.round(s.chaos) }, () => {
        if (chrome.runtime.lastError) console.warn('[Neckbeard] chaos persist failed:', chrome.runtime.lastError.message);
      });
    }
  }

  function start() {
    if (started) return;
    started = true;
    arrivedAt = Date.now();
    chrome.storage.local.get(['nb_chaosMeterLevel'], (d) => {
      if (chrome.runtime.lastError) return;
      window.NB_STATE.chaos = typeof d.nb_chaosMeterLevel === 'number' ? d.nb_chaosMeterLevel : T().CHAOS_BASELINE;
    });
    setInterval(tick, 1000);
  }

  return { start, add, mults, burning, category };
})();
