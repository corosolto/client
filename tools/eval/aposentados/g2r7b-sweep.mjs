// G2-R7B — sweep de framing genérico das armas-herói dedicadas (m4/mp5/awp): aplica
// candidatos de (pitch,yaw,roll,pos,scale) ao vivo no staticVms[arma] (userData.qAlign
// salvo no build) e captura cada um. Uso: node tools/eval/aposentados/g2r7b-sweep.mjs <arma> [WxH]
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const WEAPON = process.argv[2] || 'm4';
const [W, H] = (process.argv[3] || '1600x900').split('x').map(Number);
const OUT = '/tmp/gauntlet'; mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
// [nome, pitch, yaw, roll, px, py, pz, scale]
const CANDS = {
  m4: [
    ['a-base', 0.02, 0.28, -0.07, 0.19, -0.12, -0.37, 0.54],
    ['b-yaw+20', 0.02, 0.20, -0.06, 0.18, -0.12, -0.37, 0.54],
    ['c-yaw+36', 0.02, 0.36, -0.08, 0.20, -0.12, -0.37, 0.54],
    ['d-menor', 0.02, 0.28, -0.07, 0.18, -0.13, -0.40, 0.48],
  ],
  mp5: [
    ['u-y24s46', 0.02, 0.24, -0.22, 0.20, -0.13, -0.39, 0.46],
    ['v-y24s50', 0.02, 0.24, -0.22, 0.20, -0.12, -0.38, 0.50],
    ['w-y28s48', 0.02, 0.28, -0.24, 0.21, -0.13, -0.39, 0.48],
    ['x-y20s44', 0.02, 0.20, -0.20, 0.20, -0.13, -0.40, 0.44],
  ],
  awp: [
    ['a-base', 0.02, 0.28, -0.07, 0.19, -0.12, -0.37, 0.54],
    ['b-yaw+20', 0.02, 0.20, -0.06, 0.17, -0.14, -0.40, 0.50],
    ['c-yaw+36', 0.02, 0.36, -0.08, 0.20, -0.13, -0.40, 0.54],
    ['d-menor', 0.02, 0.24, -0.07, 0.16, -0.15, -0.44, 0.44],
  ],
}[WEAPON];
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(`${BASE}/?debug=1&map=piscina_treta&auto=P,mst`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 300000 });
await page.waitForFunction((w) => {
  const g = window.__game, m = g.vm.staticVms && g.vm.staticVms[w];
  return m && m.userData.qAlign;
}, WEAPON, { timeout: 180000 });
await page.evaluate((w) => {
  const g = window.__game;
  g.paused = true;
  window.__step = (n = 1, dt = 0.016) => { for (let i = 0; i < n; i++) { g.paused = false; g.update(dt); g.paused = true; } };
  g.player.pitch = 0;
  g._switchWeapon(w); g.player.drawUntil = 0;
  window.__step(3);
}, WEAPON);
for (const [name, pitch, yaw, roll, px, py, pz, s] of CANDS) {
  await page.evaluate(([w, pitch, yaw, roll, px, py, pz, s]) => {
    const g = window.__game, m = g.vm.staticVms[w];
    const E = new (Object.getPrototypeOf(g.camera.rotation).constructor)(pitch, yaw, roll, 'YXZ');
    const Q = new (Object.getPrototypeOf(g.camera.quaternion).constructor)().setFromEuler(E);
    m.quaternion.copy(m.userData.qAlign).multiply(Q);
    m.position.set(px, py, pz); m.scale.setScalar(s);
    m.updateWorldMatrix(true, false);
    window.__step(1);
  }, [WEAPON, pitch, yaw, roll, px, py, pz, s]);
  await page.screenshot({ path: `${OUT}/g2r7b-sw-${WEAPON}-${name}.png` });
  console.log('shot', WEAPON, name);
}
console.log('DONE');
await browser.close();
