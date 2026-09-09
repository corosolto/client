/* Régua espacial da reautoria da Piscina da Treta.
   Criada ANTES do blockout. No origin/main, PIS1/PIS2/PIS3/PIS6 devem ficar vermelhas.
   Uso:
     node tools/eval/piscina-rework-check.mjs
     node tools/eval/piscina-rework-check.mjs --mutante=sem-corredor
     node tools/eval/piscina-rework-check.mjs --mutantes

   Mutante só conta como mordido quando a cláusula alvo era verde, a mutação foi aplicada,
   ela ficou vermelha e todas as outras preservaram o veredito. Alvo já vermelho é
   INCONCLUSIVO: não existe fixture sintética para fingir um mundo corrigido. */
import { THREE, initTextures, bootGame } from './harness.mjs';
import { readFileSync } from 'node:fs';

const FAB_SOURCE = readFileSync(new URL('../audio/fab-game-local.mjs', import.meta.url), 'utf8');

const SEP_ROTA = 6;
const CORRIDOR_X = 17.2;
const targets = Object.freeze({
  'sem-corredor': 'PIS1',
  'boca-unica': 'PIS1',
  'cobertura-submersa': 'PIS2',
  'ilha-solta': 'PIS2',
  'sem-anteparo-spawn': 'PIS3',
  'porta-estreita': 'PIS3',
  'spawn-deslocado': 'PIS4',
  'sem-ambiencia': 'PIS6',
});

function fresh() {
  const game = bootGame('piscina_treta', { textures: initTextures(), ctf: true, seed: 12345 });
  game.scene.updateMatrixWorld(true);
  game.world.root.updateMatrixWorld(true);
  return game;
}

function shortest(nodes, adj, from, to, blocked) {
  const dist = new Float64Array(nodes.length).fill(Infinity);
  const prev = new Int32Array(nodes.length).fill(-1);
  const seen = new Uint8Array(nodes.length);
  if (blocked[from] || blocked[to]) return null;
  dist[from] = 0;
  for (;;) {
    let cur = -1, best = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      if (!seen[i] && dist[i] < best) { cur = i; best = dist[i]; }
    }
    if (cur < 0 || cur === to) break;
    seen[cur] = 1;
    for (const next of adj[cur] || []) {
      if (blocked[next]) continue;
      const cost = Math.hypot(nodes[cur].x - nodes[next].x, nodes[cur].z - nodes[next].z);
      if (dist[cur] + cost < dist[next]) { dist[next] = dist[cur] + cost; prev[next] = cur; }
    }
  }
  if (!Number.isFinite(dist[to])) return null;
  const path = [to];
  for (let cur = prev[to]; cur >= 0; cur = prev[cur]) path.unshift(cur);
  return path;
}

function separatedPair(world, from, to) {
  const nodes = world.waypoints?.nodes || [];
  const adj = world.waypoints?.adj || [];
  const fromIdx = world.nearestWaypoint(from.x, from.z);
  const toIdx = world.nearestWaypoint(to.x, to.z);
      const blocked = new Uint8Array(nodes.length);
      let count = 0;
      for (let attempt = 0; attempt < 4; attempt++) {
        const path = shortest(nodes, adj, fromIdx, toIdx, blocked);
        if (!path) break;
        count++;
        const endMargin = SEP_ROTA + 3.4;
        for (let i = 0; i < nodes.length; i++) {
          if (i === fromIdx || i === toIdx) continue;
          if (Math.hypot(nodes[i].x - nodes[fromIdx].x, nodes[i].z - nodes[fromIdx].z) <= endMargin) continue;
          if (Math.hypot(nodes[i].x - nodes[toIdx].x, nodes[i].z - nodes[toIdx].z) <= endMargin) continue;
          if (path.some((p) => Math.hypot(nodes[i].x - nodes[p].x, nodes[i].z - nodes[p].z) <= SEP_ROTA)) blocked[i] = 1;
        }
      }
  return count;
}

function separatedRoutes(world) {
  if (!world.waypoints?.nodes?.length || !world.nearestWaypoint) return 0;
  let worst = Infinity;
  for (const spawns of Object.values(world.spawns || {})) {
    for (const flag of world.ctfPoints || []) {
      const count = separatedPair(world, spawns[0], flag);
      worst = Math.min(worst, count);
    }
  }
  return Number.isFinite(worst) ? worst : 0;
}

function teamSeparatedRoutes(world) {
  const e = world.spawns?.E?.[0], b = world.spawns?.B?.[0];
  if (!e || !b) return 0;
  return Math.min(separatedPair(world, e, b), separatedPair(world, b, e));
}

function corridor(world, side) {
  const nodes = world.waypoints?.nodes || [];
  const ids = nodes.map((n, i) => side * n.x > CORRIDOR_X ? i : -1).filter((i) => i >= 0);
  const allowed = new Set(ids);
  const south = ids.filter((i) => nodes[i].z <= -9);
  const north = new Set(ids.filter((i) => nodes[i].z >= 9));
  const seen = new Set(south), queue = [...south];
  while (queue.length) {
    const cur = queue.shift();
    for (const next of world.waypoints?.adj?.[cur] || []) {
      if (allowed.has(next) && !seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  return {
    nodes: ids.length,
    south: south.length,
    north: north.size,
    connected: [...north].some((i) => seen.has(i)),
    boundsEdge: side < 0 ? world.bounds?.minX : world.bounds?.maxX,
  };
}

function clearHall(world) {
  const submerged = (world.colliders || []).filter((c) => c.minY < -0.2 && c.maxY <= 0.05 &&
    c.maxX > -7.5 && c.minX < 7.5 && c.maxZ > -9.5 && c.minZ < 9.5);
  const loose = (world.colliders || []).filter((c) => {
    const x = (c.minX + c.maxX) / 2, z = (c.minZ + c.maxZ) / 2;
    return Math.abs(x) < 13 && Math.abs(z) > 15.5 && Math.abs(z) < 20 &&
      c.minY >= -0.15 && c.maxY >= 1.05;
  });
  return { submerged: submerged.length, loose: loose.length };
}

function spawnPartitions(world) {
  const result = {};
  for (const side of [-1, 1]) {
    const z = side * 15;
    const walls = (world.colliders || []).filter((c) => c.minZ <= z && c.maxZ >= z &&
      c.minY <= 0.05 && c.maxY >= 3 && c.maxX > -17.6 && c.minX < 17.6)
      .map((c) => [Math.max(-17.5, c.minX), Math.min(17.5, c.maxX)])
      .filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const span of walls) {
      const last = merged.at(-1);
      if (last && span[0] <= last[1] + 0.02) last[1] = Math.max(last[1], span[1]);
      else merged.push([...span]);
    }
    const gaps = [];
    let cursor = -17.5;
    for (const [a, b] of merged) { if (a > cursor) gaps.push(a - cursor); cursor = Math.max(cursor, b); }
    if (cursor < 17.5) gaps.push(17.5 - cursor);
    result[side < 0 ? 'south' : 'north'] = {
      wallSegments: merged.length,
      portalWidths: gaps.filter((w) => w > 0.5).map((w) => +w.toFixed(2)),
    };
  }
  return result;
}

function sound(world) {
  const cfg = world.sound;
  const loops = (cfg?.loops || []).map((x) => String(x.path || x.src || ''));
  const fabPiscina = FAB_SOURCE.match(/piscina_treta:\s*\{[^\n]+/i)?.[0] || '';
  return {
    indoor: cfg?.bioma === 'indoor',
    piscina: loops.some((x) => /piscina|water/i.test(x)),
    hum: loops.some((x) => /hum/i.test(x)),
    synth: /indoor-hum/i.test(fabPiscina),
    splash: /Water_Splash/i.test(fabPiscina),
  };
}

function evaluate(game) {
  const world = game.world;
  const corridors = { west: corridor(world, -1), east: corridor(world, 1) };
  const routeFamilies = 1 + Object.values(corridors).filter((c) => c.connected).length;
  const routes = separatedRoutes(world);
  const teamRoutes = teamSeparatedRoutes(world);
  const hall = clearHall(world);
  const partitions = spawnPartitions(world);
  const partitionsOk = Object.values(partitions).every((p) => p.wallSegments >= 4 &&
    p.portalWidths.length === 3 && p.portalWidths.every((w) => w >= 2.6));
  const spawnShape = JSON.stringify(Object.fromEntries(Object.entries(world.spawns || {}).map(([team, ss]) =>
    [team, ss.map((s) => [s.x, s.z])]))) === JSON.stringify({ E: [[-9, -21], [-3, -21], [3, -21], [9, -21]], B: [[-9, 21], [-3, 21], [3, 21], [9, 21]] });
  const flagShape = JSON.stringify((world.ctfPoints || []).map((p) => [p.id, p.x, p.z])) ===
    JSON.stringify([['E', 0, -13], ['MID', 12, 0], ['B', 0, 14]]);
  const audio = sound(world);
  const verdicts = {
    PIS1: world.bounds?.minX <= -20.5 && world.bounds?.maxX >= 20.5 &&
      Object.values(corridors).every((c) => c.nodes >= 6 && c.south > 0 && c.north > 0 && c.connected) && routeFamilies >= 3,
    PIS2: hall.submerged === 0 && hall.loose === 0,
    PIS3: partitionsOk,
    PIS4: spawnShape && flagShape && routes >= 2,
    PIS6: audio.indoor && audio.piscina && audio.hum && audio.synth && audio.splash,
  };
  return { verdicts, measurements: { corridors, routeFamilies, separatedRoutes: routes, teamSeparatedRoutes: teamRoutes, hall, partitions, sound: audio } };
}

function applyMutant(game, name) {
  const world = game.world;
  const corridorNodes = (world.waypoints?.nodes || []).filter((n) => Math.abs(n.x) > CORRIDOR_X);
  if (name === 'sem-corredor') {
    const east = corridorNodes.filter((n) => n.x > 0); for (const n of east) n.x = 0; return east.length > 0;
  }
  if (name === 'boca-unica') {
    const north = corridorNodes.filter((n) => n.x > 0 && n.z >= 7); for (const n of north) n.x = 0; return north.length > 0;
  }
  if (name === 'cobertura-submersa') {
    world.colliders.push({ minX: -2, maxX: 2, minY: -1.5, maxY: -0.5, minZ: -0.3, maxZ: 0.3 }); return true;
  }
  if (name === 'ilha-solta') {
    world.colliders.push({ minX: -1.4, maxX: 1.4, minY: 0, maxY: 2, minZ: 17, maxZ: 18 }); return true;
  }
  if (name === 'sem-anteparo-spawn') {
    const before = world.colliders.length;
    world.colliders = world.colliders.filter((c) => !([15, -15].some((z) => c.minZ <= z && c.maxZ >= z) && c.maxY >= 3 && c.minY <= 0.05));
    return world.colliders.length < before;
  }
  if (name === 'porta-estreita') {
    world.colliders.push({ minX: -1.1, maxX: 1.1, minY: 0, maxY: 4, minZ: 14.7, maxZ: 15.3 }); return true;
  }
  if (name === 'spawn-deslocado') { world.spawns.E[0].x += 1; return true; }
  if (name === 'sem-ambiencia') { const applied = Boolean(world.sound); world.sound = null; return applied; }
  throw new Error(`mutante desconhecido: ${name}`);
}

function changes(before, after) {
  return Object.keys(before).filter((key) => before[key] !== after[key]);
}

function printNormal(result) {
  for (const [key, ok] of Object.entries(result.verdicts)) console.log(`${ok ? 'PASSA' : 'FALHA'} ${key}`);
  console.log(JSON.stringify(result.measurements));
  return Object.values(result.verdicts).every(Boolean) ? 0 : 1;
}

function runMutant(name) {
  const game = fresh();
  const before = evaluate(game);
  const applied = applyMutant(game, name);
  const after = evaluate(game);
  const target = targets[name];
  const changed = changes(before.verdicts, after.verdicts);
  const bitten = applied && before.verdicts[target] && !after.verdicts[target] && changed.length === 1 && changed[0] === target;
  const inconclusive = !before.verdicts[target];
  console.log(JSON.stringify({ mutant: name, target, applied, before: before.verdicts[target], after: after.verdicts[target], changed,
    result: bitten ? 'MORDIDO' : inconclusive ? 'INCONCLUSIVO' : 'FALHA_DO_MUTANTE' }));
  return bitten ? 0 : inconclusive ? 2 : 1;
}

const one = process.argv.find((x) => x.startsWith('--mutante='))?.split('=')[1];
if (one) process.exitCode = runMutant(one);
else if (process.argv.includes('--mutantes')) {
  let rc = 0;
  for (const name of Object.keys(targets)) rc = Math.max(rc, runMutant(name));
  process.exitCode = rc;
} else process.exitCode = printNormal(evaluate(fresh()));
