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
  CLIMB_MULT: 0.45,        // speed while climbing over page furniture
  CLIMB_BOB_DEG: 9,        // body tilt while climbing
  ELEMENT_SHAKE_PX: 3,     // page furniture shudders when he tramples it

  // escalation
  HEAT_RAMP_S: 25,         // every N seconds survived, he gets meaner
  HEAT_SPEED_BONUS: 22,    // px/s per heat level
  HEAT_MAX: 6,

  SPRITE_SCALE: 1.15,
};
