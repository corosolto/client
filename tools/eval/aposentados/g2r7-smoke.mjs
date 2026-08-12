// G2-R7 — smoke pós-wiring: ADS da AK dedicada + ciclo de armas (m4/awp/pump/pistola/
// faca) pra garantir que NADA fora da 'ak' mudou. Sai 2 se houver erro de console.
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
const OUT = '/tmp/gauntlet'; mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
let errors = 0;
page.on('console', (m) => { if (m.type() === 'error') { errors++; console.error('[page-err]', m.text()); } });
page.on('pageerror', (e) => { errors++; console.error('[pageerror]', e.message); });
await page.goto(`${BASE}/?debug=1&map=fy_pool_day&auto=P,mst`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 300000 });
await page.waitForFunction(() => {
  const g = window.__game, m = g.vm.staticVms && g.vm.staticVms.rifle;
  return m && m.children.length > 0;
}, null, { timeout: 180000 });
await page.evaluate(() => {
  const g = window.__game;
  g.paused = true;
  window.__step = (n = 1, dt = 0.016) => { for (let i = 0; i < n; i++) { g.paused = false; g.update(dt); g.paused = true; } };
  g.player.pitch = 0;
});
// ADS da AK dedicada
await page.evaluate(() => {
  const g = window.__game;
  g._switchWeapon('ak'); g.player.drawUntil = 0; window.__step(3);
  g._scope(true); window.__step(30);   // ADS completo
});
await page.screenshot({ path: `${OUT}/g2r7-nova-ads.png` });
console.log('shot ads');
await page.evaluate(() => { window.__game._scope(false, true); window.__step(10); });
// ciclo de armas
for (const w of ['m4', 'mp5', 'awp', 'shotgun', 'deagle', 'knife']) {
  await page.evaluate((wid) => {
    const g = window.__game;
    g._switchWeapon(wid); g.player.drawUntil = 0; window.__step(4);
  }, w);
  await page.screenshot({ path: `${OUT}/g2r7-smoke-${w}.png` });
  console.log('shot', w);
}
console.log(errors ? `CONSOLE ERRORS: ${errors}` : 'CONSOLE CLEAN');
await browser.close();
process.exit(errors ? 2 : 0);
