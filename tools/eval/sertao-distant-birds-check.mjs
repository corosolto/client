import { existsSync, readFileSync } from 'node:fs';
import * as THREE from '../../public/vendor/three.module.js';
const path = new URL('../../public/js/map_sertao_distant_birds.js', import.meta.url);
if (!existsSync(path)) { console.error('SDB0 FALHA módulo de aves distantes ausente'); process.exit(1); }
// Procedência dos envelopes: docs/reports/SERTAO-AVES-DISTANTES.md.
const mutation = process.argv.find(arg => arg.startsWith('--mutante='))?.split('=')[1];
const mutations = {
  'sem-aves': ['group.name =', 'group.visible = false; group.name =', 'SDB1'],
  triangulos: ['const patch = polygon(', 'wing.scale(1, 1, .05); const patch = polygon(', 'SDB2'],
  'sombra-cara': ['mesh.castShadow = false;', 'mesh.castShadow = true;', 'SDB3'],
  'asas-paradas': ['bird.glide = .055 + Math.sin(elapsed * .7 + bird.phase) * .045;', 'bird.glide = .055;', 'SDB4'],
  'dentro-arena': ['x: -24, z: 88', 'x: 0, z: 0', 'SDB5'],
  'voo-baixo': ['y: 26, phase: .3', 'y: 2, phase: .3', 'SDB5'],
  'voo-rapido': ['elapsed * .045', 'elapsed * 1.8', 'SDB6'],
  'low-cheio': ['low ? 1 : 4', 'low ? 4 : 4', 'SDB7'],
  'por-frame': ['elapsed += dt;', 'elapsed += 1 / 60;', 'SDB8'],
};
let source = readFileSync(path, 'utf8').replace("from 'three'", `from '${new URL('../../public/vendor/three.module.js', import.meta.url)}'`);
if (mutation) {
  if (!mutations[mutation]) throw Error('Mutante desconhecido');
  const [before, after] = mutations[mutation];
  if (!source.includes(before)) throw Error('Mutante não aplicou');
  source = source.replace(before, after);
}
const { createSertaoDistantBirds } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const build = options => createSertaoDistantBirds(new THREE.Group(), options);
const full = build(), low = build({ low: true });
const checks = [];
const check = (id, ok, evidence) => checks.push({ id, ok, evidence });
const [bodies, wings] = full.group.children;
const matrixAt = (mesh, index) => { const m = new THREE.Matrix4(); mesh.getMatrixAt(index, m); return m; };
const drawn = () => full.birds.map((_, index) => new THREE.Vector3().setFromMatrixPosition(matrixAt(bodies, index)));
const localWings = () => Array.from({ length: wings.count }, (_, index) => matrixAt(wings, index).premultiply(matrixAt(bodies, Math.floor(index / 2)).invert()).elements[1]);
check('SDB1', full.group.visible && full.birds.length === 4 && bodies.count === 4 && wings.count === 8 && full.group.children.every(mesh => mesh.isInstancedMesh), { birds: full.birds.length, instances: [bodies.count, wings.count] });
for (const mesh of [bodies, wings]) mesh.geometry.computeBoundingBox();
const torsoSize = bodies.geometry.boundingBox.getSize(new THREE.Vector3());
const wingSize = wings.geometry.boundingBox.getSize(new THREE.Vector3());
const colors = wings.geometry.attributes.color;
let bright = 0, dark = 0;
for (let i = 0; i < colors.count; i++) { if (colors.getX(i) > .2) bright++; else dark++; }
check('SDB2', torsoSize.z > .5 && torsoSize.z < .8 && torsoSize.x < .25 && wingSize.x > .6 && wingSize.x < .8 && wingSize.z > .25 && wingSize.y > .015 && bright > 0 && dark > bright,
  { body: torsoSize.toArray(), wing: wingSize.toArray(), paleVertices: bright, darkVertices: dark });
const report = full.report();
check('SDB3', full.group.userData.nonCollider && report.meshes <= 2 && report.triangles < 800 && report.textures === 0 && full.group.children.every(mesh => mesh.userData.nonSolidSurface && !mesh.castShadow && !mesh.receiveShadow && mesh.material.transparent === false), report);
const firstWings = localWings(), firstPositions = drawn();
const amplitudes = firstWings.map(() => 0);
let localSafe = true, maximumSpeed = 0, previous = firstPositions;
const tracks = full.birds.map(() => []);
for (let step = 0; step < 21600; step++) {
  full.update(1 / 60);
  const points = drawn(), local = localWings();
  local.forEach((value, index) => { amplitudes[index] = Math.max(amplitudes[index], Math.abs(value - firstWings[index])); });
  points.forEach((p, index) => {
    localSafe &&= p.y >= 18 && p.y <= 27 && (Math.abs(p.x) >= 54 || Math.abs(p.z) >= 66);
    maximumSpeed = Math.max(maximumSpeed, p.distanceTo(previous[index]) * 60);
    tracks[index].push(p);
  });
  previous = points;
}
check('SDB4', amplitudes.every(value => value > .04 && value < .15), { drawnLocalWingDeltas: amplitudes });
check('SDB5', localSafe, { safeThroughout360Seconds: localSafe, envelope: 'y18..27; abs(x)>=54 or abs(z)>=66; margem20m da arena' });
const displacements = tracks.map((track, index) => Math.max(...track.map(p => p.distanceTo(firstPositions[index]))));
check('SDB6', maximumSpeed > .2 && maximumSpeed < 1.2 && displacements.every(value => value > 10), { maximumSpeed, displacements });
check('SDB7', low.birds.length === 1 && low.group.children[0].count === 1 && low.group.children[1].count === 2 && low.report().triangles < report.triangles, low.report());
const a = build(), b = build();
for (let i = 0; i < 120; i++) a.update(1 / 60);
for (let i = 0; i < 40; i++) b.update(1 / 20);
const delta = Math.max(...a.group.children.flatMap((mesh, index) => Array.from(mesh.instanceMatrix.array, (value, slot) => Math.abs(value - b.group.children[index].instanceMatrix.array[slot]))));
a.reset(); const fresh = build();
const resetDelta = Math.max(...a.group.children.flatMap((mesh, index) => Array.from(mesh.instanceMatrix.array, (value, slot) => Math.abs(value - fresh.group.children[index].instanceMatrix.array[slot]))));
const stable = Array.from(a.group.children[0].instanceMatrix.array);
a.update(NaN); a.update(-1);
const invalidIgnored = stable.every((value, index) => value === a.group.children[0].instanceMatrix.array[index]);
const parent = a.group.parent; let disposedGeometry = 0, disposedMaterial = 0;
a.group.children.forEach(mesh => mesh.geometry.addEventListener('dispose', () => disposedGeometry++));
a.group.children[0].material.addEventListener('dispose', () => disposedMaterial++);
a.dispose(); a.dispose(); a.update(1); a.reset();
check('SDB8', delta < 1e-6 && resetDelta === 0 && invalidIgnored && !parent.children.includes(a.group) && disposedGeometry === 2 && disposedMaterial === 1,
  { dtDelta: delta, resetDelta, invalidIgnored, disposedGeometry, disposedMaterial });
[full, low, b, fresh].forEach(instance => instance.dispose());
for (const row of checks) console.log(`${row.id} ${row.ok ? 'PASSA' : 'FALHA'} ${JSON.stringify(row.evidence)}`);
const failures = checks.filter(row => !row.ok).map(row => row.id);
if (mutation) {
  const exact = failures.length === 1 && failures[0] === mutations[mutation][2];
  console.log(`MUTANTE ${mutation} ${exact ? 'ISOLADO' : 'FALHOU'} observado=${failures.join(',')}`);
  process.exitCode = exact ? 0 : 1;
} else process.exitCode = failures.length ? 1 : 0;
