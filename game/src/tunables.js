// Feel constants — seeded from the extension's proven values (physics.js lineage).
window.NB = window.NB || {};
NB.TUNE = {
  // movement (px/sec)
  LURK_SPEED: 70,
  HUNT_SPEED: 275,         // quicker onto the cursor (was 230)
  LUNGE_SPEED: 1080,       // faster lunge (was 950)
  CHARGE_SPEED: 520,

  // state timings (ms)
  LURK_MIN: 2500,          // wander before first hunt
  TELEGRAPH_MS: 500,       // the fairness window — he ALWAYS winds up first
  LUNGE_MS: 320,           // collision exists ONLY inside this window
  STUMBLE_MS: 900,         // recovery after a miss
  HUNT_REPATH_MS: 120,     // how often he re-aims while hunting
  LUNGE_RANGE: 190,        // lunges from further out (was 150)
  CATCH_RADIUS: 62,        // caught if within this of the mod during a lunge (was 34 — too small vs the sprite, lunges phased through)
  CORNER_RANGE: 78,        // cursor this close when he winds up = cornered
  CORNER_TELEGRAPH_MS: 260, // point-blank telegraph is fast — contact IS dangerous (still a warning)

  // terrain (the AvA rule: blocked, never stopped)
  CLIMB_MULT: 0.45,        // speed while incidentally on top of furniture
  CLIMB_BOB_DEG: 9,        // body tilt while walking on a card
  ELEMENT_SHAKE_PX: 3,     // page furniture shudders when he tramples it

  // the VAULT — the Animator-vs-Animation moment: he grabs a post's edge
  // and hauls his fat body up and over it. Committed = your escape window.
  VAULT_REACH: 30,         // how far ahead he senses a card edge to vault
  VAULT_MS: 480,           // vault duration (no lunge possible during it)
  VAULT_ARC: 40,           // how high he heaves up mid-vault
  VAULT_FORWARD: 104,      // distance carried across the card
  VAULT_CD: 560,           // cooldown before he can vault again
  VAULT_TILT_DEG: 20,      // forward body lean at the apex

  // escalation
  HEAT_RAMP_S: 25,         // every N seconds survived, he gets meaner
  HEAT_SPEED_BONUS: 22,    // px/s per heat level
  HEAT_MAX: 6,
  KARMA_PER_HEAT: 900,     // every N karma farmed adds +1 heat (greed = danger)

  // karma heist: stealing is an ACTIVE aim challenge, not a wait-it-out timer.
  // While inside a fresh post, targets pop up one at a time inside the card —
  // track your cursor onto each before it expires. Miss one (timeout, or you
  // leave the post) and the WHOLE sequence resets to target #1. That's what
  // makes it harder, not just longer.
  FARM_TARGETS: 3,          // targets to hit in sequence to complete a steal
  FARM_TARGET_MS: 950,      // ms you have to reach each target before it expires (was 620 — too tight)
  FARM_TARGET_RADIUS: 20,   // px — how close the cursor must get to register a hit

  SPRITE_SCALE: 2.3,       // ~2x bigger per Dave (was 1.15)

  // wreckage — persistent, compounding page destruction
  // damage floats accrue per element; each whole point = one visual stage (max 3)
  // damage staging: first crack lands fast so contact ALWAYS leaves a mark
  WRECK_THRESH: [0.3, 1.1, 2.1],  // dmg needed for stage 1 / 2 / 3
  WRECK_TRAMPLE: 0.42,     // per tick while he walks on a card (first tick = instant crack)
  WRECK_TICK_MS: 240,      // trample damage accrual rate limit
  WRECK_VAULT: 0.4,        // hauling himself over a card crunches it
  WRECK_LUNGE: 0.6,        // a whiffed lunge craters whatever he lands on
  WRECK_YANK: 0.35,        // the scroll slam rattles a few posts loose
  WRECK_SMASH: 1.4,        // the sledgehammer — always advances a full stage
  WRECK_DEBRIS_MAX: 60,    // global cap on persistent debris chunks

  // SMASH — deliberate sledgehammer strike on the card under his feet.
  // Fairness: never a catch. He's committed for SMASH_MS = your window.
  SMASH_CD_MS: 9000,
  SMASH_RANGE_MIN: 170,    // only bothers wrecking furniture when you're not in reach
  SMASH_MS: 640,
  SMASH_IMPACT_MS: 360,    // wind-up before the hammer lands

  // Balder promotion review — survive past this, then a catch triggers ceremony (once/run)
  BALDER_SURVIVAL_MS: 60000,
};

// A mouse pointer is a precise point; a fingertip is a ~40-50px contact patch
// that also sits ON TOP of whatever it's aiming at. Farm targets sized for a
// mouse are frustratingly small to hit (and half-hidden) under a real thumb.
NB.IS_TOUCH = (('ontouchstart' in window) || navigator.maxTouchPoints > 0);
if (NB.IS_TOUCH) NB.TUNE.FARM_TARGET_RADIUS = Math.round(NB.TUNE.FARM_TARGET_RADIUS * 1.7);

// Every distance/speed above is an absolute pixel count, tuned by eye against
// a wide desktop screen (the only kind anyone playtested on tonight). On a
// phone-width viewport those same pixels eat up a much bigger FRACTION of
// the visible width -- LUNGE_RANGE=190 is ~14% of a 1400px desktop test but
// ~49% of a 390px phone (nearly half the screen becomes "he's about to
// lunge"). Dave, on a real phone: "barely room to maneuver." Scale the
// space- and speed-related tunables down for narrow screens so the danger
// zone occupies roughly the same RELATIVE fraction of the screen it did
// during desktop tuning, instead of the same absolute pixel count.
// (768 matches the isWide breakpoint the layout itself already uses.)
NB.MOBILE_SPACE_SCALE = Math.min(1, Math.max(0.55, window.innerWidth / 768));
NB.MOBILE_SPRITE_SCALE = Math.min(1, Math.max(0.7, window.innerWidth / 768));
if (NB.MOBILE_SPACE_SCALE < 1) {
  NB.TUNE.LUNGE_RANGE = Math.round(NB.TUNE.LUNGE_RANGE * NB.MOBILE_SPACE_SCALE);
  NB.TUNE.CORNER_RANGE = Math.round(NB.TUNE.CORNER_RANGE * NB.MOBILE_SPACE_SCALE);
  NB.TUNE.HUNT_SPEED = Math.round(NB.TUNE.HUNT_SPEED * NB.MOBILE_SPACE_SCALE);
  NB.TUNE.LUNGE_SPEED = Math.round(NB.TUNE.LUNGE_SPEED * NB.MOBILE_SPACE_SCALE);
  // sprite + catch radius scale together (less aggressively -- he still
  // needs to be visible) so the catch stays proportional to his own body
  NB.TUNE.SPRITE_SCALE = +(NB.TUNE.SPRITE_SCALE * NB.MOBILE_SPRITE_SCALE).toFixed(3);
  NB.TUNE.CATCH_RADIUS = Math.round(NB.TUNE.CATCH_RADIUS * NB.MOBILE_SPRITE_SCALE);
}
