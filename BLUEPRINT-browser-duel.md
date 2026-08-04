# Blueprint — Neckbeard v2: the browser duel

> **⏸ PICK UP HERE:** ask David what he decided on — **Baldur.** (He'll know.)
> Everything below the line about Baldur-as-antagonist is the OLD, WRONG spine —
> left stale on purpose. Don't act on it until the Baldur question is settled.

**Status:** Post-hackathon exploration. Nothing here is decided. This doc captures the
thinking from the 2026-07-21 conversation and foregrounds the open forks. It is a
thing to ponder against, not a plan to execute.

---

## 0. Why this doc exists

The shipped Devvit game is a competent chase toy. Dave's honest read: the *idea* is
much bigger than what got built, and the build undershot it — deadline, Devvit
sandbox, and the fast path on art (pixel Baldur instead of the illustrated one).

The shortfall is about time + platform, not ability. The interesting version is still
unbuilt. This blueprint is about that version.

---

## 1. The one-sentence vision

> **A losable, real-time fight that plays out over the web page you're actually on —
> Animator vs. Animation, but a *game* you can lose, with Baldur as the living
> antagonist and the real DOM as the arena.**

---

## 2. Reference lineage (so "more" is specific, not vague)

- **Xiao Xiao** (Zhu Zhiqiang, 2001) — the granddaddy of stick combat. No. 3 = the
  kung-fu fight. No. 9 (2002) = the *interactive* one (you're the sniper). Predates AvA
  by ~5 years. Dave's verdict on No. 9: **cop-out** — the viewer aims, but it's still
  on rails. Not the target.
- **Madness Combat** (Krinkels, 2002) — brutal gun-fu stick fights. Genre-definer.
- **Hyun's Dojo / Terkoiz / Oxob3000** — the post-AvA community that made stick combat
  *fluid* and choreographed. This is the fight-craft bar.
- **Animator vs. Animation** (Alan Becker, 2006) — the **environment-as-opponent** twist:
  the figure fights its creator and the software UI itself. This is the interaction model.

**What "more than AvA" means:** AvA's environment-interactivity + Hyun's-Dojo fight
choreography + *actual losable-game stakes*. All three at once, on a real web page.

---

## 3. The proven mechanic we already own

The shipped game's entire fairness rule is the **telegraph**: the mods / Baldur can only
catch you inside a lunge window, behind a full tell. That is exactly the engine a
losable duel runs on. We didn't build a chase game — we built a *readable-threat*
system and only used it for one move.

**The v2 game is that same principle scaled into a full moveset.** This is not a new
genre invented from zero; it's an extension of a mechanic already shipped and understood.

Combat spine:
1. **Both sides can die.** Player has a stake; antagonist has HP / a defeat state.
2. **Antagonist attacks telegraph** — lunge, DOM-rip, tab-slam, hide-and-ambush — and
   the player either **dodges** or **counters**. The counter window (telegraph → punish)
   is the skill ceiling and the thing that makes "fair but hard" work.
3. **Player attacks have windup too** — no omnipotence spam. The antagonist can break or
   dodge them.
4. **Escalation** — an AvA-style powers arms race. 60 seconds in, it's a different fight
   than second 5. This is what keeps the loop from being shallow.

---

## 4. OPEN DECISION 1 — Who do you play?

The single biggest fork. It determines the control scheme and everything downstream.
**Undecided. Dave is pondering.**

### Option A — You are the ANIMATOR (the god-hand)
- **Control:** cursor + tools. Point-and-click / god-hand.
- **Feel:** director, not fighter. Omnipotent-but-clumsy.
- **Risk:** the cursor is a blunt, abstract instrument. Fighting *with* it is imprecise.
  Pure omnipotence tends toward "authored animation on rails," which is the thing Dave
  explicitly rejected ("then it's a story game you just follow along").
- To stay a *game*, the animator must be able to lose — so the antagonist needs real
  agency against you even while you hold god-tools.

### Option B — You are the STICK FIGURE (the little guy) — *currently the stronger read*
- **Control:** a body. Keyboard / direct avatar control. Move, dodge, climb, jump, hit.
- **Feel:** kinetic, legible, underdog. The role people *already root for* in AvA.
- **The antagonist is Baldur, embodied** — not an abstract cursor. Split-face demon exec
  hunting you through the page. Keeps our #1 asset (the character) on screen as the star
  villain. (Dave's point, 2026-07-21: "It doesn't have to be a cursor. It can be Baldur.")
- **The environment gets richer:** DOM elements are platforms, the scrollbar is a
  zipline, you hide behind images, climb the address bar, get swatted off a button.
- **Theme gets *tighter*, not looser:** you're the little user / poster / creature; the
  antagonist (mod / Baldur) is the banhammer force trying to delete you off the page.
  Dead-on Reddit. Baldur = final boss.
- **Costs:** control moves to the keyboard; capturing input cleanly over arbitrary live
  sites is its own problem. The antagonist becomes an AI boss that must be fair-but-
  threatening (same combat-AI problem, inverted).

### The tradeoff in one line
Animator = power fantasy, blunt controls, drifts toward on-rails.
Stick figure = underdog fantasy, kinetic controls, richer arena, tighter theme, but
keyboard-over-live-pages and a real boss AI to build.

---

## 5. OPEN DECISION 2 — What are the stakes? (what dies)

Whichever POV, "you can lose" needs a concrete loss condition. **Undecided.**

1. **The avatar/cursor itself is vulnerable** — it can be caught, pinned, dragged,
   deleted. You are target *and* means. Tense, minimal, pure.
2. **You defend an objective** — a core, an avatar, the page — and your movement/tools
   are how you protect it.
3. **Shared control bar / tug-of-war** — you and the antagonist fight over "who controls
   the page." Hits zero, you lose.

(Option 1 pairs most naturally with the stick-figure POV: Baldur catches the little guy =
death, which is exactly the shipped game's catch rule, just with the roles' emotional
weight flipped onto a protagonist you root for.)

---

## 6. OPEN DECISION 3 — Control scheme

Falls directly out of Decision 1:
- Animator POV → mouse/cursor primary.
- Stick-figure POV → keyboard primary (WASD-ish + action keys), mouse possibly for the
  antagonist's-eye or aiming secondary.

---

## 7. Technical reality — the browser-extension vehicle

**Why the extension (not Tampermonkey, not a store game):** it's the easiest way to get
a game that *interacts with the real browser* to actually work. Chosen for **capability,
not commerce** — it's a bad sales channel (Chrome killed paid extensions / in-app
payments), but it's the right tool to own a layer on top of the live web. Tampermonkey is
strictly more hacky, less capable, worse distribution.

**What the extension gives:** a content script injects a full-viewport transparent
overlay onto any page; a background service worker for persistence; real `chrome.*` APIs;
one-click Web Store install. The overlay is where the game (already Phaser/JS — ports
almost directly) renders. The new capability is reading/manipulating the *real* page as
the arena.

**Constraint wall (know these now):**
- **MV3 service workers are ephemeral** — they sleep. Fine if game state lives in the
  page; annoying for a persistent background sim.
- **CSP / cross-origin pages** — strict-CSP sites (banks, etc.) will block injected
  canvas/script. Want an allowlist / "not on these pages" anyway, for taste as much as tech.
- **The annoyance line** — a thing that messes with your real browsing is delightful for
  5 minutes and hostile by minute 30. Design has to be **summoned, not ambient**: user
  opens it, plays a round over the current page, closes it. That line is the difference
  between "toy I show friends" and "uninstall."
- **Performance** — a Phaser overlay on top of a heavy modern web app can jank. Overlay
  canvas + strict pointer-events discipline matters.

---

## 8. What's reusable from the shipped build (the low-cost argument)

- **Engine:** already Phaser/JS = web tech. Porting off Devvit is low effort.
- **Telegraph fairness system** — the core of v2's combat, already built.
- **Art / IP:** Baldur (`baldur-hero.png` is the *good* illustrated one, arms wide,
  split face — already in-repo), superM0D, redditM0D, the whole cast.
- **The "webpage as play space" architecture** — the shipped game already simulates a
  page (`scene.page.elements`, reflow, shake). v2 deletes the *fake* page and drops the
  same loop onto the *real* one. Conceptually 80% there.
- Cutscene / meme-beat systems, SFX, teleport sequences.

---

## 9. The honest hard part

Not the art. Not the extension plumbing. It's the **combat**:

> A losable real-time duel against an AI that manipulates the real page is a
> combat-design problem, and that problem is ~80% of whether this is good.

- If the antagonist isn't **fair**, losing feels like cheating.
- If it isn't **threatening**, you're back to on-rails.
- If its DOM-destruction reads as a **glitch** instead of a **fight**, the illusion dies.

The whole project lives or dies on the boss AI + telegraph legibility. Everything else is
tractable.

---

## 10. Sales / ROI honesty (for completeness)

- The **mechanic** (cursor-dodge) is a commodity — doesn't sell on its own.
- The **IP** (Baldur, superM0D, the humor, the POV) is the only distinctive asset.
- The extension is a **funnel**, not a product you sell. If money is ever a goal, the
  sellable channel is mobile / itch / a cheap Steam microgame — *lead with the character
  and the AvA-duel hook, not "dodge the cursor."*
- Because it's already web tech, the cost to *try* another target is low → even modest
  returns are positive ROI. The build already paid for part of itself in capability.

---

## 11. Questions to sleep on

1. **Animator or stick figure?** (Decision 1 — everything hangs on this.) Does being the
   small one hunted through a real page by Baldur feel right, or are you attached to the
   god-hand power fantasy?
2. **What dies** when you lose? (Decision 2.)
3. Is it **summoned** (open → play a round over this page → close) or something more
   ambient? (Strongly leaning summoned, for the annoyance-line reason.)
4. How **fluid** does the fight need to be — Hyun's-Dojo choreography, or readable-but-
   simpler? (Sets the animation budget, which is the other big cost.)
5. Is v2 a **from-scratch build** or a **fork of the shipped Phaser code**?
