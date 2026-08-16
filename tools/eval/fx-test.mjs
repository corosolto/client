// FX smoke test: loads a live match, spawns GPU particles (flash/puff) + pooled tracers via the
// real game methods, steps the loop, and screenshots. Fails loudly on any console/page error
// (e.g. shader compile). Usage: node tools/eval/fx-test.mjs [out]
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/tmp/fx-test.png';
const BASE = process.env.BASE || 'http://localhost:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 560 } });
let errors = 0;
page.on('console', m => { if (m.type() === 'error') { errors++; console.error('[page-err]', m.text()); } });
page.on('pageerror', e => { errors++; console.error('[pageerror]', e.message); });
await page.goto(`${BASE}/?debug=1&auto=P,mst`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 60000 });

const info = await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.pos;
  const V = (x, y, z) => new p.constructor(x, y, z);
  // spawn in front of the player so they're on-screen
  for (let i = 0; i < 6; i++) g._flash(V(p.x + (i - 3) * 0.4, p.y + 1.4, p.z + 2.2));
  for (let i = 0; i < 6; i++) g._puff(V(p.x + (i - 3) * 0.5, p.y + 1.0, p.z + 2.6), V(0, 0, -1));
  for (let i = 0; i < 3; i++) g._tracer(V(p.x - 1 + i, p.y + 1.3, p.z + 2.0), V(p.x - 1 + i + 0.6, p.y + 1.5, p.z + 4.5));
  return {
    hasFlashFx: !!g.flashFx, hasPuffFx: !!g.puffFx,
    flashIsPoints: g.flashFx && g.flashFx.points && g.flashFx.points.isPoints,
    puffIsPoints: g.puffFx && g.puffFx.points && g.puffFx.points.isPoints,
    tracers: g.tracers.length, rendererInfo: g.renderer ? g.renderer.info.render.calls : -1,
  };
});
console.log('info:', JSON.stringify(info));
// let the loop advance a couple frames so uTime moves and particles are mid-life
await page.waitForTimeout(60);
await page.screenshot({ path: OUT });
console.log('shot ->', OUT, '| console errors:', errors);
await browser.close();
process.exit(errors ? 1 : 0);
