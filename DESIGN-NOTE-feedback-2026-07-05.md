# Design note: Balder timer + player HP visibility

Source: playtester feedback from Bitz [BLMS], 2026-07-05. Two of the four items (low-res post images, door glitch on restart) were bugs with clear root causes and are already fixed in `reddit-fetch.js`, `server/index.js`, and `game/src/main.js`. The other two are feature gaps, not bugs — they need a design decision before implementation. This note scopes both against the real mechanics in the codebase.

## 1. A visible timer toward the Balder "second chance"

**What's actually happening today.** `NB.TUNE.BALDER_SURVIVAL_MS` (`game/src/tunables.js`) is `60000` — survive 60 seconds of in-run time and your *next* catch is intercepted by the Balder promotion-review ceremony instead of ending the run (`onCaught()` in `main.js`, once per run). `survivalMs` is real elapsed time *minus* any time spent frozen (loading screens, the entrance sequence, the ceremony itself) — see `update()`. So a player's felt sense of "I've been playing about a minute" and the actual `survivalMs` value can drift apart by however long they spent on loading screens or sub-travel.

**Why Bitz got banned "right at a minute."** The check is a strict `>`: `this.survivalMs > NB.TUNE.BALDER_SURVIVAL_MS`. There's no grace window. A catch landing at 59,900ms is a normal death with zero indication the player was 100ms from a reprieve. Combined with no visible timer at all, "I thought I survived a minute" is exactly what you'd expect this mechanic to produce.

**Proposed fix — a dedicated progress indicator, separate from the karma HUD:**
- A small ring or bar near the existing `★ karma` HUD text (`this.hud` in `buildWorld()`) that fills from 0 to `BALDER_SURVIVAL_MS` using `this.survivalMs`. Once `balderUsed` flips true (ceremony already spent), the indicator disappears or locks to "used" — it's a one-time-per-run resource, so it shouldn't imply it recharges.
- Suggest a quiet pulse or color shift in the last ~5s before the threshold, so the "you're about to be safe" moment reads clearly, matching the fairness pattern already used for the mod's own telegraph (500ms wind-up before every lunge).
- Optional, cheap fairness fix regardless of UI: don't gate strictly on `survivalMs` at the instant of the catch — snapshot "eligible" the moment the threshold is crossed (a boolean flip, checked once, rather than a live `>` comparison against a value that can be mid-freeze at catch-time). Small change, removes the "so close" edge case entirely.

**Open questions for you:**
- Ring around the HUD score, a separate progress bar, or a countdown number (e.g. "0:42")? Countdown gives the most information but also tells a chasing mod-savvy player exactly when they're "safe," which may or may not be desirable tension.
- Should the indicator show *at all* before the player has ever triggered a ceremony (i.e., is this a mechanic worth spelling out up front, or something better discovered organically the first time it saves you)? Right now nothing in `TitleScene` or onboarding explains the Balder mechanic at all.

## 2. Player "HP" visibility

**What's actually happening today — this is the important finding.** The game has no HP or damage-accumulation system. It's a single-hit-death design: `mod.js`'s comment: *"the catch check runs ONLY inside the LUNGE window, and LUNGE is reachable ONLY through a full TELEGRAPH. Comment hits and the scrollbar yank reposition and pressure — they NEVER catch."* A "ratio'd" comment hit (`onCommentHit()`) does zero damage to the player — it just gives the mod a 1.4s speed burst (`mod.burst()`) and a screen flash. The *only* things that matter to survival are: (a) do you have the blue shield pickup active (`pickups.shield`, single-charge, rendered as a ring around your cursor), and (b) does a lunge's `CATCH_RADIUS` (62px) actually connect while you have no shield.

So "getting ratio'd multiple times before I die" wasn't Bitz losing HP — those hits were cosmetically alarming (red flash, "ratio'd" text, camera shake) but mechanically inert. The actual "wiggle room" Bitz is asking about is entirely about two things that currently have **no HUD representation at all**:
- **Shield status** — only visible as a small blue ring literally on top of the cursor, easy to lose track of mid-chase, and gone the instant it's consumed with no re-confirmation of "you just used your only save."
- **Heat level** (`mod.heat`, 0–6) — this drives the mod's speed, aggression (throw/smash/yank thresholds), and animation, and is already in the HUD text as `heat ${this.mod.heat}` — but as a bare number next to the score, easy to not register as "how dangerous is this moment," especially since it climbs both from survival time and from karma greed (`KARMA_PER_HEAT: 900`).

**Given that, a literal "HP bar" would misrepresent the game** — it implies damage accumulation that doesn't exist, and could make death feel arbitrary ("I had HP left, why did I die") when actually every catch is fully deterministic (shield up + caught = safe; shield down + caught = dead). The useful fix is making the *existing* binary/discrete state legible, not inventing a new resource.

**Proposed fix — two small, cheap HUD elements, not a new mechanic:**
- **Shield indicator**: a fixed-position icon or pill near the score HUD (not just the ring on the cursor) that's present when `pickups.shield` is true and visibly pops/disappears on `absorb()`. This turns "did I still have my save?" from a guess into a glance.
- **Heat/danger meter**: replace or augment the bare `heat N` text with a short filled bar (0–6 segments matching `HEAT_MAX`) or a color-graded label (calm → agitated → frenzied), so escalating danger is felt spatially, not just read as a number in Courier New next to the score.

**Open questions for you:**
- Do you want the shield indicator to also convey *how* you'd get one back (i.e., hint at the pickup) or just current status?
- Any interest in a *third*, more literal safety signal — e.g., a subtle screen-edge vignette that intensifies as the mod's lunge range (`LUNGE_RANGE: 190`) is entered — as a "he's close enough to commit" cue, distinct from heat (which is about his general aggression, not immediate proximity)? This would speak more directly to "how much wiggle room do I have" than heat does.

## Suggested next step

Pick the visual language for each (ring vs. bar vs. number) and I'll implement both — they're additive HUD elements, no changes to the underlying fairness/catch logic required unless you also want the strict-`>` Balder edge case fixed.
