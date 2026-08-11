// G2-R7B — captura de UMA arma (herói ou via kill-switch): hip full-frame, crop das
// mãos, flash na boca. Uso: node tools/eval/g2r7b-capture.mjs <arma> <prefixo> [WxH] [extraQS]
// Sai 2 se houver erro de console/pageerror.
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const WEAPON = process.argv[2] || 'm4';
const PREFIX = process.argv[3] || 'g2r7b';
const [W, H] = (process.argv[4] || '1600x900').split('x').map(Number);
const XQS = process.argv[5] ? `&${process.argv[5]}` : '';
const OUT = '/tmp/gauntlet'; mkdirSync(OUT, { recursive: true });
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
await page.goto(`${BASE}/?debug=1&map=fy_pool_day&auto=P,mst${XQS}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 300000 });
await page.waitForFunction(() => {
  const g = window.__game, m = g.vm.staticVms && g.vm.staticVms.rifle;
  return m && m.children.length > 0;
}, null, { timeout: 180000 });
await page.evaluate((w) => {
  const g = window.__game;
  g.paused = true;
  window.__step = (n = 1, dt = 0.016) => { for (let i = 0; i < n; i++) { g.paused = false; g.update(dt); g.paused = true; } };
  g.player.pitch = 0;
  g._switchWeapon(w);
  g.player.drawUntil = 0; g.player.nextShotAt = 0; g.player.reloadUntil = 0;
  window.__step(3);
}, WEAPON);
await page.screenshot({ path: `${OUT}/${PREFIX}-hip.png` });
console.log('shot hip');
await page.screenshot({ path: `${OUT}/${PREFIX}-hands.png`, clip: { x: W * 0.42, y: H * 0.45, width: W * 0.58, height: H * 0.55 } });
console.log('shot hands');
await page.evaluate((w) => {
  const g = window.__game;
  if (g.player.ammo[w].mag <= 0) g.player.ammo[w].mag = 30;
  g.player.nextShotAt = 0;
  g._tryShoot();
  window.__step(1);
}, WEAPON);
await page.screenshot({ path: `${OUT}/${PREFIX}-flash.png` });
console.log('shot flash');
// ADS (AUG-style: VM sai + crosshair prec nas classes rifle; awp = luneta real)
await page.evaluate(() => { const g = window.__game; g._scope(true); window.__step(30); });
await page.screenshot({ path: `${OUT}/${PREFIX}-ads.png` });
console.log('shot ads');
await page.evaluate(() => { window.__game._scope(false, true); window.__step(8); });
console.log(errors ? `CONSOLE ERRORS: ${errors}` : 'CONSOLE CLEAN');
await browser.close();
process.exit(errors ? 2 : 0);
