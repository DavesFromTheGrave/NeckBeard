// Headless boot check — verifies Phaser scene reaches ready state.
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4181';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__gs?.ready === true, null, { timeout: 15000 });

const state = await page.evaluate(() => ({
  ready: window.__gs?.ready,
  posts: window.__gs?.page?.elements?.filter(e => e.kind === 'post').length,
  mod: window.__gs?.mod?.state,
  buildErr: window.__buildErr || null,
}));

console.log(JSON.stringify({ ok: state.ready && !state.buildErr, state, errors }, null, 2));
await browser.close();
process.exit(state.ready && !state.buildErr && errors.length === 0 ? 0 : 1);