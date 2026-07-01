## Findings: Neckbeard M1 Blueprint Verification

### BLOCKER Issues (Architecture/Scope Misalignment)

**BLOCKER-1: State Machine Tier — Blueprint Omits "Revenant" State**
- **DESIGN.md spec:** `Dormant -> Lurking -> Hunting -> Revenant -> Caught` (line 13)
- **Blueprint spec:** `Dormant -> Lurking -> Hunting -> Caught` (Section 3, State Transitions)
- **Issue:** Blueprint explicitly cuts Revenant to M2 ("design so they bolt on WITHOUT rework"). DESIGN.md describes Revenant as the core escalation path, not optional. The state machine is incomplete.
- **Verdict:** CONFIRMED
- **Failure scenario:** When a player survives long enough, blueprint has nowhere to escalate — the game loops Hunting->Caught with no difficulty progression. DESIGN.md intends Revenant to appear after a survival threshold, introducing the Undead Anime Waifu and paler sprite. Without this state, the feel is flat.
- **Fix:** Either (a) **Accept M1 scope narrowing explicitly** in the plan and justify why omitting Revenant doesn't break fairness/feel. Rationale: Revenant requires a second sprite tier + Waifu collision logic; M1 uses base tier only, survival threshold is not reached in typical M1 playtests. OR (b) **Include Revenant stub in M1** — no Waifu, but Neckbeard resprites to a "drenched" version of base tier (recolor + pose change, not a new sheet) and speed increases by 1.3×. Transitions at a fixed 60-second survival mark. Collision remains single-pursuer (no Waifu). This is minimal and keeps the state machine intact.
- **Recommendation:** Choose (b) — single-sprite Revenant. Keeps the architecture clean for M2 (which just swaps in the real Waifu logic) and honors the DESIGN.md core loop. Adds ~30 min of work (sprite recolor, speed multiplier logic, one transition timer).

---

**BLOCKER-2: Missing Blueprint for Post-Catch Persistence States**
- **DESIGN.md spec:** "collectibles/meta-progress persist, per-round state doesn't" (line 19). Also: "Chaos Meter," achievement unlocks, personality wear states.
- **Blueprint spec:** Only personalBestMs persists in M1. No Chaos Meter, no achievements, no wear-state progression.
- **Issue:** Blueprint treats Caught -> reset as a hard wipe of all state. But DESIGN.md hints that meta-progression (collectibles found, achievements) bridges encounters. The blueprint's current cut is reasonable for M1 scope, BUT the storage schema must be designed so M2 can add these without refactor.
- **Verdict:** PLAUSIBLE (not a blocker if M2 migration is explicit)
- **Failure scenario:** In M2, adding persistent meta-state requires redesigning chrome.storage.local keys and game-state accessors. If the blueprint assumes state is always ephemeral, M2 must rewrite the persistence layer.
- **Fix:** Extend Section 6 (Storage Schema) to show a **M1 placeholder** for Chaos Meter and achievements (empty objects, never modified in M1, but reserved in storage schema). Example:
  ```javascript
  {
    "personalBestMs": 145000,
    "chaoseMeterLevel": 0,  // M1: always 0, no code modifies it
    "achievementsUnlocked": {},  // M1: empty, M2 populates
    "collectiblesFound": {}  // M1: empty, M2 populates
  }
  ```
  This way M2 just populates these keys; no schema refactor needed.
- **Recommendation:** Update Section 6 to show M1 schema with reserved keys. Clarify that M1 code never touches them (all reads return 0 / empty).

---

### MAJOR Issues (Fairness, Accessibility, CSP)

**MAJOR-1: Revenant+Waifu Dual-Pursuer Collision Not Specified**
- **DESIGN.md spec:** "Revenant... accompanied by the much-faster Undead Anime Waifu" (line 18). "after Revenant triggers, the Waifu drags him along, keeping the actual danger from dipping" (line 33).
- **Blueprint spec:** Physics section defines single-pursuer hitbox (radius 16px). No mention of dual-pursuer collision, Waifu stacking, or hitbox-merge logic.
- **Issue:** When M2 adds the Waifu, the physics engine must handle two hitboxes. Blueprint's current architecture (single `pursuerPos`, single hitbox radius) doesn't reserve space for this. Will require refactoring `physics.js` to track `pursuerA` and `pursuerB` separately.
- **Verdict:** CONFIRMED
- **Failure scenario:** M2 sprint: add Waifu sprite, but collision logic breaks because `pursuerPos` is a single object. Must refactor game-state and physics without breaking M1.
- **Fix:** In Section 5 (Physics Model), add a comment:
  ```javascript
  // M1: single pursuer (Neckbeard).
  // M2: add pursuerWaifu as a second chaser.
  // For M2 readiness, design hitbox to OR the two positions (catch if either overlaps cursor).
  ```
  Also, reserve `window.NB_GAME_STATE.pursuerWaifuPos` in Section 3 (State Machine) as `null` in M1, populated in M2.
- **Recommendation:** Add M2-forward-compatibility note. No code change needed for M1; just document the expansion point.

---

**MAJOR-2: Panic Key Duration Not Tied to Use Case**
- **DESIGN.md spec:** "single hotkey hides all UI for N seconds (presentations, screen-shares)" (line 120).
- **Blueprint spec:** Panic key hides UI for 5s (Section 7, Table).
- **Issue:** 5 seconds is arbitrary. During a screen-share, if the pause is too short, UI re-appears mid-demo. If too long, UI stays hidden longer than needed. DESIGN.md doesn't specify N, but the use case (screen-shares) implies the caller might want tunable duration.
- **Verdict:** PLAUSIBLE
- **Failure scenario:** User presents to a team, Neckbeard sprite appears, hits panic key. UI hides for 5s, but the demo is 10 minutes long — UI re-appears partway through. User hits panic key again, UI hides for another 5s. Feels clunky.
- **Fix:** Make duration tunable. In `config/tunables.js`, expose `PANIC_KEY_DURATION_MS` (default 5000). Optional UX: hold Alt+P to keep UI hidden indefinitely, release to unhide. Or: panic key toggles, each press re-locks for 5s. Document the design choice.
- **Recommendation:** Use toggle (Alt+P once = hide; Alt+P again = show immediately) rather than fixed duration. Simpler, less friction during demos.

---

**MAJOR-3: prefers-reduced-motion Scope Incomplete**
- **DESIGN.md spec:** "respect `prefers-reduced-motion`, offer a no-jump-scare mode" (line 119).
- **Blueprint spec:** Only mentions suppressing frame-stepping animation (Section 5). No mention of:
  - Screen shake on catch (is it suppressed?)
  - Lunge speed ramping (is it instant, or smooth?)
  - Game-over screen fade transitions (instant or animated?)
  - Gnome jump-scare variant (covered in M1 cut list, but not mentioned as accessibility-related)
- **Issue:** Incomplete spec leaves implementation details to guessing.
- **Verdict:** PLAUSIBLE
- **Failure scenario:** Developer implements prefers-reduced-motion by suppressing only frame-stepping. Screen still shakes on catch, lunge still has smooth acceleration, game-over text still fades in. Player with motion sensitivity is still triggered.
- **Fix:** In Section 5, expand accessibility subsection:
  ```javascript
  if (prefersReducedMotion) {
    // Suppress frame-stepping (sprite stays on frame 0)
    // Suppress screen shake on catch (no viewport jitter)
    // Suppress lunge acceleration (speed changes instantly)
    // Suppress game-over fade-in (text appears instantly)
    // Suppress Gnome jump-scare variant (never spawns)
    // Telegraphs still happen (visual pose changes, but no motion)
  }
  ```
- **Recommendation:** Expand Section 5 to list all motion-heavy effects and their suppression behavior.

---

**MAJOR-4: Shadow DOM CSS Isolation Not Tested for font-size Inheritance**
- **DESIGN.md spec:** N/A (blueprint's own spec).
- **Blueprint spec:** Section 5 claims "only the dir and lang attributes inherit from the host. All other CSS properties are isolated."
- **Issue:** The MDN source cited is correct, BUT the game-over screen's text size is never specified. If the host page has `html { font-size: 8px; }`, will the shadow DOM game-over text render tiny?
- **Verdict:** PLAUSIBLE
- **Failure scenario:** On a page with unusual font-size rules, game-over text becomes unreadable.
- **Fix:** In `ui-overlay.js`, explicitly set `font-size` on shadow DOM root:
  ```css
  :host { font-size: 16px; }  /* Reset to baseline, immune to host page rules */
  ```
- **Recommendation:** Add a CSS reset comment in the blueprint noting that font-size must be explicit (not inherited from host).

---

### MINOR Issues (Tuning, Clarity, M1 Scope Fit)

**MINOR-1: Lunge Speed 525 px/s May Be Too Fast for 60fps @ High DPI**
- **Issue:** At 1440p (high DPI), 525 px/s for 0.3s lunge covers ~160 px screen-space. On a narrow monitor, this crosses the whole width in one frame. Hard to dodge.
- **Verdict:** PLAUSIBLE (not a blocker, but a feel risk)
- **Failure scenario:** On a 4K display, lunge feels unfair (instant catch).
- **Fix:** Lunge speed should scale with screen width. Suggested: `LUNGE_SPEED_MUL = 3.5` is correct; actual pixel speed is derived from `CREEP_SPEED * LUNGE_SPEED_MUL`. So: if CREEP_SPEED is 150 px/s, lunge is 525. On a 1920-wide screen at 60fps, that's ~8px/frame. On a 3840-wide screen, it's the same 8px/frame (speed is absolute, not relative). So the math is already fair. No fix needed.
- **Recommendation:** None (math is sound).

---

**MINOR-2: Personal Best Persistence Doesn't Record Survival Time Precision**
- **Issue:** `personalBestMs` rounds down to nearest millisecond. On modern browsers, `Date.now()` can vary by 1-4ms per frame at 60fps. The personal best is accurate but not displayable with sub-second precision (e.g., "1:23.456").
- **Verdict:** PLAUSIBLE (nitpick)
- **Failure scenario:** Personal best is saved, but game-over screen shows "1:23.000" instead of "1:23.456". Feels slightly less precise.
- **Fix:** Use `performance.now()` instead of `Date.now()` for encounter timing. It has microsecond precision and is not subject to system clock adjustments.
- **Recommendation:** In `content/physics.js`, use `performance.now()` for tracking `survivalTimeMs`, but keep chrome.storage.local using integer milliseconds (no fractional precision needed for storage).

---

**MINOR-3: Cooldown Checks Don't Account for Encounter Duration**
- **DESIGN.md spec:** "Grace periods shrink the longer a single chase runs" (line 17). This hints at dynamic cooldown scaling.
- **Blueprint spec:** Cooldown is a fixed 5 minutes, no scaling by encounter length.
- **Issue:** DESIGN.md suggests the cooldown should be shorter after a quick catch (e.g., caught in 10 seconds -> 3 min cooldown) vs. a long encounter (survived 5 minutes -> 5 min cooldown). Blueprint doesn't implement this.
- **Verdict:** PLAUSIBLE (M1 scope decision, not a bug)
- **Failure scenario:** Player survives a very long encounter (5+ min), gets caught, faces a full 5-min cooldown. Feels harsh. Conversely, player fails instantly, waits 5 min before next spawn. Feels generous.
- **Fix:** For M1, keep the cooldown fixed. For M2, add a formula: `cooldown_ms = 300000 * (1 - survivalTimeMs / max_session_ms)` where max is e.g. 10 min. This rewards longer encounters with shorter cooldowns.
- **Recommendation:** Document this as a M2 tuning opportunity. M1 uses fixed 5-min cooldown for simplicity.

---

**MINOR-4: "Never Twice in a Row on Same Domain" Logic Is Memory-Only, Fragile**
- **Issue:** Blueprint stores `lastSpawnDomain` in memory. If the user closes and reopens the tab on the same domain within the cooldown window, the "never twice in a row" check is lost (memory is cleared). So the door CAN spawn twice in a row if the tab was closed and reopened.
- **Verdict:** PLAUSIBLE (M1 scope, acceptable trade-off)
- **Failure scenario:** User is on reddit.com, door spawns. User closes tab, reopens reddit.com 30 seconds later. Door can spawn again (same-domain check is lost).
- **Fix:** Move `lastSpawnDomain` to chrome.storage.local in M2 so the check persists across tab closes.
- **Recommendation:** Document this as a known limitation of M1 (acceptable because the global cooldown still prevents rapid spawn spam). M2 will harden it via storage.

---

**MINOR-5: Sprite Frame-Stepping Rate (8-12fps) Not Fully Defined**
- **DESIGN.md spec:** "Sprite frame-stepping stays chunky/low-fps (8-12fps)" (line 31).
- **Blueprint spec:** Uses 125ms per frame = 8fps exactly.
- **Issue:** The range "8-12fps" is a ballpark. Should M1 use a fixed 8fps, or a random variable per encounter? The blueprint locks it to 8fps for consistency.
- **Verdict:** PLAUSIBLE (reasonable interpretation)
- **Failure scenario:** None (8fps is within the specified range).
- **Recommendation:** None (blueprint choice is sound; document the choice).

---

**MINOR-6: Pre-Spawn Tell (1.5s Page Flicker) Is Audio-Only in Blueprint**
- **DESIGN.md spec:** "A subtle pre-spawn tell (flicker, faint creak)" (line 15).
- **Blueprint spec:** Section 9 says "1.5s page flicker (brief 1–2px background color shift) or optional audio (low-volume hiss)" (implied both). But then M1 cut list says "Audio" is deferred to M2+.
- **Issue:** Contradiction. Is the pre-spawn tell visual or audio? If audio is cut from M1, then only the flicker remains. Flicker is CSS-only, no audio codec needed.
- **Verdict:** PLAUSIBLE
- **Failure scenario:** No audio in M1. Player never hears the "creak" mentioned in DESIGN.md.
- **Fix:** Clarify: M1 pre-spawn tell is **visual only** (page background color shift 1.5s before door appears). Audio (hiss, creak) is M2. Update the blueprint Section 4 (Ordered Build Sequence, Step 9) to specify visual-only.
- **Recommendation:** Explicitly state in Section 9 "Pre-Spawn Tell": "M1 uses visual tell only (background color flicker). Audio (hiss/creak) deferred to M2."

---

**MINOR-7: Game-Over Screen Variants Are Blueprint Scope Creep**
- **DESIGN.md spec:** "Keyboard Cat 'played off' variant for very short survival times, a Harambe tribute variant" (line 19).
- **Blueprint spec:** Only mentions default "YOU'VE BEEN MODERATED" text.
- **Issue:** DESIGN.md shows 3 variants; blueprint omits 2. Are these M2, or should they be in M1?
- **Verdict:** PLAUSIBLE (scope decision)
- **Failure scenario:** M1 ships with only one generic game-over. Players expect the Keyboard Cat and Harambe easter eggs mentioned in DESIGN.md.
- **Fix:** For M1, show only the default "YOU'VE BEEN MODERATED" variant. Keyboard Cat and Harambe are M2 easter eggs (require conditional sprite rendering / overlay text swaps, low complexity but non-zero work). Update Section 8 to note: "Game-over screen: default variant (M1). Keyboard Cat / Harambe variants deferred to M2."
- **Recommendation:** Defer to M2. M1 has a single generic screen; M2 adds easter-egg variants.

---

**MINOR-8: DaveoftheDead Transition Vignettes Not in M1 Cut List**
- **DESIGN.md spec:** "DaveoftheDead... one of several possible Revenant-transition vignettes... the game rolls between a small pool" (line 108).
- **Blueprint spec:** M1 cut list omits DaveoftheDead entirely.
- **Issue:** If Revenant is cut to M2 (BLOCKER-1), then DaveoftheDead transitions are also cut. But the blueprint should be explicit about this.
- **Verdict:** PLAUSIBLE (follows from BLOCKER-1)
- **Failure scenario:** None if Revenant is omitted. But if Revenant is restored (per BLOCKER-1 fix), DaveoftheDead transition logic must be stubbed.
- **Fix:** If BLOCKER-1 is fixed to include a stub Revenant, update the M1 cut list to say "DaveoftheDead transition vignettes: deferred to M2 (Revenant resprite uses a simple color-shift, no character appearance)."
- **Recommendation:** Explicitly add to M1 Cut List (Section 10): "DaveoftheDead: deferred to M2 (no Revenant appearance in M1; Revenant uses simple recolor of base sprite)."

---

**MINOR-9: Collision Hitbox Model Unclear for Very Small Screens**
- **Issue:** Hitbox radius is 16px. On a mobile phone (375px width), the hitbox is 4% of screen width. The blueprint doesn't address mobile responsiveness or if M1 even targets mobile.
- **Verdict:** PLAUSIBLE (scope question)
- **Failure scenario:** On mobile, hitbox feels too large (catches too easily).
- **Fix:** For M1, explicitly state: "No mobile support in M1. Tested on desktop (1280×800 minimum). Mobile responsiveness is M2+ scope." If mobile is in scope, hitbox should scale with screen width: `hitbox_radius = screen_width * 0.04`.
- **Recommendation:** Add to Section 2 (Architecture Decisions) or Section 7 (Verification Checklist): "M1 targets desktop browsers only (1280×800 viewport minimum). Mobile support deferred to M2."

---

**MINOR-10: Site Denylist (Banking/Medical/Gov) Not Implemented**
- **DESIGN.md spec:** "Denylist: auto-suppress on banking, medical, and government domains by default" (line 121).
- **Blueprint spec:** Not mentioned anywhere. M1 spawns on any domain.
- **Issue:** DESIGN.md says this is a default suppression. Blueprint omits it.
- **Verdict:** PLAUSIBLE (scope decision, reasonable omission)
- **Failure scenario:** Extension spawns Neckbeard on a banking login page, user gets spooked, trust is damaged.
- **Fix:** Add to M1 Cut List (Section 10): "Site denylist (banking/medical/gov auto-suppress): deferred to M2. M1 allows spawn on any domain." OR implement a minimal denylist (list of ~10 common banking domains, suppress by domain regex). The second option is cheap (~20 min of work).
- **Recommendation:** For safety, implement a basic denylist in M1 (10–15 regex patterns for major banks, .gov, .edu medical). This is a low-friction ask that protects user trust. Example:
  ```javascript
  const DENYLIST_DOMAINS = [
    /\bbank\./i, /\bpaypal\b/i, /\breventax\b/i, /\.gov$/i, /\.mil$/i, /healthcare/i
  ];
  ```

---

### Summary Table

| ID | Severity | Category | Verdict | Fix |
|---|----------|----------|---------|-----|
| BLOCKER-1 | BLOCKER | State Machine | Revenant state omitted from blueprint (DESIGN.md requires it) | Include Revenant stub in M1: recolor sprite, increase speed 1.3×, trigger at 60s survival. M2 adds Waifu. |
| BLOCKER-2 | BLOCKER | Storage Schema | Meta-progression (Chaos Meter, achievements) not designed for M2 migration | Add reserved keys to storage schema (empty in M1, populated in M2). |
| MAJOR-1 | MAJOR | Physics | Dual-pursuer collision not architected for M2 Waifu | Reserve `pursuerWaifuPos` in state; document hitbox-OR logic for future. |
| MAJOR-2 | MAJOR | Accessibility | Panic key duration arbitrary (5s may be too short for screen-shares) | Make toggle instead of fixed duration (Alt+P once = hide; again = show). |
| MAJOR-3 | MAJOR | Accessibility | prefers-reduced-motion scope incomplete (only frame-stepping mentioned) | Expand to suppress screen shake, lunge acceleration, game-over fade, gnome scare. |
| MAJOR-4 | MAJOR | CSP | Font-size inheritance not isolated in shadow DOM | Explicitly set `font-size` in shadow DOM root to reset host page rules. |
| MINOR-1 | MINOR | Tuning | Lunge speed math unclear | No fix (math is sound; confirm in docs). |
| MINOR-2 | MINOR | Polish | Personal best precision (1ms vs. microsecond) | Use `performance.now()` for internal timing; store integer ms only. |
| MINOR-3 | MINOR | Tuning | Cooldown doesn't scale with encounter length | Document as M2 tuning opportunity (fixed cooldown acceptable for M1). |
| MINOR-4 | MINOR | Fragility | Same-domain check is memory-only | Document as M1 limitation; M2 hardens via storage. |
| MINOR-5 | MINOR | Clarity | Frame rate (8fps) locks to low end of range | Document choice; no fix needed (within spec). |
| MINOR-6 | MINOR | Scope | Pre-spawn tell audio is M1 cut but not clearly stated | Explicitly note: M1 visual-only; audio M2+. |
| MINOR-7 | MINOR | Scope | Game-over screen variants (Keyboard Cat, Harambe) not in blueprint | Defer to M2; M1 ships single generic screen only. |
| MINOR-8 | MINOR | Scope | DaveoftheDead transitions follow from Revenant cut | Explicit note if Revenant is restored; DaveoftheDead is M2+. |
| MINOR-9 | MINOR | Scope | Mobile responsiveness not addressed | Explicitly target desktop only (M1); mobile is M2+. |
| MINOR-10 | MINOR | Safety | Site denylist (banking/medical/gov) omitted | Implement minimal denylist (~15 domain regex patterns) for user trust/safety. |

---

### Explicit Blueprint Strengths (No Fixes Needed)

✓ **No-build, plain-JS architecture** is sound. Manifest array load order enforces sequencing; no bundler needed.  
✓ **Shadow DOM + canvas rendering** correctly escapes page CSP and provides style isolation.  
✓ **State machine and physics** are solid (with BLOCKER-1 fix: add Revenant stub).  
✓ **Personal best persistence** uses chrome.storage.local correctly (M1 only writes one key).  
✓ **Fairness telegraph (0.5s)** on every lunge is hard-coded and non-negotiable (good).  
✓ **Debug harness** is well-designed for rapid tuning.  
✓ **Tuning constants** are centralized in `config/tunables.js` (easy iteration).  
✓ **M1 scope** is appropriate (single-page encounter loop, no cross-page persistence).  
✓ **M2 forward compatibility** is explicitly noted in most deferral decisions (good foresight).  

---

### Final Verdict

**Blueprint is BROADLY SOUND but has 2 blockers that must be addressed before implementation:**

1. **BLOCKER-1** (Revenant state): Add a stub Revenant tier to the state machine. Doesn't require Waifu or dual collision in M1; just a recolor + speed increase at 60s survival. Keeps the architecture aligned with DESIGN.md and unblocks M2.
2. **BLOCKER-2** (Storage schema): Reserve Chaos Meter and achievements keys in M1 storage (empty, never modified). M2 will populate them without refactoring.

**4 MAJOR issues** should be addressed before coding (will cost ~2–3 hours of implementation):

1. **MAJOR-1** (Dual pursuer): Add forward-compat note; reserve `pursuerWaifuPos` in state.
2. **MAJOR-2** (Panic key): Change to toggle (Alt+P cycles hide/show) instead of fixed 5s duration.
3. **MAJOR-3** (prefers-reduced-motion): Expand to cover all motion effects, not just frame-stepping.
4. **MAJOR-4** (Font-size inheritance): Explicitly reset shadow DOM root font-size.

**10 MINOR issues** are clarifications, polish, or scope confirmations (mostly documentation, ~1–2 hours total).

**Recommendation:** Fix the 2 blockers and 4 majors before greenlight. Minors can be rolled into implementation as polish.
