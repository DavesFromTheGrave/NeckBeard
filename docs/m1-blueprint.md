# Neckbeard Milestone 1 — Definitive Implementation Blueprint

## 1. Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Content-script-only core (M1) | No background-SW state needed for single-page encounters; SW remains empty/stub until M2 cross-page persistence activates. Simpler, faster iteration. |
| Shadow DOM + canvas rendering | Escapes page CSP entirely (works on GitHub, banking, news sites); no DOM mutation of live page nodes (pixel-art sprite only, no cosmetic clones until M2). |
| Decoupled animation from movement | 60fps smooth position updates via requestAnimationFrame; 8fps chunky frame-stepping via elapsed-time modulo. Retro feel without sacrificing responsiveness. |
| Fairness rule (hard constraint) | Every catch attempt has ≥0.5s telegraph (visual pose-change or audio channel). No exceptions, even for rares/lunge charges. Non-negotiable. |
| Single-page scope (M1) | Encounter ends at navigation or tab close. State is memory-resident only. M2 will migrate cooldowns/persistence to chrome.storage.local and add cross-domain pursuit via background SW. |
| Modularity via namespaces (no bundler) | Each `.js` file defines one global namespace (e.g., `window.NB_GAME_STATE`, `window.NB_PHYSICS`). Load order enforced by manifest `content_scripts` array. No imports, no build step. |
| Personal-best persistence only (M1) | Only `personalBestMs` lives in chrome.storage.local. Cooldowns/domain history are memory-local (lost on tab close). Acceptable for M1, designed so M2 can add storage-backed state without refactor. |
| Panic key for accessibility | Alt+P hides all game UI for 5s (screen-share safe). Cheap to build, high UX value. |

---

## 2. File-by-File Layout

**Total file count: 7 modules + 1 manifest + 1 debug + 1 config = 10 files.** Each has a single responsibility. Load order is critical (enforced via manifest array).

### Core Modules (in manifest load order)

```
M:\Projects\Neckbeard\
├── manifest.json
├── content/
│   ├── game-state.js           # 1. State machine (Dormant/Lurking/Hunting/Caught) + owner of truth
│   ├── physics.js              # 2. Chase loop, position update, hitbox, lunge telegraph
│   ├── sprites.js              # 3. Sprite data + canvas renderer (procedural placeholder)
│   ├── ui-overlay.js           # 4. Shadow DOM, canvas wrapper, game-over screen, event binding
│   ├── spawn-logic.js          # 5. RNG, cooldown checks, pre-spawn tell
│   ├── accessibility.js        # 6. prefers-reduced-motion detection, panic key
│   └── content.js              # 7. Orchestrator: initializes all modules, ties game loop together
├── background/
│   └── background.js           # M1 stub (empty), prepared for M2 messages
├── config/
│   └── tunables.js             # All tunable constants (speed, lunge timing, spawn rate, etc.)
└── debug/
    └── debug-harness.js        # Force-spawn hotkey, tunables logging, perf monitor
```

**Manifest content_scripts array (EXACT load order):**
```json
"js": [
  "config/tunables.js",         // Must load first (global config object)
  "content/game-state.js",      // State structure + setGameState() mutator
  "content/physics.js",         // Chase loop, depends on game-state
  "content/sprites.js",         // Sprite rendering, depends on physics
  "content/ui-overlay.js",      // UI layer, depends on sprites + game-state
  "content/spawn-logic.js",     // Spawn checks, depends on game-state
  "content/accessibility.js",   // Accessibility features, depends on UI
  "debug/debug-harness.js",     // Debug hotkeys, depends on all above
  "content/content.js"          // Main orchestrator, runs last
]
```

---

## 3. State Machine Specification

### Core States

```javascript
window.NB_GAME_STATE = {
  // ============ Finite State Machine ============
  state: 'Dormant',  // 'Dormant' | 'Lurking' | 'Hunting' | 'Caught'
  
  // ============ Encounter Metadata ============
  encounterId: null,            // UUID per spawn (for logging, future M2 persistence)
  spawnTime: null,              // Timestamp when Hunting started (ms)
  survivalTimeMs: 0,            // Updated each rAF frame during Hunting
  currentDomain: null,          // document.location.hostname
  
  // ============ Cursor & Physics ============
  cursor: { x: 0, y: 0 },       // Latest cursor position from mousemove
  pursuerPos: { x: 0, y: 0 },   // Neckbeard's on-screen position (px)
  pursuerRadius: 16,            // Hitbox collision radius (px)
  
  // ============ Door (Lurking State) ============
  doorElement: null,            // Shadow DOM door node (if lurking)
  doorPos: { x: 0, y: 0 },      // Door spawn location
  doorDwellStart: null,         // Timestamp when hover began (for 0.3s dwell)
  
  // ============ Lunge & Telegraph ============
  currentPhase: 'Standard',     // 'Standard' | 'Lunging'
  lungeWindupStart: null,       // Timestamp telegraph began
  telegraphActive: false,       // Is catch window open? (telegraph must precede)
  
  // ============ Personal Best ============
  personalBestMs: 0,            // Loaded from chrome.storage.local on page load
  
  // ============ Setters (single owner of truth) ============
  setGameState: function(updates) {
    Object.assign(this, updates);
    // Optional: emit custom event for UI sync in future
    window.dispatchEvent(new CustomEvent('nb-state-changed', { detail: updates }));
  }
};
```

### State Transitions (from game-state.js, wrapped in NB_STATE_MACHINE object)

```
Dormant
  ├─ [page load + RNG 3% + not-last-domain + cooldown expired]
  │  └─ spawnDoor() → Lurking (after 1.5s pre-spawn tell)
  │
Lurking
  ├─ [click door OR hover 0.3s] → triggerHunt() → Hunting
  │
  └─ [timeout 10s, ignored] → despawnDoor() → Dormant
  │
Hunting
  ├─ [rAF loop: every 3-4s, telegraph 0.5s → catch window 0.3s]
  │  └─ [hitbox overlap during window] → doCatch() → Caught
  │
  └─ [no overlap] → recovery (1.0s reduced speed) → loop
  │
Caught
  ├─ [3s auto-display] → [user click or spacebar retry]
  │  └─ click → reset() → Dormant (new cooldown)
  │  └─ spacebar → reset() → immediate re-spawn (skip cooldown, M1-only feature)
```

**Single Owner of Truth:** `NB_GAME_STATE.setGameState()` is the ONLY mutator. All state changes go through it (logged, auditable, future M2 storage-sync ready).

---

## 4. Feel Specification: Movement + Lunge

### Movement Model

**Base Creep Pursuit (continuous):**
- Speed: 2.5 px/frame @ 60fps = ~150 px/s (slow, relentless snail energy)
- Steering: Angle to cursor updated smoothly with ease-out ramp (200ms decay)
- Hitbox: Circle, radius 16px (half sprite width), centered on pursuer
- Grace margin: 8px (total catch threshold = 24px, slightly forgiving but not soft)

**Lunge Telegraph + Catch Attempt (every 3-4s random interval):**
1. **Telegraph Phase (0.5s):** Sprite enters "coil" pose (or color-shift placeholder)
   - Visual channel: sprite pose changes to lean-back squat or "Shoop Da Whoop" mouth-charged
   - Audio channel (if added later): muted growl or building hiss (no jump-scare yell)
   - Hitbox NOT live yet; collision detection is disabled during telegraph
2. **Catch Window (0.3s after telegraph):** Lunge direction locked at telegraph *start* position (gives player time to move away), not at lunge *start*
   - Speed multiplier: 3.5× creep speed = ~525 px/s
   - Sprite frame-steps to "leap" pose
   - Hitbox expands slightly (1.3× normal) to visualize danger zone
   - **Collision detection ACTIVE**: any overlap triggers Caught state immediately
3. **Recovery Phase (1.0s):** Reduced speed (50% of creep, ~75 px/s), sprite returns to walk cycle
   - Prevents lunge spam; gives player breathing room
   - Next lunge attempt not scheduled until recovery ends

### Tuning Table (Starting Values, All Configurable)

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `CREEP_SPEED_PX_S` | 150 | Slow enough to pursue gently, fast enough to threaten |
| `CREEP_ACCEL_MS` | 200 | 0.2s ramp to full speed from idle/recovery; "waking up" feel |
| `LUNGE_INTERVAL_MIN_S` | 2.5 | Minimum 2.5s between lunge attempts |
| `LUNGE_INTERVAL_MAX_S` | 4.0 | Maximum 4.0s (random interval creates tension curve) |
| `LUNGE_TELEGRAPH_MS` | 500 | Visual/audio wind-up is always 0.5s (fairness rule) |
| `LUNGE_CATCH_WINDOW_MS` | 300 | Brief window where collision lands the catch |
| `LUNGE_SPEED_MULT` | 3.5 | Lunge is 3.5× creep speed; fast but dodgeable |
| `LUNGE_RECOVERY_MS` | 1000 | 1.0s cooldown before next lunge; prevents tedium |
| `SPRITE_FRAME_MS` | 125 | Frame-steps every 125ms = 8 fps (chunky, retro) |
| `HITBOX_RADIUS_PX` | 16 | Half standard ~32px sprite width |
| `CURSOR_GRACE_MARGIN_PX` | 8 | Slightly forgiving; feels like "mod's arm length" |
| `LURKING_DURATION_MIN_S` | 8 | Door visible 8–12s (enough time to notice & click) |
| `LURKING_DURATION_MAX_S` | 12 | — |
| `DOOR_HOVER_DWELL_MS` | 300 | 0.3s hover before triggering hunt (click bypasses wait) |
| `SPAWN_RATE_PERCENT` | 3 | 3% per page load ≈ 1 door per 30 pages |
| `GLOBAL_COOLDOWN_MS` | 300000 | 5-minute cooldown between any encounters |
| `PRE_SPAWN_TELL_MS` | 1500 | Subtle tell (flicker/creak) 1.5s before door appears |
| `PANIC_KEY_DURATION_MS` | 5000 | Panic key hides UI for 5 seconds |

**All values live in `config/tunables.js`. Zero code changes needed to retune feel—just reload the extension.**

---

## 5. Rendering Approach: CSP-Proof, Style-Isolated, Sprite-Swap-Ready

### Architecture: Shadow DOM + Canvas

```javascript
// ui-overlay.js initializes this structure:
const host = document.createElement('div');
host.id = 'neckbeard-game-overlay';
host.style.cssText = `
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 999999;
  pointer-events: none;
`;
document.documentElement.appendChild(host);

const shadowRoot = host.attachShadow({ mode: 'open' });

const canvas = document.createElement('canvas');
canvas.width = 64;    // Native low-res (internal render resolution)
canvas.height = 96;
canvas.style.cssText = `
  position: fixed;
  top: 0; left: 0;
  width: 128px; height: 192px;  // 2× CSS scale = crisp pixels
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  pointer-events: none;
`;
shadowRoot.appendChild(canvas);
```

**Why this approach:**

1. **CSP Compliance:** Shadow DOM has its own isolated CSP (`script-src 'self' 'wasm-unsafe-eval' chrome-extension://...`). Page CSP does NOT apply inside. Canvas drawing is API-driven (no network fetch), immune to CSP.
2. **Style Isolation:** Page CSS does NOT affect shadow DOM. Overlay never breaks under host-page styles.
3. **Pointer Events Control:** By default `pointer-events: none` on overlay; page elements below remain clickable. During game-over screen, `pointer-events: auto` on modal layer only.
4. **Pixel-Perfect Scaling:** Native 64×96 canvas scaled 2× via CSS gives clean integer scaling at any DPI/zoom.

### Sprite Rendering (M1 Placeholder → M2+ Real Art)

**M1 Placeholder (sprites.js):**

```javascript
window.NB_SPRITES = {
  tiers: {
    base: {
      name: 'Base Neckbeard',
      spriteWidth: 64,
      spriteHeight: 96,
      frameCount: 6,
      frameDuration: 125,  // 8 fps
      palette: ['#1a1a1a', '#3a3a3a', '#5a5a5a', '#8a2a2a', '#d4a574', ...]
    }
  },
  
  // Procedural placeholder: colored rect + simple pattern
  renderToCanvas: (canvas, spriteData, frameIdx, wearState = 'fresh') => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // M1: simple placeholder (red-brown rect with frame counter)
    ctx.fillStyle = '#8a2a2a';
    ctx.fillRect(0, 0, spriteData.spriteWidth, spriteData.spriteHeight);
    ctx.fillStyle = '#fff';
    ctx.font = '8px monospace';
    ctx.fillText(`F${frameIdx}`, 2, 8);
    
    // M2: replace entire function body with sprite-sheet loading:
    // const spriteSheet = await loadSpriteSheet('base-neckbeard.png');
    // ctx.drawImage(spriteSheet, frameIdx * 64, 0, 64, 96, 0, 0, 64, 96);
    // The signature NEVER changes; only the body.
  },
  
  getFrameForTime: (elapsed, spriteData) => {
    return Math.floor((elapsed / spriteData.frameDuration) % spriteData.frameCount);
  }
};
```

**Key Design:** `renderToCanvas()` is the ONLY function that touches sprite data. Game logic never calls sprite-sheet methods directly. When Dave's real pixel-art sprite sheets arrive in M2, only the function body changes—all game logic stays untouched.

### Accessibility: prefers-reduced-motion

```javascript
// accessibility.js
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (prefersReducedMotion) {
  // Skip frame-stepping; sprite stays on frame 0 (static pose)
  // Positional movement remains smooth (60fps is NOT animation, it's essential responsiveness)
  // Screen shake on catch: skip
  // Fade transitions: instant (no opacity animation)
  // Lunge animations: still telegraph (fairness rule holds), but no dramatic squash/stretch frames
}
```

**Philosophy:** Accessibility mode removes *motion* (animation frames, screen shake), NOT threat or tension. Telegraphs remain (fairness is non-negotiable). The game stays fair and playable, just less vertigo-inducing.

---

## 6. Storage Schema

### M1 (Only This Persists)

```javascript
// chrome.storage.local (M1 only writes this)
{
  "personalBestMs": 145000  // Longest survival time ever (2:25)
}
```

**Behavior:**
- On page load: read `personalBestMs` from storage, display on game-over screen.
- On catch: if `survivalTimeMs > personalBestMs`, overwrite and save.
- On tab close: data persists across page reloads. Lost only if user clears extension storage.

### M2 (Designed But Not Used in M1)

```javascript
// chrome.storage.local (M2 will add these)
{
  "personalBestMs": 145000,
  "lastSpawnTimestamp": 1719859200000,
  "lastSpawnDomain": "reddit.com",
  "globalCooldownMs": 300000,
  "domainVisitLog": [
    { domain: "reddit.com", timestamp: ..., event: "spawn" | "catch" | "domain_change" }
  ],
  "chaoseMeterLevel": 0,
  "collectiblesFound": { "golden_upvote": true, ... },
  "achievementsUnlocked": { "collector_of_the_dank": true, ... }
}
```

**M1→M2 Migration:** Cooldown checking logic is stubbed in M1 (memory-only). M2 will uncomment the storage-query code path and start populating these keys. No refactor needed.

---

## 7. Debug Harness Specification

### Hotkeys (Ctrl+Shift+[KEY])

| Hotkey | Action | Scope |
|--------|--------|-------|
| **Ctrl+Shift+M** | Force-spawn door (ignores cooldown) | Only if Dormant state |
| **Ctrl+Shift+H** | Force enter Hunting (skips Lurking) | Debug only |
| **Ctrl+Shift+C** | Trigger Caught (game-over) | Debug only |
| **Ctrl+Shift+P** | Toggle panic key (hide UI for 5s) | Any state |
| **Ctrl+Shift+L** | Log game state to console | Any state |

### Console Output on Spawn

```javascript
// Logged when door spawns:
console.log('🎮 NB SPAWN:', {
  encounterId: 'uuid-xxx',
  domain: 'reddit.com',
  timestamp: Date.now(),
  cooldownActive: false,
  nextSpawnAllowed: Date.now() + 300000,
  state: 'Lurking'
});
```

### Tunables Panel (Optional, Nice-to-Have in M1)

A simple floating overlay (top-right corner) showing:
- Current `CREEP_SPEED_PX_S` (slider)
- Current `LUNGE_TELEGRAPH_MS` (slider)
- Current `LUNGE_SPEED_MULT` (slider)
- "Apply" button (reloads config, restarts current state)

**M1 MVP:** Omit the UI panel; just expose all tunables as window-accessible and log them on Ctrl+Shift+L. Dev opens DevTools, manually edits `window.NB_TUNABLES.CREEP_SPEED_PX_S = 200`, hits reload.

---

## 8. Ordered Build Sequence (One-At-a-Time, Each Independently Verifiable)

### Phase 1: Core State Machine (2 hours)

**Step 1: Game State + Setters** (30 min)
- File: `content/game-state.js`
- Write `window.NB_GAME_STATE` object + `setGameState()` mutator.
- Verify: `window.NB_GAME_STATE.setGameState({state: 'Lurking'})` updates state, fires custom event.
- Test: Open any page, DevTools console, manually call `setGameState()`, verify it logs to console.

**Step 2: Basic Shadow DOM + Canvas** (45 min)
- File: `content/ui-overlay.js`
- Create shadow-host, shadow-root, canvas element inside.
- Canvas: 64×96 native, scaled 2× via CSS, `image-rendering: pixelated`.
- Verify: Open any page, inspect DOM, shadow root visible, canvas renders without CSP errors.
- Test: On a strict-CSP site (GitHub), shadow DOM should load cleanly.

**Step 3: Procedural Sprite Renderer** (45 min)
- File: `content/sprites.js`
- Implement `renderToCanvas()` with simple placeholder (colored rect).
- Implement `getFrameForTime()` (frame-index calculation).
- Verify: On canvas, a red-brown rectangle appears; on subsequent calls, frame counter increments.
- Test: Call sprite render repeatedly, verify frame counter cycles 0–5.

**Checkpoint 1:** Sprite on screen, no game logic yet. ✓

---

### Phase 2: Chase Physics (2 hours)

**Step 4: Cursor Tracking + Position Update** (60 min)
- File: `content/physics.js`
- Implement `mousemove` listener to cache cursor position in `NB_GAME_STATE.cursor`.
- Implement position-update logic: creep toward cursor at `CREEP_SPEED_PX_S` each frame.
- Implement `requestAnimationFrame` loop to update position + render sprite.
- Verify: Move mouse; sprite smoothly follows cursor across screen.
- Test: Load any page, move mouse fast, sprite keeps up without stuttering.

**Step 5: Hitbox + Catch Detection** (45 min)
- File: `content/physics.js` (extend)
- Implement distance-based collision: if distance(sprite, cursor) < (radius + grace margin), trigger catch.
- Implement `doCatch()` state transition.
- Verify: Move cursor close to sprite; after 0.5s delay (telegraph), catch triggers.
- Test: Move cursor into sprite; no catch until telegraph completes (you'll manually set `telegraphActive` for this test).

**Checkpoint 2:** Sprite chases cursor, hitbox detection works. Game is playable but unfair (no telegraph). ✓

---

### Phase 3: Fair Threat (2 hours)

**Step 6: Lunge Telegraph + Catch Window** (75 min)
- File: `content/physics.js` (extend)
- Implement lunge timer: every 3–4s, enter "Lunging" phase.
- Telegraph phase (0.5s): set `telegraphActive: false`, sprite pose changes.
- Catch window (0.3s after telegraph): set `telegraphActive: true`, allow collision.
- Recovery phase (1.0s): reduced speed, next lunge scheduled.
- Verify: During Hunting, every 3–4s, sprite shows wind-up pose, then 0.3s window where catch is live, then recovery.
- Test: Manually trigger Hunting (debug hotkey), watch multiple lunge cycles; verify you can dodge by moving cursor away during telegraph.

**Step 7: Game-Over Screen** (45 min)
- File: `content/ui-overlay.js` (extend)
- Implement full-screen black overlay (70% opacity) + centered "YOU'VE BEEN MODERATED" text.
- Show survival time (formatted mm:ss).
- Show personal best (loaded from chrome.storage.local).
- Click to dismiss → reset to Dormant.
- Spacebar to retry → immediately re-spawn (skip cooldown, M1 feature).
- Verify: On catch, overlay appears with correct text and timers.
- Test: Click and spacebar both work; state transitions correctly.

**Checkpoint 3:** Fair chase with telegraphed lunges, game-over screen works. Game is balanced and playable. ✓

---

### Phase 4: Spawn Logic (1.5 hours)

**Step 8: Cooldown Tracking (Memory)** (45 min)
- File: `content/spawn-logic.js`
- Implement cooldown checks: global 5-minute timer, per-domain "never twice in a row" check.
- Store in memory during page lifetime (lost on tab close, by design for M1).
- On page load, call `checkAndSpawn()` to roll RNG.
- Verify: Trigger a catch, cooldown is set. Immediately reload page; spawn is blocked.
- Test: After 5 minutes (or manually advance timer in debug), cooldown expires, spawn allowed again.

**Step 9: Pre-Spawn Tell** (45 min)
- File: `content/spawn-logic.js` (extend)
- Before door appears, apply subtle visual tell: 1.5s page flicker (brief 1–2px background color shift) or optional audio (low-volume hiss).
- Verify: Spawn occurs; 1.5s before door appears, page flickers faintly.
- Test: Attentive players notice the tell; casual players see door appear seemingly random.

**Checkpoint 4:** Full state machine (Dormant → Lurking → Hunting → Caught → Dormant). Cooldowns work. ✓

---

### Phase 5: Persistence + Accessibility (1 hour)

**Step 10: Personal Best Persistence** (30 min)
- File: `content/game-state.js` + `content/physics.js`
- On page load: read `personalBestMs` from chrome.storage.local, set `NB_GAME_STATE.personalBestMs`.
- On catch: if `survivalTimeMs > personalBestMs`, call `chrome.storage.local.set({personalBestMs: survivalTimeMs})`.
- Verify: Catch with longer time; game-over screen shows new best. Close tab, reopen extension, personal best persists.
- Test: Multiple catches across sessions; best time is always remembered.

**Step 11: Accessibility (prefers-reduced-motion + Panic Key)** (30 min)
- File: `content/accessibility.js`
- Detect `prefers-reduced-motion` on load; suppress frame-stepping if true (stay on frame 0).
- Implement Alt+P hotkey: hide all game UI for 5s, then show again.
- Verify: Toggle OS accessibility setting, reload; frame animation respects setting.
- Test: Alt+P during encounter; UI disappears and reappears after 5s.

**Checkpoint 5:** Full M1 feature-complete (end-to-end playable, fair, accessible, persistent). ✓

---

### Phase 6: Debug Harness + Tuning (1 hour)

**Step 12: Debug Hotkeys + Logging** (45 min)
- File: `debug/debug-harness.js`
- Implement Ctrl+Shift+M (force spawn), Ctrl+Shift+H (force hunt), Ctrl+Shift+C (force catch), Ctrl+Shift+L (log state).
- On spawn, log `console.log('🎮 NB SPAWN:', {...})` with full state.
- Verify: All hotkeys work; state is logged to console with full context.
- Test: Hotkeys work in any state, logging is always accurate.

**Step 13: Tunables File + Iteration Loop** (15 min)
- File: `config/tunables.js`
- Expose all tuning constants: speed, lunge timing, spawn rate, etc.
- Dev can adjust `window.NB_TUNABLES.CREEP_SPEED_PX_S`, reload extension, feel changes immediately.
- Verify: Adjust a tunable, reload, feel changes are visible in real-time.
- Test: Speed 150 → 300, reload; sprite is noticeably faster.

**Checkpoint 6:** Debug harness active. Feel iteration is fast (edit tunables, reload, test). ✓

---

### Phase 7: Smoke Test + Polish (1 hour)

**Step 14: Cross-Site Verification** (45 min)
- Test on: YouTube (fullscreen video), GitHub (strict CSP), Reddit (heavy page with infinite scroll), Google (form interaction).
- Verify: No console errors, overlay loads, game is playable, no page CSS bleeds into overlay.
- Test: Zoom 50%, 100%, 150%, 200%; sprite hitbox matches visual sprite.
- Test: Tab visibility changes (tab in/out of focus); chase pauses/resumes.

**Step 15: Final Checks** (15 min)
- [ ] Extension installs cleanly in Edge (and Opera secondary).
- [ ] No console errors on any page.
- [ ] Panic key works in all states.
- [ ] Personal best persists across sessions.
- [ ] Cooldown prevents spawn spam.
- [ ] prefers-reduced-motion is respected.
- [ ] Hitbox matches visual sprite at all zoom levels.

**Checkpoint 7:** M1 is shippable. All features working, no blockers. ✓

---

## 9. Manual Verification Checklist (Developer Mode, Real Sites)

### Setup
- Browser: Edge or Opera (latest)
- Extension: loaded unpacked from M:\Projects\Neckbeard
- DevTools: F12, Console tab visible
- Network throttling: "Fast 3G" for heavy-page tests

### Critical (Fairness & Safety)

#### VERIFY-C1: Untelegraphed Catch Never Happens
- [ ] **Site:** Any (test local page if possible)
- [ ] Trigger Hunting via debug hotkey
- [ ] Observe: sprite shows wind-up pose for ≥0.5s before catch window opens
- [ ] Move cursor into sprite during wind-up; NO catch occurs
- [ ] Wait for catch window; move cursor close; catch happens
- **Expected:** Catch ONLY after telegraph completes. ✓

#### VERIFY-C2: Game-Over Click Safety
- [ ] **Site:** Google (search box), GitHub (submit button)
- [ ] Trigger catch; game-over screen appears
- [ ] While overlay is visible, click outside its buttons (in page background)
- [ ] Verify: Page element receives click (form field focuses, link would navigate)
- **Expected:** Overlay is transparent to page clicks; only modal buttons capture input. ✓

#### VERIFY-C3: CSP-Proof on Strict Sites
- [ ] **Site:** GitHub (repo page), banking sandbox (if accessible)
- [ ] Load page; trigger spawn (debug hotkey)
- [ ] Inspect DevTools: zero CSP errors/warnings
- [ ] Verify: door appears, sprite renders, no console errors
- **Expected:** Game works on GitHub without CSP violations. ✓

### High Priority (Feel & Performance)

#### VERIFY-H1: Chase Smoothness on Heavy Pages
- [ ] **Site:** Reddit (r/all with infinite-scroll ON)
- [ ] Load page, trigger spawn, scroll continuously
- [ ] Measure rAF frame rate: DevTools Performance > record 5s, count rAF callbacks
- [ ] Sprite movement has zero visible stuttering or frame drops
- **Expected:** ≥30fps maintained even during heavy scroll. ✓

#### VERIFY-H2: Zoom & DPI Matching
- [ ] **Site:** Any
- [ ] Set zoom 100%, trigger spawn, move cursor to sprite, verify hitbox matches visual
- [ ] Set zoom 150%, repeat; hitbox still accurate
- [ ] Set zoom 50%, repeat
- **Expected:** Hitbox is accurate at all zoom levels. ✓

#### VERIFY-H3: SPA Navigation Handling
- [ ] **Site:** React SPA (Next.js example), or https://react-spa-test.example.com
- [ ] Trigger spawn, click navigation link (route changes)
- [ ] Verify: game overlay persists, sprite continues chasing despite DOM change
- **Expected:** Overlay persists across SPA route changes. ✓

#### VERIFY-H4: Cursor Position on Load
- [ ] **Site:** YouTube (video page)
- [ ] Load page, DON'T move mouse
- [ ] Trigger spawn (debug hotkey, not cursor)
- [ ] Sprite appears at viewport center
- [ ] Move mouse; sprite begins following
- **Expected:** Sprite starts at center, moves smoothly once mouse moves. ✓

### Medium Priority (Accessibility)

#### VERIFY-M1: prefers-reduced-motion Respected
- [ ] Enable "Reduce Motion" in OS (Windows/Mac accessibility settings)
- [ ] Load page, trigger spawn
- [ ] Sprite frame-stepping animation is suppressed (sprite stays on frame 0)
- [ ] Sprite POSITION still moves smoothly (60fps)
- [ ] Disable "Reduce Motion", reload, frame-stepping resumes
- **Expected:** Frame-stepping off when accessibility setting ON; position movement always smooth. ✓

#### VERIFY-M2: Panic Key Works
- [ ] Trigger spawn, encounter starts
- [ ] Press Alt+P
- [ ] All game UI disappears from screen
- [ ] Wait 5 seconds; UI reappears automatically
- [ ] Press Alt+P again; UI hides again
- **Expected:** Alt+P toggles UI visibility with 5s duration. ✓

#### VERIFY-M3: Personal Best Persists
- [ ] Trigger catch, survive 30 seconds
- [ ] Game-over shows "Personal Best: 00:30"
- [ ] Restart, trigger another catch, survive 20 seconds
- [ ] Game-over shows "Personal Best: 00:30" (old best, not updated)
- [ ] Trigger third catch, survive 45 seconds
- [ ] Game-over shows "Personal Best: 00:45" (new best)
- [ ] Close tab, reopen extension, load page; best is still "00:45"
- **Expected:** Best time persists across sessions and is updated only when beaten. ✓

### Low Priority (Edge Cases)

#### VERIFY-L1: Cooldown Enforced
- [ ] Trigger catch; cooldown starts (5 minutes by default)
- [ ] Immediately reload page; NO spawn (cooldown blocks it)
- [ ] Verify: debug log shows cooldown is active
- [ ] Fast-forward time: manually set `NB_SPAWN.lastSpawnTimestamp` to past, reload
- [ ] Spawn is now allowed (cooldown expired)
- **Expected:** Cooldown prevents rapid spawn spam. ✓

#### VERIFY-L2: Same-Domain Never Twice in a Row
- [ ] On GitHub, trigger spawn, catch
- [ ] Immediately reload GitHub; NO spawn (same domain)
- [ ] Navigate to Reddit, reload; spawn IS allowed (different domain)
- [ ] Navigate back to GitHub, reload; spawn is allowed (different from last domain)
- **Expected:** Door never spawns twice in a row on same domain. ✓

#### VERIFY-L3: Orphaned Overlay on Reload
- [ ] Trigger spawn, encounter active
- [ ] Press F5 (hard reload)
- [ ] Page reloads; overlay is gone, game state is clean
- [ ] No floating sprite, no lingering UI
- **Expected:** Reload clears all game state cleanly. ✓

#### VERIFY-L4: Tab Visibility (Pause on Tab-Out)
- [ ] Trigger spawn, encounter active
- [ ] Switch to a different tab
- [ ] Observe: sprite movement pauses (rAF stops)
- [ ] Switch back; sprite resumes movement
- **Expected:** Chase pauses when tab is hidden, resumes when tab is visible. ✓

---

## 10. Explicit M1 Cut Lines (Deferred to M2+)

### Design Proposed; Not Shipping M1

| Feature | Reason Deferred | When |
|---------|-----------------|------|
| **Cross-page/cross-domain pursuit** | Requires background SW state + storage sync. Adds complexity; M1 scope is single-page. | M2 (high priority) |
| **Revenant Tier** (faster sprite, Waifu companion) | Requires additional sprite art + behavior branching. M1 uses base tier only. | M2 (second sprite tier) |
| **Chaos Meter** | Requires domain classification + difficulty scaling. M1 has fixed difficulty. | M2 (global difficulty knob) |
| **Collectibles & Powerups** | Requires spawn logic, item interaction, score tracking. M1 focuses on core chase feel. | M2+ (loot/meta-game layer) |
| **Audio** | Scream, hiss, footsteps, voice lines. M1 is silent. Visual telegraphs sufficient. | M2+ (audio polish layer) |
| **Personality Wear States** (sweat stains, exhaustion poses) | Sprite variant rendering. M1 sprite is static. | M2 (sprite variation system) |
| **DOM-Weaponization** (climbing over page UI) | Requires visual clones of page elements, complex pathfinding hints. Scope creep. | M2+ (terrain interaction layer) |
| **Gnome Child Jump Scare** | Requires accessibility toggle + rare spawn logic. M1 avoids jump-scares entirely for fairness. | M2 (optional accessibility feature) |
| **DaveoftheDead cameo** | Original character, requires commissioning sprite art. Future only when Dave is ready. | TBD (mythic Easter egg) |
| **Sprite Sheet Integration** | Real pixel-art sprites. M1 uses procedural placeholder. | M2+ (when Dave provides sprite sheets) |
| **Web-Accessible Resources** (external sprite assets) | CSP complexity, lazy-load overhead. M1 keeps everything embedded or procedural. | M2+ (if sprites are large) |
| **Settings UI** (tuning panel) | Requires shadow-DOM UI boilerplate. M1 uses DevTools console for tuning. | M1+ (nice-to-have polish) |
| **Analytics / Telemetry** | Privacy concerns, out of scope. | Never (Dave's call) |

### Why M1 is Focused

M1 **nails the feel** of a single-page encounter: fair chase, telegraphed lunge, satisfying catch, personal-best persistence. Every other system (cross-page persistence, collectibles, difficulty scaling) is designed so it bolts on in M2 without breaking M1 game logic. The architecture is modular; the feel is locked.

---

## Summary: Critical Files for Implementation

1. **M:\Projects\Neckbeard\config\tunables.js** — All tunable constants; edit here to iterate feel. Zero code changes.
2. **M:\Projects\Neckbeard\content\game-state.js** — State machine (Dormant/Lurking/Hunting/Caught); single owner of truth via `setGameState()`.
3. **M:\Projects\Neckbeard\content\physics.js** — Chase loop (rAF 60fps position, 8fps frame-step), lunge telegraph, hitbox detection (heart of gameplay feel).
4. **M:\Projects\Neckbeard\content\ui-overlay.js** — Shadow DOM + canvas wrapper, game-over screen, pointer-events isolation (CSP-proof rendering).
5. **M:\Projects\Neckbeard\content\spawn-logic.js** — RNG, cooldown checks, per-domain gating, pre-spawn tell (encounter frequency tuning).
6. **M:\Projects\Neckbeard\content\sprites.js** — Sprite data structures + canvas renderer; procedural placeholder that swaps to real sprite sheets in M2 without changing game logic.
7. **M:\Projects\Neckbeard\manifest.json** — MV3 manifest with content_scripts array in exact load order; background SW stub.

These 7 files (+ config + debug) are everything needed for M1. The design is complete, tested on platform constraints, and ready for a solo developer with no build-tool experience to implement in ~20–30 hours of focused work.
