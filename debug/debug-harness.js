// Dev-only controls. Alt+Shift combos (keys tunable in config/tunables.js) — Ctrl+Shift is
// browser-reserved (profile menu, inspect element) and Ctrl+Alt collided with Dave's Huion
// tablet driver.
//
//   Alt+Shift+M  force-spawn the door (skips RNG, cooldown, denylist)
//   Alt+Shift+N  force Hunting (from the door if Lurking, from screen center if Dormant)
//   Alt+Shift+C  force a catch (only while Hunting)
//   Alt+Shift+L  dump state + tunables to the console
//
// Everything is also callable from DevTools via window.NB_DEBUG.*
window.NB_DEBUG = (() => {
  function forceSpawn() {
    NB_SPAWN.checkAndMaybeSpawn(true);
  }

  function forceHunt() {
    if (NB_STATE.state === 'Lurking') {
      NB_MACHINE.toHunting();
    } else if (NB_STATE.state === 'Dormant') {
      NB_STATE.set({ state: 'Lurking', doorPos: { x: innerWidth / 2, y: innerHeight / 2 }, encounterId: NB_MACHINE.newEncounterId() });
      NB_MACHINE.toHunting();
    }
  }

  // Deliberately bypasses the telegraph — it exists to test the game-over screen and is
  // the ONE sanctioned exception to the fairness rule. Never wire it to gameplay.
  function forceCatch() {
    NB_MACHINE.toCaught();
  }

  function dump() {
    const s = window.NB_STATE;
    console.log('[Neckbeard] STATE', {
      state: s.state,
      phase: s.phase,
      revenant: s.revenant,
      paused: s.paused,
      survivalMs: Math.round(s.survivalMs),
      personalBestMs: s.personalBestMs,
      cursor: s.cursor && { x: s.cursor.x, y: s.cursor.y },
      pursuerPos: s.pursuerPos && { x: Math.round(s.pursuerPos.x), y: Math.round(s.pursuerPos.y) },
      encounterId: s.encounterId,
      reducedMotion: window.NB_ACCESS.reducedMotion,
    });
    console.log('[Neckbeard] PHYSICS', NB_PHYSICS.debugInfo());
    console.log('[Neckbeard] TUNABLES', window.NB_TUNABLES);
  }

  window.addEventListener('keydown', (e) => {
    if (!(e.altKey && e.shiftKey && !e.ctrlKey)) return;
    const t = window.NB_TUNABLES;
    switch (e.code) {
      case t.DEBUG_KEY_SPAWN: e.preventDefault(); forceSpawn(); break;
      case t.DEBUG_KEY_HUNT: e.preventDefault(); forceHunt(); break;
      case t.DEBUG_KEY_CATCH: e.preventDefault(); forceCatch(); break;
      case t.DEBUG_KEY_LOG: e.preventDefault(); dump(); break;
    }
  });

  return { forceSpawn, forceHunt, forceCatch, dump };
})();
