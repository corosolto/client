/* O movimento real parou em três nós que LB1 pulava por estarem em sólidos.
   Evidência e reprodução: docs/maps/LAJES-VISUAL-GATE.md, seção de navegação. */
import fs from 'node:fs';
import { THREE, bootGame, initTextures } from './harness.mjs';

const game = bootGame('lajes', { textures: initTextures(), bots: 0, seed: 12345 });
const world = game.world, { nodes, adj } = world.waypoints;
const radius = .38, tolerance = 1e-3;
if (!nodes.length || nodes.length !== adj.length) throw new Error('grafo ausente/incompleto: não sei medir');
const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.split('=')[1] || '';
if (mutante && !['no-em-piscina','no-em-solido','no-isolado'].includes(mutante)) throw new Error(`mutante desconhecido: ${mutante}`);
if (mutante === 'no-isolado') {
  if (!adj[0].length) throw Error('MUTANTE NÃO APLICOU: nó já isolado');
  for (const neighbors of adj) { const i=neighbors.indexOf(0); if(i>=0)neighbors.splice(i,1); }
  adj[0].length=0;
}
if (mutante && mutante !== 'no-isolado') {
  const index = nodes.findIndex((n, i) => {
    if (!adj[i].length || Math.abs(n.y-world.design.roofHeight)>1e-3) return false;
    const p = new THREE.Vector3(n.x, n.y, n.z); game._collide(p, radius);
    return Math.hypot(p.x - n.x, p.z - n.z) <= tolerance;
  });
  if (index < 0) throw new Error('MUTANTE NÃO APLICOU: nenhum nó livre de laje');
  const obstacle=world.colliders.find(c=>Math.abs(c.minY-world.design.roofHeight)<1e-3 && c.maxY-c.minY>.3);
  if (!obstacle) throw new Error('MUTANTE NÃO APLICOU: sólido de laje ausente');
  Object.assign(nodes[index], {x:(obstacle.minX+obstacle.maxX)/2,y:world.design.roofHeight,z:(obstacle.minZ+obstacle.maxZ)/2});
}
const colliders = world.colliders, occupied = [], active = [];
const blockersById = new Map();
for (let i = 0; i < nodes.length; i++) {
  if (!adj[i].length) continue;
  active.push(i);
  const n = nodes[i], from = new THREE.Vector3(n.x, n.y, n.z), resolved = from.clone();
  game._collide(resolved, radius);
  const blockers = [];
  try {
    for (let j = 0; j < colliders.length; j++) {
      const c = colliders[j];
      if (n.y + 1.5 <= c.minY || n.y + .3 >= c.maxY
        || n.x + radius <= c.minX || n.x - radius >= c.maxX
        || n.z + radius <= c.minZ || n.z - radius >= c.maxZ) continue;
      world.colliders = [c];
      const probe = from.clone(); game._collide(probe, radius);
      const push = Math.hypot(probe.x - n.x, probe.z - n.z);
      if (push <= tolerance) continue;
      blockers.push({ collider: j, push, resolved: probe.toArray() });
      blockersById.set(j, { index: j, collider: { ...c }, nodes: [] });
    }
  } finally { world.colliders = colliders; }
  const displacement = Math.hypot(resolved.x - n.x, resolved.z - n.z);
  if (blockers.length || displacement > tolerance) occupied.push({ id: i, node: { ...n },
    degree: adj[i].length, neighbors: adj[i], displacement, resolved: resolved.toArray(), blockers });
}
const blockedEdges = [];
let edgeCount = 0;
for (let a = 0; a < nodes.length; a++) for (const b of adj[a]) {
  if (b <= a) continue;
  edgeCount++;
  const A = nodes[a], B = nodes[b], distance = Math.hypot(B.x-A.x,B.y-A.y,B.z-A.z);
  const steps = Math.max(1, Math.ceil(distance / (radius / 2)));
  for (let k = 0; k <= steps; k++) {
    const t = k / steps, p = new THREE.Vector3(A.x+(B.x-A.x)*t,A.y+(B.y-A.y)*t,A.z+(B.z-A.z)*t);
    const before = p.clone(); game._collide(p, radius);
    const push = Math.hypot(p.x-before.x,p.z-before.z);
    if (push <= tolerance) continue;
    blockedEdges.push({ a,b,sample:before.toArray(),resolved:p.toArray(),push }); break;
  }
}
world.root.updateMatrixWorld(true);
const meshes = [];
world.root.traverse((mesh) => {
  if (!mesh.isMesh) return;
  const b = new THREE.Box3().setFromObject(mesh);
  meshes.push({ geometry: mesh.geometry.type, name: mesh.name, parent: mesh.parent?.name,
    position: new THREE.Vector3().setFromMatrixPosition(mesh.matrixWorld).toArray(),
    tags: Object.keys(mesh.userData || {}), bounds: [b.min.x, b.max.x, b.min.y, b.max.y, b.min.z, b.max.z] });
});
for (const entry of blockersById.values()) {
  entry.nodes = occupied.filter((n) => n.blockers.some((b) => b.collider === entry.index)).map((n) => n.id);
  const c = entry.collider, bounds = [c.minX, c.maxX, c.minY, c.maxY, c.minZ, c.maxZ];
  entry.nearestMeshes = meshes.map((m) => ({ ...m,
    boundsDifference: m.bounds.reduce((sum, x, i) => sum + Math.abs(x - bounds[i]), 0) }))
    .sort((a, b) => a.boundsDifference - b.boundsDifference).slice(0, 2);
}
const connected=new Set([0]), queue=[0];
for(let head=0;head<queue.length;head++)for(const next of adj[queue[head]])if(!connected.has(next)){connected.add(next);queue.push(next);}
const spawnAnchors=Object.values(world.spawns).flat().map(s=>world.nearestWaypoint(s.x,s.z,game._spawnY(s.x,s.z)));
const connectivity=connected.size===nodes.length && spawnAnchors.length===8 && spawnAnchors.every(i=>connected.has(i));
const result = { radius, tolerance, totalNodes: nodes.length, activeNodes: active.length, connectedNodes:connected.size, spawnAnchors,
  occupiedCount: occupied.length, occupied, edgeCount, blockedEdges, blockers: [...blockersById.values()],
  valid: active.length > 0 && occupied.length === 0 && blockedEdges.length === 0 && connectivity };
console.log(`${active.length && !occupied.length ? '✓' : '✗'} LN1 nós ativos livres para corpo real: ${occupied.length}/${active.length} ocupados (${nodes.length} nós totais)`);
for (const n of occupied.slice(0, 20)) console.log(`  nó ${n.id} (${n.node.x.toFixed(3)},${n.node.y.toFixed(3)},${n.node.z.toFixed(3)}) grau ${n.degree} deslocamento ${n.displacement.toFixed(4)}m colisores ${n.blockers.map((b) => b.collider).join(',')}`);
console.log(`${blockedEdges.length ? '✗' : '✓'} LN2 arestas com corpo real incluindo pontas: ${blockedEdges.length}/${edgeCount} bloqueadas`);
console.log(`${connectivity?'✓':'✗'} LN3 grafo inteiro conectado aos oito spawns: ${connected.size}/${nodes.length} nós · ${spawnAnchors.length} vagas`);
const output = process.argv.find((a) => a.startsWith('--json='))?.slice(7);
if (output) fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
if (!result.valid) { console.error('LAJES-NAV-OCUPACAO FALHA: rota não pode apontar para corpo preso'); process.exitCode = 1; }
else if (mutante) { console.error(`MUTANTE ${mutante} sobreviveu`); process.exitCode = 1; }
else console.log('LAJES-NAV-OCUPACAO OK');
