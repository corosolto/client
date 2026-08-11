// G2-R7B — mzmarks genérico: anota landmarks do model space de uma arma-herói num
// screenshot pra calibrar o `tip` do muzzle. Uso: node tools/eval/g2r7b-mzmarks.mjs <arma> "nome:x,y,z;nome2:x,y,z;..."
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const WEAPON = process.argv[2] || 'm4';
const LMS = (process.argv[3] || 'slab:auto').split(';').map((s) => s.split(':'));
const COLORS = ['#0f0', '#f0f', '#fa0', '#0ff', '#ff0', '#f66'];
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(`${BASE}/?debug=1&map=fy_pool_day&auto=P,mst`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 300000 });
await page.waitForFunction((w) => window.__game.vm.staticVms && window.__game.vm.staticVms[w], WEAPON, { timeout: 180000 });
await page.evaluate(([w, LMS, COLORS]) => {
  const g = window.__game, m = g.vm.staticVms[w];
  g.paused = true;
  g.player.pitch = 0; g._switchWeapon(w); g.player.drawUntil = 0;
  for (let i = 0; i < 3; i++) { g.paused = false; g.update(0.016); g.paused = true; }
  const V = Object.getPrototypeOf(g._vmMuzzle.rifle).constructor;
  m.updateWorldMatrix(true, false);
  const c = document.createElement('canvas');
  c.width = innerWidth; c.height = innerHeight;
  c.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none';
  document.body.appendChild(c);
  const x2 = c.getContext('2d');
  x2.font = 'bold 15px monospace';
  LMS.forEach(([k, v], i) => {
    let p;
    if (v === 'auto') p = g._vmMuzzle[w];       // o tip atual calculado no build
    else p = m.localToWorld(new V(...v.split(',').map(Number)));
    const pr = p.clone().project(g.vmCamera);
    const sx = (pr.x + 1) / 2 * innerWidth, sy = (1 - pr.y) / 2 * innerHeight;
    x2.fillStyle = COLORS[i % COLORS.length];
    x2.beginPath(); x2.arc(sx, sy, 6, 0, 7); x2.fill();
    x2.fillText(k, sx + 9, sy + 4 + (i % 3) * 14);
  });
}, [WEAPON, LMS, COLORS]);
await page.screenshot({ path: `/tmp/gauntlet/g2r7b-mz-${WEAPON}.png` });
console.log('DONE', WEAPON);
await browser.close();
