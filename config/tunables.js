// Every feel constant lives here and nowhere else.
// Tuning loop: edit a value in DevTools (window.NB_TUNABLES.X = ...), re-trigger with the
// debug hotkeys (Ctrl+Alt+M / H / C / L) — or edit this file and reload the extension.
window.NB_TUNABLES = {
  // Pursuit
  CREEP_SPEED_PX_S: 150,          // base chase speed; the "slow but relentless" number
  CREEP_ACCEL_MS: 200,            // ramp to full speed — the waking-up feel
  CREEP_STANDOFF_PX: 26,          // outside lunges he looms just out of reach instead of sitting on the cursor

  // Lunge cycle — the fairness rule lives in these numbers.
  // Collision physically exists ONLY during the catch window, never outside it.
  LUNGE_INTERVAL_MIN_MS: 2500,
  LUNGE_INTERVAL_MAX_MS: 4000,
  LUNGE_TELEGRAPH_MS: 500,        // wind-up; collision OFF; direction locks at wind-up start so dodging works
  LUNGE_CATCH_WINDOW_MS: 300,     // collision ON
  LUNGE_SPEED_MULT: 3.5,
  LUNGE_HITBOX_MULT: 1.3,
  LUNGE_RECOVERY_MS: 1000,
  LUNGE_RECOVERY_SPEED_MULT: 0.5,
  LUNGE_TELEGRAPH_SPEED_MULT: 0.15, // he nearly stops to coil

  // Sprite
  SPRITE_FRAME_MS: 125,           // 8fps frame-stepping; movement itself stays 60fps
  SPRITE_SCALE: 2,                // integer scaling only — non-integer blurs the pixels

  // Catch geometry (CSS px)
  HITBOX_RADIUS_PX: 16,
  CURSOR_GRACE_MARGIN_PX: 8,

  // Spawn / door
  SPAWN_RATE_PERCENT: 3,          // per page load, after all gates pass
  GLOBAL_COOLDOWN_MS: 300000,     // 5 min between encounters (recorded at spawn, so reloads can't re-roll)
  LURKING_DURATION_MIN_MS: 8000,
  LURKING_DURATION_MAX_MS: 12000,
  DOOR_HOVER_DWELL_MS: 300,       // hover this long to trigger; a click triggers instantly
  PRE_SPAWN_TELL_MS: 1500,        // subtle visual tell before the door appears (M1: visual only, no audio)

  // Escalation
  REVENANT_AT_SURVIVAL_MS: 60000, // survive this long and he comes back paler and faster
  REVENANT_SPEED_MULT: 1.3,

  // Game over
  GAMEOVER_INPUT_DELAY_MS: 600,   // swallow the click/keypress you were mid-motion on when caught

  // Accessibility
  PANIC_KEY_CODE: 'KeyP',         // Alt+P toggles all game UI off/on (screen-share safety)

  // Lore
  ADMIN_NAME: 'The Admin',        // PLACEHOLDER — Dave is still naming him; rename here only

  // M1 is desktop-only: the cursor IS the player
  MIN_VIEWPORT_W: 900,
  MIN_VIEWPORT_H: 500,

  // Never spawn on these hostnames (banking / gov / medical), per DESIGN.md default-suppress
  DENYLIST: [
    /\.gov$/i, /\.gov\.[a-z]{2}$/i, /\.mil$/i,
    /bank/i, /paypal\./i, /chase\.com$/i, /wellsfargo\.com$/i,
    /bankofamerica\.com$/i, /capitalone\.com$/i, /fidelity\.com$/i,
    /vanguard\.com$/i, /schwab\.com$/i, /americanexpress\.com$/i,
    /mychart/i, /medicare/i, /healthcare/i, /\.nhs\.uk$/i,
  ],
};
