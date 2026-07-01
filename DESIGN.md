# Neckbeard — Consolidated Design Document

Status: locked spec; M1 (single-page encounter loop) in development in this repo. Everything below reflects final decisions — remaining open items are called out explicitly at the end, not buried in the body.

Design north star (locked 2026-07-01): **Animator vs. Animation** — the character treats the live webpage as physical terrain; fluid hand-animated action against a static UI that doesn't know it's a level.

## Premise

A browser extension. A rare "MOD" basement door occasionally spawns somewhere on a webpage. Click or hover it, and it slams open to reveal Neckbeard — the quintessential reddit/discord mod caricature (receding hairline, manbun, 350+ lbs, sweaty, meme t-shirt, wielding a keyboard like a brick). From that moment, he never stops chasing the cursor: across page navigations, across new domains, climbing over/under/through page UI. He's slow, but relentless — the snail-meme energy of "never stops, but he's slow."

**Non-negotiable rule: there is no escape.** Every encounter that starts ends in a catch. Nothing in the game — no item, no collectible, no cameo — grants a permanent way out. Everything is a delay, never a win-condition. The "win" is a high-score/personal-best meta-game (survival time, sites visited, collectibles found before the catch), same shape as Flappy Bird or Crossy Road — you don't beat him, you beat your last run.

## Core gameplay loop

State machine: **Dormant -> Lurking -> Hunting -> Revenant -> Caught**, looping back to Dormant for a new attempt.

- **Dormant** — ambient background state, no encounter active. Rare, rate-limited RNG check on page load decides whether the MOD door spawns (never twice in a row on the same domain, cooldown between encounters). A subtle pre-spawn tell (flicker, faint creak) a couple seconds before it appears rewards attentive players.
- **Lurking** — the door is visible for N seconds. Ignore it, it despawns, back to Dormant. Click or hover (with a short dwell requirement, not instant-fire) starts Hunting.
- **Hunting** — he spawns and begins pursuit. Persists across same-page navigation instantly, across new pages on the same site after a short "commute" delay, and across a brand-new domain after a much longer delay — the false-safety beat. Grace periods shrink the longer a single chase runs. Obstacle interactions (climbing over/under big DOM elements) are canned cosmetic animations, not real pathfinding. He mostly creeps, but periodically winds up (~0.5s tell) and lunges — every catch attempt needs a fair tell, no exceptions, even fast/surprising moves use some channel (visual wind-up, audio scream, a hiss) rather than a blind gotcha.
- **Revenant** — after a survival threshold (accelerated by the Chaos Meter), he "dies" via one of several possible transition vignettes (see The Admin below) and resurrects as Revenant Neckbeard, paler, denser sprite tier, accompanied by the much-faster Undead Anime Waifu (floaty movement, teleport-in sparkle, parody dramatic-anime-OP entrance).
- **Caught** — either pursuer's hitbox overlaps the cursor after the fairness telegraph. Full-screen game-over takeover. Multiple screen variants: default "YOU'VE BEEN MODERATED" banner, a Keyboard Cat "played off" variant for very short survival times, a Harambe tribute variant. Resets to Dormant; collectibles/meta-progress persist, per-round state doesn't.

Note: Hunting can also shortcut directly to Caught without ever reaching Revenant — the loop above shows the full escalation path, not every round takes it.

## Art direction

Pixel art, deliberately spanning two fidelity tiers as a built-in difficulty tell:

- **Base Neckbeard**: "16-bit"/SNES tier, ~32-48px sprite, ~12-16 color palette, 6-frame walk cycle. Matches his low-effort-loser characterization.
- **Revenant Neckbeard + Undead Anime Waifu**: "32-bit"/Neo Geo-Metal Slug tier, ~64-96px, 20-32 colors, 12-18 frames, more shading.
- **The Admin**: top of the ladder, above even the Revenant tier for his mythic version, or matching the Revenant tier for his more common transition-trigger appearance.

Technical: native low-res sprite sheets, scaled up by integer multiples only (`image-rendering: pixelated`), no non-integer scaling. Sprite frame-stepping stays chunky/low-fps (8-12fps) even though positional movement itself interpolates smoothly at 60fps — decouples animation choppiness (retro feel) from movement smoothness (playability).

**Personality arc** (layered on top of the fidelity tiers, distinct from momentary reactions): Neckbeard visually/emotionally unravels over a long session. 2-4 "wear state" reskins of the base sprite (Fresh -> Winded -> Drenched/Exhausted — sweat-stained shirt, changed posture), paired with escalating voice lines ("mod time." -> "WHY... WON'T... YOU... STOP... CLICKING?!"). He never stops chasing despite the exhaustion — reinforces no-escape. Once Revenant triggers, the Waifu drags him along, keeping the actual danger from dipping just because he's tired.

**Stretch idea, not committed**: a joke "256-bit" tier — not a real production tier, a single rare Easter egg where the art style breaks the fourth wall for one beat (full-HD or anime-cutscene-quality close-up, screen shake) then snaps back. Two alternate triggers: the Waifu specifically catches you, OR a pure survival threshold at the (deliberately, comedically specific) 47-minute mark.

## The Chaos Meter

Single backbone stat — resist adding parallel meters unless a mechanic is fundamentally different in kind (a "forum bait meter" idea was folded into this instead of standing alone).

Three trigger categories:
1. **Domain-category** — curated allowlist of "cursed" domains/subreddits (not content-scanning, for privacy/trust reasons) raises it; wholesome categories (r/aww, recipe blogs) lower it. **Incentive rule (Dave, 2026-07-01): adult/edgy sites are ordinary terrain — fair game to play on, but NO site gets special rewards, exclusive collectibles, or headline risk status that gives players a reason to seek it out.**
2. **Content-based** — e.g. pages with a looping GIF over a size threshold spawn cursed-GIF mini-portals that raise it.
3. **Time-based** — staying on one domain too long without switching (Badger Badger Badger hazard) raises it; a Mushroom event pauses it, a Snake event triggers a lunge (with a brief hiss/rattle telegraph — never untelegraphed).

Visual payoff: This Is Fine dog ambient tint at moderate levels, Trogdor the Burninator full-screen chaos at max. Higher meter = faster Neckbeard, shorter lunges, earlier Revenant.

## Powerups (temporary only — nothing here is ever a permanent out)

| Item | Effect | Notes |
|---|---|---|
| Ban Hammer | Click to stun/knock back, timeout bar over his head | |
| Incognito Cloak | He loses tracking, drifts to last-known position | |
| Ad-Blocker Wall | Drops a fake banner-ad/cookie-modal obstacle | |
| Mountain Dew Can | Temporary speed boost | Common-tier drop; Nyan Cat rainbow trail is its visual juice |
| Rickroll Trap | Decoy link forces a dance-break animation | |
| VPN Teleport | Resets his tracking distance | |
| Popup-Blocker Shield | Absorbs one near-catch | |
| Scuba Steve | Thrown at him = playful mini-stun distraction; held unused at a catch = "collateral damage" flavor beat on the game-over screen | Big Daddy reference, not Scumbag Steve |
| Blue Screen (BSOD) | Fakes a full crash screen with a joke stop-code; he briefly believes the session died | Only deception-based item, distinct from every stat/positional effect |
| The One Ring | Stronger invisibility than Incognito Cloak, but the longer it's actively used the more it escalates the Chaos Meter / draws him directly | High-risk/reward, encodes the source material's actual cost |
| Spontaneous Spark | Ultra-rare evergreen: massive score + forces 4s of lost tracking, "broken script pathing" flavor text | Functional overlap with Incognito Cloak, kept as its rarer bundled upgrade |
| Techno Viking | Legendary, gated on old techno YouTube uploads: summons an intimidating pixel figure, Neckbeard backs off for the track's loop duration | DECIDED: original "intimidating pointing viking" archetype, not a recognizable rendering of the real person |
| Scumbag Hat | Uncommon cursor trap: spawns on real clickable links, slows cursor + reveals position to whichever pursuer currently exists (base Neckbeard pre-Revenant, the Waifu after), shake-mouse to remove | DECIDED: allowed as a prop-only reference to Scumbag Steve's iconography, not reviving him as a character |

**Revenant-phase reskins** (same slots, same functions, new names): Silver Bullet (Ban Hammer, a thrown "verified" checkmark), Garlic (Ad-Blocker Wall, a tab titled garlic.com), Holy Water (Popup-Blocker Shield, hand sanitizer).

## Neckbeard's behavior modes

- **Standard pursuit**: slow creep, telegraphed lunge (~0.5s visual wind-up).
- **Leeroy Jenkins charge**: rare alternate mode, his first move that isn't a pure speed/size tweak. Trigger scales with consecutive player successes (dodges/foils in a row) — a built-in counterweight to chaining evasions forever. He screams his own absurd self-given username (the yell is the telegraph, audio channel instead of visual), charges in a dead-straight line, barrels through obstacles instead of climbing them. Dodging it successfully triggers an extended comedic stumble; connecting is fast since there's no lunge wind-up to bail out mid-charge.
- **Emotion bubbles**: crude rage-comic-style reaction faces over his head at specific events — Forever Alone (loses tracking via Incognito Cloak), Y U No (foiled by an item directly), Good Guy Greg (rare mercy beat, lets the player have something). Trollface is the player-side mirror: flashes as feedback when a powerup successfully counters him.
- **Re-entry variety** (rotates to avoid repetition): ground-burst, door-prop, glitch-portal, Dat Boi unicycle ("o shit waddup"), and the jump-scare gnome variant (below). Can also be themed to a recently-visited site (a Reddit-shaped door bursting open while the player is actually on GitHub) rather than purely generic — reuses domain-transition data the commute-timer system already needs, kept session-local/ephemeral for privacy.
- **Gnome Child jump scare**: rare alternate re-entry, triggered the same way the original MOD door was — a small, easy-to-miss page element reacting to a hover/click. A fast pixelated gnome zooms in with a loud "WHOOO" scream, then resolves into a normal Neckbeard arrival. Pure startle, no catch/damage attached, so it doesn't conflict with the fairness rule. Must be suppressed/softened by the no-jump-scare accessibility toggle.
- **Random contextless pratfall**: rare stumble/faceplant, zero trigger condition, zero mechanical effect. Pure personality, cheap to build.

## Collectibles

Three spawn-condition categories, kept explicit rather than defaulting everything to one kind:

- **Site-gated** (domain match): Newgrounds, Reddit, Discord, plus GitHub README hidden collectibles.
- **Behavior-gated** (specific player action): Clippy (typing in a form field).
- **Evergreen/no-fixed-home** (random, unconditional): Ghost of Vine, meme-mashup ultra-rares (e.g. Doge+Nyan = rainbow trail that briefly reverses his direction).

**Site collectibles:**
- **Newgrounds** — tiny stick-figure cameo (direct Animator vs. Animation callback) that briefly fights Neckbeard on the player's behalf. Rare tier.
- **Reddit** — Golden Upvote: banks to the collection AND nudges the Chaos Meter down (counterweight to cursed subreddits raising it). Rare tier.
- **Discord** — summons a small swarm of Wumpus-esque helper pings that harass Neckbeard ("call the mods on the mod"). Rare tier.
- **Vine** — doesn't exist as a live site anymore, so deliberately not domain-gated: "The Ghost of Vine," legendary evergreen spawn with no fixed home. Nostalgia mode (retro filters + 8-bit skin on archived/old pages, e.g. Wayback Machine captures) doubles as its natural trigger.
- ~~4chan "Anon" legendary~~ — CUT (2026-07-01): violated the incentive rule above; no site-specific reward may point players at edgy/adult sites. The "Anon" silhouette concept may return later as an evergreen spawn with no domain gate.
- **Clippy** — behavior-gated, not a site: triggers while typing in any form field, recreates "it looks like you're writing X," subverted so accepting it actually helps (reveals distance/direction, or auto-uses the best held item).
- **GitHub READMEs** — hidden collectibles in code blocks.

**Rarity tiers**: Common (Mountain Dew), Uncommon (Scumbag Hat), Rare (Newgrounds/Reddit/Discord), Legendary (Vine/Techno Viking), and a top "Rare Pepe" tier that's Pepe's own name/flavor for the legendary rank generally — Pepe also carries an active effect (temporary chaos resistance), not just score.

**Stackable rage-face collectibles**: a separate sub-category using faces NOT already claimed by Neckbeard's own emotion-bubble system — Yao Ming, Me Gusta, etc. — build combos.

**Risk items**: Bad Luck Brian (looks like a normal pickup, actually speeds Neckbeard up briefly, but big points). Anime Waifu Plush (grabbing it speeds up the Waifu temporarily, big score).

**Achievements**: "Collector of the Dank" (10 site-specific collectibles across different domains), "Rickrolled" (trigger the Rickroll mechanic 5x in one session).

**Cosmetic unlocks**: alternate meme-shirt skins (ties back to the original pitch's mention of his shirt), pixel filters, a "trophy wall" popup page showing collection/stats (longest survival, sites survived, collectibles found).

## The Admin

*(Working name — final name TBD by Dave. Formerly "DaveoftheDead", renamed 2026-07-01 so Dave keeps his own moniker; lore logic: a mod's only natural predator. One code constant, `NB_TUNABLES.ADMIN_NAME`, makes the final rename a one-line change.)*

An original character (Dave's own creation, zero IP risk) — split human/zombie face, glowing red eye on the zombie half, red spiky hair, horns, mismatched steampunk goggles, lit pipe/cigar with a controlled ember (not a big flame effect — an AI-generated hand-ablaze moment was deliberately cut as too showy for the character). Voice: Corpse Husband-style — deep, gravelly, unhurried. Dialogue is intentionally sparse (at most a line or two total), so the performance quality on those few words matters more than usual.

**DECIDED: The Admin is one of several possible Revenant-transition vignettes**, not the sole cause and not purely a separate mythic-only event. When the Hunting -> Revenant threshold is hit, the game rolls between a small pool of "how Neckbeard dies" flavors (falls into a modal, gets stuck in UI, rage-quits into the void, or — uncommonly, not mandatorily — The Admin shows up, delivers a single "Seriously?" and a knockout hit). His hit is the single biggest knockback/delay in the game — possibly its own "crawls back into frame from off-screen" recovery animation to sell the scale — but Neckbeard always gets back up. This can't be a permanent escape.

The **true mythic version stays separate and much rarer**: an unexplained mid-chase walk-on where he wordlessly knocks Neckbeard away and leaves, no dialogue, no explanation, targeted at roughly 1-in-100-to-500 sessions specifically to build "wait, who WAS that" folklore — the same rarity-equals-mystique logic already used for Ghost of Vine and the 256-bit break.

Slow, deliberate hand-near-chin/collar gesture is good general idle-animation reference for his pacing.

## Technical & implementation notes

- **DOM-weaponization** (inspired by Alan Becker's "Animator vs. Animation"): Neckbeard grabs and uses the page's own real elements as terrain — scrollbar-surfing, hyperlink-vaulting, hiding behind images, using the cookie-consent banner as a shield, throwing a real button. Must animate **visual clones** of real elements, never the live DOM nodes, or "grabs a button" risks firing that button's actual click handler. Browser chrome (tabs, address bar) is unreachable to a content script regardless — scope stays to in-page DOM only.
- Player-facing powerups stay reliable spawned objects for fairness; only Neckbeard's own movement improvises off real page content.
- **Fairness rule, no exceptions**: every catch attempt needs a telegraph, through whatever channel fits (visual wind-up, a scream, even just a hiss before a Snake-in-the-margin lunge) — never a blind gotcha.
- **Accessibility**: respect `prefers-reduced-motion`, offer a no-jump-scare mode that disables screen shakes/lunges/the gnome scare specifically.
- **Panic key**: single hotkey hides all UI for N seconds (presentations, screen-shares).
- **Denylist**: auto-suppress on banking, medical, and government domains by default.
- **Audio**: Dave's explicit call — real/exact clips are fine wherever he wants, including licensed material. Not a topic to re-raise.
- Declined: rotten.com as a reference (real graphic content, not a stylized format — no clean way to collectible-ify it). Its legitimate underlying ideas are already covered: shock-link pranks = Rickroll Trap, "genuinely dangerous corner of the internet" = the cursed-domain Chaos category generally (no single site is singled out — see the incentive rule).

## Still needs Dave's input

1. ~~Where does this actually live?~~ Resolved: M:\Projects\Neckbeard.
2. ~~Which browser(s) to target first~~ Resolved: Chromium MV3 — Edge primary, Opera secondary (see README).
3. **The Admin's final name** — "The Admin" is a working placeholder; Dave is still choosing the real one.
