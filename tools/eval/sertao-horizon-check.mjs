import { readFileSync } from 'node:fs';
import { THREE } from './harness.mjs';
import { sertaoLandscape } from '../../public/js/map_sertao_landscape.js';
import { createSertaoHorizon } from '../../public/js/map_sertao_horizon.js';

// GLB local real: descompacta geometria, sem simular seu desenho nem decodificar imagens.
const bytes = readFileSync(new URL('../../public/models/props/sertao_juazeiro.glb', import.meta.url));
const jsonLength = bytes.readUInt32LE(12), gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
const binStart = 28 + jsonLength, primitive = gltf.meshes[0].primitives[0], geometry = new THREE.BufferGeometry();
function accessor(index) {
  const a = gltf.accessors[index], view = gltf.bufferViews[a.bufferView], components = { SCALAR: 1, VEC2: 2, VEC3: 3 }[a.type];
  const size = a.componentType === 5126 ? 4 : 2, data = a.componentType === 5126 ? new Float32Array(a.count * components) : new Uint16Array(a.count * components);
  for (let i = 0; i < a.count; i++) for (let j = 0; j < components; j++) {
    const offset = binStart + (view.byteOffset || 0) + (a.byteOffset || 0) + i * (view.byteStride || components * size) + j * size;
    data[i * components + j] = size === 4 ? bytes.readFloatLE(offset) : bytes.readUInt16LE(offset);
  }
  return new THREE.BufferAttribute(data, components);
}
for (const [key, name] of Object.entries({ POSITION: 'position', NORMAL: 'normal', TEXCOORD_0: 'uv' })) geometry.setAttribute(name, accessor(primitive.attributes[key]));
geometry.setIndex(accessor(primitive.indices)); geometry.computeBoundingBox();
const bark = new THREE.MeshStandardMaterial({ map: new THREE.Texture(), normalMap: new THREE.Texture(), roughnessMap: new THREE.Texture() });
const leafMaterial = new THREE.MeshStandardMaterial({ map: new THREE.Texture(), side: THREE.DoubleSide });
const template = new THREE.Group(); template.add(new THREE.Mesh(geometry, bark));
const scale = 4.6 / (geometry.boundingBox.max.y - geometry.boundingBox.min.y);
template.scale.setScalar(scale); template.position.y = -geometry.boundingBox.min.y * scale;
const mutation = process.argv.find(arg => arg.startsWith('--mutante='))?.split('=')[1];
const targets = { 'horizonte-vazio': 'HZ1', 'invade-rota': 'HZ2', 'sombra-cara': 'HZ3', 'geometria-cara': 'HZ3', 'low-cheio': 'HZ4', 'arvore-gigante': 'HZ5', 'flutuando': 'HZ6', 'sem-dispose': 'HZ7', 'folha-gigante': 'HZ8', 'folha-solta': 'HZ9', 'glb-ausente': 'HZ1', 'sem-dispose-instancias': 'HZ7', 'dispose-compartilhado': 'HZ7' };
if (mutation && !targets[mutation]) throw new Error(`Mutante desconhecido: ${mutation}`);
const scene = new THREE.Group(); sertaoLandscape(scene, new THREE.MeshStandardMaterial());
const options = { heroTemplate: template, leafMaterial }, full = createSertaoHorizon(scene, options);
const low = createSertaoHorizon(scene, { ...options, low: mutation !== 'low-cheio' });
const off = createSertaoHorizon(scene, { enabled: false }), same = createSertaoHorizon(scene, options);
const missing = createSertaoHorizon(scene, { ...options, heroTemplate: null });
const meshes = full.group.children, trees = full.group.getObjectByName('sertao-fundo-juazeiros-glb'), leaves = full.group.getObjectByName('sertao-fundo-copas'), shrubs = full.group.getObjectByName('sertao-fundo-arbustos');
const matrix = new THREE.Matrix4(), checks = [], put = (id, ok, evidence) => checks.push({ id, ok, evidence });
const measured = () => meshes.reduce((sum, mesh) => sum + (mesh.geometry.index?.count || mesh.geometry.attributes.position.count) / 3 * mesh.count, 0);
function transformHero(index, transform) {
  trees.getMatrixAt(index, matrix); trees.setMatrixAt(index, transform.clone().multiply(matrix));
  full.leafOwners.forEach((owner, i) => { if (owner === index) { leaves.getMatrixAt(i, matrix); leaves.setMatrixAt(i, transform.clone().multiply(matrix)); } });
}
if (mutation === 'horizonte-vazio') full.group.visible = false;
const observed = mutation === 'glb-ausente' ? missing : full;
put('HZ1', observed.group.visible && observed.report().heroTrees === 6 && observed.report().missingHeroes === 0 && trees.geometry === geometry && trees.material === bark && geometry.index.count / 3 === 5023 && meshes.every(mesh => mesh.isInstancedMesh), { ...observed.report(), sourceTriangles: geometry.index.count / 3 });
if (mutation === 'invade-rota') transformHero(0, new THREE.Matrix4().makeTranslation(43, 0, 26));
const forbidden = new THREE.Box3(new THREE.Vector3(-39, -100, -51), new THREE.Vector3(39, 100, 51)), box = new THREE.Box3();
let incursions = 0;
for (const mesh of meshes) { mesh.geometry.computeBoundingBox(); for (let i = 0; i < mesh.count; i++) { mesh.getMatrixAt(i, matrix); box.copy(mesh.geometry.boundingBox).applyMatrix4(matrix); if (box.intersectsBox(forbidden)) incursions++; } }
put('HZ2', incursions === 0, { incursions, protectedRectangle: 'arena 68x92 m + margem 5 m' });
if (mutation === 'sombra-cara') trees.castShadow = true;
if (mutation === 'geometria-cara') { const extra = trees.clone(); extra.count = 6; full.group.add(extra); }
put('HZ3', meshes.length <= 3 && measured() <= 48000 && meshes.every(mesh => !mesh.castShadow && !mesh.receiveShadow && mesh.userData.nonSolidSurface) && leaves.material === leafMaterial && full.report().newTextures === 0, { calls: meshes.length, triangles: measured(), newTextures: full.report().newTextures });
put('HZ4', low.report().heroTrees === 3 && low.report().triangles < 46230 * .6 && off.group.children.length === 0, { low: low.report(), disabled: off.group.children.length });
if (mutation === 'arvore-gigante') { const site = full.sites.filter(s => s.kind === 'glb')[3]; transformHero(3, new THREE.Matrix4().makeTranslation(site.x, site.y, site.z).multiply(new THREE.Matrix4().makeScale(2.2, 2.2, 2.2)).multiply(new THREE.Matrix4().makeTranslation(-site.x, -site.y, -site.z))); }
const heights = [];
for (let i = 0; i < trees.count; i++) { trees.getMatrixAt(i, matrix); box.copy(geometry.boundingBox).applyMatrix4(matrix); heights.push(box.max.y - box.min.y); }
put('HZ5', Math.min(...heights) >= 4.59 && Math.max(...heights) <= 6.01 && Math.max(...heights) - Math.min(...heights) > 1, { actualTreeHeightsMetres: heights });
if (mutation === 'flutuando') transformHero(0, new THREE.Matrix4().makeTranslation(0, 2, 0));
scene.updateMatrixWorld(true);
const terrain = scene.getObjectByName('sertao-horizonte'), ray = new THREE.Raycaster(), rootGaps = [];
for (const site of full.sites) {
  let p;
  if (site.kind === 'glb') { trees.getMatrixAt(site.instance, matrix); box.copy(geometry.boundingBox).applyMatrix4(matrix); p = new THREE.Vector3(matrix.elements[12], box.min.y, matrix.elements[14]); }
  else { shrubs.getMatrixAt(site.instance, matrix); p = new THREE.Vector3(0, -.5, 0).applyMatrix4(matrix); }
  ray.set(new THREE.Vector3(p.x, 100, p.z), new THREE.Vector3(0, -1, 0)); const hit = ray.intersectObject(terrain)[0]; rootGaps.push(hit ? Math.abs(p.y - hit.point.y) : Infinity);
}
put('HZ6', Math.max(...rootGaps) < .02, { maximumRootGapMetres: Math.max(...rootGaps) });
const signature = value => JSON.stringify(value.group.children.map(mesh => Array.from(mesh.instanceMatrix.array)));
const duplicate = createSertaoHorizon(scene, options), deterministic = signature(same) === signature(duplicate);
let ownedDisposed = 0, sharedDisposed = 0, instancesDisposed = 0;
same.group.children.forEach(mesh => mesh.addEventListener('dispose', () => instancesDisposed++));
for (const resource of [same.group.getObjectByName('sertao-fundo-copas').geometry, same.group.getObjectByName('sertao-fundo-arbustos').geometry, same.group.getObjectByName('sertao-fundo-arbustos').material]) resource.addEventListener('dispose', () => ownedDisposed++);
for (const resource of [geometry, bark, leafMaterial, bark.map, bark.normalMap, bark.roughnessMap, leafMaterial.map]) resource.addEventListener('dispose', () => sharedDisposed++);
if (mutation === 'sem-dispose') same.dispose = () => {};
if (mutation === 'sem-dispose-instancias') same.group.children.forEach(mesh => { mesh.dispose = () => {}; });
if (mutation === 'dispose-compartilhado') { const dispose = same.dispose; same.dispose = () => { dispose(); geometry.dispose(); }; }
same.dispose(); same.dispose();
put('HZ7', deterministic && !same.group.parent && ownedDisposed === 3 && sharedDisposed === 0 && instancesDisposed === 3, { deterministic, detached: !same.group.parent, ownedDisposed, sharedDisposed, instancesDisposed });
if (mutation === 'folha-gigante') { leaves.getMatrixAt(leaves.count - 1, matrix); const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); matrix.decompose(p, q, s); matrix.compose(p, q, s.multiplyScalar(10)); leaves.setMatrixAt(leaves.count - 1, matrix); }
let maximumLeafEdge = 0;
const positions = leaves.geometry.attributes.position, indices = leaves.geometry.index;
for (let instance = 0; instance < leaves.count; instance++) {
  leaves.getMatrixAt(instance, matrix);
  for (let triangle = 0; triangle < (indices?.count || positions.count); triangle += 3) {
    const points = [0, 1, 2].map(offset => new THREE.Vector3().fromBufferAttribute(positions, indices ? indices.getX(triangle + offset) : triangle + offset).applyMatrix4(matrix));
    for (let edge = 0; edge < 3; edge++) maximumLeafEdge = Math.max(maximumLeafEdge, points[edge].distanceTo(points[(edge + 1) % 3]));
  }
}
put('HZ8', maximumLeafEdge < .5, { maximumLeafEdgeMetres: maximumLeafEdge });
if (mutation === 'folha-solta') { leaves.getMatrixAt(leaves.count - 1, matrix); matrix.elements[13] += 1; leaves.setMatrixAt(leaves.count - 1, matrix); }
let detachedLeaves = 0; const sourcePoints = geometry.attributes.position, vertex = new THREE.Vector3(), inverse = new THREE.Matrix4();
for (let i = 0; i < leaves.count; i++) {
  leaves.getMatrixAt(i, matrix); const point = new THREE.Vector3().setFromMatrixPosition(matrix); trees.getMatrixAt(full.leafOwners[i], inverse); point.applyMatrix4(inverse.invert());
  let nearest = Infinity;
  for (let j = 0; j < sourcePoints.count; j++) nearest = Math.min(nearest, vertex.fromBufferAttribute(sourcePoints, j).distanceToSquared(point));
  if (nearest > 1e-10) detachedLeaves++;
}
put('HZ9', detachedLeaves === 0, { detachedLeaves, leafClusters: leaves.count, support: 'vértice real do GLB, tolerância 0.00001 unidades locais' });
for (const check of checks) console.log(`${check.id} ${check.ok ? 'PASSA' : 'FALHA'} ${JSON.stringify(check.evidence)}`);
const failed = checks.filter(check => !check.ok).map(check => check.id);
if (mutation) { const expected = [targets[mutation]].flat(); const exact = JSON.stringify(failed.sort()) === JSON.stringify(expected.sort()); console.log(`MUTANTE ${mutation}: ${exact ? 'ISOLADO' : 'FALHOU'} esperado=${expected.join(',')} observado=${failed.join(',')}`); process.exitCode = exact ? 0 : 1; }
else process.exitCode = failed.length ? 1 : 0;
