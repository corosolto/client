// G2-R7 — captura comparativa da AK-herói Tripo vs AK atual (classe rifle + kit).
// Uso: node tools/eval/aposentados/g2r7-capture.mjs <prefixo> [WxH] [extraQS]
// Captura em piscina_treta (outdoor claro): hip full-frame, flash na boca, crop das mãos.
// Sai com código 2 se houver QUALQUER erro de console/pageerror.
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const PREFIX = process.argv[2] || 'g2r7';
const [W, H] = (process.argv[3] || '1600x900').split('x').map(Number);
const XQS = process.argv[4] ? `&${process.argv[4]}` : '';
const OUT = '/tmp/gauntlet';
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
let errors = 0;
page.on('console', (m) => { if (m.type() === 'error') { errors++; console.error('[page-err]', m.text()); } });
page.on('pageerror', (e) => { errors++; console.error('[pageerror]', e.message); });
for (let att = 0; att < 3; att++) {
  try { await page.goto(`${BASE}/?debug=1&map=piscina_treta&auto=P,mst${XQS}`, { waitUntil: 'domcontentloaded', timeout: 120000 }); break; }
  catch (e) { console.log('goto retry', att); if (att === 2) throw e; }
}
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 300000 });
await page.waitForFunction(() => {
  const g = window.__game, m = g.vm.staticVms && g.vm.staticVms.rifle;
  return m && m.children.length > 0;
}, null, { timeout: 180000 });
await page.evaluate(() => {
  const g = window.__game;
  g.paused = true;
  window.__step = (n = 1, dt = 0.016) => { for (let i = 0; i < n; i++) { g.paused = false; g.update(dt); g.paused = true; } };
  g.player.pitch = 0.0;
  g._switchWeapon('ak');
  g.player.drawUntil = 0; g.player.nextShotAt = 0; g.player.reloadUntil = 0;
  window.__step(3);
});

// hip full-frame
await page.screenshot({ path: `${OUT}/${PREFIX}-hip.png` });
console.log('shot hip');
// crop das mãos/grip (quadrante inferior-direito, escala com o viewport)
await page.screenshot({ path: `${OUT}/${PREFIX}-hands.png`, clip: { x: W * 0.42, y: H * 0.45, width: W * 0.58, height: H * 0.55 } });
console.log('shot hands');
// flash na boca
await page.evaluate(() => {
  const g = window.__game;
  if (g.player.ammo.ak.mag <= 0) g.player.ammo.ak.mag = 30;
  g.player.nextShotAt = 0;
  g._tryShoot();
  window.__step(1);
});
await page.screenshot({ path: `${OUT}/${PREFIX}-flash.png` });
console.log('shot flash | muzzle:', await page.evaluate(() => {
  const g = window.__game, v = g._vmMuzzle.ak || g._vmMuzzle.rifle;
  return v ? v.toArray().map((n) => +n.toFixed(3)).join(',') : 'N/A';
}));
console.log(errors ? `CONSOLE ERRORS: ${errors}` : 'CONSOLE CLEAN');
console.log('DONE ->', OUT, `${PREFIX}-*.png (${W}x${H})`);
await browser.close();
process.exit(errors ? 2 : 0);
