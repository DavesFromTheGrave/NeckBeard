// key-bg.mjs — background remover for frame folders (white OR grid/checker).
// Border flood-fill: a pixel is "background" only if it's neutral (low channel
// spread) AND light AND reachable from the image edge through other background
// pixels. Interior light-gray (a gray shirt, eye-whites, BAN text) is never
// edge-connected, so it survives. The rim gets feathered alpha for clean edges.
//
// This lives in the repo so the keying capability is PERMANENT (the old
// scratchpad script got wiped between sessions — the whole point of saving it).
//
// Usage:
//   node tools/key-bg.mjs <folder> [outFolder]   # keys every *.png (in place if no out)
//   node tools/key-bg.mjs <in.png> <out.png>      # single file
// Requires pngjs (npm i pngjs).  Originals: pass an outFolder to keep them.
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

export function keyBG(inPath, outPath, { spread = 40, light = 150, hard = 232, feather = 60 } = {}) {
  const p = PNG.sync.read(fs.readFileSync(inPath));
  const { width: w, height: h, data: d } = p, N = w * h;
  const bgLike = (i) => {
    const o = i * 4, r = d[o], g = d[o + 1], b = d[o + 2], mn = Math.min(r, g, b);
    return (Math.max(r, g, b) - mn) <= spread && mn >= light;
  };
  const bg = new Uint8Array(N), st = [];
  const push = (x, y) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const i = y * w + x; if (bg[i] || !bgLike(i)) return; bg[i] = 1; st.push(i); };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (st.length) { const i = st.pop(), x = i % w, y = (i / w) | 0; push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }
  for (let i = 0; i < N; i++) {
    if (!bg[i]) continue;
    const o = i * 4, mn = Math.min(d[o], d[o + 1], d[o + 2]);
    if (mn >= hard) d[o + 3] = 0;
    else { const a = Math.round(255 * (hard - mn) / Math.max(1, hard - feather)); d[o + 3] = Math.min(d[o + 3], Math.max(0, a)); }
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, PNG.sync.write(p));
}

// CLI
const [, , inp, out] = process.argv;
if (inp) {
  const stat = fs.existsSync(inp) && fs.statSync(inp);
  if (stat && stat.isDirectory()) {
    const files = fs.readdirSync(inp).filter(f => /\.png$/i.test(f));
    for (const f of files) keyBG(path.join(inp, f), path.join(out || inp, f));
    console.log(`keyed ${files.length} frames -> ${out || inp}`);
  } else if (stat) {
    keyBG(inp, out || inp);
    console.log(`keyed ${inp} -> ${out || inp}`);
  } else {
    console.error('not found:', inp);
  }
}
