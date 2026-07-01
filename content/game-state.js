// Single owner of truth. Discrete transitions go through NB_STATE.set() (fires 'nb-state');
// hot per-frame fields (survivalMs, pursuerPos, cursor) are mutated directly by physics so we
// don't fire an event 60 times a second.
//
// chrome.storage.local keys live in M1: nb_personalBestMs, nb_lastSpawnTimestamp, nb_lastSpawnDomain.
// Reserved for M2 — never read or written by M1 code: nb_chaosMeterLevel, nb_collectiblesFound,
// nb_achievementsUnlocked. (See docs/design-critique.md BLOCKER-2.)
window.NB_STATE = {
  state: 'Dormant',      // Dormant | Lurking | Hunting | Caught (Revenant is the `revenant` flag inside Hunting)
  encounterId: null,
  revenant: false,
  survivalMs: 0,
  cursor: null,          // {x,y}; null until the first pointer event — no known target means no catch is possible
  pursuerPos: null,      // {x,y} center of Neckbeard's hitbox
  pursuerWaifuPos: null, // M2: second pursuer. Catch checks hitbox-OR over every non-null pursuer.
  doorPos: null,
  phase: 'Creep',        // Creep | Telegraph | Lunge | Recovery
  paused: false,         // panic key / fullscreen / tab hidden — the survival clock freezes too
  personalBestMs: 0,

  set(updates) {
    Object.assign(this, updates);
    window.dispatchEvent(new CustomEvent('nb-state', { detail: updates }));
  },
};

window.NB_MACHINE = {
  newEncounterId() {
    return (crypto.randomUUID ? crypto.randomUUID() : 'nb-' + Math.random().toString(36).slice(2));
  },

  toLurking(doorPos) {
    if (NB_STATE.state !== 'Dormant') return false;
    NB_STATE.set({ state: 'Lurking', doorPos, encounterId: this.newEncounterId() });
    return true;
  },

  toHunting() {
    if (NB_STATE.state !== 'Lurking') return false;
    const from = NB_STATE.doorPos || { x: innerWidth / 2, y: innerHeight / 2 };
    NB_SPAWN.cancelDespawn();
    NB_UI.hideDoor();
    NB_PHYSICS.startHunt(from);
    return true;
  },

  toCaught() {
    if (NB_STATE.state !== 'Hunting') return false;
    NB_PHYSICS.stop();
    const survivalMs = NB_STATE.survivalMs;
    const isNewBest = survivalMs > NB_STATE.personalBestMs;
    const bestMs = Math.max(survivalMs, NB_STATE.personalBestMs);
    NB_STATE.set({ state: 'Caught', personalBestMs: bestMs });
    if (isNewBest) chrome.storage.local.set({ nb_personalBestMs: Math.round(survivalMs) });
    NB_UI.showCaught({
      survivalMs,
      bestMs,
      isNewBest,
      onDismiss: () => NB_MACHINE.toDormant(),
      onRetry: () => NB_MACHINE.retry(),
    });
    return true;
  },

  // Space on the game-over screen: straight back into the chase from a fresh spot.
  // Cooldown is deliberately skipped here — beating your last run shouldn't cost a 5-minute wait.
  retry() {
    if (NB_STATE.state !== 'Caught') return false;
    NB_UI.hideCaught();
    const from = {
      x: innerWidth * (0.1 + Math.random() * 0.8),
      y: innerHeight * (0.1 + Math.random() * 0.8),
    };
    NB_STATE.set({ encounterId: this.newEncounterId() });
    NB_PHYSICS.startHunt(from);
    return true;
  },

  toDormant() {
    NB_PHYSICS.stop();
    NB_UI.hideCaught();
    NB_UI.hideDoor();
    NB_UI.spriteHide();
    NB_STATE.set({
      state: 'Dormant', encounterId: null, revenant: false,
      phase: 'Creep', doorPos: null, survivalMs: 0,
    });
    return true;
  },
};
