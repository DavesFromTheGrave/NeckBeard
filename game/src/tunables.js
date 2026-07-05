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
  CATCH_RADIUS: 34,        // pixel distance = caught (during lunge only)

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

  SPRITE_SCALE: 1.15,

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
