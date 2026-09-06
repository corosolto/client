import { THREE, initTextures, bootGame } from './harness.mjs';

const game = bootGame('quebrada', { textures: initTextures(), seed: 12345, bots: 4 });
const roles = new Map();
game.world.root.traverse((object) => {
  const role = object.userData.campinhoRole;
  if (!role) return;
  const list = roles.get(role) || [];
  list.push(object);
  roles.set(role, list);
});

const expected = new Map([['gate-cover', 2], ['sideline-cover', 11], ['sideline-backrest', 2], ['scoreboard', 1], ['score-mark', 9]]);
const failures = [];
const mutant = process.argv.find((arg) => arg.startsWith('--mutante='))?.split('=')[1];
const covers = [...roles.get('gate-cover'), ...roles.get('sideline-cover'), ...(roles.get('sideline-backrest') || [])];
if (mutant && !['invisivel', 'sem-bala', 'sem-rotacao', 'sem-encosto', 'placar-vazio', 'rota-obstruida', 'spawn-obstruido'].includes(mutant)) throw new Error(`Mutante desconhecido: ${mutant}`);
if (mutant === 'invisivel') covers[0].visible = false;
if (mutant === 'placar-vazio') roles.get('score-mark')[0].visible = false;
if (mutant === 'sem-encosto') {
  const backrest = roles.get('sideline-backrest')[0];
  const index = game.world.occluders.indexOf(backrest);
  if (index < 0) throw new Error('Mutação não aplicou: encosto já sem bala');
  game.world.occluders.splice(index, 1);
}
if (mutant === 'sem-bala') {
  const index = game.world.occluders.indexOf(covers[0]);
  if (index < 0) throw new Error('Mutação não aplicou: cobertura já sem bala');
  game.world.occluders.splice(index, 1);
}
for (const [role, count] of expected) {
  const entries = roles.get(role) || [];
  if (entries.length !== count) failures.push(`${role}: ${entries.length} (esperado ${count})`);
  for (const object of entries) {
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) failures.push(`${role}: geometria vazia`);
    if (!object.visible || object.material.visible === false) failures.push(`${role}: invisível`);
  }
}
// Compara o corpo real com a face desenhada; tolerância de 1 mm é só erro numérico.
let maxPhantomPush = 0;
let penetrations = 0;
for (const object of covers) {
  const role = object.userData.campinhoRole;
  if (!game.world.occluders.includes(object)) failures.push(`${role}: não bloqueia bala`);
  const collider = game.world.colliders.find((c) => Math.abs((c.minX + c.maxX) / 2 - object.position.x) < 1e-3
    && Math.abs((c.minZ + c.maxZ) / 2 - object.position.z) < 1e-3 && Math.abs(c.maxY - (object.position.y + object.geometry.parameters.height / 2)) < 1e-3);
  if (!collider) { failures.push(`${role}: sem colisor`); continue; }
  if (mutant === 'sem-rotacao' && role === 'gate-cover') {
    if (!collider.ry) throw new Error('Mutação não aplicou: mureta já sem OBB');
    collider.ry = 0;
    Object.assign(collider, { minX: collider.cx - collider.hx, maxX: collider.cx + collider.hx, minZ: collider.cz - collider.hz, maxZ: collider.cz + collider.hz });
  }
  const original = game.world.colliders;
  try {
    game.world.colliders = [collider];
    const { width, depth } = object.geometry.parameters;
    for (const side of [-1, 1]) for (const x of [-width * .4, 0, width * .4]) {
      const start = object.localToWorld(new THREE.Vector3(x, -object.position.y, side * (depth / 2 + .381)));
      const bounds = game.world.bounds;
      if (start.x < bounds.minX + .38 || start.x > bounds.maxX - .38 || start.z < bounds.minZ + .38 || start.z > bounds.maxZ - .38) continue;
      const resolved = start.clone(); game._collide(resolved, .38);
      maxPhantomPush = Math.max(maxPhantomPush, resolved.distanceTo(start));
      const inside = object.localToWorld(new THREE.Vector3(x, -object.position.y, side * (depth / 2 + .33)));
      const contact = inside.clone(); game._collide(contact, .38);
      if (contact.distanceTo(inside) < .05 - 1e-3) penetrations++;
    }
  } finally { game.world.colliders = original; }
}
if (maxPhantomPush > 1e-3) failures.push(`colisão fora da face visível: ${maxPhantomPush.toFixed(4)} m`);
if (penetrations) failures.push(`corpo penetra a cobertura: ${penetrations} amostras`);
game.world.root.updateMatrixWorld(true);
for (const object of roles.get('sideline-backrest') || []) {
  for (const side of [-1, 1]) {
    const ray = new THREE.Raycaster(new THREE.Vector3(object.position.x, .8, object.position.z + side), new THREE.Vector3(0, 0, -side), 0, 2);
    const visible = ray.intersectObject(object, false)[0];
    const solid = ray.intersectObjects(game.world.occluders, false).find((hit) => hit.object === object);
    if (!visible || !solid || Math.abs(visible.distance - solid.distance) > 1e-3) failures.push(`encosto atravessável por bala em x=${object.position.x}`);
  }
}
const { nodes, adj } = game.world.waypoints;
if (!nodes.length || nodes.length !== adj.length) throw new Error('Grafo ausente/incompleto');
if (mutant === 'rota-obstruida' || mutant === 'spawn-obstruido') {
  const a = nodes[0], b = nodes[adj[0][0]];
  if (!b) throw new Error('Mutação não aplicou: nó inicial sem rota');
  const point = mutant === 'spawn-obstruido' ? game.world.spawns.B[0] : { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
  game.world.colliders.push({ minX: point.x - .2, maxX: point.x + .2, minZ: point.z - .2, maxZ: point.z + .2, minY: 0, maxY: 2 });
}
let blockedNodes = 0, blockedEdges = 0, edgeCount = 0;
const occupied = (point) => {
  const start = new THREE.Vector3(point.x, point.y || 0, point.z), resolved = start.clone();
  game._collide(resolved, .38);
  return resolved.distanceTo(start) > 1e-3;
};
for (const node of nodes) if (occupied(node)) blockedNodes++;
const spawns = Object.values(game.world.spawns).flat();
if (spawns.length !== 8) failures.push(`spawns ausentes: ${spawns.length}/8`);
for (const spawn of spawns) if (occupied(spawn)) failures.push('spawn em sólido');
for (let a = 0; a < nodes.length; a++) for (const b of adj[a]) {
  if (b <= a) continue;
  edgeCount++;
  const A = nodes[a], B = nodes[b], steps = Math.ceil(Math.hypot(B.x - A.x, B.z - A.z) / (.38 / 2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (occupied({ x: A.x + (B.x - A.x) * t, z: A.z + (B.z - A.z) * t })) { blockedEdges++; break; }
  }
}
const visited = new Set([0]), queue = [0];
for (const a of queue) for (const b of adj[a]) if (!visited.has(b)) { visited.add(b); queue.push(b); }
if (visited.size !== nodes.length) failures.push(`grafo desconexo: ${visited.size}/${nodes.length}`);
if (blockedNodes || blockedEdges) failures.push(`navegação em sólido: ${blockedNodes} nós, ${blockedEdges} arestas`);
if (failures.length) throw new Error(`CAMPINHO_RELEASE falhou: ${failures.join('; ')}`);
console.log(`Navegação real: ${nodes.length} nós, ${edgeCount} arestas, oito spawns livres, grafo conexo`);
console.log(`CAMPINHO_RELEASE ok · gate-cover=${roles.get('gate-cover').length} · sideline-cover=${roles.get('sideline-cover').length} · scoreboard=${roles.get('scoreboard').length} · colisão fantasma=${maxPhantomPush.toFixed(4)} m · encostos sólidos`);
