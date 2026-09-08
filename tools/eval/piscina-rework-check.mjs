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

const SEP_ROTA = 6;
const CORRIDOR_X = -17.2;
const targets = Object.freeze({
  'sem-corredor': 'PIS1',
  'boca-unica': 'PIS1',
  'muro-de-armarios': 'PIS2',
  'cobertura-submersa': 'PIS2',
  'posto-sem-colisao': 'PIS3',
  'posto-sem-contrajogo': 'PIS3',
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

function separatedRoutes(world) {
  const nodes = world.waypoints?.nodes || [];
  const adj = world.waypoints?.adj || [];
  if (!nodes.length || !adj.length || !world.nearestWaypoint) return 0;
  let worst = Infinity;
  for (const spawns of Object.values(world.spawns || {})) {
    for (const flag of world.ctfPoints || []) {
      const from = world.nearestWaypoint(spawns[0].x, spawns[0].z);
      const to = world.nearestWaypoint(flag.x, flag.z);
      const blocked = new Uint8Array(nodes.length);
      let count = 0;
      for (let attempt = 0; attempt < 4; attempt++) {
        const path = shortest(nodes, adj, from, to, blocked);
        if (!path) break;
        count++;
        const endMargin = SEP_ROTA + 3.4;
        for (let i = 0; i < nodes.length; i++) {
          if (i === from || i === to) continue;
          if (Math.hypot(nodes[i].x - nodes[from].x, nodes[i].z - nodes[from].z) <= endMargin) continue;
          if (Math.hypot(nodes[i].x - nodes[to].x, nodes[i].z - nodes[to].z) <= endMargin) continue;
          if (path.some((p) => Math.hypot(nodes[i].x - nodes[p].x, nodes[i].z - nodes[p].z) <= SEP_ROTA)) blocked[i] = 1;
        }
      }
      worst = Math.min(worst, count);
    }
  }
  return Number.isFinite(worst) ? worst : 0;
}

function corridor(world) {
  const nodes = world.waypoints?.nodes || [];
  const ids = nodes.map((n, i) => n.x < CORRIDOR_X ? i : -1).filter((i) => i >= 0);
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
    boundsMinX: world.bounds?.minX,
  };
}

function endDeckComponents(world, sign) {
  const boxes = (world.colliders || []).filter((c) => {
    const x = (c.minX + c.maxX) / 2, z = (c.minZ + c.maxZ) / 2;
    return Math.sign(z) === sign && Math.abs(z) >= 11.5 && Math.abs(z) <= 18.5 &&
      Math.abs(x) <= 12 && c.minY >= -0.15 && c.maxY >= 1.05;
  });
  const hit = (a, b) => a.minX <= b.maxX + 0.25 && a.maxX + 0.25 >= b.minX &&
    a.minZ <= b.maxZ + 0.25 && a.maxZ + 0.25 >= b.minZ;
  const unseen = new Set(boxes.map((_, i) => i));
  const out = [];
  while (unseen.size) {
    const first = unseen.values().next().value;
    unseen.delete(first);
    const group = [first];
    for (let q = 0; q < group.length; q++) {
      for (const i of [...unseen]) if (hit(boxes[group[q]], boxes[i])) { unseen.delete(i); group.push(i); }
    }
    const members = group.map((i) => boxes[i]);
    const minX = Math.min(...members.map((c) => c.minX));
    const maxX = Math.max(...members.map((c) => c.maxX));
    const minZ = Math.min(...members.map((c) => c.minZ));
    const maxZ = Math.max(...members.map((c) => c.maxZ));
    out.push({ count: members.length, span: +Math.max(maxX - minX, maxZ - minZ).toFixed(2) });
  }
  return out;
}

function elevated(game) {
  const world = game.world;
  const gh = world.groundHeightAt || (() => 0);
  let samples = 0, heightMax = 0;
  for (let x = 11; x <= 14.5; x += 0.25) for (let z = 3.5; z <= 7.5; z += 0.25) {
    const y = gh(x, z); heightMax = Math.max(heightMax, y);
    if (y >= 1.2 && y <= 1.6) samples++;
  }
  const y = gh(12.8, 5.5) + 1.62;
  const perch = new THREE.Vector3(12.8, y, 5.5);
  const responses = [new THREE.Vector3(-17, 1.62, 4), new THREE.Vector3(7, 1.62, -13)];
  const counters = responses.filter((p) => game._losClear(p, perch)).length;
  const visible = {};
  for (const [team, spawns] of Object.entries(world.spawns || {})) {
    visible[team] = spawns.filter((s) => game._losClear(perch, new THREE.Vector3(s.x, 1.62, s.z))).length;
  }
  return { samples, heightMax: +heightMax.toFixed(2), counters, visible };
}

function sound(world) {
  const cfg = world.sound;
  const loops = (cfg?.loops || []).map((x) => String(x.src || ''));
  return {
    indoor: cfg?.bioma === 'indoor',
    piscina: loops.some((x) => /piscina|water/i.test(x)),
    hum: loops.some((x) => /hum/i.test(x)),
    shots: (cfg?.shots || []).length,
  };
}

function evaluate(game) {
  const world = game.world;
  const c = corridor(world);
  const routes = separatedRoutes(world);
  const decks = { south: endDeckComponents(world, -1), north: endDeckComponents(world, 1) };
  const deckOk = Object.values(decks).every((parts) => parts.length >= 3 && parts.every((p) => p.span <= 2.8));
  const high = elevated(game);
  const spawnShape = JSON.stringify(Object.fromEntries(Object.entries(world.spawns || {}).map(([team, ss]) =>
    [team, ss.map((s) => [s.x, s.z])]))) === JSON.stringify({ E: [[-9, -21], [-3, -21], [3, -21], [9, -21]], B: [[-9, 21], [-3, 21], [3, 21], [9, 21]] });
  const flagShape = JSON.stringify((world.ctfPoints || []).map((p) => [p.id, p.x, p.z])) ===
    JSON.stringify([['E', 0, -13], ['MID', 12, 0], ['B', 0, 14]]);
  const audio = sound(world);
  const verdicts = {
    PIS1: c.boundsMinX <= -20.5 && c.nodes >= 4 && c.south > 0 && c.north > 0 && c.connected && routes >= 3,
    PIS2: deckOk,
    PIS3: high.samples >= 12 && high.counters >= 2 && high.visible.E <= 2 && high.visible.B <= 2 &&
      (high.visible.E === 0 || high.visible.B === 0),
    PIS4: spawnShape && flagShape && routes >= 2,
    PIS6: audio.indoor && audio.piscina && audio.hum && audio.shots > 0,
  };
  return { verdicts, measurements: { corridor: c, separatedRoutes: routes, decks, elevated: high, sound: audio } };
}

function applyMutant(game, name) {
  const world = game.world;
  const corridorNodes = (world.waypoints?.nodes || []).filter((n) => n.x < CORRIDOR_X);
  if (name === 'sem-corredor') { for (const n of corridorNodes) n.x = 0; return corridorNodes.length > 0; }
  if (name === 'boca-unica') {
    const north = corridorNodes.filter((n) => n.z >= 9); for (const n of north) n.x = 0; return north.length > 0;
  }
  if (name === 'muro-de-armarios') {
    world.colliders.push({ minX: -4, maxX: 4, minY: 0, maxY: 2.1, minZ: 12.7, maxZ: 13.3 });
    return true;
  }
  if (name === 'cobertura-submersa') {
    const boxes = world.colliders.filter((c) => Math.abs((c.minZ + c.maxZ) / 2) >= 11.5 &&
      Math.abs((c.minZ + c.maxZ) / 2) <= 18.5 && Math.abs((c.minX + c.maxX) / 2) <= 12 && c.minY >= -0.15 && c.maxY >= 1.05);
    for (const c of boxes) { c.minY -= 1.5; c.maxY -= 1.5; }
    return boxes.length > 0;
  }
  if (name === 'posto-sem-colisao') {
    const before = elevated(game); if (before.samples < 12) return false;
    const original = world.groundHeightAt || (() => 0);
    world.groundHeightAt = (x, z) => x >= 11 && x <= 14.5 && z >= 3.5 && z <= 7.5 ? 0 : original(x, z);
    return true;
  }
  if (name === 'posto-sem-contrajogo') {
    if (elevated(game).samples < 12) return false;
    for (const [x, z, ry] of [[-2.1, 4.5, 0], [9.9, -2.7, -0.45]]) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 4, 9), new THREE.MeshBasicMaterial());
      mesh.position.set(x, 2, z); mesh.rotation.y = ry; game.scene.add(mesh); world.occluders.push(mesh);
    }
    game.scene.updateMatrixWorld(true); return true;
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
