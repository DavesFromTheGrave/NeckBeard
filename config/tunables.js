// Every feel constant lives here and nowhere else.
// Tuning loop: edit a value in DevTools (window.NB_TUNABLES.X = ...), re-trigger with the
// debug hotkeys (Ctrl+Alt+M / H / C / L) — or edit this file and reload the extension.
window.NB_TUNABLES = {
  // Pursuit
  CREEP_SPEED_PX_S: 150,          // base chase speed; the "slow but relentless" number
  CREEP_ACCEL_MS: 200,            // ramp to full speed — the waking-up feel
  PRESSURE_RANGE_PX: 140,         // once he's this close, being cornered accelerates the strike:
  PRESSURE_LUNGE_CAP_MS: 900,     // ...the next lunge fires within this. A parked cursor is a death sentence.

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

  // Cross-page pursuit (the false-safety beat). An active hunt follows you between pages:
  // short commute on the same site, longer to a brand-new domain — and the grace shrinks
  // the longer a single chase has been running.
  COMMUTE_SAME_SITE_MS: 8000,
  COMMUTE_NEW_DOMAIN_MS: 25000,
  COMMUTE_SHRINK_FLOOR: 0.35,     // grace never drops below this fraction
  COMMUTE_SHRINK_OVER_MS: 600000, // linear shrink to the floor across 10 min of chase
  HUNT_SAVE_INTERVAL_MS: 2000,    // how often the live hunt checkpoints to storage

  // Game over
  GAMEOVER_INPUT_DELAY_MS: 600,   // swallow the click/keypress you were mid-motion on when caught

  // Accessibility
  PANIC_KEY_CODE: 'KeyP',         // Alt+P toggles all game UI off/on (screen-share safety)

  // Lore
  ADMIN_NAME: 'The Admin',        // PLACEHOLDER — Dave is still naming him; rename here only

  // M1 is desktop-only: the cursor IS the player
  MIN_VIEWPORT_W: 900,
  MIN_VIEWPORT_H: 500,

  // ---- Chaos Meter (0-100, the single backbone stat — resist adding parallel meters) ----
  CHAOS_BASELINE: 10,
  CHAOS_DECAY_PER_S: 0.15,        // drifts back toward baseline
  CHAOS_CURSED_PER_S: 0.8,        // while on a cursed-category domain
  CHAOS_WHOLESOME_PER_S: -1.2,    // while on a wholesome-category domain
  CHAOS_CAMP_AFTER_MS: 180000,    // camping one domain past 3 min starts the Badger creep
  CHAOS_CAMP_PER_S: 0.5,
  CHAOS_TINT_AT: 70,              // This Is Fine ember tint from here up
  CHAOS_BURN_MS: 10000,           // at 100: Trogdor burnination — constant pressure for this long
  CHAOS_BURN_FALLBACK: 50,        // then the meter falls back to this
  // difficulty scaling: at chaos C, his speed x(1 + C/CHAOS_SPEED_DIV), lunge interval
  // x(1 - C/CHAOS_LUNGE_DIV), revenant threshold x(1 - C/CHAOS_REV_DIV)
  CHAOS_SPEED_DIV: 250,
  CHAOS_LUNGE_DIV: 300,
  CHAOS_REV_DIV: 250,
  // Incentive rule (locked 2026-07-01): cursed list is a curated CATEGORY — no single site
  // is special, nothing here may ever pair with a reward.
  CHAOS_CURSED: [/4chan\.org$/i, /kiwifarms/i, /r\/drama/i, /twitter\.com$/i, /x\.com$/i],
  CHAOS_WHOLESOME: [/wikipedia\.org$/i, /allrecipes\./i, /r\/aww/i, /nationalgeographic\./i, /\.edu$/i],

  // ---- Items & pickups ----
  INVENTORY_SLOTS: 3,
  PICKUP_TOUCH_RADIUS_PX: 22,     // grab by touching with the cursor
  PICKUP_LIFETIME_MS: 15000,      // unclaimed pickups despawn
  POWERUP_SPAWN_EVERY_MS: 12000,  // roll for a powerup this often while Hunting
  POWERUP_SPAWN_CHANCE: 0.65,
  COLLECTIBLE_SPAWN_EVERY_MS: 20000, // collectibles roll in any state
  COLLECTIBLE_SPAWN_CHANCE: 0.35,
  SHAKE_FLINGS_HAT_FLIPS: 6,      // rapid direction reversals needed to fling the Scumbag Hat
  SHAKE_WINDOW_MS: 900,
  MERCY_CHANCE: 0.03,             // Good Guy Greg: rare canceled telegraph

  // per-item effect numbers live with their definitions in content/items.js (they're
  // identity, not feel); durations that need feel-tuning are here:
  ITEM_STUN_MS: 2500,             // Ban Hammer
  ITEM_CLOAK_MS: 4000,            // Incognito Cloak
  ITEM_WALL_MS: 4000,             // Ad-Blocker Wall
  ITEM_DEW_MS: 6000,              // Mountain Dew (slows HIM 20% — a real mouse can't be sped up)
  ITEM_RICKROLL_MS: 3500,         // dance-break at the decoy
  ITEM_SCUBA_STUN_MS: 1500,
  ITEM_BSOD_MS: 3500,
  ITEM_RING_MS: 8000,             // One Ring invisibility...
  ITEM_RING_CHAOS_PER_S: 4,       // ...but wearing it feeds the meter
  ITEM_SPARK_LOST_MS: 4000,
  ITEM_VIKING_MS: 8000,
  ITEM_HAT_SPEED_MULT: 1.15,      // worn Scumbag Hat: he reads you loud and clear
  ITEM_PEPE_RESIST_MS: 60000,     // chaos gains halved
  ITEM_BRIAN_HASTE_MS: 6000,      // Bad Luck Brian: him x1.3
  ITEM_WUMPUS_MS: 5000,           // Discord swarm: him x0.6
  SHIELD_KNOCKBACK_PX: 250,
  SHIELD_STUN_MS: 1200,
  HAMMER_KNOCKBACK_PX: 200,

  // Never spawn on these hostnames (banking / gov / medical), per DESIGN.md default-suppress
  DENYLIST: [
    /\.gov$/i, /\.gov\.[a-z]{2}$/i, /\.mil$/i,
    /bank/i, /paypal\./i, /chase\.com$/i, /wellsfargo\.com$/i,
    /bankofamerica\.com$/i, /capitalone\.com$/i, /fidelity\.com$/i,
    /vanguard\.com$/i, /schwab\.com$/i, /americanexpress\.com$/i,
    /mychart/i, /medicare/i, /healthcare/i, /\.nhs\.uk$/i,
  ],
};
