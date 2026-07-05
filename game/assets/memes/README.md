# Meme assets — drop-in

Captured a meme? Drop it here and add its id to one list. Ids are in
`game/src/memes.js` (`NB.MEMES`) and the sourcing links are in the repo-root
`MEME-SOURCING.md`.

## Images
1. Save the transparent PNG as `img/<id>.png` (e.g. `img/doge.png`).
2. In `game/src/memes.js`, add `'doge'` to `NB.MEME_ART`.
3. In `game/src/main.js` preload, the loader picks it up as texture `meme-<id>`
   (add the load line if it isn't looped yet — see the pickups preload block).

## Sound bytes
1. Save as `audio/<id>.mp3` (or `.ogg`).
2. Add `<id>` to `NB.MEME_AUDIO` in `game/src/memes.js`.
3. Load it in `main.js` preload as `memeaudio-<id>`.

Until an asset is added, the game shows a color-coded placeholder badge and
plays the WebAudio synth — nothing breaks, ids never change.

**Sizing:** badges render ~34px. Source art around 128–256px square, trimmed,
transparent background.
