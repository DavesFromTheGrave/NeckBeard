// Sprite contract: NB_SPRITES.renderToCanvas(canvas, tier, animName, frameIdx, opts) is the ONLY
// code that touches pixel data. When Dave's real sprite sheets land, only the body of
// renderToCanvas changes (drawImage from the sheet) — the signature, tiers, and frame tables
// stay put, so an art swap never touches game logic.
//
// Sheet spec for the real art (per-frame cell): 48x64 px, horizontal strip PNG (RGBA transparent),
// rows: walk x6, windup x4, lunge x3, stumble x3, <=14 colors on the base tier, 8-12fps.
window.NB_SPRITES = (() => {
  const TIERS = {
    base: {
      cellW: 48,
      cellH: 64,
      anims: {
        walk:    { frames: 6, loop: true  },
        windup:  { frames: 4, loop: false },
        lunge:   { frames: 3, loop: false },
        stumble: { frames: 3, loop: false },
        climb:   { frames: 4, loop: true  }, // AvA beat: scaling page furniture
      },
    },
  };

  const PAL = {
    skin: '#d4a574', skinShade: '#b8875a',
    hair: '#5a3d28',
    shirt: '#7a2020', shirtGfx: '#e8d44c',
    jeans: '#3a4a6a',
    keyboard: '#9a9a9a', keys: '#55555a',
    eye: '#241a12',
    mouthCharge: '#ffffff',
    shoe: '#2a2a2a',
  };
  // Revenant tier stub: palette swap only (see docs/design-critique.md BLOCKER-1)
  const PAL_REVENANT = Object.assign({}, PAL, {
    skin: '#8fae9a', skinShade: '#6e8f7c', shirt: '#4a1a3a', eye: '#ff3030', hair: '#3d4a3d',
  });

  function getFrame(tier, animName, elapsedMs) {
    const a = TIERS[tier].anims[animName] || TIERS[tier].anims.walk;
    const idx = Math.floor(elapsedMs / window.NB_TUNABLES.SPRITE_FRAME_MS);
    return a.loop ? idx % a.frames : Math.min(idx, a.frames - 1);
  }

  // Placeholder renderer: draws the guy on a virtual 24x32 grid (2 native px per grid cell),
  // so he's chunky by construction. Crude on purpose — he's a low-effort loser; the real art
  // replaces this whole body of code and nothing else.
  function renderToCanvas(canvas, tier, animName, frameIdx, opts) {
    opts = opts || {};
    const t = TIERS[tier] || TIERS.base;
    const p = opts.revenant ? PAL_REVENANT : PAL;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, t.cellW, t.cellH);
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x * 2, y * 2, w * 2, h * 2); };

    const f = frameIdx;
    let dy = 0, lean = 0, charge = 0, legPhase = 0, armsUp = false;
    if (animName === 'walk')    { dy = f % 2; legPhase = f % 3; }
    if (animName === 'windup')  { dy = 2 + Math.min(f, 2); lean = -2; charge = Math.min(f, 3); }
    if (animName === 'lunge')   { dy = 1; lean = 3 + f; legPhase = 1; }
    if (animName === 'stumble') { dy = 4 + f * 2; lean = 2; }
    if (animName === 'climb')   { dy = f % 2; legPhase = f % 3; armsUp = true; }

    const cx = 12 + lean;

    // hair: back mass + manbun; the front stays receded
    px(cx - 4, 2 + dy, 8, 2, p.hair);
    px(cx + 3, 1 + dy, 3, 2, p.hair);
    // face
    px(cx - 4, 4 + dy, 9, 5, p.skin);
    // the neckbeard itself
    px(cx - 4, 8 + dy, 9, 2, p.hair);
    // eyes
    px(cx - 2, 5 + dy, 1, 1, p.eye);
    px(cx + 2, 5 + dy, 1, 1, p.eye);
    // wind-up mouth charge (the Shoop Da Whoop nod — this IS the visual telegraph)
    if (charge > 0) px(cx - 1, 7 + dy, 2 + charge, 2, p.mouthCharge);

    // torso: meme shirt with a legible graphic block
    px(cx - 6, 10 + dy, 13, 9, p.shirt);
    px(cx - 2, 12 + dy, 5, 4, p.shirtGfx);
    // belly overhang
    px(cx - 6, 18 + dy, 13, 2, p.skinShade);

    // arms; keyboard held like a brick in the right hand (overhead while climbing)
    if (armsUp) {
      px(cx - 7, 5 + dy, 2, 6, p.skin);
      px(cx + 6, 5 + dy, 2, 6, p.skin);
      px(cx - 1, 1 + dy, 6, 3, p.keyboard);
      px(cx, 2 + dy, 4, 1, p.keys);
    } else {
      px(cx - 8, 11 + dy, 2, 6, p.skin);
      px(cx + 7, 11 + dy, 2, 6, p.skin);
      px(cx + 6, 16 + dy, 6, 3, p.keyboard);
      px(cx + 7, 17 + dy, 4, 1, p.keys);
    }

    // jeans + alternating legs
    px(cx - 5, 20 + dy, 11, 4, p.jeans);
    px(cx - 4, 24 + dy, 3, legPhase === 1 ? 5 : 6, p.jeans);
    px(cx + 2, 24 + dy, 3, legPhase === 2 ? 5 : 6, p.jeans);
    // shoes
    px(cx - 5, 24 + dy + (legPhase === 1 ? 5 : 6), 4, 1, p.shoe);
    px(cx + 2, 24 + dy + (legPhase === 2 ? 5 : 6), 4, 1, p.shoe);
  }

  return { TIERS, getFrame, renderToCanvas };
})();
