import assert from 'node:assert/strict';
import { THREE, bootGame, initTextures } from './harness.mjs';

const game = bootGame('escadao', { textures: initTextures(), ctf: true, seed: 8012 });
const W = game.world;
const mutant = process.argv.find(arg => arg.startsWith('--mutante='))?.split('=')[1] || null;
if (mutant && mutant !== 'rear-window-sealed') throw Error(`Mutante desconhecido: ${mutant}`);

if (mutant === 'rear-window-sealed') {
  const sealed = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.2, .28), new THREE.MeshBasicMaterial());
  sealed.position.set(1.45, 4.37, 18.8);
  W.root.add(sealed);
  W.occluders.push(sealed);
}

W.root.updateMatrixWorld(true);
const ray = new THREE.Raycaster();
const clearAcross = (from, to) => {
  ray.set(from, to.clone().sub(from).normalize());
  ray.far = from.distanceTo(to);
  return ray.intersectObjects(W.occluders, true).length === 0;
};

const frontEye = new THREE.Vector3(6.15, 4.37, 14.15);
const rearEye = new THREE.Vector3(1.45, 4.37, 18.55);
assert.ok(clearAcross(frontEye, frontEye.clone().add(new THREE.Vector3(0, 0, -1.4))),
  'Janela para a escada permanece uma abertura real de tiro');
assert.ok(clearAcross(rearEye, rearEye.clone().add(new THREE.Vector3(0, 0, 1.4))),
  'Janela voltada ao respawn é uma abertura real de tiro, não só vidro decorativo');

const source = W.nearestWaypoint(0, 26);
const interior = W.nearestWaypoint(3.4, 16);
const path = W.findPath(source, interior);
assert.ok(path.length > 1, 'Bots alcançam a casa central a partir do respawn da rua');
for (let i = 1; i < path.length; i++) {
  const a = W.waypoints.nodes[path[i - 1]], b = W.waypoints.nodes[path[i]];
  assert.ok(game._retaAndavel(a.x, a.z, b.x, b.z, .42, .3), 'Cada aresta do abrigo central é caminhável');
}

if (mutant) throw Error('Mutante vedou a janela traseira, mas a cláusula permaneceu verde');
console.log(`ESCADAO CONFLICT HOME PASS: janelas opostas e rota bot ${path.length} nós`);
