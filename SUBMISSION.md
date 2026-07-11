# NECKBEARD — Devpost Submission (Reddit "Games with a Hook")

**Portal:** https://redditgameswithahook.devpost.com — project at
`devpost.com/software/neckbeard` · **Status: DRAFT, 3/5 steps done** ·
deadline Wed **July 15, 2026, 8pm CDT**.

## Hard requirements (from the Submit page "REMEMBER")
1. **Video must be 1 minute or less** if submitted (optional but capped at 1:00).
2. App **uploaded to developers.reddit.com** — DONE (`neckbeard-supermod`).
3. **Testing subreddit must be PUBLIC**, and link judges to **one example game
   post** in that subreddit. ⚠️ current playtest sub `r/workspace_warden_dev`
   is a dev sub — need a PUBLIC sub with a game post for judges.
4. Submit the **feedback survey** to be eligible for the feedback award.
5. Agree to Official Rules + Devpost ToS (checkbox on Submit).

## The 5 form steps
1. **Manage team** ✅ — solo (David Fisher / u/DavesFromTheGrave).
2. **Project overview** ✅ — name `NECKBEARD`; elevator pitch *"A banned Reddit
   moderator claws out of your subreddit and hunts your cursor across it,
   wrecking every post he touches. Your goal is to farm as much karma as you
   can before he destroys it all."*; thumbnail set (JPG/PNG/GIF, 5MB, 3:2).
3. **Project details** ✅ — public story (below); Built with: `javascript,
   html5, phaser-3, devvit-web, reddit, hono, node.js, esbuild`; "Try it out"
   links (confirm these point at the public sub post + GitHub).
4. **Additional info** ⬜ — Reddit username `u/DeadOfTheDave`;
   app page `https://developers.reddit.com/apps/neckbeard-supermod`;
   **Link to test post** (needs PUBLIC sub — see req #3); optional "most
   helpful user" nomination; "Did you use Phaser?" = **Yes**.
5. **Submit** ⬜ — T&C checkbox → Submit (editable until deadline).

## What's left for Dave
- [ ] Make a **PUBLIC** subreddit, post the game there, grab the post link.
- [ ] (Optional) ≤60s demo video.
- [ ] Fill Additional info + agree T&C + hit Submit.
- [ ] Submit the feedback survey.

## NOTE — the public Project Story undersells the build
Dave's story (below) lists the **leaderboard, mobile pass, and more meme
pickups as "What's next"** — but all three are SHIPPED (v0.0.9–0.0.20:
Redis subreddit leaderboard w/ names, full mobile layout, expanded memes,
personalized subs, the cutscene + tag-team endgame). Worth moving those from
"what's next" into "what it does / accomplishments" so judges see them.

---

## Project Story (as submitted — Dave's words)

## Inspiration
I've always liked the _Animator vs. Animation_ style of chase, a drawn
character breaking loose and turning on whoever made it. When Reddit announced
this hackathon with Phaser, the twist was right there: what if the thing chasing
you wasn't animation software, it was a moderator, and the canvas wasn't a
drawing program, it was Reddit itself?

**SuperMOD** is a banned Discord moderator who claws his way onto Reddit's front
page to hunt the cursor of whoever's trying to farm karma illegitimately.

## What it does
**NECKBEARD** recreates the actual subreddit it's posted in, matched to whether
you run Reddit in light or dark mode. _SuperMOD_ spawns behind a basement door
and starts hunting your cursor across your own real feed. Every post he touches
takes damage that never repairs for the rest of the run: hairline cracks, then a
shard punched clean through the card, and it stays that way even if you run to
another subreddit and come back.

You're not just running, you're farming karma. Stand on a fresh post and a quick
sequence of targets pops up that you have to track your cursor onto in order, on
a tight timer, while he's closing in. Farm a post he's mid swing on and it pays
double. Survive long enough and instead of a normal death, a gold elevator rises
up out of the floor: management steps out for a "promotion review," and
_superMOD_ gets dragged under, coming back stronger as a Revenant.

## How I built it
**Devvit Web** and **Phaser 3**. The arena comes from Reddit's first-party
server API, not a mockup: the hot posts, comments, and images you're farming and
fleeing through are the real posts from the subreddit the game is posted in.
Real comments get ripped off the page and thrown at you as projectiles.

Damage is a persistent per-element number that only ever goes up, drawn in three
visible stages with Phaser Graphics, no pre-baked damage sprites. The chase runs
on a small state machine (lurk, hunt, telegraph, lunge, stumble) with one rule I
never broke: a catch is only possible inside a telegraphed lunge. Every other
attack, a thrown comment, a scroll bar yank, a sledgehammer swing, pressures or
repositions you but never kills. No cheap deaths.

## Challenges I ran into
Getting anything running inside Devvit's actual sandbox was the scary part, and
it bit me more than once. The sandbox doesn't run npm install, so the server has
to ship as one fully bundled file, not a loose module tree. I also hit a
recursion bug where my own dev script was calling `devvit playtest` from inside a
script that `devvit playtest` itself was already running, which showed up as port
conflicts and "AppVersion already exists" errors until I tracked it down.

The other one looked like a "damage doesn't reset" bug but was a Phaser texture
problem: a background-removal pass was compositing on top of an already-processed
canvas every time the scene restarted, degrading a couple of sprites a little
more each life.

## Accomplishments that I'm proud of
The Reddit fidelity is the biggest win. The game opens on a page that actually
looks like Reddit, not a cartoon of it, in whichever theme you already run. The
destruction system turned out exactly like I wanted: by the end of a good run,
the subreddit looks like a warzone, and it stays that way.

## What I learned
The scoring model changed after real playtesting. It started as "how long did
you survive," which is passive, you just run away and wait. Watching someone
actually play it (including my 16-y/o) made it clear the loop needed a reason to
move toward danger, not just away from it. Karma farming, and then turning that
farming into an active aim challenge instead of a hold-still timer, came straight
out of that one session.

## What's next for NECKBEARD
A real subreddit-wide leaderboard backed by Reddit's and Devvit's realtime
channel, so the death screen shows actual usernames of everyone caught in that
community, live. More meme-powered pickups. A mobile pass, since most of Reddit's
traffic is touch-first and that's where this game needs to actually work.
