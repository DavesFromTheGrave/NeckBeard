# Neckbeard-Devvit — Design Notes (hackathon build)

Working notes for the Reddit "Games with a Hook" entry. Locked decisions marked ✅,
open questions marked 🔶. The extension repo's DESIGN.md remains the mechanical
bible (fairness invariant, state machine); this file covers what's new for the port.

## Cast

- **Supermod** (the moderator) — the villain. Chases the player's finger/cursor.
- **Balder** — company mascot. Appears in-game ONLY via the near-miss intervention
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

## Balder intervention ✅ trigger / 🔶 choreography

- **Trigger (locked):** a lunge near-miss AND total survival time past a threshold
  (tunable). Fires the SAME scripted sequence every time — it is a set-piece, not
  a variation pool.
- **Effect after sequence (locked):** chaos/difficulty escalates (management has
  noticed you).
- **Rule (locked):** Balder never touches the player, never touches Supermod.
- **Choreography: 🔶 DAVE IS WRITING IT.** Do not invent beats. Slot in his
  sequence when delivered.

## THE GIMMICK ✅ (locked 2026-07-04, Dave: "exactly what I was trying to get")

**The game eats the subreddit it's posted in and makes you survive inside it.**

The arena is built from REAL Reddit data fetched by the Devvit app at run start:
actual hot posts of the host subreddit (titles, usernames, vote counts), real
comments. Not a fake internet — a re-staging of the live one. "It plays on the
pages of Reddit" stays true, which is the magic the extension had.

- Post cards = terrain/walls; gutters between them = chase lanes (Pac-Man
  corridor readability WITHOUT a designed maze — the feed layout IS the maze)
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
