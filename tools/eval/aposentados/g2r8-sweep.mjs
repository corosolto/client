// G2-R8 — sweep de framing de QUALQUER staticVm (classe ou variante): aplica candidatos
// de (pitch,yaw,roll,pos,scale) ao vivo via userData.qAlign (salvo no build p/ todas as
// entradas) e captura. Uso: node tools/eval/aposentados/g2r8-sweep.mjs <vmKey> <armaPraMostrar> [WxH]
// vmKey = chave no staticVms (ex: g3, shotgun, mosin); arma = id p/ _switchWeapon.
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const KEY = process.argv[2] || 'g3';
const WEAPON = process.argv[3] || KEY;
const EXPLICIT = ['p90', 'uzi', 'tavor', 'famas', 'svd'];
const SET = process.argv[5] || (EXPLICIT.includes(KEY) ? KEY : ['g3','scar','famas','akm','carbine','tavor','lmg'].includes(KEY) ? 'rifle' : ['mosin','rem700','m400','svd','g3sg1','sks'].includes(KEY) ? 'awp' : KEY);
const [W, H] = (process.argv[4] || '1600x900').split('x').map(Number);
const OUT = '/tmp/gauntlet'; mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
// [nome, pitch, yaw, roll, px, py, pz, scale]
const CANDS = {
  rifle: [
    ['w1-y25py08', 0, 0.25, 0, 0.17, -0.08, -0.42, 0.44],
    ['w2-y28py08', 0, 0.28, 0, 0.18, -0.08, -0.42, 0.45],
    ['w3-y22py09', 0, 0.22, 0, 0.17, -0.09, -0.42, 0.43],
    ['w4-y25py10', 0, 0.25, 0, 0.17, -0.10, -0.42, 0.44],
  ],
  shotgun: [
    ['e-y16py08', 0, 0.16, 0, 0.18, -0.08, -0.45, 0.40],
    ['f-y22py08', 0, 0.22, 0, 0.18, -0.08, -0.45, 0.42],
    ['g-y28py09', 0, 0.28, 0, 0.19, -0.09, -0.44, 0.42],
    ['h-y22py11', 0, 0.22, 0, 0.18, -0.11, -0.45, 0.38],
  ],
  awp: [
    ['e-y14py10', 0, 0.14, 0, 0.16, -0.10, -0.43, 0.44],
    ['f-y20py10', 0, 0.20, 0, 0.16, -0.10, -0.43, 0.44],
    ['g-y26py10', 0, 0.26, 0, 0.17, -0.10, -0.43, 0.46],
    ['h-y20py13', 0, 0.20, 0, 0.16, -0.13, -0.44, 0.42],
  ],
}[SET] || {
  p90: [
    ['a-y32', 0, 0.32, 0, 0.20, -0.13, -0.38, 0.44],
    ['b-y38', 0, 0.38, 0, 0.20, -0.13, -0.38, 0.44],
    ['c-y38s40', 0, 0.38, 0, 0.19, -0.12, -0.37, 0.40],
    ['d-y44', 0, 0.44, 0, 0.21, -0.13, -0.39, 0.44],
  ],
  uzi: [
    ['a-y30', 0, 0.30, 0, 0.18, -0.08, -0.42, 0.45],
    ['b-y36', 0, 0.36, 0, 0.18, -0.08, -0.42, 0.45],
    ['c-y36s41', 0, 0.36, 0, 0.18, -0.07, -0.41, 0.41],
    ['d-y42', 0, 0.42, 0, 0.19, -0.08, -0.42, 0.45],
  ],
  svd: [
    ['a-y28', 0, 0.28, 0, 0.19, -0.12, -0.37, 0.54],
    ['b-y36', 0, 0.36, 0, 0.19, -0.12, -0.37, 0.54],
    ['c-y36s48', 0, 0.36, 0, 0.18, -0.13, -0.40, 0.48],
    ['d-y44', 0, 0.44, 0, 0.20, -0.13, -0.38, 0.54],
  ],
  m92: [
    ['a-y30', 0, 0.30, 0, 0.18, -0.08, -0.42, 0.45],
    ['b-y36', 0, 0.36, 0, 0.18, -0.08, -0.42, 0.45],
    ['c-y36r+', 0, 0.36, 0.12, 0.18, -0.08, -0.42, 0.45],
    ['d-y30r+', 0, 0.30, 0.14, 0.18, -0.08, -0.42, 0.45],
  ],
  tavor: [
    ['a-y32', 0, 0.32, 0, 0.20, -0.13, -0.38, 0.44],
    ['b-y38', 0, 0.38, 0, 0.20, -0.13, -0.38, 0.44],
    ['c-y38s40', 0, 0.38, 0, 0.19, -0.12, -0.37, 0.40],
    ['d-y44', 0, 0.44, 0, 0.21, -0.13, -0.39, 0.44],
  ],
  famas: [
    ['a-y24', 0, 0.24, 0, 0.20, -0.13, -0.38, 0.44],
    ['b-y28', 0, 0.28, 0, 0.20, -0.13, -0.38, 0.44],
    ['c-y20s40', 0, 0.20, 0, 0.19, -0.12, -0.37, 0.40],
    ['d-y32s47', 0, 0.32, 0, 0.21, -0.13, -0.39, 0.47],
  ],
}[KEY] || [];
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
await page.waitForFunction((k) => {
  const g = window.__game, m = g.vm.staticVms && g.vm.staticVms[k];
  return m && m.userData.qAlign;
}, KEY, { timeout: 180000 });
await page.evaluate((w) => {
  const g = window.__game;
  g.paused = true;
  window.__step = (n = 1, dt = 0.016) => { for (let i = 0; i < n; i++) { g.paused = false; g.update(dt); g.paused = true; } };
  g.player.pitch = 0;
  if (!g.player.ammo[w]) g.player.ammo[w] = { mag: 30, res: 90 };
  g._switchWeapon(w); g.player.drawUntil = 0;
  window.__step(3);
}, WEAPON);
for (const [name, pitch, yaw, roll, px, py, pz, s] of CANDS) {
  const modelEuler = await page.evaluate(([k, pitch, yaw, roll, px, py, pz, s]) => {
    const g = window.__game, m = g.vm.staticVms[k];
    const E = new (Object.getPrototypeOf(g.camera.rotation).constructor)(pitch, yaw, roll, 'YXZ');
    const Q = new (Object.getPrototypeOf(g.camera.quaternion).constructor)().setFromEuler(E);
    // VIEW space: premultiplica (o qAlign já inclui Y(π)*R⁻¹ e os deltas antigos são zerados aqui)
    m.quaternion.copy(Q).multiply(m.userData.qAlign0);
    m.position.set(px, py, pz); m.scale.setScalar(s);
    m.updateWorldMatrix(true, false);
    window.__step(1);
    // euler model-space equivalente p/ colar no VM_FWD: E = qAlign0⁻¹ * Q * qAlign0
    const qE = m.userData.qAlign0.clone().invert().multiply(Q).multiply(m.userData.qAlign0);
    const e2 = new E.constructor().setFromQuaternion(qE, 'YXZ');
    return [e2.x, e2.y, e2.z].map((n) => +n.toFixed(3));
  }, [KEY, pitch, yaw, roll, px, py, pz, s]);
  await page.screenshot({ path: `${OUT}/g2r8-sw-${KEY}-${name}.png` });
  console.log('shot', KEY, name, '| modelEuler VM_FWD =', JSON.stringify(modelEuler));
}
console.log('DONE');
await browser.close();
