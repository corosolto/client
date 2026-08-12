// R7.6 FEEL capture — outdoor clara (fy_pool_day), stepping manual 16ms.
// A) flash NA BOCA do cano por classe (ak/shotgun/deagle)  B) ADS rifle: VM sai + crosshair
// de precisão  C) rajada de 10 tiros com recoilP logado por step.
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

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
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
let errors = 0;
page.on('console', m => { if (m.type() === 'error') { errors++; console.error('[page-err]', m.text()); } });
page.on('pageerror', e => { errors++; console.error('[pageerror]', e.message); });
for (let att = 0; att < 3; att++) {
  try { await page.goto(`${BASE}/?debug=1&map=fy_pool_day&auto=P,mst`, { waitUntil: 'domcontentloaded', timeout: 120000 }); break; }
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
});

// ---- A) FLASH na boca do cano: ak / shotgun / deagle ----------------------------
for (const [i, w] of ['ak', 'shotgun', 'deagle'].entries()) {
  await page.evaluate((w) => {
    const g = window.__game;
    g._switchWeapon(w);
    g.player.drawUntil = 0; g.player.nextShotAt = 0; g.player.reloadUntil = 0;
    window.__step(3);
  }, w);
  await page.screenshot({ path: `${OUT}/r76-hip-${w}.png` });
  await page.evaluate((w) => {
    const g = window.__game;
    if (g.player.ammo[w].mag <= 0) g.player.ammo[w].mag = 7;
    g.player.nextShotAt = 0;
    g._tryShoot();
    window.__step(1);
  }, w);
  await page.screenshot({ path: `${OUT}/r76-flash-${w}.png` });
  console.log(`flash-${w}:`, await page.evaluate(() => {
    const g = window.__game, m = g._mzActive[0];
    return JSON.stringify({ active: g._mzActive.length, spriteScale: m ? +m.jetS.toFixed(2) : 0 });
  }));
  await page.evaluate(() => window.__step(6));
}

// ---- B) ADS rifle: transição até o VM sair + crosshair prec ---------------------
await page.evaluate(() => {
  const g = window.__game;
  g._switchWeapon('ak');
  g.player.drawUntil = 0; g.player.pitch = 0;
  window.__step(3);
  g._scope(true);
});
for (let i = 0; i < 6; i++) {
  const st = await page.evaluate(() => {
    const g = window.__game;
    window.__step(4);   // ~64ms por captura
    return {
      adsF: +g.vm.adsF.toFixed(2), slide: +(g._adsSlide || 0).toFixed(2),
      prec: document.getElementById('crosshair').classList.contains('prec'),
      fov: +g.camera.fov.toFixed(1),
    };
  });
  await page.screenshot({ path: `${OUT}/r76-ads-${i}.png` });
  console.log(`ads-${i}:`, JSON.stringify(st));
}
await page.evaluate(() => { const g = window.__game; g._scope(false, true); window.__step(8); });

// ---- C) RAJADA: 10 tiros a cada 6 steps (100ms), recoilP logado -----------------
const recoil = await page.evaluate(() => {
  const g = window.__game;
  g.player.pitch = 0;
  const log = [];
  for (let shot = 0; shot < 10; shot++) {
    g.player.nextShotAt = 0;
    if (g.player.ammo.ak.mag <= 0) g.player.ammo.ak.mag = 30;
    g._tryShoot();
    for (let s = 0; s < 6; s++) {
      window.__step(1);
      log.push({ shot, s, recoilP: +g.player.recoilP.toFixed(4) });
    }
  }
  // soltou o dedo: recuperação total
  const after = [];
  for (let s = 0; s < 10; s++) { window.__step(1); after.push(+g.player.recoilP.toFixed(4)); }
  return { log, after, pitch: g.player.pitch, camRotX: +g.camera.rotation.x.toFixed(4) };
});
const peak = Math.max(...recoil.log.map(r => r.recoilP));
console.log('recoilP peak na rajada:', peak, '(esperado >0 por vários frames)');
console.log('recoilP 1 step após 1º tiro:', recoil.log[1].recoilP, '| 5 steps:', recoil.log[5].recoilP);
console.log('recoilP fim do 1º tiro→2º:', recoil.log[5].recoilP, '→ pós 2º:', recoil.log[6].recoilP);
console.log('recuperação pós-rajada (10 steps):', recoil.after.join(' → '));
await page.screenshot({ path: `${OUT}/r76-burst-end.png` });
console.log('console errors:', errors);
await browser.close();
process.exit(errors ? 1 : 0);
