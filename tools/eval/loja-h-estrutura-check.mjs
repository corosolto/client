/* Loja H — contrato estrutural de circulação e conflito.
 *
 * Mede o mundo construído, sem copiar coordenadas do resultado para aprová-lo:
 *   LH1  três portas na fachada e três descidas do mezanino;
 *   LH2  grafo inteiramente conexo, sem destinos de roam em bolsões selados;
 *   LH3  todo spawn alcança toda bandeira, e as três opções de saída de cada lado;
 *   LH4  quatro conflitos CTF distribuídos entre interior e exterior;
 *   LH5  a saída central do depósito tem cobertura opaca antes da escada.
 *
 * Uso:
 *   node tools/eval/loja-h-estrutura-check.mjs [--json]
 *   node tools/eval/loja-h-estrutura-check.mjs --mutante=sem-central|grafo-partido|sem-ctf|sem-cover
 */
import { THREE, MAPS, initTextures } from './harness.mjs';

const arg = (name) => (process.argv.find((x) => x.startsWith(`--${name}=`)) || '').split('=').slice(1).join('=');
const MUT = arg('mutante');
const JSONOUT = process.argv.includes('--json');
const scene = new THREE.Scene();
const W = MAPS.loja_h.build(scene, await initTextures());

if (MUT === 'sem-central') {
  W.stairs = W.stairs.filter((s) => !/central/i.test(s.nome));
  const central = W.doors.reduce((best, d) => Math.abs(d.x) < Math.abs(best.x) ? d : best, W.doors[0]);
  W.doors = W.doors.filter((d) => d !== central);
}
if (MUT === 'grafo-partido') W.waypoints.adj[0] = [];
if (MUT === 'sem-ctf') W.ctfPoints = W.ctfPoints.slice(0, 3);
if (MUT === 'sem-cover') {
  for (const c of W.colliders)
    if (c.minX < -3 && c.maxX > 3 && c.minZ < -32 && c.maxZ > -33) c.maxY = c.minY + 0.5;
}

const failures = [];
const pass = (id, ok, detail) => { if (!ok) failures.push(`${id}: ${detail}`); return { id, ok, detail }; };
const { nodes, adj } = W.waypoints;
const nearest = (x, z) => W.nearestWaypoint(x, z);
const route = (a, b) => W.findPath(nearest(a.x, a.z), nearest(b.x, b.z));
const reaches = (a, b) => {
  const to = nearest(b.x, b.z), p = route(a, b);
  return p.length > 0 && p[p.length - 1] === to;
};

// Grafo: uma BFS deve visitar exatamente todos os nós publicados para o bot.
const seen = new Uint8Array(nodes.length), q = [0]; seen[0] = 1;
while (q.length) {
  const i = q.pop();
  for (const j of adj[i] || []) if (!seen[j]) { seen[j] = 1; q.push(j); }
}
const reached = seen.reduce((n, v) => n + v, 0);

const stairs = [...(W.stairs || [])].sort((a, b) => (a.x0 + a.x1) - (b.x0 + b.x1));
const frontDoors = [...(W.doors || [])].filter((d) => Math.abs(d.z + 6) < 0.6).sort((a, b) => a.x - b.x);
const stairCenters = stairs.map((s) => ({
  x: (s.x0 + s.x1) / 2,
  top: { x: (s.x0 + s.x1) / 2, z: s.z0 - 0.45 },
  bottom: { x: (s.x0 + s.x1) / 2, z: s.z1 + 0.45 },
}));
const doorApproaches = frontDoors.map((d) => ({ x: d.x, z: d.z + 2.4 }));
const bSpawn = W.spawns.B[0], eSpawn = W.spawns.E[0];

const lh1 = pass('LH1', stairs.length >= 3 && frontDoors.length >= 3
  && stairCenters.some((s) => s.x < -6) && stairCenters.some((s) => Math.abs(s.x) < 2) && stairCenters.some((s) => s.x > 6)
  && frontDoors.some((d) => d.x < -15) && frontDoors.some((d) => Math.abs(d.x) < 2) && frontDoors.some((d) => d.x > 15),
`escadas=${stairs.length} [${stairCenters.map((s) => s.x.toFixed(1)).join(', ')}], portas=${frontDoors.length} [${frontDoors.map((d) => d.x.toFixed(1)).join(', ')}]`);
const lh2 = pass('LH2', reached === nodes.length,
  `${reached}/${nodes.length} nós alcançados${reached === nodes.length ? '' : `; ${nodes.length - reached} ilhados`}`);

const spawnFlag = [];
for (const [team, ss] of Object.entries(W.spawns)) for (let i = 0; i < ss.length; i++)
  for (const f of W.ctfPoints) spawnFlag.push({ team, spawn: i, flag: f.id, ok: reaches(ss[i], f) });
const bChoices = stairCenters.map((s) => reaches(bSpawn, s.top) && reaches(s.bottom, W.ctfPoints[0]));
const eChoices = doorApproaches.map((p) => reaches(eSpawn, p) && reaches(p, W.ctfPoints.find((f) => f.z < 0)));
const lh3 = pass('LH3', spawnFlag.every((x) => x.ok) && bChoices.filter(Boolean).length >= 3 && eChoices.filter(Boolean).length >= 3,
  `spawn→CTF ${spawnFlag.filter((x) => x.ok).length}/${spawnFlag.length}; escolhas B=${bChoices.filter(Boolean).length}/3 E=${eChoices.filter(Boolean).length}/3`);

const inside = W.ctfPoints.filter((p) => p.z < -6), outside = W.ctfPoints.filter((p) => p.z > -6);
const sides = new Set(W.ctfPoints.map((p) => Math.sign(p.x)));
const lh4 = pass('LH4', W.ctfPoints.length >= 4 && inside.length >= 2 && outside.length >= 2 && sides.has(-1) && sides.has(1),
  `CTF=${W.ctfPoints.length}, interior=${inside.length}, exterior=${outside.length}, lados=${[...sides].join('/')}`);

// A cobertura da saída central é um sólido largo, opaco e alto na sacada, entre porta e escada.
const centralCover = W.colliders.filter((c) => c.minX <= -3 && c.maxX >= 3
  && c.minY >= 3.3 && c.maxY >= 5.8 && c.minZ < -32 && c.maxZ > -33);
const lh5 = pass('LH5', centralCover.length >= 1,
  `${centralCover.length} cobertura(s) opaca(s) protegendo a saída central`);

const result = {
  ok: failures.length === 0, mutante: MUT || null,
  metrics: { nodes: nodes.length, edges: adj.reduce((n, a) => n + a.length, 0), reached, stairs: stairs.length, frontDoors: frontDoors.length,
    ctf: W.ctfPoints.length, spawnFlagRoutes: spawnFlag.filter((x) => x.ok).length, spawnFlagTotal: spawnFlag.length,
    choicesB: bChoices.filter(Boolean).length, choicesE: eChoices.filter(Boolean).length, centralCover: centralCover.length },
  checks: [lh1, lh2, lh3, lh4, lh5], failures,
};

if (JSONOUT) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`LOJA H — ESTRUTURA${MUT ? ` [mutante ${MUT}]` : ''}`);
  for (const c of result.checks) console.log(`  ${c.ok ? 'ok' : 'x '} ${c.id} ${c.detail}`);
  console.log(result.ok ? 'VERDE' : `VERMELHA — ${failures.length} falha(s)`);
}
process.exit(result.ok ? 0 : 1);
