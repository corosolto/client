// Cenários de regressão do viewmodel (rodada look Quake 4): ADS, muzzle flash, reload,
// look-down. O _vmMuzzleExt (origem do flash/tracer) e o adsPt (centralização da alça)
// derivam do MESMO transform do _vmFrame — se a arma se move e o flash não, quebrou.
// Uso: node tools/eval/vm-quake-scen.mjs <outDir> [arma] [W,H] [extraQS]
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/tmp/vmqscen';
const ID = process.argv[3] || 'ak';
const [W, H] = (process.argv[4] || '1200,800').split(',').map(Number);
const XQS = process.argv[5] ? `&${process.argv[5]}` : '';
const BASE = process.env.BASE || 'http://localhost:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', e => console.error('[pageerror]', e.message));
await page.goto(`${BASE}/?debug=1&auto=P,mst${XQS}`, { waitUntil: 'commit', timeout: 90000 });
await page.waitForFunction(() => !!window.__game, null, { timeout: 240000 });
await page.evaluate(() => { const g = window.__game; if (g.state === 'countdown') { g.stateUntil = 0; g.update(0.05); } });
const settle = (n) => page.evaluate((k) => { const g = window.__game; for (let i = 0; i < k; i++) g.update(0.016); }, n);

await page.evaluate((wid) => { const g = window.__game; g._switchWeapon(wid); g.player.drawUntil = 0; g.player.pitch = 0; g.player.yaw = 0; }, ID);
await settle(6);

// 1) FLASH: atira e compara a origem registrada do clarão (_vmMuzzle — de onde a estrela
// e a point light nascem, ver _flash) com a BOCA medida do GLB. Têm que coincidir em NDC.
const flash = await page.evaluate(() => {
  const g = window.__game;
  const m = g.vm.models[g.player.weapon];
  const rw = m.getObjectByName('rw');
  const met = rw.userData.metrics;
  m.updateWorldMatrix(true, true);
  g.vm.root.updateWorldMatrix(true, false);
  const mouth = rw.localToWorld(met.muzzle.clone().divideScalar(met.norm)).project(g.vmCamera);
  const off = (g._vmMuzzle || {})[g.player.weapon];
  const offNDC = off ? g.vm.root.localToWorld(off.clone()).project(g.vmCamera) : null;
  g._tryShoot();
  g.update(0.010);   // 1 frame só: o clarão vive ~45 ms — tem que estar visível no shot
  return {
    mouthNDC: [+mouth.x.toFixed(3), +mouth.y.toFixed(3)],
    vmMuzzleNDC: offNDC ? [+offNDC.x.toFixed(3), +offNDC.y.toFixed(3)] : null,
  };
});
console.log('flash:', JSON.stringify(flash));
await page.screenshot({ path: `${OUT}/fire.png` });

// 2) ADS: pose por CLASSE (_adsPose — nudge sutil + leve zoom; a alça exata por arma foi
// desligada por fragilidade, ver game.js:3975). Aqui é REGRESSÃO VISUAL: a arma tem que
// continuar na tela, nudada pro centro, sem sumir nem apontar pra baixo.
await page.evaluate(() => window.__game._scope(true));
await settle(30);   // ease do ADS (0,11 s) com folga
const ads = await page.evaluate(() => ({ adsF: +(window.__game.vm.adsF || 0).toFixed(2) }));
console.log('ads:', JSON.stringify(ads));
await page.screenshot({ path: `${OUT}/ads.png` });
await page.evaluate(() => window.__game._scope(false, true));
await settle(20);

// 3) RELOAD no meio do dip
await page.evaluate(() => { const g = window.__game; g.player.ammo[g.player.weapon].mag = 1; g._startReload(); });
await settle(12);
await page.screenshot({ path: `${OUT}/reload.png` });
await page.evaluate(() => { const g = window.__game; g.player.reloadUntil = 0; });
await settle(6);

// 4) LOOK-DOWN: pitch 1,15 — corpo/braços não podem vazar no quadro
await page.evaluate(() => { window.__game.player.pitch = 1.15; });
await settle(3);
await page.screenshot({ path: `${OUT}/lookdown.png` });
console.log('DONE ->', OUT);
await browser.close();
