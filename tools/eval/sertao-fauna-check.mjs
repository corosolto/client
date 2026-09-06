import { existsSync } from 'node:fs';
import { THREE, MAPS, initTextures } from './harness.mjs';

// Limiares e referência dos orçamentos: docs/reports/SERTAO-FAUNA-VOO.md.
const path = new URL('../../public/js/map_sertao_fauna.js', import.meta.url);
if (!existsSync(path)) { console.error('SF0 FALHA: módulo da fauna aérea ausente'); process.exit(1); }
const { createSertaoFauna } = await import(path);
const mutation = process.argv.find(arg => arg.startsWith('--mutante='))?.split('=')[1];
const targets = { 'asas-congeladas': 'SF2', 'voo-no-chao': 'SF3', 'sombra-cara': 'SF4', 'low-cheio': 'SF5', 'relogio-por-frame': 'SF6', 'sem-fauna': 'SF1', 'mundo-parado': 'SF7' };
if (mutation && !targets[mutation]) throw new Error(`Mutante desconhecido: ${mutation}`);
const build = options => createSertaoFauna(new THREE.Group(), options);
const full = build({ enabled: true });
const low = build({ low: mutation !== 'low-cheio', enabled: true });
const off = build({ enabled: false });
const checks = [];
const put = (id, ok, evidence) => checks.push({ id, ok, evidence });
if (mutation === 'sem-fauna') full.group.visible = false;
put('SF1', full.birds.length === 3 && full.group.visible && full.group.children.every(mesh => mesh.isInstancedMesh), { birds: full.birds.length, batches: full.group.children.length });
const frozenWings = new Map();
for (const mesh of full.group.children.filter(mesh => mesh.name.includes('asa'))) {
  const matrices = [];
  for (let index = 0; index < mesh.count; index++) {
    const body = new THREE.Matrix4(), local = new THREE.Matrix4();
    full.group.children.find(part => part.name === 'corpo').getMatrixAt(Math.floor(index / 2), body);
    mesh.getMatrixAt(index, local); matrices.push(local.premultiply(body.invert()));
  }
  frozenWings.set(mesh, matrices);
}
const wingSamples = [];
const trackSamples = [];
for (let step = 0; step < 5400; step++) {
  full.update(1 / 60);
  if (mutation === 'asas-congeladas') {
    for (const [mesh, matrices] of frozenWings) {
      for (let index = 0; index < mesh.count; index++) {
        const body = new THREE.Matrix4();
        full.group.children.find(part => part.name === 'corpo').getMatrixAt(Math.floor(index / 2), body);
        mesh.setMatrixAt(index, body.multiply(matrices[index]));
      }
    }
  }
  if (mutation === 'voo-no-chao') {
    const mesh = full.group.children.find(mesh => mesh.name === 'corpo');
    for (let index = 0; index < mesh.count; index++) { const m = new THREE.Matrix4(); mesh.getMatrixAt(index, m); m.elements[13] = 1; mesh.setMatrixAt(index, m); }
  }
  const bird = full.birds[0];
  const wing = full.group.children.find(mesh => mesh.name === 'asa-primaria');
  const matrix = new THREE.Matrix4(); wing.getMatrixAt(0, matrix);
  const torso = full.group.children.find(mesh => mesh.name === 'corpo');
  const bodyMatrix = new THREE.Matrix4(); torso.getMatrixAt(0, bodyMatrix);
  matrix.premultiply(bodyMatrix.invert());
  const allWings = Array.from({ length: wing.count }, (_, index) => {
    const body = new THREE.Matrix4(), pose = new THREE.Matrix4();
    torso.getMatrixAt(Math.floor(index / 2), body); wing.getMatrixAt(index, pose);
    return pose.premultiply(body.invert()).elements[1];
  });
  wingSamples.push({ flap: bird.flap, matrix: matrix.toArray(), allWings });
  trackSamples.push(full.birds.map((bird, index) => { const m = new THREE.Matrix4(); torso.getMatrixAt(index, m); return new THREE.Vector3().setFromMatrixPosition(m); }));
}
const wingDelta = Math.max(...wingSamples.map(sample => sample.flap)) - Math.min(...wingSamples.map(sample => sample.flap));
const matrixDelta = Math.max(...wingSamples.map(sample => Math.abs(sample.matrix[1] - wingSamples[0].matrix[1])));
const allWingDeltas = wingSamples[0].allWings.map((value, index) => Math.max(...wingSamples.map(sample => Math.abs(sample.allWings[index] - value))));
put('SF2', wingDelta > .5 && matrixDelta > .1 && allWingDeltas.every(delta => delta > .1), { wingDelta, matrixDelta, allWingDeltas });
const travelled = trackSamples[0][0].distanceTo(trackSamples[2700][0]);
const safe = trackSamples.flat().every(p => p.y >= 10 && p.y <= 15 && (Math.abs(p.x) > 30 || Math.abs(p.z) > 45));
let jump = 0;
for (let step = 1; step < trackSamples.length; step++) trackSamples[step].forEach((p, index) => { jump = Math.max(jump, p.distanceTo(trackSamples[step - 1][index])); });
put('SF3', safe && jump < .2 && travelled > 20, { safe, maximumStepMetres: jump, travelled });
if (mutation === 'sombra-cara') full.group.children[0].castShadow = true;
const report = full.report();
put('SF4', full.group.children.every(mesh => !mesh.castShadow && !mesh.receiveShadow && mesh.userData.nonSolidSurface) && report.meshes <= 7 && report.triangles <= 4958 && report.textures === 0, report);
put('SF5', low.birds.length === 1 && off.birds.length === 0 && off.group.children.length === 0, { low: low.birds.length, disabled: off.birds.length });
const a = build({ enabled: true }); const b = build({ enabled: true });
for (let i = 0; i < 120; i++) a.update(1 / 60);
for (let i = 0; i < 40; i++) b.update(mutation === 'relogio-por-frame' ? 1 / 60 : 1 / 20);
const delta = Math.max(...a.birds.map((bird, index) => bird.position.distanceTo(b.birds[index].position)));
const drawnDelta = Math.max(...a.group.children.flatMap((mesh, index) => Array.from(mesh.instanceMatrix.array, (value, slot) => Math.abs(value - b.group.children[index].instanceMatrix.array[slot]))));
const flapDelta = Math.max(...a.birds.map((bird, index) => Math.abs(bird.flap - b.birds[index].flap)));
a.reset(); const fresh = build({ enabled: true });
const resetDelta = Math.max(...a.birds.map((bird, index) => bird.position.distanceTo(fresh.birds[index].position)));
const parent = a.group.parent; a.dispose();
put('SF6', delta < 1e-9 && flapDelta < 1e-9 && drawnDelta < 1e-6 && resetDelta === 0 && !parent.children.includes(a.group), { delta, flapDelta, drawnDelta, resetDelta, disposed: !parent.children.includes(a.group) });
const world = MAPS.velho_oeste.build(new THREE.Scene(), await initTextures());
const integrated = world.faunaFlight;
const initial = integrated?.birds[0]?.position.clone();
if (mutation === 'mundo-parado') world.update = () => {};
world.update(1 / 60, 1 / 60);
const integratedDelta = initial && integrated.birds[0].position.distanceTo(initial);
put('SF7', !!integrated && integrated.group.parent === world.root && integratedDelta > 0, { present: !!integrated, integratedDelta });
for (const check of checks) console.log(`${check.id} ${check.ok ? 'PASSA' : 'FALHA'} ${JSON.stringify(check.evidence)}`);
const failed = checks.filter(check => !check.ok).map(check => check.id);
if (mutation) {
  const exact = failed.length === 1 && failed[0] === targets[mutation];
  console.log(`MUTANTE ${mutation}: ${exact ? 'ISOLADO' : 'FALHOU'} esperado=${targets[mutation]} observado=${failed.join(',')}`);
  process.exitCode = exact ? 0 : 1;
} else process.exitCode = failed.length ? 1 : 0;
