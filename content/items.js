// The meme registry: every powerup and collectible, its rarity, where it may spawn, and what
// it does. Effects are applied by mutating NB_STATE.mods (consumed by physics every frame)
// and by talking to NB_CHAOS / NB_FX. Icons are placeholder pixel grids (see ICON_PAL) behind
// the same swap-later contract as the sprite: Dave's art replaces grids, ids never change.
//
// HARD RULES: nothing here may ever be a permanent out (temporary delays only), and per the
// incentive rule no edgy/adult site may gate a reward.
window.NB_ITEMS = (() => {
  const T = () => window.NB_TUNABLES;
  const S = () => window.NB_STATE;
  const now = () => performance.now();

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function knockback(px) {
    const s = S();
    if (!s.pursuerPos || !s.cursor) return;
    const d = dist(s.cursor, s.pursuerPos) || 1;
    const away = { x: (s.pursuerPos.x - s.cursor.x) / d, y: (s.pursuerPos.y - s.cursor.y) / d };
    s.pursuerPos.x = clamp(s.pursuerPos.x + away.x * px, 0, innerWidth || 4096);
    s.pursuerPos.y = clamp(s.pursuerPos.y + away.y * px, 0, innerHeight || 4096);
  }

  const stun = (ms) => { S().mods.stunUntil = Math.max(S().mods.stunUntil, now() + ms); };

  // ---- Definitions ----
  // kind: 'powerup' (inventory, keys 1/2/3) | 'collectible' (instant on touch) | 'trap' (touch = bad)
  // tier: common | uncommon | rare | legendary | ultra   gate: hostname regex (null = anywhere)
  const DEFS = {
    // ============ POWERUPS ============
    'ban-hammer': {
      kind: 'powerup', tier: 'uncommon', gate: null, name: 'Ban Hammer',
      use() {
        stun(T().ITEM_STUN_MS); knockback(T().HAMMER_KNOCKBACK_PX);
        NB_FX.timeoutBar(T().ITEM_STUN_MS);
        NB_FX.bubble('sprite', 'Y U NO LET ME MOD?!');
      },
    },
    'incognito-cloak': {
      kind: 'powerup', tier: 'uncommon', gate: null, name: 'Incognito Cloak',
      use() {
        S().mods.trackingLostUntil = now() + T().ITEM_CLOAK_MS;
        NB_FX.bubble('sprite', 'forever alone...');
      },
    },
    'adblock-wall': {
      kind: 'powerup', tier: 'uncommon', gate: null, name: 'Ad-Blocker Wall',
      use() {
        const s = S();
        if (!s.cursor || !s.pursuerPos) return;
        const mid = { x: (s.cursor.x + s.pursuerPos.x) / 2, y: (s.cursor.y + s.pursuerPos.y) / 2 };
        s.mods.wall = { x: mid.x - 140, y: mid.y - 80, w: 280, h: 160, until: now() + T().ITEM_WALL_MS };
        NB_FX.wall(s.mods.wall, T().ITEM_WALL_MS);
        NB_FX.bubble('sprite', 'Y U NO CLICK?!');
      },
    },
    'mountain-dew': {
      kind: 'powerup', tier: 'common', gate: null, name: 'Mountain Dew',
      use() {
        const m = S().mods;
        m.slowMult = 0.8; m.slowUntil = now() + T().ITEM_DEW_MS;
        m.dewTrailUntil = now() + T().ITEM_DEW_MS;
        NB_FX.trail(T().ITEM_DEW_MS);
      },
    },
    'rickroll-trap': {
      kind: 'powerup', tier: 'uncommon', gate: null, name: 'Rickroll Trap',
      use() {
        const s = S();
        if (!s.cursor) return;
        s.mods.decoy = { x: s.cursor.x, y: s.cursor.y, until: now() + T().ITEM_RICKROLL_MS };
        NB_FX.decoy(s.mods.decoy, T().ITEM_RICKROLL_MS);
        NB_FX.bubble('cursor', 'problem?');
      },
    },
    'vpn-teleport': {
      kind: 'powerup', tier: 'rare', gate: null, name: 'VPN Teleport',
      use() {
        const s = S();
        if (!s.pursuerPos || !s.cursor) return;
        // he rematerializes at the farthest corner from you — tracking distance reset
        const w = innerWidth || 1200, h = innerHeight || 800;
        const corners = [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: 0, y: h }, { x: w, y: h }];
        corners.sort((a, b) => dist(b, s.cursor) - dist(a, s.cursor));
        s.pursuerPos.x = corners[0].x; s.pursuerPos.y = corners[0].y;
        NB_FX.bubble('sprite', 'wait. where.');
      },
    },
    'popup-shield': {
      kind: 'powerup', tier: 'rare', gate: null, name: 'Popup-Blocker Shield',
      use() { S().mods.shieldCharges = Math.min(1, S().mods.shieldCharges + 1); NB_FX.bubble('cursor', 'shield up.'); },
    },
    'scuba-steve': {
      kind: 'powerup', tier: 'rare', gate: null, name: 'Scuba Steve',
      use() {
        stun(T().ITEM_SCUBA_STUN_MS);
        NB_FX.bubble('sprite', 'is that... Big Daddy??');
      },
    },
    'bsod': {
      kind: 'powerup', tier: 'rare', gate: null, name: 'Blue Screen',
      use() {
        const m = S().mods;
        stun(T().ITEM_BSOD_MS);
        m.trackingLostUntil = Math.max(m.trackingLostUntil, now() + T().ITEM_BSOD_MS + 500);
        NB_FX.bsod(T().ITEM_BSOD_MS);
      },
    },
    'one-ring': {
      kind: 'powerup', tier: 'legendary', gate: null, name: 'The One Ring',
      use() {
        const m = S().mods;
        m.invisUntil = now() + T().ITEM_RING_MS;        // chaos.js feeds the meter while worn
        m.trackingLostUntil = Math.max(m.trackingLostUntil, m.invisUntil);
        NB_FX.bubble('cursor', 'precious.');
      },
    },
    'techno-viking': {
      kind: 'powerup', tier: 'legendary', gate: /youtube\.com$/i, name: 'Techno Viking',
      use() {
        NB_FX.viking(T().ITEM_VIKING_MS); // fx spawns him and keeps mods.retreatFrom updated
      },
    },

    // ============ TRAPS (touching them is the mistake) ============
    'scumbag-hat': {
      kind: 'trap', tier: 'uncommon', gate: null, name: 'Scumbag Hat',
      onTouch() {
        S().mods.hatOn = true; // pickups.js watches for mouse-shake to fling it
        NB_FX.hat(true);
        NB_FX.bubble('cursor', 'why would you touch that.');
      },
    },

    // ============ COLLECTIBLES (instant score + effect) ============
    'spontaneous-spark': {
      kind: 'collectible', tier: 'ultra', gate: null, name: 'Spontaneous Spark', score: 2500,
      collect() {
        S().mods.trackingLostUntil = Math.max(S().mods.trackingLostUntil, now() + T().ITEM_SPARK_LOST_MS);
        NB_FX.bubble('sprite', 'broken... script... pathing??');
      },
    },
    'golden-upvote': {
      kind: 'collectible', tier: 'rare', gate: /reddit\.com$/i, name: 'Golden Upvote', score: 500,
      collect() { NB_CHAOS.add(-15); },
    },
    'wumpus': {
      kind: 'collectible', tier: 'rare', gate: /discord\.com$/i, name: 'Wumpus Swarm', score: 400,
      collect() {
        const m = S().mods;
        m.slowMult = 0.6; m.slowUntil = now() + T().ITEM_WUMPUS_MS;
        NB_FX.bubble('sprite', 'not the pings. NOT THE PINGS.');
      },
    },
    'stick-figure': {
      kind: 'collectible', tier: 'rare', gate: /newgrounds\.com$/i, name: 'The Animator\'s Stick Figure', score: 400,
      collect() { stun(2000); knockback(150); NB_FX.bubble('sprite', 'not you again'); },
    },
    'readme-gem': {
      kind: 'collectible', tier: 'rare', gate: /github\.com$/i, name: 'README Gem', score: 600,
      collect() { NB_FX.bubble('cursor', 'documented AND hidden.'); },
    },
    'clippy': {
      kind: 'collectible', tier: 'rare', gate: null, behavior: 'typing', name: 'Clippy', score: 200,
      collect() { NB_FX.reveal(10000); NB_FX.bubble('cursor', 'it looks like you\'re being hunted.'); },
    },
    'rare-pepe': {
      kind: 'collectible', tier: 'legendary', gate: null, name: 'Rare Pepe', score: 1500,
      collect() {
        S().mods.chaosResistUntil = now() + T().ITEM_PEPE_RESIST_MS;
        NB_FX.bubble('cursor', 'feels good man');
      },
    },
    'doge': {
      kind: 'collectible', tier: 'rare', gate: null, name: 'Doge', score: 300,
      collect() { NB_CHAOS.add(-20); NB_FX.bubble('cursor', 'much safe. very protected. wow.'); },
    },
    'bad-luck-brian': {
      kind: 'collectible', tier: 'uncommon', gate: null, name: 'Bad Luck Brian', score: 800,
      collect() {
        const m = S().mods;
        m.hasteMult = 1.3; m.hasteUntil = now() + T().ITEM_BRIAN_HASTE_MS;
        NB_FX.bubble('cursor', 'grabs rare pickup. it\'s a trap.');
      },
    },
    'waifu-plush': {
      kind: 'collectible', tier: 'rare', gate: null, name: 'Anime Waifu Plush', score: 700,
      collect() { NB_CHAOS.add(10); NB_FX.bubble('cursor', 'she saw you grab that.'); }, // M2: speeds the Waifu
    },
    'ghost-of-vine': {
      kind: 'collectible', tier: 'legendary', gate: null, name: 'Ghost of Vine', score: 2000,
      collect() { NB_FX.bubble('cursor', 'do it for the vine.'); },
    },
    'rage-face': {
      kind: 'collectible', tier: 'common', gate: null, name: 'Rage Face', score: 50, stackable: true,
      collect() {
        const s = S();
        s.comboCount++;
        NB_FX.bubble('cursor', ['LOL', 'ME GUSTA', 'YAO MING FACE', 'FFFFFUUUU'][s.comboCount % 4] + ' x' + s.comboCount);
      },
    },
  };

  // Placeholder pixel icons, 12x12 (Dave's art replaces these grids; ids never change).
  const ICON_PAL = { k: '#16161c', w: '#f2f2f2', r: '#c23434', g: '#3fa04a', b: '#3a62c2', y: '#e8c944', o: '#df8434', n: '#7a4c2a', p: '#b05ac0', s: '#69c4e0', d: '#8a8a92', e: '#2fbf71' };

  const ICONS = {
    'ban-hammer':      ['............', '...kkkkkk...', '..kddddddk..', '..kddddddk..', '...kkkkkk...', '.....kn.....', '.....kn.....', '.....kn.....', '.....kn.....', '.....kn.....', '.....kk.....', '............'],
    'incognito-cloak': ['............', '....kkkk....', '...kkkkkk...', '..kkkkkkkk..', '..kkwkkwkk..', '..kkkkkkkk..', '...kkkkkk...', '..kkkkkkkk..', '.kkkkkkkkkk.', '.kkk....kkk.', '.kk......kk.', '............'],
    'adblock-wall':    ['............', '.rrrrrrrrrr.', '.rwwwwwwwwr.', '.rwkkwwkkwr.', '.rwwwwwwwwr.', '.rrrrrrrrrr.', '.rwwwwwwwwr.', '.rwkkkkkkwr.', '.rwwwwwwwwr.', '.rrrrrrrrrr.', '............', '............'],
    'mountain-dew':    ['............', '....gggg....', '....g..g....', '...gggggg...', '...geeeeg...', '...geeeeg...', '...gewweg...', '...geeeeg...', '...geeeeg...', '...gggggg...', '............', '............'],
    'rickroll-trap':   ['............', '....kkkk....', '...knnnnk...', '..knnnnnnk..', '..kwnwnwnk..', '..knnnnnnk..', '...krrrrk...', '..krrrrrrk..', '..kr.rr.rk..', '..kk.kk.kk..', '............', '............'],
    'vpn-teleport':    ['............', '....bbbb....', '..bb....bb..', '.b..s..s..b.', '.b.s....s.b.', 'b..s.ss.s..b', 'b..s.ss.s..b', '.b.s....s.b.', '.b..s..s..b.', '..bb....bb..', '....bbbb....', '............'],
    'popup-shield':    ['............', '...ssssss...', '..s......s..', '.s..wwww..s.', '.s.w....w.s.', '.s.w.ww.w.s.', '.s.w....w.s.', '.s..wwww..s.', '..s......s..', '...ssssss...', '............', '............'],
    'scuba-steve':     ['............', '....oooo....', '...osssso...', '..os.ss.so..', '..osssssso..', '...osssso...', '....o..o....', '...oo..oo...', '...o....o...', '...o....o...', '............', '............'],
    'bsod':            ['............', '.bbbbbbbbbb.', '.bwwbbbbbbb.', '.bbbbbbbbbb.', '.bwwwwwbbbb.', '.bbbbbbbbbb.', '.bwwwbbbbbb.', '.bbbbbbbbbb.', '.bwwwwwwwbb.', '.bbbbbbbbbb.', '............', '............'],
    'one-ring':        ['............', '............', '....yyyy....', '...y....y...', '..y......y..', '..y......y..', '..y......y..', '..y......y..', '...y....y...', '....yyyy....', '............', '............'],
    'techno-viking':   ['............', '....nnnn....', '...nwwwwn...', '...nw..wn...', '....wwww....', '..d.wwww.d..', '.d.dddddd.d.', '...dddddd...', '...dd..dd...', '...dd..dd...', '............', '............'],
    'scumbag-hat':     ['............', '............', '...nnnnnn...', '..nwnwnwnn..', '..nnnnnnnn..', '.nnnnnnnnnn.', '.nwnwnwnwnn.', '.nnnnnnnnnn.', '............', '............', '............', '............'],
    'spontaneous-spark':['............', '.......yy...', '......yy....', '.....yy.....', '....yyyy....', '...yyyy.....', '.....yy.....', '....yy......', '...yy.......', '..yy........', '............', '............'],
    'golden-upvote':   ['............', '.....yy.....', '....yyyy....', '...yyyyyy...', '..yyyyyyyy..', '.yyy.yy.yyy.', '.....yy.....', '.....yy.....', '.....yy.....', '.....yy.....', '............', '............'],
    'wumpus':          ['............', '...b....b...', '...bb..bb...', '...bbbbbb...', '..bbwbbwbb..', '..bbbbbbbb..', '..bb.bb.bb..', '...bbbbbb...', '...b.bb.b...', '............', '............', '............'],
    'stick-figure':    ['............', '.....kk.....', '.....kk.....', '..kkkkkkkk..', '.....kk.....', '.....kk.....', '.....kk.....', '....k..k....', '...k....k...', '..k......k..', '............', '............'],
    'readme-gem':      ['............', '....pppp....', '...pppppp...', '..pwpppppp..', '..pppppppp..', '...pppppp...', '....pppp....', '.....pp.....', '............', '............', '............', '............'],
    'clippy':          ['............', '....ss......', '...s..s.....', '...s..s.....', '...s..s.....', '...s..s.....', '...s..s.ww..', '...s..s.ww..', '...s..s.....', '....ss......', '............', '............'],
    'rare-pepe':       ['............', '...gggggg...', '..gggggggg..', '..gwggwggg..', '..ggggggggg.', '..grrrrrgg..', '..gggggggg..', '...gggggg...', '............', '............', '............', '............'],
    'doge':            ['............', '...y....y...', '...yy..yy...', '...yyyyyy...', '..yykyykyy..', '..yyyyyyyy..', '..yyykkyyy..', '...yyyyyy...', '............', '............', '............', '............'],
    'bad-luck-brian':  ['............', '...yyyyyy...', '..yyyyyyyy..', '..ywwyywwy..', '..yyyyyyyy..', '..ywwwwwwy..', '..yw.ww.wy..', '..ywwwwwwy..', '...yyyyyy...', '............', '............', '............'],
    'waifu-plush':     ['............', '...pp..pp...', '..pppppppp..', '..pwppppwp..', '..pppppppp..', '...pppppp...', '....pppp....', '...pp..pp...', '............', '............', '............', '............'],
    'ghost-of-vine':   ['............', '....wwww....', '...wwwwww...', '..wwkwwkww..', '..wwwwwwww..', '..wwwwwwww..', '..wwwwwwww..', '..w.w..w.w..', '............', '............', '............', '............'],
    'rage-face':       ['............', '...wwwwww...', '..wwwwwwww..', '..wkwwwwkw..', '..wwwwwwww..', '..wkkkkkkw..', '..wwkkkkww..', '...wwwwww...', '............', '............', '............', '............'],
  };

  function drawIcon(canvas, id) {
    const grid = ICONS[id];
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!grid) { ctx.fillStyle = '#f0f'; ctx.fillRect(2, 2, 8, 8); return; }
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const col = ICON_PAL[grid[r][c]];
        if (col) { ctx.fillStyle = col; ctx.fillRect(c, r, 1, 1); }
      }
    }
  }

  return { DEFS, drawIcon };
})();
