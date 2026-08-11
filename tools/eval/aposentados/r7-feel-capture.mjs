// R7 FEEL/GUNPLAY capture v2 — stepping MANUAL do loop (pausa o rAF e avança dt=16ms por
// passo), assim os frames provam timing real: tracer some <100ms, flash ~45ms, ADS gradual.
// Uso: node tools/eval/r7-feel-capture.mjs   (serve.mjs em :8123)
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const OUT = '/tmp/gauntlet';
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:8123';
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
await page.goto(`${BASE}/?debug=1&auto=P,mst`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 60000 });
// espera o viewmodel estático carregar (GLB async) — prova do flash no VM precisa dele
await page.waitForFunction(() => {
  const g = window.__game, m = g.vm.staticVms && g.vm.staticVms.rifle;
  return m && m.visible && m.children.length > 0;
}, null, { timeout: 30000 });
// pausa o loop externo e assume o stepping manual (dt fixo 16ms, render dentro do update)
await page.evaluate(() => {
  const g = window.__game;
  g.paused = true;
  window.__step = (n = 1, dt = 0.016) => { for (let i = 0; i < n; i++) { g.paused = false; g.update(dt); g.paused = true; } };
  g._switchWeapon('ak');
  g.player.drawUntil = 0; g.player.nextShotAt = 0; g.player.reloadUntil = 0;
  g.player.pitch = 0.02;
  window.__step(2);
});
await page.screenshot({ path: `${OUT}/r7-idle.png` });

// ---- A) TIRO: 1 disparo, frames em ~16/48/110ms --------------------------------
const shot = async (label, steps) => {
  const st = await page.evaluate((s) => {
    const g = window.__game;
    window.__step(s);
    const t = g.tracers[0];
    return {
      nTracers: g.tracers.length,
      segLen: t ? +t.m.scale.y.toFixed(2) : 0,
      op: t ? +t.m.material.opacity.toFixed(2) : 0,
      vmFlash: +g._vmFlashLight.intensity.toFixed(3),
    };
  }, steps);
  await page.screenshot({ path: `${OUT}/r7-${label}.png` });
  console.log(`${label}:`, JSON.stringify(st));
};
await page.evaluate(() => { const g = window.__game; g.player.nextShotAt = 0; g._tryShoot(); });
await shot('fire-016ms', 1);    // ~16ms depois do tiro: tracer viajando + flash aceso
await shot('fire-048ms', 2);    // ~48ms: fade avançado
await shot('fire-110ms', 4);    // ~110ms: tracer sumiu, luz zerada

// ---- B) ADS AWP: transição frame a frame (lerp real 70→22 em ~12 frames) --------
await page.evaluate(() => {
  const g = window.__game;
  g._switchWeapon('awp');
  g.player.drawUntil = 0;
  window.__step(2);
  g._scope(true);              // overlay vira display:block AQUI, opacity 0 no mesmo frame
});
for (let i = 0; i < 10; i++) {
  const st = await page.evaluate(() => {
    const g = window.__game;
    window.__step(1);
    const so = document.getElementById('scope-overlay');
    return {
      fov: +g.camera.fov.toFixed(1),
      overlayOp: so.style.opacity === '' ? '(css:1)' : +(+so.style.opacity).toFixed(2),
    };
  });
  await page.screenshot({ path: `${OUT}/r7-ads-${i}.png` });
  console.log(`ads-${i}:`, JSON.stringify(st));
}
await page.evaluate(() => { window.__game._scope(false); window.__step(3); });
await page.screenshot({ path: `${OUT}/r7-ads-out.png` });
console.log('console errors:', errors);
await browser.close();
process.exit(errors ? 1 : 0);
