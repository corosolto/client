/* Contrato espacial roof-first comprado pelo teste do dono em 16/08/2026.

   A R18 tinha materiais melhores, mas os dois times nasciam no chão, a travessia
   curta ficava no beco, as três lajes eram ilhas e o corredor útil passava de 4 m.
   As réguas anteriores ficaram verdes porque contavam objetos e declarações. Esta
   sobe o Game real e mede o grafo, colisores, meshes de escada e física de pulo.

   Procedência das faixas: references/favela/lajes-rio/FONTE.md. As medidas reais
   publicadas de 0,6-1,5 m foram abertas até 1,4-2,4 m para o corpo de 0,76 m.

   Mutantes:
     spawn-beco   move um time para um ponto baixo realmente livre;
     rota-unica   corta todas menos uma saída alta do nó inicial;
     beco-avenida remove fachadas baixas dos colisores;
     escada-reta  funde os lances da primeira escada;
     pulo-global  aplica o impulso local também ao mapa-controle.
*/
import { THREE, bootGame, initTextures } from './harness.mjs';

const mutante = process.argv.find((arg) => arg.startsWith('--mutante='))?.split('=')[1] || '';
const conhecidos = new Set(['', 'spawn-beco', 'rota-unica', 'beco-avenida', 'escada-reta', 'pulo-global']);
if (!conhecidos.has(mutante)) throw new Error(`mutante desconhecido: ${mutante}`);

const textures = initTextures();
const game = bootGame('lajes', { textures, bots: 0, seed: 16082026 });
const W = game.world;
const { nodes = [], adj = [] } = W.waypoints || {};

const livre = (x, z, y) => {
  const p = new THREE.Vector3(x, y, z);
  game._collide(p, 0.38);
  return Math.hypot(p.x - x, p.z - z) < 1e-3;
};

function pontoBaixoLivre() {
  const B = W.bounds;
  for (let z = B.minZ + 1; z <= B.maxZ - 1; z += 0.5) {
    for (let x = B.minX + 1; x <= B.maxX - 1; x += 0.5) {
      const y = W.groundHeightAt(x, z, 0.5);
      if (y < 1 && livre(x, z, y)) return { x, z };
    }
  }
  throw new Error('sem ponto baixo livre para o mutante spawn-beco');
}

if (mutante === 'spawn-beco') {
  const p = pontoBaixoLivre();
  for (const spawn of W.spawns.E) { spawn.x = p.x; spawn.z = p.z; }
}

const spawnY = Object.fromEntries(Object.entries(W.spawns || {}).map(([time, lista]) => [time,
  lista.map((s) => W.groundHeightAt(s.x, s.z, 100))]));

const nearest = (spawn, onlyHigh = false) => {
  const sy = W.groundHeightAt(spawn.x, spawn.z, 100);
  let best = -1, dist = Infinity;
  for (let i = 0; i < nodes.length; i++) {
    if (onlyHigh && nodes[i].y < 4) continue;
    const d = Math.hypot(nodes[i].x - spawn.x, nodes[i].z - spawn.z, nodes[i].y - sy);
    if (d < dist) { best = i; dist = d; }
  }
  return { index: best, dist };
};

const startSpawn = W.spawns.E?.[0], endSpawn = W.spawns.B?.[0];
const start = startSpawn ? nearest(startSpawn).index : -1;
const end = endSpawn ? nearest(endSpawn).index : -1;
const highStart = startSpawn ? nearest(startSpawn, true) : { index: -1, dist: Infinity };
const highEnd = endSpawn ? nearest(endSpawn, true) : { index: -1, dist: Infinity };

if (mutante === 'rota-unica' && highStart.index >= 0) {
  const vizinhos = adj[highStart.index].filter((n) => nodes[n]?.y >= 4);
  if (vizinhos.length < 2) throw new Error('mutante rota-unica não encontrou duas saídas para cortar');
  for (const vizinho of vizinhos.slice(1)) {
    adj[highStart.index] = adj[highStart.index].filter((n) => n !== vizinho);
    adj[vizinho] = adj[vizinho].filter((n) => n !== highStart.index);
  }
}

function shortestPath(a, b) {
  if (a < 0 || b < 0) return [];
  const dist = new Float64Array(nodes.length).fill(Infinity);
  const prev = new Int32Array(nodes.length).fill(-1);
  const used = new Uint8Array(nodes.length);
  dist[a] = 0;
  for (;;) {
    let cur = -1, best = Infinity;
    for (let i = 0; i < nodes.length; i++) if (!used[i] && dist[i] < best) { cur = i; best = dist[i]; }
    if (cur < 0 || cur === b) break;
    used[cur] = 1;
    for (const next of adj[cur] || []) {
      const A = nodes[cur], B = nodes[next];
      const d = Math.hypot(B.x - A.x, B.z - A.z, B.y - A.y);
      if (dist[cur] + d < dist[next]) { dist[next] = dist[cur] + d; prev[next] = cur; }
    }
  }
  if (!Number.isFinite(dist[b])) return [];
  const path = [b];
  for (let cur = prev[b]; cur >= 0; cur = prev[cur]) path.unshift(cur);
  return path;
}

function highNodeDisjointRoutes(source, sink) {
  if (source < 0 || sink < 0) return 0;
  const high = new Set(nodes.map((n, i) => n.y >= 4 ? i : -1).filter((i) => i >= 0));
  if (!high.has(source) || !high.has(sink)) return 0;
  const N = nodes.length * 2;
  const cap = Array.from({ length: N }, () => new Int8Array(N));
  for (const i of high) cap[i * 2][i * 2 + 1] = (i === source || i === sink) ? 2 : 1;
  for (const i of high) for (const j of adj[i] || []) if (high.has(j)) cap[i * 2 + 1][j * 2] = 2;
  const s = source * 2 + 1, t = sink * 2;
  let flow = 0;
  while (flow < 2) {
    const prev = new Int32Array(N).fill(-1), q = [s]; prev[s] = s;
    for (let h = 0; h < q.length && prev[t] < 0; h++) {
      const u = q[h];
      for (let v = 0; v < N; v++) if (prev[v] < 0 && cap[u][v] > 0) { prev[v] = u; q.push(v); }
    }
    if (prev[t] < 0) break;
    for (let v = t; v !== s; v = prev[v]) { cap[prev[v]][v]--; cap[v][prev[v]]++; }
    flow++;
  }
  return flow;
}

const path = shortestPath(start, end);
let total = 0, highLength = 0;
for (let i = 1; i < path.length; i++) {
  const A = nodes[path[i - 1]], B = nodes[path[i]];
  const d = Math.hypot(B.x - A.x, B.z - A.z, B.y - A.y);
  total += d;
  if (A.y >= 4 && B.y >= 4) highLength += d;
}
const highShare = total ? highLength / total : 0;

if (mutante === 'beco-avenida') {
  const antes = W.colliders.length;
  W.colliders = W.colliders.filter((c) => !(c.minY <= 0.3 && c.maxY >= 1.8));
  if (W.colliders.length === antes) throw new Error('mutante beco-avenida não removeu fachada');
}

const edgeWidths = [];
const seen = new Set();
const probeWall = (x, z, nx, nz, y, sign) => {
  for (let d = 0.05; d <= 6; d += 0.05) if (!livre(x + nx * d * sign, z + nz * d * sign, y)) return d;
  return 6;
};
/* JUNÇÃO não é trecho de beco: onde três corredores se encontram (boca de ramal, cotovelo
   duplo) a sonda perpendicular corre corredor adentro e lê 8-12 m de "largura" fantasma.
   A largura do contrato (FONTE.md) mede TRECHO entre curvas. Filtro de instrumento: nó de
   grau ≥ 3 no térreo é junção; a aresta perto dele não entra na amostra. Teto intacto. */
const juncoes = new Set();
for (let i = 0; i < nodes.length; i++) {
  if (nodes[i].y >= 1) continue;
  const viz = (adj[i] || []).filter((n) => nodes[n]?.y < 1);
  if (viz.length >= 3) { juncoes.add(i); continue; }
  if (viz.length === 2) {   // cotovelo: trecho mede corredor reto, não a praça da curva
    const A = nodes[viz[0]], B = nodes[viz[1]], C = nodes[i];
    const ux = A.x - C.x, uz = A.z - C.z, vx = B.x - C.x, vz = B.z - C.z;
    const dot = (ux * vx + uz * vz) / Math.max(1e-6, Math.hypot(ux, uz) * Math.hypot(vx, vz));
    if (dot > -0.85) juncoes.add(i);
  }
}
const pertoDeJuncao = (x, z) => {
  for (const j of juncoes) if (Math.hypot(nodes[j].x - x, nodes[j].z - z) < 2.0) return true;
  return false;
};
for (let a = 0; a < nodes.length; a++) for (const b of adj[a] || []) {
  if (b <= a || nodes[a].y >= 1 || nodes[b]?.y >= 1) continue;
  const key = `${a}:${b}`; if (seen.has(key)) continue; seen.add(key);
  const A = nodes[a], B = nodes[b], dx = B.x - A.x, dz = B.z - A.z, len = Math.hypot(dx, dz);
  if (len < 0.5) continue;
  const straightAt = (center, other) => {
    const neighbors = (adj[center] || []).filter((n) => n !== other && nodes[n]?.y < 1);
    if (neighbors.length !== 1) return false;
    const C = nodes[center], O = nodes[other], N = nodes[neighbors[0]];
    const ux = O.x - C.x, uz = O.z - C.z, vx = N.x - C.x, vz = N.z - C.z;
    return (ux * vx + uz * vz) / Math.max(1e-6, Math.hypot(ux, uz) * Math.hypot(vx, vz)) < -0.92;
  };
  if (!straightAt(a, b) || !straightAt(b, a)) continue;
  const x = (A.x + B.x) / 2, z = (A.z + B.z) / 2, nx = -dz / len, nz = dx / len;
  if (pertoDeJuncao(x, z)) continue;
  if (!livre(x, z, 0)) continue;
  const width = probeWall(x, z, nx, nz, 0, -1) + probeWall(x, z, nx, nz, 0, 1) + 0.76;
  edgeWidths.push({ width, x, z });
}
edgeWidths.sort((a, b) => a.width - b.width);
const percentile = (list, q) => list.length ? list[Math.min(list.length - 1, Math.floor((list.length - 1) * q))].width : Infinity;
const w50 = percentile(edgeWidths, 0.5), w90 = percentile(edgeWidths, 0.9);

if (mutante === 'escada-reta') {
  const stair = (W.staircases || W.stairs)?.[0];
  if (!stair?.flights?.length || stair.flights.length < 2) throw new Error('mutante escada-reta sem dois lances para fundir');
  stair.flights = [{ steps: stair.flights.reduce((n, f) => n + f.steps, 0), direction: stair.flights[0].direction }];
  stair.landings = [];
}
const stairMeshes = new Map();
W.root.traverse((object) => {
  const id = object.userData?.lajesStair;
  if (id) stairMeshes.set(id, (stairMeshes.get(id) || 0) + 1);
});
const stairEvidence = (W.staircases || W.stairs || []).map((s) => {
  const width = Number.isFinite(s.width) ? s.width : Math.min(s.x1 - s.x0, s.z1 - s.z0);
  const turns = (s.flights || []).slice(1).some((flight, i) => {
    const a = s.flights[i].direction, b = flight.direction;
    return a && b && a[0] * b[0] + a[1] * b[1] < 0.5;
  });
  return { name: s.nome, width, flights: s.flights?.length || 0, landings: s.landings?.length || 0,
    maxSteps: Math.max(0, ...(s.flights || []).map((f) => f.steps)), turns, meshes: stairMeshes.get(s.nome) || 0 };
});

function jumpApex(g) {
  const p = g.player, spawn = g.world.spawns.E[0];
  p.pos.set(spawn.x, g.world.groundHeightAt(spawn.x, spawn.z, 100), spawn.z);
  const floor = p.pos.y;
  p.vel.set(0, 0, 0); p.grounded = true; p.alive = true; p.mantle = null;
  p.coyoteUntil = g.time + 0.09; p.jumpBufferedUntil = 0; g._spaceHeld = false;
  const oldKeys = g.keys; g.keys = { Space: true };
  let apex = floor;
  for (let i = 0; i < 120; i++) {
    if (i === 1) g.keys.Space = false;
    g.time += 1 / 120;
    g._updatePlayer(1 / 120);
    apex = Math.max(apex, p.pos.y);
  }
  g.keys = oldKeys;
  return apex - floor;
}

const control = bootGame('praca_poderes', { textures, bots: 0, seed: 16082026 });
if (mutante === 'pulo-global') {
  if (!(W.jumpImpulse > 5)) throw new Error('mutante pulo-global sem impulso local para copiar');
  control.world.jumpImpulse = W.jumpImpulse;
}
const lajesApex = jumpApex(game), controlApex = jumpApex(control);

const highRoutes = highNodeDisjointRoutes(highStart.index, highEnd.index);
const stairsOk = stairEvidence.length >= 3 && stairEvidence.every((s) => s.width >= 1.10 && s.width <= 1.40
  && s.flights >= 2 && s.landings >= 1 && s.maxSteps <= 16 && s.turns && s.meshes >= s.flights);
const checks = [
  ['LS1', 'os dois times nascem nas lajes', Object.keys(spawnY).length >= 2 && Object.values(spawnY).flat().every((y) => y >= 4),
    Object.entries(spawnY).map(([t, ys]) => `${t} ${ys.map((y) => y.toFixed(2)).join('/')}`).join(' · ')],
  ['LS2', 'duas rotas superiores independentes ligam os spawns', highRoutes >= 2 && highStart.dist <= 3 && highEnd.dist <= 3,
    `${highRoutes}/2 rotas · encaixe ${highStart.dist.toFixed(2)}/${highEnd.dist.toFixed(2)} m`],
  ['LS3', 'a travessia curta é roof-first', highShare >= 0.70, `${(highShare * 100).toFixed(1)}% de ${total.toFixed(1)} m acima de 4 m`],
  ['LS4', 'becos físicos são estreitos sem impedir o corpo', edgeWidths.length >= 12 && w50 >= 1.40 && w50 <= 1.90 && w90 <= 2.40,
    `${edgeWidths.length} cortes · p50 ${w50.toFixed(2)} m · p90 ${w90.toFixed(2)} m`],
  ['LS5', 'escadas têm dois lances, patamar, giro e encaixe', stairsOk,
    stairEvidence.map((s) => `${s.name}:${s.width.toFixed(2)}m/${s.flights}L/${s.landings}P/${s.meshes}M`).join(' · ') || 'sem escada medida'],
  ['LS6', 'pulo maior existe só em Lajes', lajesApex >= 0.75 && lajesApex <= 0.90 && controlApex >= 0.58 && controlApex <= 0.64,
    `Lajes ${lajesApex.toFixed(3)} m · controle ${controlApex.toFixed(3)} m`],
];

let falhas = 0;
for (const [id, desc, ok, evidence] of checks) {
  if (!ok) falhas++;
  console.log(`${ok ? '✓' : '✗'} ${id} ${desc} — ${evidence}`);
}
if (falhas) { console.error(`LAJES-SPATIAL FALHA: ${falhas}/${checks.length}`); process.exitCode = 1; }
else if (mutante) { console.error(`MUTANTE ${mutante} sobreviveu`); process.exitCode = 1; }
else console.log('LAJES-SPATIAL OK');
