// Feel constants — seeded from the extension's proven values (physics.js lineage).
window.NB = window.NB || {};
NB.TUNE = {
  // movement (px/sec)
  LURK_SPEED: 70,
  HUNT_SPEED: 300,         // 2026-07-10: kid reached the ceremony FIRST RUN on a phone — early game was a participation trophy (was 275)
  LUNGE_SPEED: 1080,       // faster lunge (was 950)
  CHARGE_SPEED: 520,

  // state timings (ms)
  LURK_MIN: 1500,          // wander before first hunt — a second less mercy (was 2500)
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
  HEAT_RAMP_S: 18,         // every N seconds survived, he gets meaner — arrives ~40% sooner (was 25)
  HEAT_SPEED_BONUS: 26,    // px/s per heat level (was 22)
  HEAT_MAX: 6,
  KARMA_PER_HEAT: 700,     // every N karma farmed adds +1 heat — greed bites harder (was 900)

  // karma heist: stealing is an ACTIVE aim challenge, not a wait-it-out timer.
  // While inside a fresh post, targets pop up one at a time inside the card —
  // track your cursor onto each before it expires. Miss one (timeout, or you
  // leave the post) and the WHOLE sequence resets to target #1. That's what
  // makes it harder, not just longer.
  FARM_TARGETS: 3,          // targets to hit in sequence to complete a steal
  FARM_TARGET_MS: 950,      // ms you have to reach each target before it expires (was 620 — too tight)
  FARM_TARGET_RADIUS: 20,   // px — how close the cursor must get to register a hit

  // Character frames are high-res now (512px tall source, from Dave's full-res
  // originals) instead of the old 96px lowres. This scale keeps the SAME
  // on-screen size as before (96px*2.3 = 220px; now 512*0.431 ≈ 220px) — just
  // sourced crisp so the mod isn't an upscaled blur. Desktop override below.
  SPRITE_SCALE: 0.431,

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
  SMASH_MS: 1400,          // the sledge swing (~625ms) then HOLDS the embedded-hammer pose so the
                           // strike actually registers on screen (was 640 — pose flashed and was gone)
  SMASH_IMPACT_MS: 360,    // wind-up before the hammer lands

  // Balder promotion review — survive past this, then a catch triggers ceremony (once/run)
  BALDER_SURVIVAL_MS: 60000,

  // The tag-team endgame. After the ceremony superM0D is gone (called upstairs)
  // and redditM0D takes the hunt SOLO at a hard speed multiplier (Dave's spec:
  // "at LEAST 2x-3x faster"). REVENANT_DELAY_MS later the old mod claws back
  // out of the ground and BOTH hunt. Telegraph timings are untouched — the
  // fairness window is identical, there's just less room to breathe.
  MOD2_SPEED_MULT: 2.5,      // redditM0D locomotion vs superM0D (lurk/hunt/charge)
  // The ZENITSU dash (Dave: "make him move like zenitsu"): dead-still telegraph,
  // then ONE lightning streak. 1080*3.0 ≈ 3240px/s over the same 320ms window —
  // he crosses the screen as a blur. Fairness intact: the stillness IS the tell,
  // the catch still exists only inside the telegraphed LUNGE window.
  MOD2_LUNGE_MULT: 3.0,      // dash speed (was 1.25 — too polite)
  MOD2_RANGE_MULT: 1.9,      // he draws from much further out — distance ≠ safety
  MOD2_SCALE_MULT: 0.94,     // slightly smaller body: the junior mod, reads faster
  REVENANT_DELAY_MS: 30000,  // how long redditM0D hunts alone before superM0D rises

  // Anti-scroll-camp rubber band. Desktop exploit: wheel-fling to the far end of
  // the feed and farm while the mods jog the whole world height back to you.
  // Fix: the further you run, the faster they close — full sprint by CATCHUP_FULL
  // px. Scroll still works (fleeing IS reddit), it just stops being free time.
  CATCHUP_START: 750,        // px of real distance where catchup starts
  CATCHUP_FULL: 2400,        // px where it maxes out
  CATCHUP_MAX: 3.4,          // locomotion multiplier at max (lurk/hunt only, never lunge)

  // ── MEMES: rarer + stronger (Dave 2026-07-11) ────────────────────────
  // They used to rain every 5-9s and tickle. Now one drop matters when it
  // lands, and every grab builds the run's COLLECTION (the HUD strip stacks
  // ×counts; challenges will read the bag later).
  MEME_FIRST_MS: 6000,         // first badge of the run
  MEME_SPAWN_MIN_MS: 14000,    // then one every 14-22s (was 5-9s)
  MEME_SPAWN_MAX_MS: 22000,
  MEME_MAX_ONSCREEN: 2,        // was 3
  MEME_STUN_MS: 3000,          // was 1600 — you should NOTICE a stun
  MEME_STUN_BIG_MS: 4500,      // was 2400
  MEME_DECOY_MS: 6000,         // was 3200
  MEME_SLOW_MS: 5000,          // was 3000
  MEME_SLOW_FACTOR: 0.45,      // was 0.6 (lower = slower mod)
  MEME_KNOCKBACK: 380,         // was 220
  MEME_KNOCKBACK_BIG: 560,     // was 360
  MEME_HEATWIPE_STUN_MS: 1200, // was 400

  // ── BALDER, the endgame boss ─────────────────────────────────────────
  // THE GATE (Dave 2026-07-11: "Balder's gate IS THE LETTERS"): all SIX
  // letters of B-A-L-D-E-R found across the cursed subreddits (letters.js)
  // + karma ≥ BOSS_KARMA_GATE + BOSS_DUO_MS survived with BOTH mods hunting.
  // His ONLY kill is the teleport-strike, double-telegraphed: the vanish
  // charge-up says "he's coming", the arrival burst + ring says "he's HERE",
  // and only THEN does a short strike window open. Walking/running between
  // blinks is pure pressure — Balder never catches outside the strike window.
  // BALDER is the ending. Once he manifests the run is already over; the only
  // question is the karma number on the stone. Nobody survives.
  BOSS_KARMA_GATE: 250000,   // was 50k — one hot post paid 34k, Dave repriced
  BOSS_DUO_MS: 30000,        // ms survived with redditM0D + revenant BOTH live
  BOSS_THANKS_MS: 60000,     // last THIS long vs Balder before he gets you →
                             // white-suit "thank you for playing" send-off (you
                             // still die — it only warms the death screen)
  BOSS_ENTRANCE_MS: 3200,    // arrival burst → both mods dragged to hell → the hunt
  BOSS_ESCALATE_MS: 75000,   // blink cooldown ramps START→MIN over this, then stays MIN
  BOSS_TP_CD_START: 8000,    // ms between blinks when the fight starts
  BOSS_TP_CD_MIN: 4200,      // blink cooldown floor as the fight escalates
  // Blink warning compressed to HALF A SECOND total (Dave 2026-07-11: "You
  // get a half second warning. It's at 1.5 seconds? Make it a half second.")
  // vanish + gap + arrive = 500ms, then the strike. Bursts play sped-up to
  // fit their window; the entrance burst keeps the natural anim length.
  BOSS_TP_VANISH_MS: 180,    // charge-up burst — "he's coming"
  BOSS_TP_GAP_MS: 120,       // dead air — he is NOWHERE (the dread beat)
  BOSS_TP_ARRIVE_MS: 200,    // arrival burst + ring at the landing spot
  BOSS_TP_NATURAL_MS: 560,   // unhurried burst length (12f @ 22fps) — entrance only
  BOSS_STRIKE_MS: 420,       // catch window right after the arrival burst
  BOSS_RECOVER_MS: 1500,     // whiffed strike = he stands there — your window
  BOSS_LAND_RING: 175,       // he lands this far from the cursor, never on top
  BOSS_WALK_SPEED: 150,      // stalk speed (pressure between blinks)
  BOSS_RUN_SPEED: 330,       // when you're far he runs (face = direction)
  BOSS_SCALE_MULT: 1.25,     // bigger than the mods — he should loom
};

// Session flags that survive sandboxed webviews. Reddit's iframe can block
// sessionStorage OUTRIGHT — merely touching it throws a SecurityError (this
// bricked the ceremony on real Reddit, 2026-07-09). In-memory fallback keeps
// the once-per-page-load semantics when storage is walled off.
NB._memFlags = {};
NB.flagGet = function (k) {
  try { return sessionStorage.getItem(k) ?? NB._memFlags[k] ?? null; }
  catch { return NB._memFlags[k] ?? null; }
};
NB.flagSet = function (k, v) {
  NB._memFlags[k] = String(v);
  try { sessionStorage.setItem(k, String(v)); } catch {}
};

// Cross-RUN persistence (the letter hunt survives runs and days). Same
// walled-webview rules as above but localStorage-backed; where Reddit blocks
// storage entirely it degrades to per-page-load memory — the hunt still
// works, it just forgets between visits there.
NB._memPersist = {};
NB.persistGet = function (k) {
  try { return localStorage.getItem(k) ?? NB._memPersist[k] ?? null; }
  catch { return NB._memPersist[k] ?? null; }
};
NB.persistSet = function (k, v) {
  NB._memPersist[k] = String(v);
  try { localStorage.setItem(k, String(v)); } catch {}
};

// A mouse pointer is a precise point; a fingertip is a ~40-50px contact patch
// that also sits ON TOP of whatever it's aiming at. Farm targets sized for a
// mouse are frustratingly small to hit (and half-hidden) under a real thumb.
NB.IS_TOUCH = (('ontouchstart' in window) || navigator.maxTouchPoints > 0);
if (NB.IS_TOUCH) NB.TUNE.FARM_TARGET_RADIUS = Math.round(NB.TUNE.FARM_TARGET_RADIUS * 1.7);

// Wide desktop screens give the cursor too much room — the mod reads small and
// easy to outrun. Scale him up so he fills the page and feels threatening, and
// grow his reach WITH him (catch radius/lunge range track the bigger body, so
// he's scarier without being cheap — the catch is still lunge-only). Keeps the
// authentic Reddit layout; only the mod changes. Starting values — playtest-tuned.
NB.IS_DESKTOP = !NB.IS_TOUCH && window.innerWidth > 900;
if (NB.IS_DESKTOP) {
  NB.TUNE.SPRITE_SCALE = 0.6;   // 512*0.6 ≈ 307px on-screen (was 96px*3.2) — bigger presence on wide screens
  NB.TUNE.CATCH_RADIUS = 80;
  NB.TUNE.LUNGE_RANGE = 230;
}
