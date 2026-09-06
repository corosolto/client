import assert from 'node:assert/strict';
import { THREE, bootGame, initTextures } from './harness.mjs';

const game = bootGame('escadao', { textures: initTextures(), ctf: true, seed: 8012 });
const W = game.world;
const abrigo = [];
W.root.traverse(object => { if (object.userData.escadaoMiranteAbrigo) abrigo.push(object); });
assert.ok(abrigo.length > 0, 'Mirante precisa de abrigo central acessível, não vazio sem disputa');

if (process.argv.includes('--mutante=saidas-seladas')) {
  for (const [x, z, w, d] of [[2.1, -21.5, .3, 1.2], [-2.1, -21.5, .3, 1.2]]) {
    const sealed = new THREE.Mesh(new THREE.BoxGeometry(w, 2.4, d), new THREE.MeshBasicMaterial());
    sealed.position.set(x, W.groundHeightAt(x, z) + 1.2, z);
    W.root.add(sealed); W.occluders.push(sealed);
    W.colliders.push({ minX: x-w/2, maxX: x+w/2, minY: W.groundHeightAt(x,z), maxY: W.groundHeightAt(x,z)+2.4, minZ: z-d/2, maxZ: z+d/2 });
  }
}

const source = W.nearestWaypoint(0, 26), interior = W.nearestWaypoint(0, -21.5);
const path = W.findPath(source, interior);
assert.ok(path.length > 1, 'Time da rua alcança o abrigo central do mirante');
for (let i = 1; i < path.length; i++) {
  const a = W.waypoints.nodes[path[i - 1]], b = W.waypoints.nodes[path[i]];
  assert.ok(game._retaAndavel(a.x, a.z, b.x, b.z, .42, .3), 'Grafo do abrigo contém apenas arestas caminháveis');
}
for (const [from, to] of [[[2.55,-21.5],[0,-21.5]],[[-2.55,-21.5],[0,-21.5]]])
  assert.ok(game._retaAndavel(...from, ...to, .38, .3), 'Abrigo mantém duas entradas independentes');

W.root.updateMatrixWorld(true);
const eye = new THREE.Vector3(0, W.groundHeightAt(0,-21.5) + 1.62, -20.05);
const target = new THREE.Vector3(0, W.groundHeightAt(0,-15) + 1.62, -15);
const ray = new THREE.Raycaster(eye, target.clone().sub(eye).normalize(), 0, eye.distanceTo(target));
assert.equal(ray.intersectObjects(W.occluders, true).length, 0, 'Janela do abrigo lê a descida central');

if (process.argv.includes('--mutante=saidas-seladas')) throw Error('Mutante selou as duas saídas, mas a régua permaneceu verde');
console.log(`ESCADAO MIRANTE ABRIGO PASS: ${path.length} nós até o interior, janela e duas entradas reais`);
