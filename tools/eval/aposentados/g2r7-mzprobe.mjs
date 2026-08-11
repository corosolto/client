// G2-R7 — probe do muzzle da AK dedicada: projeta _vmMuzzle.ak e candidatos de bore
// (model space) pra coordenadas de tela, pra calibrar o flash na boca do cano.
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
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(`${BASE}/?debug=1&map=piscina_treta&auto=P,mst`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 300000 });
await page.waitForFunction(() => window.__game.vm.staticVms && window.__game.vm.staticVms.ak, null, { timeout: 180000 });
const r = await page.evaluate(() => {
  const g = window.__game, m = g.vm.staticVms.ak;
  g.paused = true;
  g.player.pitch = 0; g._switchWeapon('ak'); g.player.drawUntil = 0;
  for (let i = 0; i < 3; i++) { g.paused = false; g.update(0.016); g.paused = true; }
  const proj = (v) => {
    const p = v.clone().project(g.vmCamera);
    return [((p.x + 1) / 2 * innerWidth) | 0, ((1 - p.y) / 2 * innerHeight) | 0];
  };
  const V = Object.getPrototypeOf(g._vmMuzzle.ak).constructor;
  const out = { stored: proj(g._vmMuzzle.ak), cands: {} };
  m.updateWorldMatrix(true, false);
  for (const [k, p] of Object.entries({
    slab06: [-0.101, 0.309, 0.467],
    bore: [-0.102, 0.316, 0.497],
    boreUp1: [-0.102, 0.336, 0.497],
    boreUp2: [-0.102, 0.356, 0.497],
  })) out.cands[k] = { model: p, screen: proj(m.localToWorld(new V(...p))) };
  return out;
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
