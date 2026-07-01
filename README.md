# Neckbeard

A browser extension that turns "you" into permanent prey. A rare MOD door spawns somewhere on your internet travels; click or hover it, and a caricatured reddit/discord mod bursts out and never stops chasing your cursor — across pages, across sites, forever, until he catches you. There's no escape, only how long you last and what you find along the way.

Status: skeleton loads, no game logic yet. See [DESIGN.md](./DESIGN.md) for the full spec.

Target: Chromium (Edge, Opera — both run the same Manifest V3 / WebExtensions platform as Chrome, so one build covers both).

## Load it (dev mode)

**Edge**: `edge://extensions` -> enable Developer mode -> Load unpacked -> select this folder.
**Opera**: `opera://extensions` -> enable Developer mode -> Load unpacked -> select this folder.

You should see a small "Neckbeard: pipeline OK" badge in the bottom-right corner of any page — that confirms the extension loads and the content script runs, not the actual game yet.

Next up: the real Dormant -> Lurking -> Hunting state machine and the MOD door spawn logic.
