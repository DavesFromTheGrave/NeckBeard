// Visual effects for items, chaos, and reactions. Everything renders inside NB_UI's shadow
// root, everything is pointer-events:none (the page stays usable through ALL of it — even
// the fake BSOD lets clicks through), and everything cleans itself up on a timer.
// Placeholder-grade visuals behind stable function names; the art pass restyles, ids stay.
window.NB_FX = (() => {
  const S = () => window.NB_STATE;
  const reduced = () => !!(window.NB_ACCESS && window.NB_ACCESS.reducedMotion);

  const layer = () => window.NB_UI.layer();

  function el(css, text) {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;pointer-events:none;' + css;
    if (text) d.textContent = text;
    layer().appendChild(d);
    return d;
  }

  const IMPACT = 'font-family:Impact,\'Arial Black\',sans-serif;';

  // ---- Speech bubbles (rage-comic text tier until the art lands) ----
  function bubble(anchor, text, ms) {
    ms = ms || 2200;
    const b = el('background:#fff;color:#111;border:3px solid #111;padding:4px 10px;' + IMPACT +
      'font-size:15px;letter-spacing:1px;white-space:nowrap;z-index:30;', text);
    const place = () => {
      const p = anchor === 'sprite' && S().pursuerPos ? S().pursuerPos : (S().cursor || { x: innerWidth / 2, y: innerHeight / 2 });
      b.style.left = Math.round(p.x - b.offsetWidth / 2) + 'px';
      b.style.top = Math.round(p.y - (anchor === 'sprite' ? 110 : 50)) + 'px';
    };
    place();
    const follow = anchor === 'sprite' ? setInterval(place, 60) : null;
    setTimeout(() => { if (follow) clearInterval(follow); b.remove(); }, ms);
  }

  // ---- Ban Hammer timeout bar over his head ----
  function timeoutBar(ms) {
    const wrap = el('width:80px;height:10px;background:#111;border:2px solid #fff;z-index:30;');
    const fill = document.createElement('div');
    fill.style.cssText = 'height:100%;background:#c23434;width:100%;';
    wrap.appendChild(fill);
    const born = performance.now();
    const iv = setInterval(() => {
      const p = S().pursuerPos || { x: -100, y: -100 };
      wrap.style.left = Math.round(p.x - 40) + 'px';
      wrap.style.top = Math.round(p.y - 90) + 'px';
      fill.style.width = Math.max(0, 100 - ((performance.now() - born) / ms) * 100) + '%';
    }, 50);
    setTimeout(() => { clearInterval(iv); wrap.remove(); }, ms);
  }

  // ---- Mountain Dew rainbow trail ----
  function trail(ms) {
    const colors = ['#e33', '#e83', '#ec3', '#3c3', '#36c', '#63c'];
    let i = 0;
    const drop = (e) => {
      const d = el('width:8px;height:8px;z-index:5;background:' + colors[i++ % colors.length] +
        ';left:' + (e.clientX - 4) + 'px;top:' + (e.clientY + 10) + 'px;transition:opacity .6s;');
      setTimeout(() => { d.style.opacity = '0'; }, 50);
      setTimeout(() => d.remove(), 700);
    };
    if (!reduced()) window.addEventListener('pointermove', drop, { passive: true });
    setTimeout(() => window.removeEventListener('pointermove', drop), ms);
  }

  // ---- Chaos: This Is Fine ember tint + Trogdor burnination ----
  let tintEl = null;
  function chaosTint(frac) {
    if (!tintEl) tintEl = el('inset:0;z-index:1;box-shadow:inset 0 0 160px rgba(190,60,20,0.85);opacity:0;transition:opacity 1s;');
    tintEl.style.opacity = String(Math.min(1, frac));
  }

  function burninate(ms) {
    const banner = el('left:50%;top:12%;transform:translateX(-50%);' + IMPACT +
      'font-size:34px;color:#ff6a00;text-shadow:2px 2px 0 #000;z-index:40;', 'BURNINATION.');
    const flames = el('inset:0;z-index:2;box-shadow:inset 0 0 220px rgba(255,80,0,0.95);');
    setTimeout(() => { banner.remove(); flames.remove(); }, ms);
  }

  // ---- BSOD (deception tier: looks fatal, page stays fully clickable) ----
  function bsod(ms) {
    const b = el('inset:0;background:#0a67c2;color:#fff;z-index:50;padding:12vh 10vw;font-family:Consolas,monospace;');
    b.innerHTML = '';
    const face = document.createElement('div'); face.textContent = ':('; face.style.cssText = 'font-size:90px;margin-bottom:24px;';
    const l1 = document.createElement('div'); l1.textContent = 'Your session ran into a problem and needs to restart.'; l1.style.cssText = 'font-size:22px;margin-bottom:16px;';
    const l2 = document.createElement('div'); l2.textContent = 'Collecting error info... 100% complete'; l2.style.cssText = 'font-size:16px;margin-bottom:16px;';
    const l3 = document.createElement('div'); l3.textContent = 'Stop code: NECKBEARD_STOPPED_RESPONDING'; l3.style.cssText = 'font-size:14px;opacity:.8;';
    b.append(face, l1, l2, l3);
    setTimeout(() => b.remove(), ms);
  }

  // ---- Popup-Blocker shield pop ----
  function shieldPop() {
    const c = S().cursor || { x: innerWidth / 2, y: innerHeight / 2 };
    const ring = el('width:20px;height:20px;border:4px solid #69c4e0;border-radius:50%;z-index:30;' +
      'left:' + (c.x - 14) + 'px;top:' + (c.y - 14) + 'px;transition:all .35s ease-out;');
    const label = el('left:' + (c.x - 40) + 'px;top:' + (c.y - 60) + 'px;' + IMPACT + 'font-size:18px;color:#69c4e0;text-shadow:2px 2px 0 #000;z-index:30;', 'BLOCKED');
    requestAnimationFrame(() => {
      ring.style.width = '90px'; ring.style.height = '90px';
      ring.style.left = (c.x - 49) + 'px'; ring.style.top = (c.y - 49) + 'px';
      ring.style.opacity = '0';
    });
    setTimeout(() => { ring.remove(); label.remove(); }, 900);
  }

  // ---- Ad-Blocker Wall: the obstacle IS a fake banner ad ----
  function wall(rect, ms) {
    const w = el('left:' + rect.x + 'px;top:' + rect.y + 'px;width:' + rect.w + 'px;height:' + rect.h + 'px;' +
      'background:#ffe;border:3px solid #c23434;z-index:10;display:flex;align-items:center;justify-content:center;text-align:center;' +
      IMPACT + 'font-size:20px;color:#c23434;');
    w.textContent = 'HOT SINGLES IN YOUR DOM AREA';
    const x = document.createElement('div');
    x.textContent = 'X';
    x.style.cssText = 'position:absolute;top:2px;right:6px;font-size:14px;color:#888;';
    w.appendChild(x);
    setTimeout(() => w.remove(), ms);
  }

  // ---- Rickroll decoy: an irresistible fake link ----
  function decoy(pos, ms) {
    const d = el('left:' + (pos.x - 90) + 'px;top:' + (pos.y - 12) + 'px;z-index:10;' +
      'font-family:Arial,sans-serif;font-size:15px;color:#1a0dab;text-decoration:underline;', 'You won’t BELIEVE what this mod found');
    const note = el('left:' + (pos.x + 60) + 'px;top:' + (pos.y - 34) + 'px;font-size:18px;z-index:10;', '♪');
    let flip = false;
    const iv = setInterval(() => { note.style.top = (pos.y - (flip ? 30 : 38)) + 'px'; flip = !flip; }, 250);
    setTimeout(() => { clearInterval(iv); d.remove(); note.remove(); }, ms);
  }

  // ---- Techno Viking: walks a straight line; Neckbeard wants NOTHING to do with him ----
  function viking(ms) {
    const y = (innerHeight || 800) * (0.3 + Math.random() * 0.4);
    const c = document.createElement('canvas');
    c.width = 12; c.height = 12;
    NB_ITEMS.drawIcon(c, 'techno-viking');
    c.style.cssText = 'position:fixed;pointer-events:none;width:72px;height:72px;image-rendering:pixelated;z-index:20;top:' + (y - 36) + 'px;';
    layer().appendChild(c);
    const born = performance.now();
    const fromLeft = Math.random() < 0.5;
    const iv = setInterval(() => {
      const t = (performance.now() - born) / ms;
      const w = innerWidth || 1200;
      const x = fromLeft ? t * (w + 160) - 80 : w + 80 - t * (w + 160);
      c.style.left = Math.round(x - 36) + 'px';
      const m = S().mods;
      if (m) m.retreatFrom = { x, y, until: performance.now() + 200 };
    }, 50);
    setTimeout(() => { clearInterval(iv); c.remove(); const m = S().mods; if (m) m.retreatFrom = null; }, ms);
  }

  // ---- Scumbag Hat riding the cursor ----
  let hatEl = null, hatMove = null;
  function hat(on) {
    if (on && !hatEl) {
      hatEl = document.createElement('canvas');
      hatEl.width = 12; hatEl.height = 12;
      NB_ITEMS.drawIcon(hatEl, 'scumbag-hat');
      hatEl.style.cssText = 'position:fixed;pointer-events:none;width:36px;height:36px;image-rendering:pixelated;z-index:35;';
      layer().appendChild(hatEl);
      hatMove = (e) => { hatEl.style.left = (e.clientX - 18) + 'px'; hatEl.style.top = (e.clientY - 40) + 'px'; };
      window.addEventListener('pointermove', hatMove, { passive: true });
    } else if (!on && hatEl) {
      window.removeEventListener('pointermove', hatMove);
      hatEl.remove(); hatEl = null; hatMove = null;
    }
  }

  // ---- Clippy reveal: an arrow that always points at him ----
  function reveal(ms) {
    const a = el(IMPACT + 'font-size:30px;color:#69c4e0;text-shadow:2px 2px 0 #000;z-index:30;', '➤');
    const iv = setInterval(() => {
      const c = S().cursor, p = S().pursuerPos;
      if (!c || !p) return;
      const ang = Math.atan2(p.y - c.y, p.x - c.x);
      a.style.left = Math.round(c.x + Math.cos(ang) * 60 - 15) + 'px';
      a.style.top = Math.round(c.y + Math.sin(ang) * 60 - 20) + 'px';
      a.style.transform = 'rotate(' + ang + 'rad)';
    }, 50);
    setTimeout(() => { clearInterval(iv); a.remove(); }, ms);
  }

  // ---- Floating score text ----
  function scorePop(x, y, text) {
    const p = el('left:' + (x - 20) + 'px;top:' + (y - 20) + 'px;' + IMPACT +
      'font-size:20px;color:#e8c944;text-shadow:2px 2px 0 #000;z-index:30;transition:all 1s ease-out;', text);
    requestAnimationFrame(() => { p.style.top = (y - 70) + 'px'; p.style.opacity = '0'; });
    setTimeout(() => p.remove(), 1100);
  }

  return { bubble, timeoutBar, trail, chaosTint, burninate, bsod, shieldPop, wall, decoy, viking, hat, reveal, scorePop };
})();
