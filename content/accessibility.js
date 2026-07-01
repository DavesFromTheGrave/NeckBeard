// Accessibility posture (see docs/design-critique.md MAJOR-2/MAJOR-3):
// - prefers-reduced-motion removes MOTION (frame-stepping, shake, fades, door wobble, the tell),
//   never fairness — telegraphs still happen as static pose changes, and positional movement
//   stays smooth because that's responsiveness, not decoration.
// - Panic key (Alt+P) is a TOGGLE, not a timer — a fixed duration fails long screen-shares.
//   While hidden (panic or fullscreen), the game clock pauses: no off-screen deaths, ever.
window.NB_ACCESS = (() => {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hiddenBy = { panic: false, fullscreen: false };

  function apply() {
    const hidden = hiddenBy.panic || hiddenBy.fullscreen;
    NB_UI.setHiddenAll(hidden);
    NB_STATE.set({ paused: hidden });
  }

  window.addEventListener('keydown', (e) => {
    if (e.altKey && !e.ctrlKey && !e.shiftKey && e.code === window.NB_TUNABLES.PANIC_KEY_CODE && !e.repeat) {
      e.preventDefault();
      hiddenBy.panic = !hiddenBy.panic;
      apply();
    }
  });

  // Top-layer reality: fullscreen elements render above ANY z-index, so the game hides
  // rather than pretending to exist behind a video (see docs/platform-research.md item 6).
  document.addEventListener('fullscreenchange', () => {
    hiddenBy.fullscreen = !!document.fullscreenElement;
    apply();
  });

  return {
    get reducedMotion() { return mq.matches; },
    get hidden() { return hiddenBy.panic || hiddenBy.fullscreen; },
  };
})();
