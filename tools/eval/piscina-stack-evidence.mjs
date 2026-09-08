/* Evidência espacial da Piscina reempilhada sobre o degrau #548.
   Mede o grafo com Dijkstra próprio e valida cada segmento com a cápsula usada
   pelo jogo (`Game._collide`, raio 0,38 m). Não substitui captura nem playtest. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { THREE, initTextures, bootGame } from './harness.mjs';

const out = process.argv.find((arg) => arg.startsWith('--out='))?.slice(6);
const game = bootGame('piscina_treta', { textures: initTextures(), ctf: true, seed: 12345 });
game.scene.updateMatrixWorld(true);
game.world.root.updateMatrixWorld(true);

const world = game.world;
const nodes = world.waypoints.nodes;
const adj = world.waypoints.adj;
const gh = world.groundHeightAt || (() => 0);

function dijkstra(from, to) {
  const dist = new Float64Array(nodes.length).fill(Infinity);
  const prev = new Int32Array(nodes.length).fill(-1);
  const seen = new Uint8Array(nodes.length);
  dist[from] = 0;
  for (;;) {
    let cur = -1;
    let best = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      if (!seen[i] && dist[i] < best) { cur = i; best = dist[i]; }
    }
    if (cur < 0 || cur === to) break;
    seen[cur] = 1;
    for (const next of adj[cur] || []) {
      const cost = Math.hypot(nodes[cur].x - nodes[next].x, nodes[cur].z - nodes[next].z);
      if (dist[cur] + cost < dist[next]) {
        dist[next] = dist[cur] + cost;
        prev[next] = cur;
      }
    }
  }
  if (!Number.isFinite(dist[to])) return null;
  const path = [to];
  for (let cur = prev[to]; cur >= 0; cur = prev[cur]) path.unshift(cur);
  return { path, meters: dist[to] };
}

function via(from, waypoint, to) {
  const a = dijkstra(from, waypoint);
  const b = dijkstra(waypoint, to);
  if (!a || !b) return null;
  return { path: a.path.concat(b.path.slice(1)), meters: a.meters + b.meters };
}

function capsule(path) {
  let samples = 0;
  let collisions = 0;
  let maxPush = 0;
  let maxStep = 0;
  const unreachable = [];
  let previousY = gh(nodes[path[0]].x, nodes[path[0]].z);
  for (let i = 1; i < path.length; i++) {
    const a = nodes[path[i - 1]], b = nodes[path[i]];
    // Mesma sonda do runtime: raio 0,38 m, passo 0,30 m e tolerância de chegada
    // de 1,20 m (`Game._walkReach`). Contato com quina é informativo porque
    // `_collide` desliza a cápsula; só é defeito quando o hop não é alcançado.
    const walker = { pos: { x: a.x, y: gh(a.x, a.z), z: a.z } };
    if (!game._walkReach(walker, b, 1.2)) {
      unreachable.push({ from: path[i - 1], to: path[i] });
    }
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.max(1, Math.ceil(length / 0.1));
    for (let j = 1; j <= steps; j++) {
      const t = j / steps;
      const x = a.x + (b.x - a.x) * t;
      const z = a.z + (b.z - a.z) * t;
      const y = gh(x, z);
      maxStep = Math.max(maxStep, Math.abs(y - previousY));
      previousY = y;
      const p = new THREE.Vector3(x, y, z);
      game._collide(p, 0.38);
      const push = Math.hypot(p.x - x, p.z - z);
      if (push > 1e-3) collisions++;
      maxPush = Math.max(maxPush, push);
      samples++;
    }
  }
  return {
    samples,
    collisions,
    maxPush: +maxPush.toFixed(4),
    maxStep: +maxStep.toFixed(4),
    unreachable,
    pass: unreachable.length === 0 && maxStep <= 0.3,
  };
}

const nearest = (x, z) => world.nearestWaypoint(x, z);
const teamFrom = nearest(0, -21);
const teamTo = nearest(0, 21);
const central = via(teamFrom, nearest(0, -0.5), teamTo);
const service = via(teamFrom, nearest(-18.8, -0.8), teamTo);
const lookoutSouth = via(nearest(12.8, 0), nearest(12.8, 5.5), nearest(12.8, 11));

const routes = {
  central: { meters: +central.meters.toFixed(2), nodes: central.path.length, capsule: capsule(central.path) },
  service: { meters: +service.meters.toFixed(2), nodes: service.path.length, capsule: capsule(service.path) },
  lookout: { meters: +lookoutSouth.meters.toFixed(2), nodes: lookoutSouth.path.length, capsule: capsule(lookoutSouth.path) },
};

const matrix = [];
for (const [team, spawns] of Object.entries(world.spawns)) {
  for (let index = 0; index < spawns.length; index++) {
    const spawn = spawns[index];
    for (const flag of world.ctfPoints) {
      const route = dijkstra(nearest(spawn.x, spawn.z), nearest(flag.x, flag.z));
      const from = new THREE.Vector3(spawn.x, gh(spawn.x, spawn.z) + 1.62, spawn.z);
      const target = new THREE.Vector3(flag.x, gh(flag.x, flag.z) + 1.2, flag.z);
      const routeCapsule = route ? capsule(route.path) : null;
      matrix.push({
        team,
        spawn: index + 1,
        flag: flag.id,
        meters: route ? +route.meters.toFixed(2) : null,
        directLos: game._losClear(from, target),
        capsule: routeCapsule,
      });
    }
  }
}

const evidence = {
  map: 'piscina_treta',
  radius: 0.38,
  nodes: nodes.length,
  edges: adj.reduce((sum, row) => sum + row.length, 0),
  routes,
  centralShorterThanService: routes.central.meters < routes.service.meters,
  matrix,
};
evidence.pass = evidence.centralShorterThanService &&
  Object.values(routes).every((route) => route.capsule.pass) &&
  matrix.every((row) => row.meters !== null && row.capsule?.pass);

if (out) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(evidence, null, 2)}\n`);
}
console.log(JSON.stringify(evidence, null, 2));
if (!evidence.pass) process.exitCode = 1;
