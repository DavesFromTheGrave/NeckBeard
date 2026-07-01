// The chase. Position interpolates smoothly at rAF rate (~60fps); the sprite frame-steps at
// 8fps over in ui-overlay/sprites. Timing uses the rAF timestamp (performance.now clock).
//
// THE FAIRNESS RULE IS STRUCTURAL HERE: collision is only evaluated while phase === 'Lunge',
// which can only be entered through a full 'Telegraph' phase. There is no code path to a catch
// without a telegraph. Do not add one.
window.NB_PHYSICS = (() => {
  const T = () => window.NB_TUNABLES;
  const S = () => window.NB_STATE;

  let rafId = null;
  let lastTs = null;
  let speedNow = 0;        // current speed px/s (accel-ramped toward the phase target)
  let lungeInMs = 0;       // countdown until the next lunge attempt
  let phaseLeftMs = 0;     // time left in Telegraph/Lunge/Recovery
  let lockedDir = null;    // lunge direction, locked at telegraph START — that's what makes dodging real
  let animName = 'walk';
  let animStartTs = 0;
  let lungeCount = 0;   // diagnostics: how many telegraphs have fired this hunt

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function dirTo(from, to) {
    const dx = to.x - from.x, dy = to.y - from.y;
    const d = Math.hypot(dx, dy);
    return d < 0.001 ? { x: 0, y: 0 } : { x: dx / d, y: dy / d };
  }

  const nextLungeDelay = () =>
    T().LUNGE_INTERVAL_MIN_MS + Math.random() * (T().LUNGE_INTERVAL_MAX_MS - T().LUNGE_INTERVAL_MIN_MS);

  function setAnim(name, ts) {
    if (animName !== name) { animName = name; animStartTs = ts; }
  }

  function startHunt(fromPos, opts) {
    stop();
    S().set({
      state: 'Hunting', phase: 'Creep',
      revenant: !!(opts && opts.revenant),
      survivalMs: (opts && opts.resumeSurvivalMs) || 0,
      pursuerPos: { x: fromPos.x, y: fromPos.y },
    });
    speedNow = 0;
    lungeInMs = nextLungeDelay();
    lastTs = null;
    animName = 'walk';
    animStartTs = 0;
    phaseLeftMs = 0;
    lockedDir = null;
    NB_UI.spriteShow();
    NB_MACHINE.saveHunt(true);
    console.log('[Neckbeard] HUNT BEGINS', { encounterId: S().encounterId, from: fromPos, resumed: !!(opts && opts.resumeSurvivalMs) });
    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    lastTs = null;
  }

  function tick(ts) {
    if (S().state !== 'Hunting') { rafId = null; return; }
    rafId = requestAnimationFrame(tick);
    update(ts);
  }

  let simulating = false;

  function update(ts) {
    const s = S(), t = T();
    // Extension reloaded while this page was open: this context is orphaned — kill the
    // ghost chase instead of running a game that can no longer save anything.
    if (!chrome.runtime || !chrome.runtime.id) { stop(); return; }
    if (s.state !== 'Hunting') return;

    if (animStartTs === 0) animStartTs = ts;
    // Cap: tab-out gaps neither count as survival nor teleport him. Floor at 0: a timestamp
    // that goes backwards (clock mixing, platform weirdness) must never run the clock in reverse.
    const dt = lastTs === null ? 0 : Math.max(0, Math.min(ts - lastTs, 100));
    lastTs = ts;
    if (dt === 0) return;
    if (!simulating && (s.paused || document.hidden)) return; // clock frozen while hidden — no off-screen deaths

    s.survivalMs += dt;
    NB_MACHINE.saveHunt(); // throttled checkpoint so the hunt survives navigation

    // Insurance: if his position ever goes non-finite (bad math anywhere upstream), re-seat
    // at the top edge and keep hunting — the alternative is a sprite frozen forever mid-chase.
    if (!Number.isFinite(s.pursuerPos.x) || !Number.isFinite(s.pursuerPos.y)) {
      console.warn('[Neckbeard] position went non-finite; re-seating');
      s.pursuerPos.x = (innerWidth || 800) / 2;
      s.pursuerPos.y = -40;
    }

    // Escalation: he dies a little and comes back paler and faster (Revenant stub; the Waifu is M2)
    if (!s.revenant && s.survivalMs >= t.REVENANT_AT_SURVIVAL_MS) {
      s.set({ revenant: true });
      console.log('[Neckbeard] REVENANT', { survivalMs: Math.round(s.survivalMs) });
    }

    // Phase machinery
    if (s.phase === 'Creep') {
      lungeInMs -= dt;
      // Cornered pressure: in close range the strike comes fast — parking the cursor never works
      if (s.cursor && lungeInMs > t.PRESSURE_LUNGE_CAP_MS && dist(s.pursuerPos, s.cursor) <= t.PRESSURE_RANGE_PX) {
        lungeInMs = t.PRESSURE_LUNGE_CAP_MS;
      }
      if (lungeInMs <= 0 && s.cursor) {
        s.set({ phase: 'Telegraph' });
        phaseLeftMs = t.LUNGE_TELEGRAPH_MS;
        lockedDir = dirTo(s.pursuerPos, s.cursor);
        lungeCount++;
        setAnim('windup', ts);
      }
    } else {
      phaseLeftMs -= dt;
      if (phaseLeftMs <= 0) {
        if (s.phase === 'Telegraph') {
          s.set({ phase: 'Lunge' });
          phaseLeftMs = t.LUNGE_CATCH_WINDOW_MS;
          setAnim('lunge', ts);
        } else if (s.phase === 'Lunge') {
          s.set({ phase: 'Recovery' });
          phaseLeftMs = t.LUNGE_RECOVERY_MS;
          setAnim('walk', ts);
        } else if (s.phase === 'Recovery') {
          s.set({ phase: 'Creep' });
          lungeInMs = nextLungeDelay();
        }
      }
    }

    // Movement
    const phaseMult =
      s.phase === 'Lunge' ? t.LUNGE_SPEED_MULT :
      s.phase === 'Telegraph' ? t.LUNGE_TELEGRAPH_SPEED_MULT :
      s.phase === 'Recovery' ? t.LUNGE_RECOVERY_SPEED_MULT : 1;
    const targetSpeed = t.CREEP_SPEED_PX_S * phaseMult * (s.revenant ? t.REVENANT_SPEED_MULT : 1);
    speedNow += (targetSpeed - speedNow) * Math.min(1, dt / t.CREEP_ACCEL_MS);

    let dir = null;
    if (s.phase === 'Lunge') {
      dir = lockedDir;
    } else if (s.cursor && dist(s.pursuerPos, s.cursor) > 2) {
      dir = dirTo(s.pursuerPos, s.cursor); // no standoff: he walks right onto the cursor and looms
    }
    if (dir) {
      const step = speedNow * dt / 1000;
      // "|| 4096": a hidden/zero-sized viewport (background preview tabs) must not pin him to (0,0)
      s.pursuerPos.x = clamp(s.pursuerPos.x + dir.x * step, 0, innerWidth || 4096);
      s.pursuerPos.y = clamp(s.pursuerPos.y + dir.y * step, 0, innerHeight || 4096);
    }

    // Collision — ONLY inside the catch window. Hitbox-OR over pursuers (M2 Waifu drops in here).
    if (s.phase === 'Lunge' && s.cursor) {
      const r = t.HITBOX_RADIUS_PX * t.LUNGE_HITBOX_MULT + t.CURSOR_GRACE_MARGIN_PX;
      const pursuers = [s.pursuerPos, s.pursuerWaifuPos].filter(Boolean);
      if (pursuers.some(pp => dist(pp, s.cursor) <= r)) {
        stop();
        NB_MACHINE.toCaught();
        return;
      }
    }

    NB_UI.spriteMoveTo(s.pursuerPos.x, s.pursuerPos.y);
    NB_UI.spriteRender(animName, ts - animStartTs, { revenant: s.revenant });
  }

  window.addEventListener('pointermove', (e) => {
    const s = S();
    if (!s.cursor) s.cursor = { x: 0, y: 0 };
    s.cursor.x = e.clientX;
    s.cursor.y = e.clientY;
  }, { passive: true });

  // Clock hygiene: after a hidden stretch or a bfcache restore, restart dt from zero
  // rather than counting any of the gap as play time.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) lastTs = null; });
  window.addEventListener('pageshow', () => { lastTs = null; });

  // Last checkpoint on the way out the door — the hunt follows you to the next page.
  window.addEventListener('pagehide', () => {
    if (S().state === 'Hunting') NB_MACHINE.saveHunt(true);
  });

  // Test-only: advance the game deterministically on synthetic time (a hidden tab never
  // fires rAF, and real time makes tests flaky). Never called by gameplay code.
  function simulate(totalMs, stepMs) {
    stepMs = stepMs || 16.7;
    simulating = true;
    try {
      if (lastTs === null) lastTs = 0;
      let ts = lastTs;
      for (let el = 0; el < totalMs && S().state === 'Hunting'; el += stepMs) {
        ts += stepMs;
        update(ts);
      }
    } finally {
      simulating = false;
      lastTs = null; // synthetic time must never be compared against the real rAF clock
    }
  }

  // Diagnostics for Ctrl+Alt+L: if "he never lunges" ever comes back, this says whether the
  // phase machinery is cycling (lungeCount grows -> collision problem) or frozen (timer problem).
  function debugInfo() {
    return {
      lungeCount,
      lungeInMs: Math.round(lungeInMs),
      phaseLeftMs: Math.round(phaseLeftMs),
      speedNow: Math.round(speedNow),
      lockedDir,
      rafActive: rafId !== null,
    };
  }

  return { startHunt, stop, simulate, debugInfo };
})();
