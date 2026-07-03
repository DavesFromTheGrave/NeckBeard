# Neckbeard Sprite Guide (for Dave, the artist who has never done pixel art)

The full beginner ramp (tools, technique, learning resources) is in
[docs/art-pipeline.md](../docs/art-pipeline.md). This file is just the contract: what to
draw, at what size, and how to hand it over. The engine adapts to YOU — if a pose needs a
different frame count, say so and the frame tables change in one line.

## The one asset that matters: the base Neckbeard sheet

- **Frame size: 48 × 64 pixels**, transparent background.
- **Palette: 12–14 colors max.** Pick them before you render (Lospec quantizer helps —
  links in the pipeline doc). Lock them as an Aseprite palette so colors can't drift.
- **Animations (one horizontal strip per animation, frames left → right):**

| animation | frames | what it is |
|---|---|---|
| walk | 6 | the relentless creep. Frames 4–6 can be flipped copies of 1–3 with touch-ups |
| windup | 4 | THE TELEGRAPH. His tell before a lunge — must read instantly at small size. Mouth-charge (Shoop Da Whoop) is the locked concept |
| lunge | 3 | the strike. Stretched, committed, no take-backs |
| stumble | 3 | knocked back / stunned / shield-popped. His most-laughed-at frames |
| climb | 4 | scaling page furniture, arms up, keyboard held overhead |

- **Template to draw over:** `art/templates/neckbeard-base-template.png` — my ugly
  placeholder frames at 45% opacity in the exact grid (magenta guides mark the 48×64
  cells). Open it in Aseprite, add a layer on top, draw. Delete the template layer
  before exporting. The ghosts are pose scaffolding, not style reference — bury them.

## Character notes (from the locked design)

Receding hairline, manbun, the neckbeard itself, 350+ lbs energy, meme shirt with a
legible graphic block, jeans, keyboard held like a brick. He's a low-effort loser and the
sprite is allowed to look a little scrappy — that's characterization, not a quality bar.
Readability rule: if the silhouette doesn't say "that guy," no amount of shading saves it.

Tone reference: the South Park WoW guy ("Make Love, Not Warcraft"). Mass, dead stare,
claw hands. Body is one continuous blob — shoulders into neck into head — with detail
budget spent on the head and hands only. Archetype, not a copy: draw him in your style.

## Delivery

1. Export each animation as its own PNG strip: `walk.png` (288×64), `windup.png`
   (192×64), `lunge.png` (144×64), `stumble.png` (144×64), `climb.png` (192×64).
2. Drop them in `art/sprites/`.
3. Tell Claude. Slicing, wiring, palette checks, and the Revenant recolor happen on the
   code side. Your files are never modified — they're read and committed as-is.

**Shortcut that pays off today:** one good STANDING pose (a single 48×64 frame) is enough
to wire "statue mode" — your art in the live game, same day, while the animations come
later at your pace.

## Later (don't start these yet)

MOD door (40×56, closed + slammed-open), item icons (16×16, all 23 memes — great practice
pieces), Revenant palette swap (a menu operation, not drawing), the Waifu (64×96, denser
tier), The Admin cameo, wear-state variants, rage-comic bubble faces.

## The authenticity rule (yours, enforced)

No AI touches the art path. Photograph your pencil work as reference layers, post the
pencil → pixel WIP chain when you ship — that chain is the proof of authorship the meme
crowd respects.
