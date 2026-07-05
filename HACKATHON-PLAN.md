# Neckbeard — Hackathon Finish Plan

**Event:** Reddit "Games with a Hook"
**Deadline:** Wed **July 15, 2026, 8:00pm CDT**
**Planned:** Sat July 4 (11 days out)

## Guiding principle: de-risk the deploy BEFORE polishing

The classic way to lose a hackathon is to spend 10 days making the game
beautiful *locally*, then discover on day 11 that it won't run inside Devvit
or that the real-subreddit hook is blocked in their sandbox. So the scary
unknowns go first, polish goes last.

### The three biggest risks (resolve early)
1. **It has never run inside real Devvit / on real Reddit** — only locally,
   and even that was awkward this session (headless-tab throttling).
2. **The whole hook is unproven in production.** The arena data currently
   comes from a dev-only `fetch('reddit.com/.../hot.json')` (+ pullpush.io
   fallback). `reddit-fetch.js:3` already flags that production must use the
   `@devvit/web` server `reddit` client instead — that swap isn't done. Devvit's
   first-party API is also *better* for the hook: it hands you the host
   subreddit's real posts/comments with no external fetch to get blocked.
3. **Mobile.** Reddit is mostly mobile. The finger-as-cursor control and the
   header search `<input>` (native keyboard) need real-device testing.

---

## Phase 1 — De-risk the deploy (Sat–Mon, Jul 4–6)
**Goal:** an ugly-but-real build running in a test subreddit, on desktop AND
the Reddit mobile app, built from that subreddit's real posts/comments.

- **Dave:** create/confirm the Reddit dev account, `devvit login`, spin up a
  private test subreddit to playtest in. *(Only you can do the account side.)*
- **Me:** swap the arena source from external reddit.com fetch → Devvit's
  first-party `reddit` API (host sub's real posts + comments); wire
  `devvit playtest`; get it loading in the iframe; fix whatever breaks in the
  sandbox.
- **Milestone:** you open the test post on your phone and play a real round
  built from that subreddit. **If this slips, everything else waits.**

## Phase 2 — Core feel + lock mechanics (Tue–Thu, Jul 7–9)
**Goal:** the chase genuinely reads as "animator vs animation."

- **Dave:** playtest the juice added this session (hit-stop, camera shake,
  telegraph zoom, squash/stretch) in a real browser; say what still feels off;
  iterate with me until it's right. Fill any missing art frames.
- **Me:** tune to your feedback; balance difficulty (heat ramp, fairness,
  telegraph timing); make the vault/climb trigger reliably on real post cards;
  polish the Balder ceremony + Revenant.
- **Milestone:** mechanics locked; it feels like the prototype you wanted.

## Phase 3 — Make the hook REAL + polish (Fri–Sun, Jul 10–12)
**Goal:** turn the mocked bits into actual Reddit — this is what judges reward.

- **Me:**
  - **Real "who died here" + leaderboard** via Devvit **redis + realtime**
    (death screen already marks the swap point). Real usernames of everyone
    caught in *this* subreddit; real survival-time leaderboard.
    - *Minimum:* real usernames on the death screen.
    - *Stretch:* live realtime leaderboard.
  - Final Reddit 1:1 fidelity pass. Audio pass. First-time onboarding
    (5-second clarity for a brand-new player).
- **Dave:** creative calls — final name for the mod/"The Admin" if changing,
  splash-card art, app description + icon.
- **Milestone:** the hook is real, not simulated; game feels finished.

## Phase 4 — Submission + buffer (Mon–Tue, Jul 13–14 → submit Wed Jul 15)
- **Both:** `devvit upload`/publish; write the submission (what it is, the
  hook, how to play); record a short demo video/gif; make the demo post; fill
  out the hackathon submission form.
- **Keep Wed Jul 15 daytime as pure buffer.** Submit early afternoon, not
  7:59pm.

---

## Confirm before we start (I can't see these)
- **Official submission requirements + form.** Working off the Jul 15 8pm CDT
  date from memory — paste the real rules (video? writeup length? public app?
  demo post in a specific sub?) so I plan to them exactly.
- **Scope of the subreddit-search feature for v1.** Recommend v1 ships with
  just the **host subreddit** (simplest, most reliable, no external-fetch
  allowlisting), and the "type any cursed sub" search + external fetch is a
  **stretch** for Phase 3 if time allows. Veto if you want it in v1.

## Owner split at a glance
- **Only Dave:** Reddit dev account + login, test subreddit, all art, final
  creative/naming calls, clicking submit.
- **I'll drive:** the Devvit port (reddit API swap, sandbox fixes), redis
  leaderboard, feel/balance tuning, fidelity + audio + onboarding, build/upload
  mechanics, the writeup draft.
