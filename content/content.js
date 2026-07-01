// Orchestrator. Everything above this file only defines namespaces; this is the only
// module that runs anything on load.
(() => {
  if (window.top !== window) return; // top frame only in M1 (manifest also injects top-frame only)
  const T = window.NB_TUNABLES;
  if (!T || !window.NB_UI) return;

  // M1 is desktop-only: the cursor IS the player.
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (innerWidth < T.MIN_VIEWPORT_W || innerHeight < T.MIN_VIEWPORT_H) return;

  NB_UI.init();

  // SPA route changes and bfcache restores don't re-run content scripts;
  // make sure the overlay host is still in the tree on both.
  window.addEventListener('pageshow', () => NB_UI.ensureAttached());
  window.addEventListener('popstate', () => NB_UI.ensureAttached());

  chrome.storage.local.get(['nb_personalBestMs'], (d) => {
    if (chrome.runtime.lastError) {
      console.warn('[Neckbeard] storage read failed:', chrome.runtime.lastError.message);
      return;
    }
    NB_STATE.set({ personalBestMs: (d && d.nb_personalBestMs) || 0 });
  });

  NB_SPAWN.checkAndMaybeSpawn();
})();
