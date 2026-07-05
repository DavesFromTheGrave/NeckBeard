// Feel constants — seeded from the extension's proven values (physics.js lineage).
window.NB = window.NB || {};
NB.TUNE = {
  // movement (px/sec)
  LURK_SPEED: 70,
  HUNT_SPEED: 230,
  LUNGE_SPEED: 950,
  CHARGE_SPEED: 480,

  // state timings (ms)
  LURK_MIN: 2500,          // wander before first hunt
  TELEGRAPH_MS: 500,       // the fairness window — he ALWAYS winds up first
  LUNGE_MS: 320,           // collision exists ONLY inside this window
  STUMBLE_MS: 900,         // recovery after a miss
  HUNT_REPATH_MS: 120,     // how often he re-aims while hunting
  LUNGE_RANGE: 150,        // distance that triggers a telegraph
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

  SPRITE_SCALE: 1.15,

  // Balder promotion review — survive past this, then a catch triggers ceremony (once/run)
  BALDER_SURVIVAL_MS: 60000,
};
