// Dev-only controls. Ctrl+Alt combos, NOT Ctrl+Shift — Chromium reserves Ctrl+Shift+M
// (profile menu) and Ctrl+Shift+C (inspect element) at the browser level, so those never
// reach the page.
//
//   Ctrl+Alt+M  force-spawn the door (skips RNG, cooldown, denylist)
//   Ctrl+Alt+H  force Hunting (from the door if Lurking, from screen center if Dormant)
//   Ctrl+Alt+C  force a catch (only while Hunting)
//   Ctrl+Alt+L  dump state + tunables to the console
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
    if (!(e.ctrlKey && e.altKey && !e.shiftKey)) return;
    switch (e.code) {
      case 'KeyM': e.preventDefault(); forceSpawn(); break;
      case 'KeyH': e.preventDefault(); forceHunt(); break;
      case 'KeyC': e.preventDefault(); forceCatch(); break;
      case 'KeyL': e.preventDefault(); dump(); break;
    }
  });

  return { forceSpawn, forceHunt, forceCatch, dump };
})();
