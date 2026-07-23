// The chase. Position interpolates smoothly at rAF rate (~60fps); the sprite frame-steps at
// 8fps over in ui-overlay/sprites. Timing uses the rAF timestamp (performance.now clock).
// Item/effect modifiers (NB_STATE.mods) are wall-clock — set by items.js, consumed here.
//
// THE FAIRNESS RULE IS STRUCTURAL HERE: collision is only evaluated while phase === 'Lunge',
// which can only be entered through a full 'Telegraph' phase. There is no code path to a catch
// without a telegraph. Do not add one. (The Popup-Blocker Shield may PREVENT a catch — that
// direction is always fair.)
window.NB_PHYSICS = (() => {
  const T = () => window.NB_TUNABLES;
  const S = () => window.NB_STATE;

  let rafId = null;
  let lastTs = null;
  let speedNow = 0;        // current speed px/s (accel-ramped toward the phase target)
  let lungeInMs = 0;       // countdown to the next lunge attempt
  let phaseLeftMs = 0;     // time left in Telegraph/Lunge/Recovery
  let lockedDir = null;    // lunge direction, locked at telegraph START — that's what makes dodging real
  let animName = 'walk';
  let animStartTs = 0;
  let lungeCount = 0;      // diagnostics: how many telegraphs have fired this hunt
  let wanderSeed = 0;      // heading while tracking is lost

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function dirTo(from, to) {
    const dx = to.x - from.x, dy = to.y - from.y;
    const d = Math.hypot(dx, dy);
    return d < 0.001 ? { x: 0, y: 0 } : { x: dx / d, y: dy / d };
  }

  const nextLungeDelay = () =>
    (T().LUNGE_INTERVAL_MIN_MS + Math.random() * (T().LUNGE_INTERVAL_MAX_MS - T().LUNGE_INTERVAL_MIN_MS)) *
    (window.NB_CHAOS ? NB_CHAOS.mults().lungeInterval : 1);

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
    lungeCount = 0;
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

    const m = s.mods;
    const now = performance.now();
    const chaos = window.NB_CHAOS ? NB_CHAOS.mults() : { speed: 1, lungeInterval: 1, revenantAt: 1 };

    // Escalation: he dies a little and comes back paler and faster (Revenant stub; the Waifu is
    // M2). High chaos pulls the threshold earlier.
    if (!s.revenant && s.survivalMs >= t.REVENANT_AT_SURVIVAL_MS * chaos.revenantAt) {
      s.set({ revenant: true });
      console.log('[Neckbeard] REVENANT', { survivalMs: Math.round(s.survivalMs) });
    }

    // Stunned (Ban Hammer, shield pop, Scuba Steve, stick figure): frozen solid, phases too.
    if (now < m.stunUntil) {
      NB_UI.spriteMoveTo(s.pursuerPos.x, s.pursuerPos.y);
      NB_UI.spriteRender('stumble', ts - animStartTs, { revenant: s.revenant });
      return;
    }

    // ---- What does he think he's chasing? ----
    const hatOn = m.hatOn; // worn Scumbag Hat: broadcasts you — overrides any tracking loss
    const trackingLost = !hatOn && now < m.trackingLostUntil;
    const decoyLive = m.decoy && now < m.decoy.until;
    const retreating = m.retreatFrom && now < m.retreatFrom.until;

    let target = null;
    if (decoyLive) {
      target = m.decoy; // the Rickroll is irresistible
    } else if (!trackingLost && s.cursor) {
      target = s.cursor;
      m.lastKnown = { x: s.cursor.x, y: s.cursor.y };
    } else if (trackingLost && m.lastKnown) {
      target = m.lastKnown; // shuffles to where you were...
    }
    const hasRealTrack = !retreating && !decoyLive && !trackingLost && !!s.cursor;

    // Techno Viking cancels an attack already in flight, not just future ones — "he actively
    // recoils" means an active wind-up/lunge gets cut short too, otherwise the intimidation
    // effect doesn't cover the one moment it matters most (mid-catch-attempt).
    if (retreating && (s.phase === 'Telegraph' || s.phase === 'Lunge')) {
      s.set({ phase: 'Recovery' });
      phaseLeftMs = t.LUNGE_RECOVERY_MS;
      setAnim('stumble', ts);
    }

    // ---- Phase machinery (lunges need a REAL track — no blind swings at ghosts) ----
    if (s.phase === 'Creep') {
      lungeInMs -= dt;
      // Cornered pressure: in close range the strike comes fast — parking the cursor never works.
      // Burnination: everything is pressure.
      const pressured = (hasRealTrack && dist(s.pursuerPos, s.cursor) <= t.PRESSURE_RANGE_PX) ||
                        (window.NB_CHAOS && NB_CHAOS.burning());
      if (pressured && lungeInMs > t.PRESSURE_LUNGE_CAP_MS) lungeInMs = t.PRESSURE_LUNGE_CAP_MS;
      if (lungeInMs <= 0 && hasRealTrack) {
        if (Math.random() < t.MERCY_CHANCE) {
          // Good Guy Greg: he had you, and let it go. Rare on purpose.
          if (window.NB_FX) NB_FX.bubble('sprite', 'nah. you looked busy.');
          lungeInMs = nextLungeDelay();
        } else {
          s.set({ phase: 'Telegraph' });
          phaseLeftMs = t.LUNGE_TELEGRAPH_MS;
          lockedDir = dirTo(s.pursuerPos, s.cursor);
          lungeCount++;
          setAnim('windup', ts);
        }
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

    // ---- Movement ----
    const phaseMult =
      s.phase === 'Lunge' ? t.LUNGE_SPEED_MULT :
      s.phase === 'Telegraph' ? t.LUNGE_TELEGRAPH_SPEED_MULT :
      s.phase === 'Recovery' ? t.LUNGE_RECOVERY_SPEED_MULT : 1;
    const slowMult = now < m.slowUntil ? m.slowMult : 1;
    const hasteMult = now < m.hasteUntil ? m.hasteMult : 1;
    const hatMult = hatOn ? t.ITEM_HAT_SPEED_MULT : 1;
    const inWall = m.wall && now < m.wall.until &&
      s.pursuerPos.x >= m.wall.x && s.pursuerPos.x <= m.wall.x + m.wall.w &&
      s.pursuerPos.y >= m.wall.y && s.pursuerPos.y <= m.wall.y + m.wall.h;
    const wallMult = inWall ? 0.15 : 1;
    // AvA terrain: crossing dense page furniture costs him REAL time — blocked, never
    // stopped (Dave's rule). Direction is sacred; time is what terrain takes.
    let dress = null;
    if ((s.phase === 'Creep' || s.phase === 'Recovery') && window.NB_TERRAIN) {
      dress = NB_TERRAIN.pathDress(s.pursuerPos);
    }
    const terrainMult = dress && dress.slowMult ? dress.slowMult : 1;
    const targetSpeed = t.CREEP_SPEED_PX_S * phaseMult *
      (s.revenant ? t.REVENANT_SPEED_MULT : 1) * chaos.speed * slowMult * hasteMult * hatMult * wallMult * terrainMult;
    speedNow += (targetSpeed - speedNow) * Math.min(1, dt / t.CREEP_ACCEL_MS);

    let dir = null;
    if (s.phase === 'Lunge') {
      dir = lockedDir;
    } else if (retreating) {
      dir = dirTo(m.retreatFrom, s.pursuerPos); // away from the Viking, with feeling
    } else if (target && dist(s.pursuerPos, target) > 2) {
      dir = dirTo(s.pursuerPos, target); // no standoff: he walks right onto the cursor and looms
    } else if (trackingLost) {
      // at last-known and still blind: confused shuffle
      wanderSeed += dt / 700;
      dir = { x: Math.cos(wanderSeed), y: Math.sin(wanderSeed) };
    }
    if (dir) {
      const step = speedNow * dt / 1000;
      // "|| 4096": a hidden/zero-sized viewport (background preview tabs) must not pin him to (0,0)
      s.pursuerPos.x = clamp(s.pursuerPos.x + dir.x * step, 0, innerWidth || 4096);
      s.pursuerPos.y = clamp(s.pursuerPos.y + dir.y * step, 0, innerHeight || 4096);
    }

    // ---- Collision — ONLY inside the catch window. Hitbox-OR over pursuers (M2 Waifu). ----
    if (s.phase === 'Lunge' && s.cursor) {
      const r = t.HITBOX_RADIUS_PX * t.LUNGE_HITBOX_MULT + t.CURSOR_GRACE_MARGIN_PX;
      const pursuers = [s.pursuerPos, s.pursuerWaifuPos].filter(Boolean);
      if (pursuers.some(pp => dist(pp, s.cursor) <= r)) {
        if (m.shieldCharges > 0) {
          // Popup-Blocker Shield: the one near-catch you get back.
          m.shieldCharges--;
          const away = dirTo(s.cursor, s.pursuerPos);
          s.pursuerPos.x = clamp(s.pursuerPos.x + away.x * t.SHIELD_KNOCKBACK_PX, 0, innerWidth || 4096);
          s.pursuerPos.y = clamp(s.pursuerPos.y + away.y * t.SHIELD_KNOCKBACK_PX, 0, innerHeight || 4096);
          m.stunUntil = now + t.SHIELD_STUN_MS;
          s.set({ phase: 'Recovery' });
          phaseLeftMs = t.LUNGE_RECOVERY_MS;
          setAnim('stumble', ts);
          if (window.NB_FX) { NB_FX.shieldPop(); NB_FX.bubble('cursor', 'problem?'); }
          console.log('[Neckbeard] SHIELD POP — catch absorbed');
        } else {
          stop();
          NB_MACHINE.toCaught();
          return;
        }
      }
    }

    // ---- AvA presentation: anim beats + occlusion. NEVER hides a telegraph (fairness:
    // clip off during Telegraph/Lunge — "bursting out from behind the article image" is
    // the free scare).
    let lift = 0;
    if ((s.phase === 'Creep' || s.phase === 'Recovery') && window.NB_TERRAIN) {
      if (now < scrollBeatUntil) {
        setAnim('stumble', ts);
      } else if (dress) {
        lift = dress.visualLift || 0;
        if (dress.anim) setAnim(dress.anim, ts);
      } else if (animName === 'climb' || animName === 'stumble') {
        setAnim('walk', ts);
      }
      const t2 = NB_SPRITES.TIERS.base, sc = T().SPRITE_SCALE;
      NB_UI.spriteSetClip(NB_TERRAIN.occlusionClip({
        x: s.pursuerPos.x - (t2.cellW * sc) / 2,
        y: s.pursuerPos.y - (t2.cellH * sc) / 2,
        w: t2.cellW * sc,
        h: t2.cellH * sc,
      }));
    } else {
      NB_UI.spriteSetClip(null);
    }

    NB_UI.spriteMoveTo(s.pursuerPos.x, s.pursuerPos.y, lift);
    NB_UI.spriteRender(animName, ts - animStartTs, { revenant: s.revenant, decoy: decoyLive });
  }

  window.addEventListener('pointermove', (e) => {
    const s = S();
    if (!s.cursor) s.cursor = { x: 0, y: 0 };
    s.cursor.x = e.clientX;
    s.cursor.y = e.clientY;
  }, { passive: true });

  // Scroll physics: yank the page hard under his feet and he stumbles. Pure personality —
  // the world he lives in just moved, and he reacts like it.
  let scrollBeatUntil = 0;
  let lastScrollY = null, lastScrollTs = 0;
  window.addEventListener('scroll', () => {
    const nowTs = performance.now();
    if (lastScrollY !== null) {
      const v = Math.abs(scrollY - lastScrollY) / Math.max(1, nowTs - lastScrollTs) * 1000;
      if (v > 1800 && S().state === 'Hunting' && S().phase === 'Creep') {
        scrollBeatUntil = nowTs + 600;
        if (Math.random() < 0.12 && window.NB_FX) NB_FX.bubble('sprite', 'STOP. SCROLLING.');
      }
    }
    lastScrollY = scrollY;
    lastScrollTs = nowTs;
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
