// G2-R7B — smoke pós-wiring dos heróis: cicla armas DENTRO e FORA das dedicadas pra
// garantir que nada mudou (kits de classe, outras snipers, outras classes). Sai 2 se
// houver erro de console.
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
const OUT = '/tmp/gauntlet'; mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const LIST = (process.argv[2] || 'ak,g3,uzi,scar,mosin,svd,sks,shotgun,deagle,pistol,knife').split(',');
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
for (const w of LIST) {
  await page.evaluate((wid) => {
    const g = window.__game;
    if (!g.player.ammo[wid]) g.player.ammo[wid] = { mag: 30, res: 90 };
    g._switchWeapon(wid); g.player.drawUntil = 0; window.__step(4);
  }, w);
  // espera a herói dedicada terminar o lazy-load (G2-R13/R14A): o rebuild acontece
  // segundos depois do _switchWeapon; sem esperar, a captura pega a variante de classe.
  await page.waitForFunction((wid) => {
    const g = window.__game;
    const DED = { ak: 1, m4: 1, mp5: 1, awp: 1, p90: 1, tavor: 1, famas: 1, svd: 1 };
    return !DED[wid] || (g._staticVmDed && g._staticVmDed.has(wid));
  }, w, { timeout: 90000 }).catch(() => console.log('  (sem herói dedicada p/', w, '— variante de classe)'));
  await page.evaluate(() => window.__step(2));
  await page.screenshot({ path: `${OUT}/g2r7b-smoke-${w}.png` });
  console.log('shot', w);
}
// muzzle da classe awp tem que continuar medido do template da classe (não da herói)
console.log('muzzleCls.awp:', await page.evaluate(() => {
  const g = window.__game;
  return g._vmMuzzle.awp ? g._vmMuzzle.awp.toArray().map((n) => +n.toFixed(3)).join(',') : 'N/A';
}));
console.log(errors ? `CONSOLE ERRORS: ${errors}` : 'CONSOLE CLEAN');
await browser.close();
process.exit(errors ? 2 : 0);
