import fs from 'node:fs';
import path from 'node:path';
import { THREE, bootGame, initTextures } from './harness.mjs';

const output = path.resolve(process.argv[2] || 'artifacts/campo-morro-final/offline');
fs.mkdirSync(output, { recursive: true });
const game = bootGame('quebrada', { textures: initTextures(), bots: 0 });
const meshes = [];
game.world.root.updateMatrixWorld(true);
game.world.root.traverseVisible((mesh) => {
  if (!mesh.isMesh || Array.isArray(mesh.material) || !mesh.material.visible || mesh.material.transparent) return;
  const box = new THREE.Box3().setFromObject(mesh);
  if (box.max.z < 22 || box.min.z > 49 || box.max.x < -29 || box.min.x > 29) return;
  const geometry = mesh.geometry, positions = geometry.getAttribute('position');
  if (!positions) return;
  const vertices = [];
  for (let i = 0; i < positions.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
    vertices.push([v.x, -v.z, v.y]);
  }
  const indices = geometry.index ? Array.from(geometry.index.array) : Array.from({ length: positions.count }, (_, i) => i);
  const faces = [];
  for (let i = 0; i < indices.length; i += 3) faces.push(indices.slice(i, i + 3));
  meshes.push({ vertices, faces, color: mesh.material.color?.toArray() || [.5, .5, .5], role: mesh.userData.campinhoRole || mesh.name || 'world' });
});
fs.writeFileSync(path.join(output, 'scene.json'), JSON.stringify({
  limitation: 'Geometria procedural e cores lineares; sem GLBs assíncronos, texturas canvas, transparências, HUD ou pós-processamento do jogo.',
  meshes, spawns: game.world.spawns, flags: game.world.ctfPoints,
}));
console.log(`Offline: ${meshes.length} malhas em ${output}/scene.json`);
