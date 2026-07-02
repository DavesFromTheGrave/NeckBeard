// The Animator-vs-Animation layer: the live page, read as terrain. STRICTLY READ-ONLY —
// we sample element rectangles; we never mutate, hide, or move a page node.
// Terrain rule (Dave, 2026-07-02): he can be BLOCKED, never STOPPED. Crossing dense page
// furniture costs him real time (climb-speed penalty); it never walls him off. Cluttered
// pages are defensive terrain; clean pages are kill boxes.
window.NB_TERRAIN = (() => {
  const T = () => window.NB_TUNABLES;

  let surfaces = [];   // big layout blocks: walkable top edges (climb beat, cosmetic)
  let obstacles = [];  // dense THINGS (images/video/tables/code): crossing them is slow
  let occluders = [];  // rects he can pass BEHIND (opaque-ish media bigger than him)
  let hopPoints = [];  // small inline targets (links, buttons) worth a hop
  let lastScan = 0;
  let started = false;

  const SCAN_EVERY_MS = 700;
  const MAX_TRACKED = 40;

  function visible(r) {
    // "|| 4096": zero-sized viewports (hidden/background tabs) must not blind the scanner
    const vw = innerWidth || 4096, vh = innerHeight || 4096;
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
  }

  function scan() {
    lastScan = performance.now();
    const nextSurfaces = [], nextObstacles = [], nextOccluders = [], nextHops = [];
    let budget = 400; // element examination cap — heavy pages stay smooth
    const els = document.querySelectorAll('img,video,iframe,article,section,aside,nav,header,pre,table,figure,button,a,h1,h2');
    for (const el of els) {
      if (budget-- <= 0) break;
      const r = el.getBoundingClientRect();
      if (!visible(r)) continue;
      const tag = el.tagName;
      if (tag === 'A' || tag === 'BUTTON' || tag === 'H1' || tag === 'H2') {
        if (r.width >= 24 && r.width <= 400 && r.height <= 60 && nextHops.length < MAX_TRACKED) {
          nextHops.push({ x: r.left, y: r.top, w: r.width, h: r.height });
        }
        continue;
      }
      const rect = { x: r.left, y: r.top, w: r.width, h: r.height };
      // dense THINGS he has to physically get over — real traversal cost
      const dense = tag === 'IMG' || tag === 'VIDEO' || tag === 'IFRAME' || tag === 'FIGURE' || tag === 'PRE' || tag === 'TABLE';
      if (dense && r.width >= 100 && r.height >= 80 && nextObstacles.length < MAX_TRACKED) {
        nextObstacles.push(rect);
        // opaque media noticeably bigger than the sprite = also something to hide behind
        if (r.width >= 140 && r.height >= 170 && nextOccluders.length < MAX_TRACKED) {
          nextOccluders.push(rect);
        }
      }
      // big layout blocks: walkable top edge (cosmetic climb beat, no slow — they ARE the page)
      if (r.width >= 160 && r.height >= 90 && nextSurfaces.length < MAX_TRACKED) {
        nextSurfaces.push(rect);
      }
    }
    surfaces = nextSurfaces;
    obstacles = nextObstacles;
    occluders = nextOccluders;
    hopPoints = nextHops;
  }

  function maybeScan() {
    if (performance.now() - lastScan > SCAN_EVERY_MS) scan();
  }

  // ---- Occlusion: how much of the sprite box should be clipped away so the REAL page
  // element appears to be in front of him. Returns a CSS clip-path or null. ----
  function occlusionClip(box) {
    maybeScan();
    let best = null, bestArea = 0;
    for (const o of occluders) {
      const ix = Math.max(0, Math.min(box.x + box.w, o.x + o.w) - Math.max(box.x, o.x));
      const iy = Math.max(0, Math.min(box.y + box.h, o.y + o.h) - Math.max(box.y, o.y));
      const area = ix * iy;
      if (area > bestArea) { bestArea = area; best = o; }
    }
    if (!best || bestArea < box.w * box.h * 0.15) return null;
    if (bestArea >= box.w * box.h * 0.92) return 'inset(100%)'; // fully behind it
    // clip from the side the occluder covers most (inset keeps the inner region visible)
    const cutL = Math.max(0, (best.x + best.w) - box.x), coverL = best.x <= box.x ? cutL : 0;
    const cutR = Math.max(0, (box.x + box.w) - best.x), coverR = best.x + best.w >= box.x + box.w ? cutR : 0;
    const cutT = Math.max(0, (best.y + best.h) - box.y), coverT = best.y <= box.y ? cutT : 0;
    const cutB = Math.max(0, (box.y + box.h) - best.y), coverB = best.y + best.h >= box.y + box.h ? cutB : 0;
    const m = Math.max(coverL, coverR, coverT, coverB);
    if (m === coverL && coverL > 0) return `inset(0 0 0 ${Math.min(coverL, box.w)}px)`;
    if (m === coverR && coverR > 0) return `inset(0 ${Math.min(coverR, box.w)}px 0 0)`;
    if (m === coverT && coverT > 0) return `inset(${Math.min(coverT, box.h)}px 0 0 0)`;
    if (m === coverB && coverB > 0) return `inset(0 0 ${Math.min(coverB, box.h)}px 0)`;
    return null;
  }

  // ---- Path dressing + traversal cost as he crosses page furniture. ----
  // Returns {anim, visualLift, slowMult} or null. Never changes his trajectory — direction
  // is sacred (no escape); TIME is what terrain costs him.
  function pathDress(pos) {
    maybeScan();
    // inside a dense obstacle: he's climbing over it — slow, arms up, keyboard overhead
    for (const o of obstacles) {
      if (pos.x >= o.x && pos.x <= o.x + o.w && pos.y >= o.y && pos.y <= o.y + o.h) {
        return { anim: 'climb', visualLift: 6, slowMult: T().TERRAIN_CLIMB_MULT };
      }
    }
    // riding a big block's top edge: cosmetic beat, no cost (that's just the page)
    for (const s of surfaces) {
      if (pos.x >= s.x && pos.x <= s.x + s.w && Math.abs(pos.y - s.y) < 14) {
        return { anim: 'climb', visualLift: 6 };
      }
    }
    // hop beat: vaulting a link/button
    for (const hp of hopPoints) {
      if (pos.x >= hp.x - 6 && pos.x <= hp.x + hp.w + 6 && Math.abs(pos.y - (hp.y + hp.h / 2)) < 18) {
        return { visualLift: 14 }; // little arc over the hyperlink; hitbox stays honest
      }
    }
    return null;
  }

  // A spot sitting ON a real element's top edge — doors and pickups leaning against actual
  // content is what sells "he lives in your page" at first sight.
  function surfaceSpot() {
    maybeScan();
    const usable = surfaces.filter((s) => s.y > 90 && s.y < (innerHeight || 800) - 40);
    if (!usable.length) return null;
    const s = usable[Math.floor(Math.random() * usable.length)];
    return { x: s.x + 30 + Math.random() * Math.max(10, s.w - 60), y: s.y };
  }

  function start() {
    if (started) return;
    started = true;
    scan();
    window.addEventListener('scroll', () => { lastScan = 0; }, { passive: true });
    window.addEventListener('resize', () => { lastScan = 0; }, { passive: true });
  }

  function debugCounts() {
    maybeScan();
    return { surfaces: surfaces.length, obstacles: obstacles.length, occluders: occluders.length, hopPoints: hopPoints.length };
  }

  return { start, occlusionClip, pathDress, surfaceSpot, debugCounts };
})();
