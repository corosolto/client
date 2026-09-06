/* Regressão do relato 06/09: mirante invisível por baixo e degraus ocos.
 * Raios partem do vale, fora da futura contenção, e usam os occluders do motor.
 * Node mede a massa estrutural procedural; GLBs/pixels exigem navegador separado. */
import assert from 'node:assert/strict';
import { THREE, bootGame, initTextures } from './harness.mjs';

const game = bootGame('escadao', { textures: initTextures(), ctf: true, seed: 8012 });
const world = game.world;
game.scene.updateMatrixWorld(true);
const mutation = process.argv.includes('--mutante=sem-massa');
if (mutation) {
  const removed = world.occluders.filter(m => m.userData.escadaoStructure);
  assert.ok(removed.length > 0, 'Mutante precisa remover massa realmente existente');
  world.occluders = world.occluders.filter(m => !m.userData.escadaoStructure);
}
const ray = new THREE.Raycaster();
const blocked = (from, to) => {
  const origin = new THREE.Vector3(...from), delta = new THREE.Vector3(...to).sub(origin);
  ray.set(origin, delta.clone().normalize()); ray.far = delta.length();
  return ray.intersectObjects(world.occluders, false).some(h => h.object.visible);
};
const top = world.groundHeightAt(0, -20);
const rays = [
  ['contenção leste', [9, 1.62, -3], [9, top + .88, -18]],
  ['contenção oeste', [-9, 1.62, -3], [-9, top + .88, -18]],
  ['massa inferior do primeiro lance', [-2.15, .10, 12], [2.15, .10, 12]],
  ['piso do mirante bloqueia tiro descendente', [0, top + 1, -20], [0, top - 1, -20]],
];
const misses = rays.filter(([, from, to]) => !blocked(from, to)).map(([name]) => name);
if (mutation) {
  assert.deepEqual(misses, rays.map(([name]) => name), 'Retirar massa deve reabrir todos os raios');
  console.log(`STRUCTURE PASS: mutante reabre ${rays.length} vazamentos`);
} else {
  assert.deepEqual(misses, [], `Pisos não podem deixar visão/tiros atravessarem: ${misses.join(', ')}`);
  // Inclinação pedida pelo dono: subida >35°, mantendo o deslocamento horizontal.
  const slope = (world.groundHeightAt(0, 11) - world.groundHeightAt(0, 13)) / 2;
  assert.ok(slope >= Math.tan(35 * Math.PI / 180) && slope < 1, `Inclinação inadequada: ${slope}`);
  const routes = [
    ['rua', [0, 26], [0, 18]],
    ['lance 1', [0, 14], [0, 10.52]],
    ['patamar 1', [.8, 10.52], [.8, 6.52]],
    ['lance 2', [.8, 6.52], [.8, 3.04]],
    ['patamar 2', [.8, 3.04], [.8, -1.96]],
    ['lance 3', [.8, -1.96], [.8, -5.7]],
    ['beco oeste', [-12, 14], [-12, 5.9]],
    ['beco leste', [12, 14], [12, 5.9]],
    ['flanco oeste 2', [-12, 5.32], [-12, 1.84]],
    ['flanco oeste 3', [-12, 1.84], [-12, -5.7]],
  ];
  for (const [name, a, b] of routes)
    assert.ok(game._retaAndavel(...a, ...b), `Fechamento bloqueou ${name}`);
  console.log(`STRUCTURE PASS: ${rays.length} raios fechados, ${routes.length} segmentos andáveis, inclinação ${(Math.atan(slope) * 180 / Math.PI).toFixed(1)}°`);
}
process.exit(0);
