// R7.6 FEEL capture — outdoor clara, stepping manual 16ms. MEDE como o crítico: no frame
// DURANTE o kick, projeta a boca REAL do mesh (vértices 4% mais profundos) vs o sprite do
// flash (filho do vm.root) — meta: distância <20px nas 3 classes.
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
  try { await page.goto(`${BASE}/?debug=1&map=piscina_treta&auto=P,mst`, { waitUntil: 'domcontentloaded', timeout: 120000 }); break; }
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
  g.player.pitch = 0;
  // A pergunta do crítico: "o flash está colado na boca (geometria) durante o kick?".
  // Métrica: distância em px do sprite ao VÉRTICE MAIS PRÓXIMO do mesh estático (com o
  // matrixWorld do kick aplicado) — <20px = colado. Clusters de "mais profundos" são
  // inválidos sob rotação (a membresia do cluster muda com o pitch do kick).
  window.__measure = (cls) => {
    const V = g.camera.position.constructor;
    const vm = g.vm.staticVms[cls];
    vm.updateMatrixWorld(true);
    const fx = g._vmMzActive[0];
    if (!fx) return { err: 'sem sprite ativo' };
    const sp = fx.grp.getWorldPosition(new V());
    const toPx = (p) => { const q = p.clone().project(g.vmCamera); return [(q.x * 0.5 + 0.5) * 960, (-q.y * 0.5 + 0.5) * 600]; };
    const [bx, by] = toPx(sp);
    let best = 1e9, bestPx = null;
    const p = new V();
    vm.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      const pos = o.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += 3) {
        p.set(pos.getX(i), pos.getY(i), pos.getZ(i));
        o.localToWorld(p);
        const [ax, ay] = toPx(p);
        const d = Math.hypot(ax - bx, ay - by);
        if (d < best) { best = d; bestPx = [ax | 0, ay | 0]; }
      }
    });
    return { spritePx: [bx | 0, by | 0], nearestVertPx: bestPx, distPx: +best.toFixed(1), kick: +g.vm.kick.toFixed(3) };
  };
});

// ---- FLASH durante o KICK: ak / shotgun / deagle --------------------------------
for (const w of ['ak', 'shotgun', 'deagle']) {
  const cls = { ak: 'rifle', shotgun: 'shotgun', deagle: 'pistol' }[w];
  const m = await page.evaluate(([w, cls]) => {
    const g = window.__game;
    g._switchWeapon(w);
    g.player.drawUntil = 0; g.player.nextShotAt = 0; g.player.reloadUntil = 0;
    if (g.player.ammo[w].mag <= 0) g.player.ammo[w].mag = 7;
    window.__step(2);
    g.player.nextShotAt = 0;
    g._tryShoot();
    window.__step(1);                       // 16ms: kick alto, flash vivo
    return window.__measure(cls);
  }, [w, cls]);
  await page.screenshot({ path: `${OUT}/r77-flash-${w}.png` });
  console.log(`${w}:`, JSON.stringify(m));
  await page.evaluate(() => window.__step(6));
}

// ---- TRACER fino: rajada de 3, frame no meio ------------------------------------
await page.evaluate(() => {
  const g = window.__game;
  g._switchWeapon('ak');
  g.player.drawUntil = 0; g.player.pitch = 0.02;
  for (let i = 0; i < 3; i++) {
    g.player.nextShotAt = 0; if (g.player.ammo.ak.mag <= 0) g.player.ammo.ak.mag = 30;
    g._tryShoot();
    window.__step(3);
  }
  g.player.nextShotAt = 0; if (g.player.ammo.ak.mag <= 0) g.player.ammo.ak.mag = 30;
  g._tryShoot();
  window.__step(1);
});
const tst = await page.evaluate(() => {
  const g = window.__game, t = g.tracers[0];
  return t ? { seg: +t.m.scale.y.toFixed(2), op: +t.m.material.opacity.toFixed(2), r: g._tracerGeo.parameters.radiusTop } : null;
});
await page.screenshot({ path: `${OUT}/r77-tracer.png` });
console.log('tracer:', JSON.stringify(tst));
console.log('console errors:', errors);
await browser.close();
process.exit(errors ? 1 : 0);
