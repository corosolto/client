import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { bootGame, initTextures } from './harness.mjs';

const game = bootGame('escadao', { textures: initTextures(), ctf: true, seed: 8012 });
const world = game.world, { nodes, adj } = world.waypoints;
const out = process.env.OUT || 'artifacts/escadao-visual/main-sync/graph';
mkdirSync(out, { recursive: true });
function measure() {
  const reachable = new Set([0]), queue = [0];
  for (const i of queue) for (const next of adj[i]) if (!reachable.has(next)) { reachable.add(next); queue.push(next); }
  const target = world.nearestWaypoint(-10, 38);
  const routes = Object.values(world.spawns).flat().map(spawn => {
    const from = world.nearestWaypoint(spawn.x, spawn.z), route = world.findPath(from, target);
    return { from, target, route, reaches: route.at(-1) === target };
  });
  return { nodes: nodes.length, reached: reachable.size, isolated: nodes.filter((_, i) => !reachable.has(i)), routes,
    passed: reachable.size === nodes.length && routes.every(r => r.reaches) };
}
const before = measure();
writeFileSync(`${out}/graph.json`, JSON.stringify(before, null, 2));
assert.ok(before.passed, 'Grafo precisa conectar todos os nós e a Deagle a todos os spawns');
if (process.argv.includes('--mutante=sem-conexao-rua')) {
  const removed = new Set(nodes.flatMap((n, i) => Math.abs(n.x + 8.5) < 1e-6 && n.z >= 26 && n.z <= 38 ? [i] : []));
  assert.ok(removed.size > 0, 'Mutação precisa remover conexão existente');
  for (let i = 0; i < adj.length; i++) adj[i] = removed.has(i) ? [] : adj[i].filter(j => !removed.has(j));
  const after = measure();
  writeFileSync(`${out}/mutation.json`, JSON.stringify({ removed: removed.size, after }, null, 2));
  assert.ok(!after.passed && after.routes.some(r => !r.reaches), 'Mutação deve isolar a Deagle');
  console.log('GRAPH PASS: mutação detectada na rota para a Deagle');
} else console.log(`GRAPH PASS: ${before.reached}/${before.nodes} nós, ${before.routes.length} rotas para Deagle`);
