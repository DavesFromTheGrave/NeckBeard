# Neckbeard — Hackathon Sprint Plan

**Event:** Reddit "Games with a Hook"
**Deadline:** Wed **July 15, 2026, 8:00pm CDT**
**Plan updated:** Wed July 8, 2026 (start of 6-day final sprint)

---

## Guiding principle: de-risk the deploy BEFORE polishing

The server-side Devvit API integration (`server/index.js`) is complete. The arena
pulls real posts + comments from the host subreddit via `@devvit/web` reddit client.
Bugs from the July 5 playtester session (Bitz) are fixed. What's left is verification
on real Devvit + polish + the features below.

---

## KEY DESIGN DECISIONS (locked July 8)

### Score = karma (NOT time)
The score is karma farmed from posts (`this.karma`, formatted via `NB.fmtKarma()`).
There is no time-based score. Don't confuse this with `survivalMs` which only
gates the Balder ceremony. The title screen high-score panel and leaderboard
are all karma values.

### Balder ceremony → tag-in mechanic (replaces separate "Hard Mode")
**Old behavior:** ceremony fires → mod sucked underground → 4-8s later mod returns
as zombie revenant.

**New behavior (to implement):**
1. Balder ceremony fires (same as now: crack, elevator, Balder rises, mod sucked down)
2. **At ceremony end:** second mod (the YouTube Reddit Mod character) appears in his
   place — "tagged in" by management. Chases immediately.
3. **30 seconds later:** original mod crawls back as zombie revenant (`NB.spawnRevenant()`).
4. Now BOTH are chasing you. No separate difficulty UI — it emerges from surviving
   long enough to trigger Balder.

**Files to change:** `balder.js` — `NB.spawnRevenant()` becomes two-stage:
spawn second mod at ceremony end (`done()` callback), schedule original revenant
30s after that.

### Desktop size scaling (makes PC feel less boring)
On wide desktop screens the mod is easy to avoid because there's too much room.
Solution: scale the mod up on desktop — keeps the authentic Reddit page look,
just makes him scarier.

Add to bottom of `game/src/tunables.js` (after the `NB.IS_TOUCH` block):

```js
NB.IS_DESKTOP = !NB.IS_TOUCH && window.innerWidth > 900;
if (NB.IS_DESKTOP) {
  NB.TUNE.SPRITE_SCALE = 3.2;
  NB.TUNE.CATCH_RADIUS = 80;
  NB.TUNE.LUNGE_RANGE = 230;
}
```

Numbers are starting points — needs playtesting. ~40% bigger presence on wide screen.

### Fortune cookie ban reasons (death screen)
`main.js` `onCaught()` lines 560–565 currently hardcode:
- `'[ REMOVED ]'` — should randomly be `'[ REMOVED ]'` or `'[ BANNED ]'`
- `'Reason: none provided.'` — should pull from a shuffled pool, no repeats per session

Add `NB.BAN_REASONS` pool (~25 reasons) in `main.js` or a new `reasons.js`.
Shuffle once per session. Pull next reason each death. Social shareability:
"what reason did it give you?" Players compare.

### Mobile intro screen
`game/src/title.js` — the title art (`neckbeard-intro.png`) is landscape.
On portrait mobile (`H > W`) it renders tiny.

Portrait layout: black background, title text stack (arcade font), tagline,
"PRESS TO START" blink, score list as plain text below. No art overlay.
The landscape art stays for desktop — portrait gets its own code path.

### Second mod (YouTube Reddit Mod character)
Dave does all sprite art. Minimum viable art for integration:
- Walk cycle: 4-6 frames (same format as `mod-walk2-*.png` at 96px scale)
- Leap/lunge: 2-4 frames
- Run (optional but nice): 4-6 frames

Art goes in `game/assets/` with agreed prefix. Code will be wired in `mod.js`
or a new `mod2.js` once frames arrive.

---

## 6-Day Sprint: July 9–14, Submit July 15

### Day 1 — Wed July 9: Quick wins
**Code (no art dependencies):**
- Fortune cookie ban reasons (`main.js` `onCaught()`)
- Balder timer HUD indicator (fill ring near karma HUD, pulse last 5s, disappears after used)
- Shield status pill + heat bar (HUD elements from July 5 design note)
- Fix Balder strict-`>` edge case: snapshot `balderEligible` when threshold crosses
- Smash visibility: increase `SMASH_MS` from 640→~1400ms so hammer pose stays on screen long enough to register (`tunables.js`)

**Dave:** Start second mod walk cycle (4-6 frames, 96px scale)

### Day 2 — Thu July 10: Mobile title + Devvit verify
**Code:**
- Mobile portrait title screen (`title.js`)
- Mobile swipe-left sub picker: swipe left → overlay of favorited subs → tap to hop.
  Desktop keeps the real Reddit sidebar. Mobile gets this gesture-based escape in-canvas.
  Replaces the missing sidebar on mobile — same mechanic, different input.
- `devvit playtest` end-to-end — first verification on real Reddit
- Fix whatever breaks in the Devvit sandbox

**Dave:** Playtest on phone. Note layout/touch issues.

### Day 3 — Fri July 11: Reddit integration + second mod skeleton
**Code:**
- Verify/fix arena from real subreddit (posts + comments as projectiles)
- "Who died here" o7 swarm: POST `/api/death` on catch → Redis sorted set;
  GET `/api/deaths/recent` on death screen → real player names in o7 swarm
- Second mod skeleton (`mod2.js` or extension of `mod.js`), placeholder art
- Desktop scaling tunable (`IS_DESKTOP` block in `tunables.js`)

**Dave:** Finish walk frames, start run if time allows

### Day 4 — Sat July 12: Tag-in mechanic + Redis leaderboard + meme wiring
**Code:**
- Balder ceremony tag-in: wire second mod spawn at ceremony end,
  schedule original revenant 30s after (`balder.js`)
- Wire Dave's second mod art (preload + Phaser anims)
- Redis karma leaderboard: `/api/leaderboard` → top-10 karma for this subreddit
- Title screen fetches and renders live leaderboard
- **Meme asset wiring pass:** go through all 34 memes in `memes.js`, match each
  to best audio/image from Dave's haul, confirm fx type fits meme personality
  (e.g. Trollface → decoy, Shoop Da Whoop → stun, GTA Wasted → knockback),
  wire into `NB.MEME_ART[]` and `NB.MEME_AUDIO[]`
  **Dave:** Move `C:\Users\Dave\Desktop\memes\` into project folder before Day 4

**Dave:** Deliver remaining second mod frames

### Day 5 — Sun July 13: Polish + mobile test + onboarding
**Code:**
- Audio pass (verify all `NB.sfx.*` calls have working audio)
- First-time onboarding overlay (3 lines, 4s, sessionStorage flag)
- Mobile touch pass (farm targets, search input, tap targets)
- Edge cases: Balder + two mods, revenant + second mod, heat 6 dual chase

**Dave:** Full playthrough on phone. Final creative call on "The Admin" name.

**Dave:** Polish Balder ceremony animation — the scripted event needs actual animation work, not just code beats.

- Balder ceremony CG cutscene: Dave generates 3-5s video clip in Grok (not pixel art,
  full cinematic) using Balder reference art. Code plays it fullscreen when ceremony
  fires — pixel game freezes → video plays → game resumes. Real cutscene, not tweens.

### Day 6 — Mon July 14: Build + submit
- `devvit upload` final build
- Submission writeup (what it is, the hook, how to play)
- Demo gif/video
- Demo post in submission subreddit
- **Buffer day** — submit early afternoon, not 7:59pm

---

## Owner split
| Who | Does |
|-----|------|
| Only Dave | Reddit account + `devvit login`, test subreddit, all sprite art, naming calls, clicking submit |
| Code side | All implementation, Devvit config, build/upload mechanics, writeup draft |

## Three risks to watch
1. **Devvit never verified on real Reddit** — Day 2 resolves this or sounds the alarm
2. **Second mod art arrives late** — if not by Day 4 morning, ship polished base game
3. **Submission form has unknown requirements** — paste the actual form requirements ASAP

## Confirm before starting
- Official submission requirements (video? writeup length? public app? demo in specific sub?)
- Devvit login + test subreddit confirmed?
