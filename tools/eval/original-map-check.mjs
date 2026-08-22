/* ============================================================================
   original-map-check.mjs — contratos de gameplay dos cinco mapas originais.

   Casos reais (auditoria visual/jogável de 09/08/2026):
     OM1  Havan e Ferro-Velho desenhavam cover GLB e registravam apenas o AABB em
          colliders. Hitscan/LOS usa occluders, portanto 0/6 raios centrais paravam.
     OM2  A piscina é declarada andável, mas o grafo excluía todo chão abaixo de
          -0,35 m: 0 waypoints dentro da água.
     OM3  os mapas declaram spawn.yaw, mas Game sobrescrevia por constantes de time;
          Piscina, Ferro-Velho e Quebrada nasciam apontando para o lado errado.

   Exige `npm run eval:serve` no ar porque OM1 precisa dos GLBs que não carregam em
   Node. Mutações: --mutante=semcover|sempiscina|yawfixo.
   ============================================================================ */
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { bootGame, initTextures } from './harness.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const mutante = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const validos = new Set(['', 'semcover', 'sempiscina', 'yawfixo']);
if (!validos.has(mutante)) throw new Error(`mutante desconhecido: ${mutante}`);

const falhas = [];
const angulo = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const originais = ['awp_map', 'fy_pool_day', 'fy_havan', 'fy_ferrovelho', 'fy_quebrada'];
const T = initTextures();
let yawTotal = 0, yawErrados = 0;

for (const id of originais) {
  const g = bootGame(id, { textures: T, seed: 12345 });
  const W = g.world;
  for (const ent of g.combatants.filter((c) => c.alive)) {
    const team = ent.team;
    const spawns = W.spawns[team] || [];
    if (!spawns.length) continue;
    let s = spawns[0], bd = Infinity;
    for (const cand of spawns) {
      const d = (ent.pos.x - cand.x) ** 2 + (ent.pos.z - cand.z) ** 2;
      if (d < bd) { bd = d; s = cand; }
    }
    if (!Number.isFinite(s.yaw)) continue;
    const atual = mutante === 'yawfixo'
      ? (ent.isPlayer ? (team === 'E' ? Math.PI : 0) : (team === 'E' ? 0 : Math.PI))
      : ent.yaw;
    yawTotal++;
    if (angulo(atual, s.yaw) > 1e-6) yawErrados++;
  }

  if (id === 'fy_pool_day') {
    const molhados = mutante === 'sempiscina' ? []
      : W.waypoints.nodes.map((n, i) => ({ ...n, i })).filter((n) => W.groundHeightAt(n.x, n.z) < -0.35);
    let rotas = 0;
    if (molhados.length) {
      const alvo = molhados.reduce((a, b) => a.x * a.x + a.z * a.z < b.x * b.x + b.z * b.z ? a : b);
      for (const team of ['E', 'B']) {
        const s = W.spawns[team][0];
        const path = W.findPath(W.nearestWaypoint(s.x, s.z), alvo.i);
        if (path.length > 1 && path.at(-1) === alvo.i) rotas++;
      }
    }
    console.log(`OM2 piscina: ${molhados.length} waypoint(s) submersos · ${rotas}/2 times conectados`);
    if (molhados.length < 8 || rotas !== 2)
      falhas.push(`OM2 piscina fora do grafo (${molhados.length} nós, ${rotas}/2 times); inclua a rampa e o fundo no A*`);
  }
  g.dispose?.();
}

console.log(`OM3 spawn.yaw: ${yawTotal - yawErrados}/${yawTotal} combatentes alinhados`);
if (yawErrados) falhas.push(`OM3 ${yawErrados}/${yawTotal} combatentes ignoram spawn.yaw; use o yaw do ponto escolhido em reset e respawn`);

const root = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${root}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
if (!chromium) throw new Error('Playwright/Chromium indisponível: OM1 não pode medir GLBs');
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
const casos = {
  fy_havan: [
    [[11, .9, 6], [11, .9, 14]], [[-18, .9, 6], [-18, .9, 14]], [[-5, .9, 34], [-5, .9, 42]],
  ],
  fy_ferrovelho: [
    [[-15, 1.4, -13], [-7, 1.4, -13]], [[7, 1.4, 1], [15, 1.4, 1]], [[-10, 1.4, 4], [-10, 1.4, 12]],
  ],
};
let coverHits = 0, coverTotal = 0;
try {
  for (const [id, rays] of Object.entries(casos)) {
    await page.goto(`${BASE}/mapview.html?map=${id}&glb=1&deco=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.MAPEVAL?.ready, null, { timeout: 180000 });
    await page.waitForTimeout(3000);
    const hits = await page.evaluate(async ({ rays, semcover }) => {
      const THREE = await import('/vendor/three.module.js');
      const W = window.__gworld;
      window.__scene.updateMatrixWorld(true);
      const occ = semcover ? W.occluders.filter((o) => !o.userData?.coverProxy) : W.occluders;
      return rays.map(([a, b]) => {
        const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), dir = to.clone().sub(from);
        const dist = dir.length();
        const ray = new THREE.Raycaster(from, dir.normalize(), 0, dist);
        return ray.intersectObjects(occ, false).length > 0;
      });
    }, { rays, semcover: mutante === 'semcover' });
    coverHits += hits.filter(Boolean).length; coverTotal += hits.length;
  }
} finally { await browser.close(); }

console.log(`OM1 cover GLB: ${coverHits}/${coverTotal} raios bloqueados`);
if (coverHits !== coverTotal)
  falhas.push(`OM1 ${coverTotal - coverHits}/${coverTotal} raios atravessam cover GLB; registre proxy em occluders junto do collider`);

if (falhas.length) {
  for (const f of falhas) console.error(`✗ ${f}`);
  process.exitCode = 1;
} else console.log('✓ ORIGMAPS 3/3 contratos verdes');
