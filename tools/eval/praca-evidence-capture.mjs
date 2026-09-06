// CAPTURA DE EVIDÊNCIA 3:2 — praca_poderes (Praça dos Três Poderes), jogo REAL via Astro.
// Mesmo padrão do corrego-evidence-capture: o dono revisa em 3:2, e servir só `public/`
// não prova o jogo (não existe public/index.html). Poses fixas = A/B reproduzível.
// Uso: BASE=http://127.0.0.1:8177 node tools/eval/praca-evidence-capture.mjs [outDir] [TAG]
//   BOTS=1  mantém os bots na cena (leitura de inimigo); padrão esconde (arquitetura).
//   CHROME_BIN sobrescreve o binário; GL_SWIFTSHADER=1 força raster por software.
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || 'artifacts/praca-poderes/round';
const TAG = process.argv[3] || '';
const BASE = process.env.BASE || 'http://127.0.0.1:8177';
const VW = 1500, VH = 1000;   // 3:2 — o recorte em que o dono revisa
const KEEP_BOTS = process.env.BOTS === '1';
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;   // subconjunto de poses
const EXTRA_QS = process.env.QS ? '&' + process.env.QS : '';       // ex.: QS=agua=0 (A/B por kill-switch)

// [nome, x, y, z, yaw, pitch] — forward = (-sin yaw, -cos yaw): yaw 0 olha para -z (Catedral),
// yaw π olha para +z (Congresso), yaw -π/2 olha para +x (Planalto), yaw π/2 olha para -x (STF).
// Mapa em `?bigscale` padrão: Congresso z=+152, Catedral z=-108, spawns z=±62, ônibus (2.5,-4).
const POSES = [
  ['spawn-E-olha-sul',      0,     0, 62,   0,           -0.04],
  ['spawn-B-olha-norte',    0,     0, -62,  Math.PI,     -0.04],
  ['praca-olha-congresso',  0,     0, 40,   Math.PI,      0.10],
  ['praca-olha-catedral',   0,     0, -40,  0,            0.10],
  ['onibus-de-oeste',      -12,    0, 0,   -Math.PI / 2, -0.02],
  ['onibus-de-leste',       16,    0, -2,   Math.PI / 2, -0.02],
  ['urna-barracas',         2,     0, 14,   0,           -0.06],
  ['planalto-de-frente',    0,     0, 56,  -Math.PI / 2,  0.10],
  ['stf-de-frente',         0,     0, 56,   Math.PI / 2,  0.10],
  ['espelho-de-perto',      0,     0, 76.6, Math.PI,     -0.35],
  ['piloti-leste-corredor', 37,    0, -52,  Math.PI,      0.00],
  ['piloti-oeste-corredor',-37,    0, 52,   0,            0.00],
  ['ministerio-empena',     18,    0, -30, -Math.PI / 2,  0.12],
  ['espelho-dagua-norte',   0,     0, 72,   Math.PI,      0.02],
  ['flanco-leste-olha-centro', 30, 0, 0,    Math.PI / 2 + 0.6, -0.03],
  ['caixas-leste',          7.5,   0, 6.5, -Math.PI / 2 + 0.35, 0.05],
];

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
mkdirSync(OUT, { recursive: true });

const args = ['--headless=new', '--mute-audio', '--no-sandbox'];
if (process.env.GL_SWIFTSHADER === '1') args.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader');
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args,
});
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
let errors = 0;
const log = [];
page.on('console', (m) => { if (m.type() === 'error') { errors++; log.push('[console-err] ' + m.text()); } });
page.on('pageerror', (e) => { errors++; log.push('[pageerror] ' + e.message); });
page.on('response', (r) => { if (r.status() >= 400) log.push(`[http ${r.status()}] ${r.url()}`); });
const t0 = Date.now();
for (let att = 0; att < 3; att++) {
  try { await page.goto(`${BASE}/?debug=1&auto=P,mst&map=praca_poderes${EXTRA_QS}`, { waitUntil: 'domcontentloaded', timeout: 120000 }); break; } catch (e) { console.log('goto retry', att); if (att === 2) throw e; }
}
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 300000 });
const tLive = (Date.now() - t0) / 1000;
await page.waitForTimeout(2500);   // GLBs e decalques terminam de assentar
await page.evaluate((keepBots) => {
  const g = window.__game;
  // Bots FORA de verdade: mover para y=-80 não bastava (o respawn os trazia de volta e o
  // crítico achou rádio, traçante e dano no "depois"). Mortos sem respawn e sem corpo.
  if (!keepBots) for (const b of g.bots) { b.alive = false; b.hp = 0; b.respawnAt = Infinity; b.deadT = 99; b.pos.set(0, -80, 0); if (b.mesh) b.mesh.visible = false; }
  g.player.hp = 1e9;
  // arma guardada: o viewmodel vive numa cena própria (vmScene) — esconder só vm.root não bastava
  if (g.vmScene) g.vmScene.traverse((o) => { o.visible = false; });
  if (g.vm && g.vm.root) g.vm.root.visible = false;
}, KEEP_BOTS);
const shots = [];
for (const [nome, x, y, z, yaw, pitch] of POSES.filter((p) => !ONLY || ONLY.includes(p[0]))) {
  const info = await page.evaluate(([px, py, pz, yw, pt]) => {
    const g = window.__game;
    const gy = g.world && g.world.groundHeightAt ? g.world.groundHeightAt(px, pz) : 0;
    g.player.pos.set(px, (py || 0) + (gy || 0) + 0.02, pz);
    g.player.yaw = yw; g.player.pitch = pt;
    g.player.vel.set(0, 0, 0);
    g.player.grounded = true;
    return { ground: gy };
  }, [x, y, z, yaw, pitch]);
  await page.waitForTimeout(600);
  const m = await page.evaluate(() => {
    const g = window.__game; const r = g.renderer && g.renderer.info;
    return {
      calls: r ? r.render.calls : null, tris: r ? r.render.triangles : null,
      geometries: r ? r.memory.geometries : null, textures: r ? r.memory.textures : null,
      programs: r && r.programs ? r.programs.length : null,
      heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
      pos: [g.player.pos.x, g.player.pos.y, g.player.pos.z], yaw: g.player.yaw, pitch: g.player.pitch,
    };
  });
  await page.screenshot({ path: `${OUT}/${TAG}${nome}.png`, timeout: 90000 });
  shots.push({ nome, pose: [x, y, z, yaw, pitch], ...info, ...m });
  console.log('  shot', nome, `calls=${m.calls} tris=${m.tris} heap=${m.heapMB}MB`);
}
writeFileSync(`${OUT}/${TAG}manifest.json`, JSON.stringify({
  gerado: new Date().toISOString(), base: BASE, viewport: [VW, VH], tLive, bots: KEEP_BOTS,
  erros: errors, log, shots,
}, null, 2));
console.log(`DONE -> ${OUT} | live em ${tLive.toFixed(1)}s | 0 erros = ${errors === 0}`);
if (log.length) console.log(log.slice(0, 20).join('\n'));
await browser.close();
process.exit(errors ? 1 : 0);
