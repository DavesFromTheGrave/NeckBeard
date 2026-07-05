# Meme Sourcing Manifest — Neckbeard

Every meme on the roster, where to grab it, and an IP flag for your okay/ban-hammer pass.
**I did not download or bundle any of this** — these are verified links; you capture what you approve.

## How the assets plug into the game
The `id` column IS the filename. Once you've captured an asset:
- **Image** → save as `game/assets/memes/img/<id>.png` (transparent PNG), then add `<id>` to `NB.MEME_ART` in `game/src/memes.js`.
- **Sound byte** → save as `game/assets/memes/audio/<id>.mp3` (or .ogg), then add `<id>` to `NB.MEME_AUDIO` in `game/src/memes.js`.
- Until an asset is added, the game shows a placeholder badge + plays the WebAudio synth fallback. Ids never change, so drops are zero-code beyond the one list entry.

## IP flags (for your call — not advice, just the lay of the land)
- 🟢 **Low risk** — anonymous/community origin, no known enforcement.
- 🟡 **Care** — a real person's likeness, or an active creator (consent/attribution matters; higher care on a public entry).
- 🔴 **Owned IP** — copyrighted music / film / anime / game master, or a creator with a *history of enforcement*. Highest risk to bundle in a public contest submission. Several of these have actually sued (Nyan Cat & Keyboard Cat both won against game studios; Pepe's creator won against Infowars; Techno Viking sued over his likeness).

KYM links are for the **image + origin/history**. YouTube-search links are for the **sound bytes/clips** you'll screen-record + ffmpeg (search links, not a specific video, so you pick the cleanest/longest cut — and they never rot).

---

## IMAGE memes (download the still)

| Meme | id | Source (image + origin) | Flag / note |
|------|----|-------------------------|-------------|
| Doge | `doge` | https://knowyourmeme.com/memes/doge | 🟢 the Kabosu photos have been NFT'd/sold — use a generic shibe render if worried |
| Trollface | `trollface` | https://knowyourmeme.com/memes/trollface | 🔴 Whynne/DeviantArt; got *Meme Run* pulled from the eShop |
| Pepe the Frog | `pepe` | https://knowyourmeme.com/memes/pepe-the-frog | 🔴 Matt Furie actively enforces (won vs Infowars) |
| Forever Alone | `forever-alone` | https://knowyourmeme.com/memes/forever-alone | 🟢 rage-comic face |
| Y U No | `y-u-no` | https://knowyourmeme.com/memes/y-u-no-guy | 🟢 rage-comic face |
| Bad Luck Brian | `bad-luck-brian` | https://knowyourmeme.com/memes/bad-luck-brian | 🟡 real person (Kyle Craven), licenses his image |
| Success Kid | `success-kid` | https://knowyourmeme.com/memes/success-kid-i-hate-sandcastles | 🟡 real person (Sammy Griner), family licenses it |
| This Is Fine dog | `this-is-fine` | https://knowyourmeme.com/memes/this-is-fine | 🟡 KC Green, active creator + merch |
| Harambe | `harambe` | https://knowyourmeme.com/memes/harambe-the-gorilla | 🟡 real photo, Cincinnati Zoo; also a sensitive subject |
| Good Guy Greg | `good-guy-greg` | https://knowyourmeme.com/memes/good-guy-greg | 🟢 anonymous |
| Scumbag Steve | `scumbag-steve` | https://knowyourmeme.com/memes/scumbag-steve | 🟡 real person (Blake Boston) — pairs w/ the Scumbag Hat |
| Ermahgerd girl | `ermahgerd` | https://knowyourmeme.com/memes/ermahgerd | 🟡 real person photo (Maggie Goldenberger) |
| Philosoraptor | `philosoraptor` | https://knowyourmeme.com/memes/philosoraptor | 🟢 (LonelyDinosaur owns the art — attribution) |
| Longcat | `longcat` | https://knowyourmeme.com/memes/longcat | 🟢 anonymous |
| Yao Ming Face | `yao-ming` | https://knowyourmeme.com/memes/yao-ming-face-bitch-please | 🟡 real person likeness |
| Me Gusta | `me-gusta` | https://knowyourmeme.com/memes/me-gusta | 🟢 rage-comic face |
| Gnome (Gnomed) | `gnome` | https://knowyourmeme.com/memes/gnome-child | 🟡 depends which gnome — confirm the one you mean |
| I Can Has Cheezburger | `cheezburger` | https://knowyourmeme.com/memes/lolcats | 🟢 lolcat format |
| Rage Comics | `rage-comics` | https://knowyourmeme.com/memes/rage-comics | 🟢 format/face set |
| Banhammer | `banhammer` | https://knowyourmeme.com/memes/banhammer | 🟢 generic — safest to just draw your own |
| One Does Not Simply | `one-does-not-simply` | https://knowyourmeme.com/memes/one-does-not-simply-walk-into-mordor | 🔴 New Line film still (Boromir/LOTR) |
| The One Ring | `one-ring` | https://knowyourmeme.com/memes/lord-of-the-rings | 🔴 New Line/LOTR prop — draw a generic gold ring instead |

## SOUND / CLIP memes (screen-record + ffmpeg the audio)

| Meme | id | Origin page | Clip to capture (YouTube search) | Flag / note |
|------|----|-------------|----------------------------------|-------------|
| Shoop Da Whoop | `shoop-da-whoop` | https://knowyourmeme.com/memes/shoop-da-whoop | https://www.youtube.com/results?search_query=shoop+da+whoop+sound+effect | 🟢 image + "BLAAA" laser sfx |
| Dat Boi | `dat-boi` | https://knowyourmeme.com/memes/dat-boi | https://www.youtube.com/results?search_query=here+come+dat+boi+o+shit+waddup | 🟡 "o shit waddup" audio |
| Leeroy Jenkins | `leeroy-jenkins` | https://knowyourmeme.com/memes/leeroy-jenkins | https://www.youtube.com/results?search_query=leeroy+jenkins+original+clip | 🔴 Blizzard (WoW) |
| Badger Badger Badger | `badger-badger` | https://knowyourmeme.com/memes/badger-badger-badger | https://www.youtube.com/results?search_query=badger+badger+badger+original | 🔴 Weebl (Jonti Picking) song |
| Techno Viking | `techno-viking` | https://knowyourmeme.com/memes/technoviking | https://www.youtube.com/results?search_query=technoviking | 🔴 **litigated** — the subject sued over his likeness |
| All Your Base | `all-your-base` | https://knowyourmeme.com/memes/all-your-base-are-belong-to-us | https://www.youtube.com/results?search_query=all+your+base+are+belong+to+us+flash | 🔴 Zero Wing (Toaplan/Sega) + the song |
| Over 9000 | `over-9000` | https://knowyourmeme.com/memes/its-over-9000 | https://www.youtube.com/results?search_query=its+over+9000+original+dub | 🔴 DBZ (Toei) — copyrighted anime |
| Rick Roll | `rickroll` | https://knowyourmeme.com/memes/rickroll | https://www.youtube.com/results?search_query=never+gonna+give+you+up | 🔴 Sony Music (Rick Astley master) |
| Ultimate Showdown | `ultimate-showdown` | https://knowyourmeme.com/memes/the-ultimate-showdown-of-ultimate-destiny | https://www.youtube.com/results?search_query=ultimate+showdown+of+ultimate+destiny+lemon+demon | 🟡 Lemon Demon (Neil Cicierega) — relatively chill but his song |
| Banana Phone | `banana-phone` | https://knowyourmeme.com/memes/bananaphone | https://www.youtube.com/results?search_query=raffi+banana+phone | 🔴 Raffi — copyrighted song |
| Yakety Sax | `yakety-sax` | *(no KYM page)* | https://www.youtube.com/results?search_query=yakety+sax+benny+hill+chase+music | 🔴 Boots Randolph — copyrighted music |
| Nyan Cat | `nyan-cat` | https://knowyourmeme.com/memes/nyan-cat-pop-tart-cat | https://www.youtube.com/results?search_query=nyan+cat+original | 🔴 Chris Torres — **won a lawsuit** vs a game studio |
| Keyboard Cat | `keyboard-cat` | https://knowyourmeme.com/memes/keyboard-cat | https://www.youtube.com/results?search_query=keyboard+cat+original | 🔴 Charlie Schmidt — **sued Warner Bros**, licenses it |
| Trogdor the Burninator | `trogdor` | https://knowyourmeme.com/memes/trogdor | https://www.youtube.com/results?search_query=trogdor+the+burninator+song | 🟡 The Brothers Chaps (Homestar Runner) |

---

## My honest read (you make the call)
The 🔴 audio memes are where the real exposure lives — a screen-recorded **Rick Astley master**, **Yakety Sax**, **Raffi**, or a **DBZ dub** is straight copyrighted music/film audio, which is a bigger deal in a public, judged Reddit submission than a static reaction image. Two safer routes that keep the *joke* without the master recording:
1. **Sound-alikes** — a synth Rickroll melody, a chiptune Yakety Sax. Recognizable, original recording. The game already has a WebAudio synth layer to hang these on.
2. **Your own hand-drawn takes** on the image memes — which is also the hackathon's stated differentiator (judges reward hand-drawn, penalize ripped/AI-looking).

Nothing here blocks you — the code takes whatever you drop in. This is just the map so your okay/ban pass is fast.
