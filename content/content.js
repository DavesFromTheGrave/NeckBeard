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

  chrome.storage.local.get(['nb_personalBestMs'], (d) => {
    NB_STATE.set({ personalBestMs: d.nb_personalBestMs || 0 });
  });

  NB_SPAWN.checkAndMaybeSpawn();
})();
