// On install or extension reload, re-inject the content scripts into every open http(s)
// tab. Without this, tabs opened before the (re)load have no game in them — which reads
// as "Ctrl+Alt+M does nothing" — and every dev reload would need a manual refresh of
// every tab. Keep FILES in sync with manifest.json's content_scripts array.
const FILES = [
  'config/tunables.js',
  'content/game-state.js',
  'content/sprites.js',
  'content/terrain.js',
  'content/chaos.js',
  'content/items.js',
  'content/physics.js',
  'content/ui-overlay.js',
  'content/fx.js',
  'content/pickups.js',
  'content/spawn-logic.js',
  'content/accessibility.js',
  'debug/debug-harness.js',
  'content/content.js',
];

chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Neckbeard] installed; re-injecting into open tabs');
  let tabs = [];
  try {
    tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
  } catch (e) {
    console.warn('[Neckbeard] tab query failed:', e.message);
    return;
  }
  for (const tab of tabs) {
    try {
      const [probe] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => !!window.NB_TUNABLES,
      });
      if (!probe || !probe.result) {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: FILES });
      }
    } catch (e) {
      // Pages we can't script (store pages, pdf viewers, mid-navigation) — skip quietly.
    }
  }
});
