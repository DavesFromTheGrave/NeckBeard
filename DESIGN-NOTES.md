# Neckbeard-Devvit — Design Notes (hackathon build)

Working notes for the Reddit "Games with a Hook" entry. Locked decisions marked ✅,
open questions marked 🔶. The extension repo's DESIGN.md remains the mechanical
bible (fairness invariant, state machine); this file covers what's new for the port.

## Cast

- **Supermod** (the moderator) — the villain. Chases the player's finger/cursor.
- **Baldur** — company mascot. Appears in-game ONLY via the near-miss intervention
  (below). Never a combatant.

## Animation manifest (96px lowres set, art/sprites/lowres in the Neckbeard repo)

| Action | Frames | Status |
|---|---|---|
| walk | 6 | ✅ usable (real stride motion, diffs 13-26) |
| run | 6 | 🔶 too samey (diffs ~9-11) — regen or hand-fix 2-3 frames |
| idle/breathe | 3 | ✅ generated from pose-1 (stomach puff + shoulder bob) |
| climb-over | 4 | 🔶 missing — art queue |
| hang | 1-2 | ✅ pose-2 (arms overhead) |
| crawl | 4 | 🔶 pose-3 is frame 1 — needs 2-3 more |
| lunge | 2-3 | 🔶 pose-4 + mod-lunge are key frames — needs 1 tween |
| stumble | 1-2 | ✅ pose-5 |
| victory/catch | 1 | ✅ pose-6 |

Left/right = same frames, engine mirrors (flipX). No separate art needed.

## Hammer throw ✅ (design accepted, build later)

Ranged attack that OBEYS the fairness invariant: big windup telegraph, hammer
spins across the arena, on hit it KNOCKS BACK the player / destroys cover —
never catches. While the hammer is in flight Supermod is unarmed = punish window.
It is the ranged sibling of the scrollbar yank: repositions the fight, never ends it.

## Baldur intervention ✅ trigger / 🔶 choreography

- **Trigger (locked):** a lunge near-miss AND total survival time past a threshold
  (tunable). Fires the SAME scripted sequence every time — it is a set-piece, not
  a variation pool.
- **Effect after sequence (locked):** chaos/difficulty escalates (management has
  noticed you).
- **Rule (locked):** Baldur never touches the player, never touches Supermod.
- **Choreography ✅ DELIVERED (Dave, 2026-07-04 ~02:38):**
  - **Trigger (revised):** you survive LONGER THAN ~60s (tunable) and THEN get
    caught — instead of instant death, the Baldur event plays. One time per run.
  - **The sequence:**
    1. Catch freezes — no [ REMOVED ] yet
    2. A crack splits open in the ground; a SLICK GOLD ELEVATOR rises out
       (Dave: he's too good to crawl out; "slick one, made of gold or some
       shit — I'll let you figure that part out" = detailing delegated)
    3. Baldur steps out (suit-vest canon look, cigar)
    4. A crack opens UNDER SUPERMOD — Baldur SUCKS HIM INTO THE GROUND
       (the physical beat: swift, effortless, management-grade violence)
    5. Player is SPARED — the run continues
    6. **When Supermod comes back up... he comes back as REVENANT** (the
       escalated form — the true endgame tier)
  - Reading: it's not mercy, it's a performance review. You were good enough
    prey that the employee gets disciplined — and replaced with something worse.
  - Art needs: gold elevator asset, Baldur emerge/gesture, Revenant-Supermod
    skin (zombie set is the natural base). Placeholders acceptable for jam.

## THE GIMMICK ✅ (locked 2026-07-04, Dave: "exactly what I was trying to get")

**The game eats the subreddit it's posted in and makes you survive inside it.**

The arena is built from REAL Reddit data fetched by the Devvit app at run start:
actual hot posts of the host subreddit (titles, usernames, vote counts), real
comments. Not a fake internet — a re-staging of the live one. "It plays on the
pages of Reddit" stays true, which is the magic the extension had.

- **MECHANICS ARE LOCKED (Dave, 2026-07-04: "I loved the way that it moved
  already"):** the prototype's chase feel — free 2D movement, climb-slowdown
  over cards, telegraph/lunge fairness — ships AS IS. Pac-Man/maze idea is
  DEAD (it was only a fallback for when we thought real pages were impossible).
  Do not corridor-ify movement; post cards stay climbable furniture, not walls.
- The mod throws REAL comments as projectiles
- Every subreddit = a different level for free (content is the geometry) —
  this IS the community-layouts/User-Contributions play: crosspost = new arena
- Side-view sprites stay (top-down was considered and rejected — obsoletes
  the whole processed cast; corridor chase gives the Pac-Man feel instead)
- Scrolling long level, Phaser camera follows the action

## Player-facing actions still to spec

- Touch-first: finger = the hunted cursor. Viewport-fit UI. (Jam bonus for mobile.)
- Death ritual: [ REMOVED ] screen + o7 salute swarm of real player deaths
  (redis + realtime). Locked earlier — see Muninn 2026-07-02 night entry.
