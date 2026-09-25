/* ==========================================================================
   parque-estrutura-check.mjs — o Parque da Treta precisa jogar como parque
   urbano disputado, não como gramado aberto.

   Mede o mundo real construído pelo jogo. As cláusulas congelam a identidade
   de Madureira, proteção de spawn, cobertura, três decisões de rota, CTF,
   capacidade 8x8 e ambiência. Use --mutar=<nome> para provar que a régua morde.
   ========================================================================== */
import { existsSync } from 'node:fs';
import { THREE, bootGame, initTextures } from './harness.mjs';
import { rotasSeparadas } from './rotas-separadas.mjs';
import { PARQUE_PROPS, PARQUE_AMBIENCE } from '../../public/js/map_parque.js';

const MUTANTES = new Set(['aberto', 'sem-madureira', 'sem-central', 'rota-fechada', 'ctf-convergente', 'spawn-apertado', 'sem-ambiencia']);
const MUT = (process.argv.find((a) => a.startsWith('--mutar=')) || '').split('=')[1] || '';
if (MUT && !MUTANTES.has(MUT)) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const game = bootGame('parque_treta', { textures: initTextures(), ctf: true, seed: 12345, bots: 8 });
const W = game.world;
const porRole = (role) => { const out = []; W.root.traverse((o) => { if (o.userData?.parqueRole === role) out.push(o); }); return out; };
const porPrefixo = (prefix) => { const out = []; W.root.traverse((o) => { if (o.name?.startsWith(prefix)) out.push(o); }); return out; };
const remove = (objects) => {
  for (const o of objects) {
    if (o.parent) o.parent.remove(o);
    const c = o.userData?.collider;
    if (c) W.colliders = W.colliders.filter((x) => x !== c);
    W.occluders = W.occluders.filter((x) => x !== o);
  }
};

if (MUT === 'aberto') remove([...porRole('spawn-screen'), ...porRole('cover'), ...porRole('cover-central')]);
if (MUT === 'sem-central') remove(porRole('cover-central'));
if (MUT === 'sem-madureira') {
  PARQUE_PROPS.length = 0;
  remove(porPrefixo('parque-molde-'));
}
if (MUT === 'rota-fechada') {
  const { nodes, adj } = W.waypoints;
  let cuts = 0;
  for (let i = 0; i < adj.length; i++) {
    const before = adj[i].length;
    adj[i] = nodes[i].x > 15 ? [] : adj[i].filter((j) => nodes[j].x <= 15);
    cuts += before - adj[i].length;
  }
  if (!cuts) { console.error('MUTANTE NÃO APLICOU: rota-fechada não cortou arestas'); process.exit(2); }
}
if (MUT === 'ctf-convergente') {
  W.ctfPoints.splice(0, W.ctfPoints.length,
    { id: 'E', label: 'E', x: 0, z: -25 }, { id: 'MID', label: 'MID', x: 0, z: 0 }, { id: 'B', label: 'B', x: 0, z: 25 });
}
if (MUT === 'spawn-apertado') { W.spawns.E[0].x = -3.9; W.spawns.E[0].z = -33; }
if (MUT === 'sem-ambiencia') {
  PARQUE_AMBIENCE.length = 0;
  W.ambience = null;
  const fauna = [];
  W.root.traverse((o) => { if (o.userData?.fauna) fauna.push(o); });
  remove(fauna);
}
W.root.updateMatrixWorld(true);

const results = [];
const clause = (id, ok, evidence) => { results.push(ok); console.log(`${id} ${ok ? 'PASSA' : 'FALHA'} — ${evidence}${MUT ? ` [mutante ${MUT}]` : ''}`); };
const nodes = W.waypoints?.nodes || [], adj = W.waypoints?.adj || [];

// PKE1 — identidade e assets locais versionados.
const heroPrefixes = ['parque-molde-carrossel', 'parque-molde-roda', 'parque-molde-barraca', 'parque-molde-predio', 'parque-coreto'];
const heroCount = heroPrefixes.reduce((n, prefix) => n + porPrefixo(prefix).length, 0);
const missingAssets = PARQUE_PROPS.filter((id) => !existsSync(new URL(`../../public/models/props/${id}.glb`, import.meta.url)));
clause('PKE1', PARQUE_PROPS.length >= 6 && !missingAssets.length && heroCount >= 15,
  `${PARQUE_PROPS.length} ids locais, ${heroCount} marcos nomeados, ausentes ${missingAssets.join(',') || 'nenhum'}`);

// PKE2 — proteção de spawn medida pela mesma LOS usada pelos bots.
const screens = porRole('spawn-screen');
const exposure = [];
for (const [team, spawns] of Object.entries(W.spawns)) {
  let seen = 0, total = 0;
  for (const spawn of spawns) {
    const target = new THREE.Vector3(spawn.x, 1.62, spawn.z);
    for (const n of nodes) {
      if (Math.hypot(n.x - spawn.x, n.z - spawn.z) < 25) continue;
      total++;
      if (game._losClear(new THREE.Vector3(n.x, (n.y || 0) + 1.62, n.z), target)) seen++;
    }
  }
  exposure.push({ team, frac: total ? seen / total : 1 });
}
const worstExposure = Math.max(...exposure.map((x) => x.frac));
clause('PKE2', screens.length === 4 && screens.every((o) => W.colliders.includes(o.userData.collider)) && worstExposure <= .35,
  `${screens.length}/4 bilheterias sólidas; exposição distante ${exposure.map((x) => `${x.team} ${(x.frac * 100).toFixed(1)}%`).join(' · ')}`);

// PKE3 — cobertura tática distribuída entre bases e miolo.
const baseCover = porRole('cover'), centralCover = porRole('cover-central');
const baseSides = [-1, 1].map((side) => baseCover.filter((o) => Math.sign(o.position.z) === side).length);
clause('PKE3', baseCover.length >= 8 && centralCover.length >= 4 && Math.min(...baseSides) >= 4,
  `${baseCover.length} coberturas de base (${baseSides.join('/')}); ${centralCover.length} jardins centrais`);

// PKE4 — oeste, centro e leste são escolhas realmente alcançáveis.
const routes = [];
for (const [team, side] of [['E', -1], ['B', 1]]) {
  const start = W.nearestWaypoint(W.spawns[team][0].x, W.spawns[team][0].z);
  for (const laneX of [-22, 0, 22]) {
    const gate = W.nearestWaypoint(laneX, side * 14);
    const target = W.nearestWaypoint(laneX, -side * 8);
    const first = W.findPath(start, gate), second = W.findPath(gate, target);
    const gateNode = nodes[gate], targetNode = nodes[target];
    routes.push({ team, laneX, ok: first.length > 1 && first.at(-1) === gate && second.length > 1 && second.at(-1) === target
      && Math.hypot(gateNode.x - laneX, gateNode.z - side * 14) <= 4
      && Math.hypot(targetNode.x - laneX, targetNode.z + side * 8) <= 4,
      length: first.length + second.length - 1 });
  }
}
clause('PKE4', routes.every((r) => r.ok), routes.map((r) => `${r.team}${r.laneX > 0 ? '+' : ''}${r.laneX}:${r.ok ? r.length : 'X'}`).join(' · '));

// PKE5 — bandeiras fora de uma reta única e com duas rotas separadas por par.
const ctf = [];
for (const team of ['E', 'B']) for (const p of W.ctfPoints) {
  const spawn = W.spawns[team][0];
  const from = W.nearestWaypoint(spawn.x, spawn.z), to = W.nearestWaypoint(p.x, p.z);
  ctf.push({ pair: `${team}→${p.id}`, routes: rotasSeparadas(nodes, adj, from, to).length, y: nodes[to]?.y || 0 });
}
const [A, B, C] = W.ctfPoints;
const area2 = Math.abs((B.x - A.x) * (C.z - A.z) - (C.x - A.x) * (B.z - A.z));
const maxSide = Math.max(Math.hypot(B.x - A.x, B.z - A.z), Math.hypot(C.x - A.x, C.z - A.z), Math.hypot(C.x - B.x, C.z - B.z));
const triangleHeight = maxSide ? area2 / maxSide : 0;
clause('PKE5', triangleHeight >= 4 && ctf.every((x) => x.routes >= 2 && Math.abs(x.y) < .2),
  `triângulo ${triangleHeight.toFixed(2)} m; ${ctf.map((x) => `${x.pair} ${x.routes} rota(s)`).join(' · ')}`);

// PKE6 — quatro slots por time servem 5x5/8x8 por reciclagem sem sobreposição.
const relevantColliders = W.colliders.filter((c) => c.minY < 1.5 && c.maxY > .3);
const clearances = Object.values(W.spawns).flat().map((s) => Math.min(...relevantColliders.map((c) =>
  Math.hypot(Math.max(c.minX - s.x, 0, s.x - c.maxX), Math.max(c.minZ - s.z, 0, s.z - c.maxZ)))));
const spacing = Object.values(W.spawns).flatMap((list) => list.flatMap((a, i) => list.slice(i + 1).map((b) => Math.hypot(a.x - b.x, a.z - b.z))));
clause('PKE6', W.spawns.E.length === 4 && W.spawns.B.length === 4 && Math.min(...clearances) >= 1.2 && Math.min(...spacing) >= 5,
  `slots E/B ${W.spawns.E.length}/${W.spawns.B.length}; folga ${Math.min(...clearances).toFixed(2)} m; distância ${Math.min(...spacing).toFixed(2)} m`);

// PKE7 — fauna e loops locais fazem parte da leitura do parque.
const fauna = [];
W.root.traverse((o) => { if (o.userData?.fauna) fauna.push(o.userData.fauna); });
const loops = W.sound?.loops || [];
clause('PKE7', PARQUE_AMBIENCE.length >= 4 && new Set(fauna).size >= 3 && loops.length >= 2 && loops.every((l) => typeof l.src === 'string'),
  `${PARQUE_AMBIENCE.length} assets de ambiência; fauna ${[...new Set(fauna)].join('/') || 'nenhuma'}; ${loops.length} loops`);

const failures = results.filter((ok) => !ok).length;
if (MUT && failures === 0) { console.error(`MUTAÇÃO '${MUT}' não acendeu cláusula — régua cega`); process.exit(2); }
if (failures) process.exit(1);
console.log('PARQUE-ESTRUTURA ✓ 7 cláusulas verdes');
