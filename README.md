# Neckbeard

A browser extension that turns "you" into permanent prey. A rare MOD door spawns somewhere on your internet travels; click or hover it, and a caricatured reddit/discord mod bursts out and never stops chasing your cursor — across pages, across sites, forever, until he catches you. There's no escape, only how long you last and what you find along the way.

Status: full single-page + cross-page encounter loop is implemented and playable — state machine (Dormant/Lurking/Hunting/Caught, with a Revenant escalation flag), chase physics with telegraphed lunges, the Chaos Meter, the full item/collectible/pickup roster, AvA terrain (the page as obstacles/cover), cross-page pursuit persistence, accessibility (reduced-motion, panic key, denylist), and a debug harness. See [DESIGN.md](./DESIGN.md) for the full spec and `docs/m1-blueprint.md` for the original build plan (note: several items that doc marked "deferred to M2" — Chaos Meter, collectibles/powerups, cross-page pursuit — are already built; treat the doc as history, not a current gap list). Not yet implemented: the Undead Anime Waifu second pursuer (`pursuerWaifuPos` is wired into collision but never populated) and the Admin/DaveoftheDead transition vignettes.

Target: Chromium (Edge, Opera — both run the same Manifest V3 / WebExtensions platform as Chrome, so one build covers both).

## Load it (dev mode)

**Edge**: `edge://extensions` -> enable Developer mode -> Load unpacked -> select this folder.
**Opera**: `opera://extensions` -> enable Developer mode -> Load unpacked -> select this folder.

A rare door reading "MOD" spawns on some page loads (3% chance, gated by a 5-minute cooldown and a denylist for banking/medical/gov sites — see `config/tunables.js`). Click or hover it to start the chase. `Alt+Shift+M` force-spawns the door for testing; `Alt+Shift+L` dumps full state to the console. See `debug/debug-harness.js` for the rest of the dev hotkeys.

## Manual test harness

`node test/server.js` serves the repo at `http://localhost:4173` with a Chrome-API shim (`test/chrome-shim.js`) standing in for `chrome.storage`/`chrome.runtime`, so the game logic can be poked in a plain browser tab without loading it as an extension. Open the page and drive it via DevTools (`NB_STATE`, `NB_DEBUG.*`).
