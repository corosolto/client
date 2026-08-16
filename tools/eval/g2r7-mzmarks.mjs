// G2-R7 — anota landmarks do model space da AK num screenshot: bore (ponta do cano),
// front sight, e pontos de referência, pra calibrar _vmMuzzle.ak com certeza.
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(`${BASE}/?debug=1&map=piscina_treta&auto=P,mst`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 300000 });
await page.waitForFunction(() => window.__game.vm.staticVms && window.__game.vm.staticVms.ak, null, { timeout: 180000 });
await page.evaluate(() => {
  const g = window.__game, m = g.vm.staticVms.ak;
  g.paused = true;
  g.player.pitch = 0; g._switchWeapon('ak'); g.player.drawUntil = 0;
  for (let i = 0; i < 3; i++) { g.paused = false; g.update(0.016); g.paused = true; }
  const V = Object.getPrototypeOf(g._vmMuzzle.ak).constructor;
  m.updateWorldMatrix(true, false);
  const LM = {
    mz1: [-0.10, 0.325, 0.43],
    mz2: [-0.10, 0.320, 0.44],
    mz3: [-0.10, 0.315, 0.43],
    mz4: [-0.10, 0.325, 0.45],



    stored: null,                       // _vmMuzzle.ak atual
  };
  const c = document.createElement('canvas');
  c.width = innerWidth; c.height = innerHeight;
  c.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none';
  document.body.appendChild(c);
  const x2 = c.getContext('2d');
  x2.font = 'bold 14px monospace';
  for (const [k, p] of Object.entries(LM)) {
    const v = p ? m.localToWorld(new V(...p)) : g._vmMuzzle.ak;
    const pr = v.clone().project(g.vmCamera);
    const sx = (pr.x + 1) / 2 * innerWidth, sy = (1 - pr.y) / 2 * innerHeight;
    x2.fillStyle = { mz1: '#0f0', mz2: '#f0f', mz3: '#fa0', mz4: '#0ff', stored: '#f00' }[k];
    x2.beginPath(); x2.arc(sx, sy, 6, 0, 7); x2.fill();
    x2.fillText(k, sx + 9, sy + 4);
  }
});
await page.screenshot({ path: '/tmp/gauntlet/g2r7-mzmarks.png' });
console.log('DONE');
await browser.close();
