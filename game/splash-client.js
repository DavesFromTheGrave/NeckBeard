// Wires the splash screen's play button to Devvit's expand-mode API.
// Without this, the splash is just decorative text with nothing that
// actually transitions into the game entrypoint (tap does nothing).
import { requestExpandedMode } from '@devvit/web/client';

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('play-button');
  if (!btn) return;
  btn.addEventListener('click', async (event) => {
    try {
      await requestExpandedMode(event, 'game');
    } catch (e) {
      console.error('requestExpandedMode failed:', e);
    }
  });
});
