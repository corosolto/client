/* Gate causal do Carandiru R3.
   Mede a geometria carregada pelo mesmo harness do jogo. Cada mutante modifica
   colisão, objeto, CTF ou ambiência do mundo real e precisa derrubar uma única
   cláusula. */
import { execFileSync } from 'node:child_process';
import { THREE, bootGame, initTextures } from './harness.mjs';

const mutant = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '=').split('=')[1];
const selftest = process.argv.includes('--selftest-mutantes');
const mutantTargets = {
  'sem-identidade': 'CR3-1',
  'fecha-escada': 'CR3-2',
  'fecha-guarita': 'CR3-2',
  'pavilhao-solido': 'CR3-3',
  'janela-suspensa': 'CR3-3',
  'rota-unica': 'CR3-4',
  'ctf-colinear': 'CR3-4',
  'spawn-exposto': 'CR3-5',
  'sem-ambiencia': 'CR3-6',
};
if (mutant && !mutantTargets[mutant]) throw new Error(`mutante desconhecido: ${mutant}`);
if (selftest) {
  for (const name of Object.keys(mutantTargets)) {
    const output = execFileSync(process.execPath, [new URL(import.meta.url).pathname, `--mutante=${name}`], {
      cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    console.log(output.trim().split('\n').at(-1));
  }
  console.log(`MUTANTES VERDES: ${Object.keys(mutantTargets).length}/${Object.keys(mutantTargets).length}`);
  process.exit(0);
}

const game = bootGame('penitenciaria', { textures: await initTextures(), bots: 0, seed: 1977 });
const world = game.world;
const spec = world.carandiru;
world.root.updateMatrixWorld(true);

const applied = [];
const addBlocker = (x, y, z, w, d, tag) => {
  world.colliders.push({ minX: x-w/2, maxX: x+w/2, minY: y, maxY: y+7,
    minZ: z-d/2, maxZ: z+d/2, tag });
  applied.push(tag);
};
if (mutant === 'sem-identidade') {
  for (const name of ['carandiru-placa-casa-de-detencao', 'carandiru-placa-pavilhao-6-sul',
    'carandiru-placa-pavilhao-6-norte', 'carandiru-viatura-fallback']) {
    const object = world.root.getObjectByName(name);
    if (object) { object.removeFromParent(); applied.push(`mutante-${name}`); }
  }
}
if (mutant === 'fecha-escada') {
  const a = spec.wallAccesses[0], i = 5;
  addBlocker(a.x, 0, a.z0+a.dz*i, a.width+.8, .45, 'mutante-fecha-escada');
}
if (mutant === 'fecha-guarita') {
  const [x, y, z] = spec.guardEntries[0].inside;
  addBlocker(x, y, z, 1.4, 1.4, 'mutante-fecha-guarita');
}
if (mutant === 'pavilhao-solido') addBlocker(4, 0, 0, .6, 4.4, 'mutante-pavilhao-solido');
if (mutant === 'janela-suspensa') {
  const wall = world.root.getObjectByName(spec.pavilionWindowSupports[0].wall);
  if (wall) { wall.removeFromParent(); applied.push('mutante-janela-suspensa'); }
}
if (mutant === 'rota-unica') {
  for (const route of spec.routes.slice(1)) {
    const point = route.points[Math.floor(route.points.length/2)];
    addBlocker(point[0], point[1], point[2], 3.2, 3.2, `mutante-rota-${route.id}`);
  }
}
if (mutant === 'ctf-colinear') {
  const mid = world.ctfPoints.find((point) => point.id === 'MID');
  mid.x = 0; applied.push('mutante-ctf-colinear');
}
if (mutant === 'spawn-exposto') {
  const before = world.colliders.length;
  world.colliders.splice(0, world.colliders.length,
    ...world.colliders.filter((box) => box.tag !== 'torre-contracobertura'));
  if (world.colliders.length < before) applied.push('mutante-spawn-exposto');
}
if (mutant === 'sem-ambiencia') {
  world.ambience?.group?.removeFromParent();
  world.sound.loops.length = 0;
  applied.push('mutante-sem-ambiencia');
}
if (mutant && !applied.length) throw new Error(`mutante ${mutant} não alterou o mundo`);

const named = (name) => !!world.root.getObjectByName(name);
const MAX_STEP = .55;
const samplesOf = (points, spacing = .18) => {
  const out = [];
  for (let k = 1; k < points.length; k++) {
    const a = points[k-1], b = points[k], distance = Math.hypot(b[0]-a[0], b[1]-a[1], b[2]-a[2]);
    const count = Math.max(1, Math.ceil(distance/spacing));
    for (let i = k === 1 ? 0 : 1; i <= count; i++) {
      const t = i/count;
      out.push({ x:a[0]+(b[0]-a[0])*t, y:a[1]+(b[1]-a[1])*t,
        z:a[2]+(b[2]-a[2])*t, dx:b[0]-a[0], dz:b[2]-a[2] });
    }
  }
  return out;
};
const capsuleFree = (x, y, z, radius = .38) => {
  const probe = new THREE.Vector3(x, y, z);
  game._collide(probe, radius);
  return Math.hypot(probe.x-x, probe.z-z) < 1e-3;
};
const pointFree = (x, y, z, radius = 0) => !world.colliders.some((box) =>
  x > box.minX-radius && x < box.maxX+radius && z > box.minZ-radius && z < box.maxZ+radius
  && box.minY < y+1.55 && box.maxY > y+.25);
const stairPoints = (a) => a.heights.map((y, i) => [a.x ?? a.x0+i*a.dx, y, a.z ?? a.z0+i*a.dz]);
const staircaseWorks = (a, target) => a.heights.length >= 8 && a.heights.at(-1) >= target
  && a.heights.every((height, i) => i === 0 || height >= a.heights[i-1]
    && height-a.heights[i-1] <= MAX_STEP);
const pathWalkable = (points) => {
  let previous = points[0]?.[1] || 0;
  return samplesOf(points).every((point) => {
    const y = world.groundHeightAt(point.x, point.z, previous);
    const ok = Math.abs(y-point.y) <= MAX_STEP+.03 && Math.abs(y-previous) <= MAX_STEP+.01
      && capsuleFree(point.x, y, point.z);
    previous = y;
    return ok;
  });
};
const connected = (points) => {
  const first = points?.[0], last = points?.at(-1);
  if (!first || !last) return false;
  const a = world.nearestWaypoint(first[0], first[2], first[1]);
  const b = world.nearestWaypoint(last[0], last[2], last[1]);
  const path = world.findPath(a, b);
  return a === b || path.length > 1 && path[0] === a && path.at(-1) === b;
};
const navigationReach = (() => {
  const { nodes, adj } = world.waypoints, seen = new Uint8Array(nodes.length), queue = nodes.length ? [0] : [];
  if (nodes.length) seen[0] = 1;
  let reached = nodes.length ? 1 : 0;
  while (queue.length) {
    const current = queue.pop();
    for (const next of adj[current] || []) if (!seen[next]) { seen[next] = 1; reached++; queue.push(next); }
  }
  return { reached, total:nodes.length };
})();
const routeMetric = (route) => {
  const samples = samplesOf(route.points), branch = samplesOf(route.midBranch);
  const failures = [];
  const physical = (rows) => rows.every((point) => {
    const ground = world.groundHeightAt(point.x, point.z, point.y);
    const length = Math.hypot(point.dx, point.dz) || 1;
    const nx = -point.dz/length, nz = point.dx/length;
    const cap = capsuleFree(point.x, point.y, point.z);
    /* Centro livre mais 0,4 m por lado equivale a 1,56 m para a cápsula de
       diâmetro 0,76 m; portanto ainda excede a rota mínima de 1,2 m. */
    const left = pointFree(point.x+nx*.4, point.y, point.z+nz*.4);
    const right = pointFree(point.x-nx*.4, point.y, point.z-nz*.4);
    const ok = Math.abs(ground-point.y) <= .65 && cap && left && right;
    if (!ok) failures.push([+point.x.toFixed(2),+point.y.toFixed(2),+point.z.toFixed(2),
      `g${Math.abs(ground-point.y).toFixed(2)}`,`c${+cap}`,`l${+left}`,`r${+right}`]);
    return ok;
  });
  return { id:route.id, samples:samples.length+branch.length,
    physical:physical(samples) && physical(branch), connected:connected(route.points) && connected(route.midBranch),
    firstFailure:failures[0] };
};

const segmentHits = (a, b, box) => {
  let enter = 0, exit = 1;
  for (const [start, end, min, max] of [[a[0],b[0],box.minX,box.maxX], [a[1],b[1],box.minY,box.maxY], [a[2],b[2],box.minZ,box.maxZ]]) {
    const delta = end-start;
    if (Math.abs(delta) < 1e-9) { if (start <= min || start >= max) return false; continue; }
    let lo = (min-start)/delta, hi = (max-start)/delta;
    if (lo > hi) [lo, hi] = [hi, lo];
    enter = Math.max(enter, lo); exit = Math.min(exit, hi);
    if (enter >= exit) return false;
  }
  return exit > .02 && enter < .98;
};
const visible = (a, b) => !world.colliders.some((box) => {
  const startsInside = a[0] > box.minX-.5 && a[0] < box.maxX+.5 && a[1] > box.minY-.5
    && a[1] < box.maxY+.5 && a[2] > box.minZ-.5 && a[2] < box.maxZ+.5;
  return !startsInside && segmentHits(a, b, box);
});
const towerSight = spec.watchtowers.map((tower) => ({ name:tower.name,
  seen:(tower.team === 'E' ? world.spawns.B : world.spawns.E)
    .filter((spawn) => visible(tower.eye, [spawn.x,1.6,spawn.z])).length }));
const counterfire = new Set(spec.counterfireVantages.filter((vantage) =>
  spec.watchtowers.some((tower) => visible(vantage.eye, tower.eye))).map((vantage) => vantage.route)).size;

const results = [];
const put = (id, ok, detail) => { results.push({ id, ok }); console.log(`${id} ${ok ? 'PASSA' : 'FALHA'} — ${detail}`); };
const access = spec.wallAccesses, entries = spec.guardEntries, guardRoutes = spec.guardRoutes;
put('CR3-1', named('carandiru-placa-casa-de-detencao') && named('carandiru-placa-pavilhao-6-sul')
  && named('carandiru-placa-pavilhao-6-norte') && named('carandiru-viatura-fallback')
  && world.root.name === 'carandiru',
  'identidade física, Pavilhão 6 e viatura procedural local');
const validAccess = access.filter((a) => named(a.name) && staircaseWorks(a, 5.7)
  && a.width >= 2.6 && a.run >= 12 && pathWalkable(stairPoints(a)));
const validEntries = entries.filter((entry) => named(entry.name) && named(entry.floor)
  && capsuleFree(...[entry.inside[0],entry.inside[1],entry.inside[2]]));
const validGuardRoutes = guardRoutes.filter((route) => named(route.name)
  && pathWalkable(route.points) && pathWalkable([...route.points].reverse()));
put('CR3-2', validAccess.length === 4 && spec.wallWalkways.length === 4
  && spec.wallWalkways.every((walk) => named(walk.name)) && validEntries.length === 6
  && validGuardRoutes.length === 6,
  `escadas=${validAccess.length}/4 passarelas=${spec.wallWalkways.length}/4 guaritas=${validEntries.length}/6 rotas=${validGuardRoutes.length}/6`);
const passages = spec.pavilionPassages;
const pStair = spec.pavilionStairs[0];
const passageFree = pathWalkable([[0,0,-8],[0,0,8]]) && pathWalkable([[-8,0,0],[8,0,0]]);
const supports = spec.pavilionWindowSupports.filter((support) => named(support.window)
  && named(support.wall) && named(support.floor)
  && world.groundHeightAt(support.firing[0], support.firing[2], support.firing[1]) === support.firing[1]
  && capsuleFree(support.firing[0], support.firing[1], support.firing[2]));
put('CR3-3', passages.length === 2 && passages.every((passage) => passage.width >= 3.2 && named(passage.name))
  && passageFree && staircaseWorks(pStair, 3.3) && pStair.width >= 3 && pStair.run >= 6.5
  && pathWalkable(stairPoints(pStair)) && named(spec.pavilionGallery.name)
  && supports.length === 12,
  `passagens=${passages.length}/2 livres=${passageFree} escada=${pathWalkable(stairPoints(pStair))} janelas apoiadas=${supports.length}/12`);
const routeMetrics = spec.routes.map(routeMetric);
const mids = spec.routes.map((route) => route.points[Math.floor(route.points.length/2)]);
const independent = mids.every((a, i) => mids.every((b, j) => i === j || Math.hypot(a[0]-b[0],a[2]-b[2]) >= 6));
const mid = world.ctfPoints.find((point) => point.id === 'MID');
const [flagE,,flagB] = world.ctfPoints;
const triangleHeight = Math.abs((flagB.x-flagE.x)*(flagE.z-mid.z)-(flagE.x-mid.x)*(flagB.z-flagE.z))
  / Math.hypot(flagB.x-flagE.x,flagB.z-flagE.z);
const branchesReachMid = spec.routes.every((route) => {
  const end = route.midBranch.at(-1); return Math.hypot(end[0]-mid.x,end[2]-mid.z) <= .25;
});
put('CR3-4', routeMetrics.length === 3 && independent && branchesReachMid && triangleHeight >= 4.5
  && routeMetrics.every((route) => route.physical && route.connected)
  && navigationReach.reached === navigationReach.total,
  `${routeMetrics.map((r) => `${r.id}:${r.physical&&r.connected?'livre':`bloqueada@${r.firstFailure||'grafo'}`}`).join(' ')} triângulo=${triangleHeight.toFixed(1)}m MID=${branchesReachMid} grafo=${navigationReach.reached}/${navigationReach.total}`);
const maxSight = Math.max(...towerSight.map((row) => row.seen));
put('CR3-5', maxSight <= 2 && counterfire >= 2 && towerSight.every((row) => named(row.name)),
  `visada máxima=${maxSight}/4 contrafogo=${counterfire}/3`);
const light = world.root.getObjectByName('penitenciaria-holofote-0');
const before = light?.quaternion.clone(); world.update(.016, 20); world.root.updateMatrixWorld(true);
const moved = !!before && !before.equals(light.quaternion);
const animals = world.ambience?.animals || [];
const animalTypes = new Set(animals.map((animal) => animal.type));
put('CR3-6', world.ambience?.group?.parent === world.root && animals.length >= 3
  && animalTypes.has('rat') && animalTypes.has('pigeon')
  && world.sound.loops.length === 3 && world.sound.loops.every((loop) => typeof loop.src === 'string' && loop.src.length)
  && moved,
  `animais=${animals.length} tipos=${[...animalTypes].join('+')} loops=${world.sound.loops.length}/3 holofote=${moved?'móvel':'parado'}`);

const failed = results.filter((result) => !result.ok).map((result) => result.id);
if (mutant) {
  const target = mutantTargets[mutant];
  if (failed.length !== 1 || failed[0] !== target) throw new Error(
    `mutante ${mutant} deveria reprovar somente ${target}; reprovou ${failed.join(', ') || 'nada'}`);
  console.log(`MUTANTE MORDIDO: ${mutant} -> ${target}`);
  process.exit(0);
}
console.log(`CARANDIRU R3 ${failed.length ? `VERMELHO: ${failed.join(', ')}` : 'VERDE'}`);
process.exit(failed.length ? 1 : 0);
