import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { registerHooks } from 'node:module';

const out = process.argv[2];
if (!out) throw Error('Uso: node tools/escadao-conflict-offline.mjs DIRETORIO [REF_GIT]');
const revision = process.argv[3];
const sourceFiles = ['public/js/map_escadao.js', 'public/js/map_escadao_home.js'];
const sourceText = new Map(sourceFiles.map(p => [p, revision
  ? execFileSync('git', ['show', `${revision}:${p}`], { encoding: 'utf8' }) : readFileSync(p, 'utf8')]));
if (revision) registerHooks({ load(url, context, next) {
  const path = sourceFiles.find(p => new URL(`../${p}`, import.meta.url).href === url);
  return path ? { format: 'module', source: sourceText.get(path), shortCircuit: true } : next(url, context);
} });
const { THREE, bootGame, initTextures } = await import('./eval/harness.mjs');
const game = bootGame('escadao', { textures: initTextures(), ctf: true, seed: 8012 });
game.world.root.updateMatrixWorld(true);
const meshes = [], v = new THREE.Vector3(), instance = new THREE.Matrix4();
game.world.root.traverseVisible(o => {
  if (!o.isMesh || o.userData.nonSolidSurface) return;
  const materials = Array.isArray(o.material) ? o.material : [o.material];
  if (materials.every(m => !m.visible || m.opacity < .1)) return;
  const g = o.geometry, p = g.attributes.position;
  for (let n = 0; n < (o.isInstancedMesh ? o.count : 1); n++) {
    const matrix = o.matrixWorld.clone();
    if (o.isInstancedMesh) { o.getMatrixAt(n, instance); matrix.multiply(instance); }
    const center = new THREE.Box3().setFromBufferAttribute(p).getCenter(new THREE.Vector3()).applyMatrix4(matrix);
    if (Math.abs(center.x) > 22 || Math.abs(center.z) > 42) continue;
    const vertices = [];
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(matrix); vertices.push([v.x, -v.z, v.y]); }
    const indices = g.index ? Array.from(g.index.array) : Array.from({ length: p.count }, (_, i) => i);
    const faces = [], colors = [];
    for (let i = 0; i < indices.length; i += 3) {
      const group = g.groups.find(q => i >= q.start && i < q.start + q.count);
      const m = Array.isArray(o.material) ? materials[group?.materialIndex || 0] : materials[0];
      if (!m || !m.visible) continue;
      faces.push(indices.slice(i, i + 3)); colors.push((m.color || new THREE.Color(.5,.5,.5)).toArray());
    }
    if (faces.length) meshes.push({ vertices, faces, colors });
  }
});
const sources = Object.fromEntries(sourceFiles.map(p =>
  [p, createHash('sha256').update(sourceText.get(p)).digest('hex')]));
mkdirSync(out, { recursive: true });
writeFileSync(`${out}/geometry.json`, JSON.stringify({ sources, limitation: 'Geometria procedural Node; sem GLBs, texturas, HUD ou renderer do jogo.', meshes }));
console.log(JSON.stringify({ out, meshes: meshes.length, sources }));
