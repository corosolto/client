// G2-R7 — sweep de framing da AK dedicada EM UMA SESSÃO: aplica candidatos de
// (pitch,yaw,roll,pos,scale) ao vivo no staticVms.ak (userData.qAlign salvo no build)
// e captura cada um. Uso: node tools/eval/g2r7-aksweep.mjs [WxH]
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const [W, H] = (process.argv[2] || '1600x900').split('x').map(Number);
const OUT = '/tmp/gauntlet'; mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const CANDS = [
  // [nome, pitch, yaw, roll, px, py, pz, scale]
  ['e-refino', 0.02, 0.24, -0.07, 0.185, -0.125, -0.37, 0.52],
  ['f-d', 0.02, 0.20, -0.06, 0.18, -0.12, -0.36, 0.55],
  ['g-yaw+28', 0.02, 0.28, -0.07, 0.19, -0.12, -0.37, 0.54],
  ['h-yaw+20menor', 0.02, 0.20, -0.06, 0.18, -0.13, -0.38, 0.50],
];
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(`${BASE}/?debug=1&map=fy_pool_day&auto=P,mst`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 300000 });
await page.waitForFunction(() => {
  const g = window.__game, m = g.vm.staticVms && g.vm.staticVms.ak;
  return m && m.userData.qAlign;
}, null, { timeout: 180000 });
await page.evaluate(() => {
  const g = window.__game;
  g.paused = true;
  window.__step = (n = 1, dt = 0.016) => { for (let i = 0; i < n; i++) { g.paused = false; g.update(dt); g.paused = true; } };
  g.player.pitch = 0;
  g._switchWeapon('ak'); g.player.drawUntil = 0;
  window.__step(3);
});
for (const [name, pitch, yaw, roll, px, py, pz, s] of CANDS) {
  await page.evaluate(([pitch, yaw, roll, px, py, pz, s]) => {
    const g = window.__game, m = g.vm.staticVms.ak, T = g.vm.root.THREE || null;
    const E = new (Object.getPrototypeOf(g.camera.rotation).constructor)(pitch, yaw, roll, 'YXZ');
    const Q = new (Object.getPrototypeOf(g.camera.quaternion).constructor)().setFromEuler(E);
    m.quaternion.copy(m.userData.qAlign).multiply(Q);
    m.position.set(px, py, pz); m.scale.setScalar(s);
    m.updateWorldMatrix(true, false);
    window.__step(1);
  }, [pitch, yaw, roll, px, py, pz, s]);
  await page.screenshot({ path: `${OUT}/g2r7-sw-${name}.png` });
  console.log('shot', name);
}
console.log('DONE');
await browser.close();
