// R7.5 tuning/capture — cena OUTDOOR CLARA (fy_pool_day). Stepping manual 16ms.
// A) flash compacto na boca do VM  B) sweep de poses ADS rifle  C) frame de kill.
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const OUT = '/tmp/gauntlet';
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://127.0.0.1:8123';   // 127.0.0.1: Chrome headless enforcava no IPv6 de 'localhost'
const MAP = process.env.MAP || 'fy_pool_day';
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
await page.goto(`${BASE}/?debug=1&map=${MAP}&auto=E,mst`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 150000 });
await page.waitForFunction(() => {
  const g = window.__game, m = g.vm.staticVms && g.vm.staticVms.rifle;
  return m && m.children.length > 0;
}, null, { timeout: 90000 });
await page.evaluate(() => {
  const g = window.__game;
  g.paused = true;
  window.__step = (n = 1, dt = 0.016) => { for (let i = 0; i < n; i++) { g.paused = false; g.update(dt); g.paused = true; } };
  g._switchWeapon('ak');
  g.player.drawUntil = 0; g.player.nextShotAt = 0; g.player.reloadUntil = 0;
  g.player.pitch = 0.0;
  window.__step(3);
});
await page.screenshot({ path: `${OUT}/r75-hip.png` });

// ---- A) FLASH: 1 tiro, frames 16/48/80ms ---------------------------------------
await page.evaluate(() => { const g = window.__game; g.player.nextShotAt = 0; g._tryShoot(); window.__step(1); });
await page.screenshot({ path: `${OUT}/r75-flash-0.png` });
await page.evaluate(() => window.__step(2));
await page.screenshot({ path: `${OUT}/r75-flash-1.png` });
await page.evaluate(() => window.__step(2));
await page.screenshot({ path: `${OUT}/r75-flash-2.png` });
const flashSt = await page.evaluate(() => ({ active: window.__game._mzActive.length, vmFlash: +window.__game._vmFlashLight.intensity.toFixed(2) }));
console.log('flash após ~80ms:', JSON.stringify(flashSt));

// ---- B) ADS sweep: hip + candidatos de pose rifle -------------------------------
const cands = JSON.parse(process.env.POSES || 'null') || [
  { x: -0.13, y: 0.075, z: 0.08, s: 0.8, rx: 0.2, ry: -0.28 },
  { x: -0.16, y: 0.09, z: 0.08, s: 0.8, rx: 0.2, ry: -0.28 },
  { x: -0.10, y: 0.06, z: 0.08, s: 0.8, rx: 0.2, ry: -0.28 },
  { x: -0.13, y: 0.075, z: 0.12, s: 0.7, rx: 0.24, ry: -0.30 },
  { x: -0.13, y: 0.10, z: 0.08, s: 0.8, rx: 0.25, ry: -0.30 },
];
for (let i = 0; i < cands.length; i++) {
  await page.evaluate((pose) => {
    const g = window.__game;
    g._adsPose.rifle = pose;
    g.player.scoped = true; g.vm.adsF = 1;
    window.__step(1);
  }, cands[i]);
  await page.screenshot({ path: `${OUT}/r75-tune-ads-${i}.png` });
  console.log(`pose ${i}:`, JSON.stringify(cands[i]));
}
// sequência de TRANSIÇÃO com a pose escolhida (env CHOSEN=i)
const chosen = +(process.env.CHOSEN || 0);
await page.evaluate((pose) => {
  const g = window.__game;
  g._adsPose.rifle = pose;
  g.player.scoped = false; g.vm.adsF = 0;
  window.__step(2);
  g._scope(true);
}, cands[chosen]);
for (let i = 0; i < 6; i++) {
  await page.evaluate(() => window.__step(3));   // ~48ms por captura
  await page.screenshot({ path: `${OUT}/r75-ads-${i}.png` });
}
await page.evaluate(() => { const g = window.__game; g._scope(false, true); g.vm.adsF = 0; window.__step(2); });

// ---- C) KILL FRAME: bot inimigo à frente, hp baixo, 1 tiro ----------------------
await page.evaluate(() => {
  const g = window.__game;
  const p = g.player, V = p.pos.constructor;
  // acha uma direção SEM occluder por ≥10m (spawn pode dar de cara com parede)
  const from = g.camera.getWorldPosition(new V());
  let bestYaw = p.yaw, bestD = -1;
  for (let i = 0; i < 16; i++) {
    const yaw = (i / 16) * Math.PI * 2;
    const dir = new V(-Math.sin(yaw), 0, -Math.cos(yaw));
    g.ray.set(from, dir); g.ray.far = 200;
    const h = g.ray.intersectObjects(g.world.occluders, false)[0];
    const d = h ? h.distance : 999;
    if (d > bestD) { bestD = d; bestYaw = yaw; }
  }
  p.yaw = bestYaw; p.pitch = 0;
  const b = g.bots.find(b => b.team !== g.playerTeam && b.alive) || g.bots[0];
  b.team = g.playerTeam === 'E' ? 'B' : 'E';
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
  b.pos.set(p.pos.x + fx * 4, p.pos.y, p.pos.z + fz * 4);
  b.hp = 20; b.alive = true; b.protUntil = g.time + 60;   // protege dos OUTROS bots no settle
  b.vel && b.vel.set(0, 0, 0);
  window.__step(10);   // mesh do bot assenta no novo b.pos
  // RE-teleporta (bot anda durante o settle) e mira no peito com o mesh fresco
  b.pos.set(p.pos.x + fx * 4, p.pos.y, p.pos.z + fz * 4);
  window.__step(1);
  const mp = b.mesh.group.position;
  const dx = mp.x - p.pos.x, dz = mp.z - p.pos.z, dy = (mp.y + 1.2) - (p.pos.y + 1.55);
  p.yaw = Math.atan2(-dx, -dz);
  p.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  g.bloom = 0;
  window.__step(1);
  const hpBefore = b.hp;
  b.protUntil = 0;   // libera SÓ para o nosso tiro (mesmo evaluate = sem janela p/ bots)
  g.player.nextShotAt = 0; g.player.ammo.ak.mag = 30;
  g._tryShoot();
  if (b.hp === hpBefore) {
    // fallback determinístico: o tiro (fx) foi real; garante o evento de dano p/ o frame
    const pt = new V(mp.x, mp.y + 1.2, mp.z);
    g._damage(b, 100, g.player, 'AK', true, pt);
    window.__killFallback = true;
  }
  window.__step(1);   // 16ms após o tiro
  // CONGELA os overlays p/ o screenshot (hitmarker some em 140ms wall / número em 900ms —
  // em stepping manual o wall-clock entre evaluate e screenshot apagava os dois)
  clearTimeout(g._hmT);
  document.getElementById('hitmarker').classList.add('show');
  // CLONA os .dmg-num: o setTimeout(900ms) remove o nó ORIGINAL (o clone sobrevive p/ o shot)
  document.querySelectorAll('.dmg-num').forEach(n => {
    const c = n.cloneNode(true);
    c.style.animation = 'none'; c.style.opacity = '1';
    n.replaceWith(c);
  });
  const n0 = document.querySelector('.dmg-num');
  const r0 = n0 ? n0.getBoundingClientRect() : null;
  window.__killSt = {
    hmOpacity: getComputedStyle(document.getElementById('hitmarker')).opacity,
    hmClass: document.getElementById('hitmarker').className,
    fallback: !!window.__killFallback,
    dmg: n0 ? { txt: n0.textContent, cls: n0.className, font: n0.style.fontSize, rect: [r0.x | 0, r0.y | 0, r0.width | 0, r0.height | 0] } : null,
  };
});
const killSt = await page.evaluate(() => window.__killSt);
console.log('kill frame:', JSON.stringify(killSt));
await page.screenshot({ path: `${OUT}/r75-kill-0.png` });
await page.evaluate(() => window.__step(2));
await page.screenshot({ path: `${OUT}/r75-kill-1.png` });
console.log('console errors:', errors);
await browser.close();
process.exit(errors ? 1 : 0);
