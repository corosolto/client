import assert from 'node:assert/strict';
import { THREE, bootGame, initTextures } from './harness.mjs';
import { ESCADAO_HOME as HOME } from '../../public/js/map_escadao_home.js';

const game = bootGame('escadao', { textures: initTextures(), ctf: true, seed: 8012 });
const W = game.world;
const mutant = process.argv.find(arg => arg.startsWith('--mutante='))?.split('=')[1] || null;
if (mutant && !['rear-window-sealed', 'canto-aberto'].includes(mutant)) throw Error(`Mutante desconhecido: ${mutant}`);

if (mutant === 'rear-window-sealed') {
  const sealed = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.2, .28), new THREE.MeshBasicMaterial());
  sealed.position.set(7.175, 4.37, 18.375);
  W.root.add(sealed);
  W.occluders.push(sealed);
}

if (mutant === 'canto-aberto') {
  const before = W.occluders.length;
  W.occluders = W.occluders.filter(o => !(o.userData.escadaoHome && Math.abs(o.position.z-18.375)<.001));
  assert.ok(W.occluders.length < before, 'Mutante removeu fechamento traseiro');
}
W.root.updateMatrixWorld(true);
const ray = new THREE.Raycaster();
const clearAcross = (from, to) => {
  ray.set(from, to.clone().sub(from).normalize());
  ray.far = from.distanceTo(to);
  return ray.intersectObjects(W.occluders, true).length === 0;
};

const frontEye = new THREE.Vector3(6.15, 4.37, 15.5);
const rearEye = new THREE.Vector3(7.175, 4.37, 17.7);
for (const eye of [frontEye, rearEye]) {
  const feet = eye.clone(); feet.y = W.groundHeightAt(feet.x, feet.z);
  const resolved = feet.clone(); game._collide(resolved, .42);
  assert.ok(resolved.distanceTo(feet) < 1e-6, 'Posição de tiro deve caber dentro da casa, fora das paredes');
}
assert.ok(clearAcross(frontEye, frontEye.clone().add(new THREE.Vector3(0, 0, -1.4))),
  'Janela para a escada permanece uma abertura real de tiro');
assert.ok(clearAcross(rearEye, new THREE.Vector3(10.8, 1.5, 24)),
  'Janela voltada ao respawn é uma abertura real de tiro, não só vidro decorativo');

const visible = [];
W.root.traverseVisible(o => { if (o.isMesh && (Array.isArray(o.material) ? o.material.some(m => m.visible) : o.material.visible)) visible.push(o); });
assert.equal(ray.intersectObjects(visible, false).length, 0, 'Caixilho e decoração também deixam enxergar o alvo da janela');

const rearTarget = new THREE.Vector3(10.8, 0, 24), resolvedTarget = rearTarget.clone();
game._collide(resolvedTarget, .42);
assert.ok(resolvedTarget.distanceTo(rearTarget) < 1e-6, 'Alvo da rua também cabe no chão jogável');
assert.ok(clearAcross(new THREE.Vector3(10.8, 1.5, 24), rearEye), 'Quem avança pela rua pode revidar pela janela');
for (const x of [1.75, 3, 5]) for (const height of [3.2, 4.37, 5.4])
  assert.ok(!clearAcross(new THREE.Vector3(x, height, 19), new THREE.Vector3(x, height, 17.7)),
    'Fechamento traseiro contínuo fora da janela, do piso ao teto');

let positions = 0, spawnRays = 0;
for (let x = HOME.x0; x <= HOME.x1; x += .2) for (let z = HOME.z0; z <= HOME.z1; z += .2) {
  const feet = new THREE.Vector3(x, W.groundHeightAt(x,z), z), resolved = feet.clone();
  game._collide(resolved, .42);
  if (resolved.distanceTo(feet) > 1e-6) continue;
  positions++;
  for (const height of [1.05, 1.62]) for (const slot of Object.values(W.spawns).flat()) for (const targetHeight of [.5,1.05,1.62]) {
    const target = new THREE.Vector3(slot.x, W.groundHeightAt(slot.x,slot.z)+targetHeight, slot.z);
    assert.ok(!clearAcross(feet.clone().add(new THREE.Vector3(0,height,0)), target),
      `Casa não lê slot de nascimento: ${x},${z} -> ${slot.x},${slot.z}`);
    spawnRays++;
  }
}
assert.ok(positions > 0, 'Varredura precisa medir posições reais na casa');
console.log(`Casa: ${positions} posições, ${spawnRays} raios de spawn bloqueados`);

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
