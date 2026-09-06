import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
const nativeFetch = globalThis.fetch;
const baseline = process.argv.includes('--baseline');
const mut = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
const targets = { bipede: ['CQ1', 'CQ2', 'CQ3', 'CQ4'], 'pata-aerea': ['CQ2', 'CQ3'], 'sem-passada': 'CQ3', 'triangulos-duplicados': 'CQ4', 'pitch-corrida': 'CQ5', 'fuga-teleporte': 'CQ6', 'cache-velho': 'CQ7', 'fallback-congelado': 'CQ8', 'idle-correndo': ['CQ9', 'CQ10'], 'clipe-congelado': 'CQ9', 'normaliza-morph': 'CQ10' };
if (mut && !targets[mut]) throw Error(`Mutante desconhecido: ${mut}`);
const file = baseline || mut === 'bipede' ? 'public/models/ambient/calango.glb' : 'public/models/ambient/calango_quadrupede.glb';
if (!existsSync(file)) { console.log('CQ0 FALHA derivado ausente'); process.exit(1); }
function load(path) { const b = readFileSync(path), len = b.readUInt32LE(12); return { json: JSON.parse(b.subarray(20, 20 + len)), bin: b.subarray(28 + len) }; }
const { json: j, bin } = load(file), p = j.meshes[0].primitives[0];
function values(id) {
  const a = j.accessors[id], v = j.bufferViews[a.bufferView], width = { SCALAR: 1, VEC3: 3 }[a.type];
  return Array.from({ length: a.count }, (_, i) => Array.from({ length: width }, (_, c) => bin.readFloatLE((v.byteOffset || 0) + (a.byteOffset || 0) + i * (v.byteStride || 4 * width) + 4 * c)));
}
const positions = values(p.attributes.POSITION), low = [0, 1, 2].map(a => Math.min(...positions.map(p => p[a]))), high = [0, 1, 2].map(a => Math.max(...positions.map(p => p[a])));
const length = Math.max(high[0] - low[0], high[2] - low[2]), ratio = (high[1] - low[1]) / length;
// A referência quadrúpede local tem razão .217; bípede rejeitado mede .957 (renders no relatório).
const flat = ratio <= .30;
const contacts = j.extras?.contacts || [], contactPositions = contacts.map(i => positions[i]);
if (mut === 'pata-aerea') { if (contacts.length !== 4) throw Error('Mutante não aplicou'); contactPositions[0][1] += .06; }
const support = contacts.length === 4 && contactPositions.every(p => Math.abs(p[1]) < .002) && new Set(contactPositions.map(p => `${Math.sign(p[0])},${p[2] > .175}`)).size === 4;
const morphs = (p.targets || []).map(t => values(t.POSITION));
if (mut === 'sem-passada') { if (!morphs.length) throw Error('Mutante não aplicou'); morphs[0] = morphs[0].map(p => p.map(() => 0)); }
const clip = j.animations?.find(a => a.name === 'Run'), sampler = clip?.samplers[0];
const keys = sampler ? values(sampler.output).flat() : [];
const frames = keys.length / Math.max(1, morphs.length);
const samples = Array.from({ length: 65 }, (_, i) => {
  const t = i / 64 * (frames - 1), a = Math.floor(t), b = Math.min(frames - 1, a + 1), mix = t - a;
  const weights = morphs.map((_, c) => (keys[a * morphs.length + c] || 0) * (1 - mix) + (keys[b * morphs.length + c] || 0) * mix);
  return contacts.map((idx, c) => contactPositions[c].map((n, axis) => n + morphs.reduce((sum, m, t) => sum + (m[idx]?.[axis] || 0) * (weights[t] || 0), 0)));
});
const stride = contacts.map((_, c) => Math.max(...samples.map(s => s[c][2])) - Math.min(...samples.map(s => s[c][2])));
const swingAdvances = samples.length && contacts.length === 4 && samples[32][0][2] > samples[0][0][2] + .06 && samples[32][3][2] > samples[0][3][2] + .06 && samples[64][1][2] > samples[32][1][2] + .06 && samples[64][2][2] > samples[32][2][2] + .06;
const stepping = swingAdvances && morphs.length === 4 && j.animations?.some(a => a.name === 'Run') && stride.every(s => s > .06) && samples.every(s => s.filter(p => p[1] <= .002).length >= 2);
const ia = j.accessors[p.indices], iv = j.bufferViews[ia.bufferView];
const indices = Array.from({ length: ia.count }, (_, i) => bin.readUInt16LE((iv.byteOffset || 0) + (ia.byteOffset || 0) + i * 2));
if (mut === 'triangulos-duplicados') { if (indices.length < 3) throw Error('Mutante não aplicou'); indices.push(...Array.from({ length: 392 }, () => indices.slice(0, 3)).flat()); }
const tris = indices.length / 3;
const cost = tris < 4957 && j.extras?.removedStoneVertices === 207;
const checks = [{ id: 'CQ1', ok: flat, ratio, length }, { id: 'CQ2', ok: support, contacts: contactPositions }, { id: 'CQ3', ok: stepping, stride }, { id: 'CQ4', ok: cost, triangles: tris }];
const { THREE } = await import('./harness.mjs');
const { createFavelaAmbience, faunaAssetUrl } = await import('../../public/js/ambientlife.js');
const ambience = createFavelaAmbience(new THREE.Group(), { map: 'velho_oeste', calangos: [{ pos: [0, 0, 0], to: [0, 0, 6.2], phase: .2 }] });
const animal = ambience.animals[0], originalUpdate = ambience._updateCalango;
if (mut === 'pitch-corrida') ambience._updateCalango = function(a, dt) { originalUpdate.call(this, a, dt); if (a.state === 'run') a.root.rotation.x = -.42; };
if (mut === 'fuga-teleporte') ambience._updateCalango = function(a, dt) { originalUpdate.call(this, a, dt); if (a.state === 'flee' && !this.mutated) { a.root.position.z += 4; this.mutated = true; } };
if (mut === 'fallback-congelado') ambience._updateCalango = function(a, dt) { originalUpdate.call(this, a, dt); a.root.traverse(p => { if (p.userData.calangoLeg !== undefined) p.position.set(0, 0, 0); }); };
let maxPitch = 0, maxSpeed = 0, idleFrames = 0, movingFrames = 0, movedLeg = 0, idleLeg = 0;
const states = new Set();
for (let frame = 0; frame < 2400; frame++) {
  if (frame === 900) ambience.onShot(new THREE.Vector3(-1, 0, animal.root.position.z), animal.root.position.clone());
  const before = animal.root.position.clone(); ambience.update(1 / 60, null);
  const speed = animal.root.position.distanceTo(before) * 60;
  maxSpeed = Math.max(maxSpeed, speed); maxPitch = Math.max(maxPitch, Math.abs(animal.root.rotation.x), Math.abs(animal.root.rotation.z));
  states.add(animal.state);
  animal.root.traverse(part => { if (part.userData.calangoLeg !== undefined) { if (speed > .01) movedLeg = Math.max(movedLeg, part.position.length()); else idleLeg = Math.max(idleLeg, part.position.length()); } });
  if (animal.state === 'idle' && speed < .001) idleFrames++;
  if (animal.state === 'run' && speed > .1) movingFrames++;
}
const box = new THREE.Box3().setFromObject(animal.root), size = box.getSize(new THREE.Vector3());
checks.push({ id: 'CQ5', ok: maxPitch < .000001 && size.y / Math.max(size.x, size.z) < .30, maxPitch, fallbackRatio: size.y / Math.max(size.x, size.z) });
checks.push({ id: 'CQ6', ok: maxSpeed <= 1.21 && idleFrames > 60 && movingFrames > 60 && ['idle', 'run', 'flee', 'recover'].every(s => states.has(s)), maxSpeed, idleFrames, movingFrames, states: [...states] });
const source = readFileSync('public/js/ambientlife.js', 'utf8'), start = source.indexOf('export async function preloadAmbientLife'), finish = source.indexOf('\n}', start) + 2;
let preloadSource = source.slice(start, finish).replace('export ', '');
if (mut === 'cache-velho') { const next = preloadSource.replace('?v=${revision}', '?v=${VERSION}'); if (next === preloadSource) throw Error('Mutante não aplicou'); preloadSource = next; }
const urls = [], preload = runInNewContext(`(${preloadSource})`, { ASSETS: { calango: faunaAssetUrl('calango') }, FAVELA_AMBIENCE_ASSETS: ['calango'], templates: new Map(), VERSION: 'fixture', console, loadGLB: async url => { urls.push(url); return { scene: { traverse() {} }, animations: [] }; } });
await preload(['calango']);
const revision = createHash('sha256').update(readFileSync('public/models/ambient/calango_quadrupede.glb')).digest('hex').slice(0, 12);
checks.push({ id: 'CQ7', ok: urls.includes(`models/ambient/calango_quadrupede.glb?v=${revision}`), urls, revision });
checks.push({ id: 'CQ8', ok: movedLeg > .008 && idleLeg < .000001, movedLeg, idleLeg });
ambience.dispose();
const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
const { preloadAmbientLife } = await import('../../public/js/ambientlife.js');
const loadOriginal = GLTFLoader.prototype.load, fetchOriginal = globalThis.fetch;
globalThis.self = globalThis;
globalThis.Image = class { constructor() { this.width = 1; this.height = 1; } set src(value) { queueMicrotask(() => this.onload?.()); } };
globalThis.createImageBitmap = async () => ({ width: 1024, height: 1024, close() {} });
globalThis.fetch = nativeFetch;
const derived = readFileSync('public/models/ambient/calango_quadrupede.glb');
GLTFLoader.prototype.load = function(url, ok, progress, error) { this.parse(derived.buffer.slice(derived.byteOffset, derived.byteOffset + derived.byteLength), '', ok, error); };
try {
  await preloadAmbientLife(['calango']);
  const glbAmbience = createFavelaAmbience(new THREE.Group(), { map: 'velho_oeste', calangos: [{ pos: [0, 0, 0], to: [0, 0, 6.2], phase: .2 }] });
  const glbAnimal = glbAmbience.animals[0], update = glbAmbience._updateCalango;
  if (mut === 'idle-correndo') glbAmbience._updateCalango = function(a, dt) { update.call(this, a, dt); if (a.state === 'idle') a.actions.run.play(); };
  if (mut === 'clipe-congelado') glbAnimal.actions.run.setEffectiveTimeScale = function() { this.timeScale = 0; return this; };
  if (mut === 'normaliza-morph') {
    const a = source.indexOf('function normalizeModel('), b = source.indexOf('\n}', a) + 2;
    const original = source.slice(a, b), changed = original.replace("setFromObject(model, id === 'calango')", 'setFromObject(model)');
    if (changed === original) throw Error('Mutante não aplicou');
    const normalize = runInNewContext(`(${changed})`, { THREE });
    glbAnimal.model.position.set(0, 0, 0); glbAnimal.model.scale.setScalar(1); normalize('calango', glbAnimal.model);
  }
  let mesh, idleMorph = 0, minIdleFeet = 4, minMovingFeet = 4, maxIdleFootHeight = 0;
  glbAnimal.root.traverse(o => { if (o.morphTargetInfluences) mesh = o; });
  const derivedJson = JSON.parse(derived.subarray(20, 20 + derived.readUInt32LE(12))), footIndices = derivedJson.extras.contacts;

  const poses = new Set();
  for (let frame = 0; frame < 1200; frame++) {
    glbAmbience.update(1 / 60, null);
    glbAnimal.root.updateMatrixWorld(true);
    const footHeights = footIndices.map(i => mesh.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld).y - glbAnimal.root.position.y);
    const grounded = footHeights.filter(y => Math.abs(y) <= .002).length;
    if (glbAnimal.state === 'idle') { minIdleFeet = Math.min(minIdleFeet, grounded); maxIdleFootHeight = Math.max(maxIdleFootHeight, ...footHeights.map(Math.abs)); }
    else minMovingFeet = Math.min(minMovingFeet, grounded);

    if (glbAnimal.state === 'idle') idleMorph = Math.max(idleMorph, ...mesh.morphTargetInfluences.map(Math.abs));
    else poses.add(mesh.morphTargetInfluences.map(v => v.toFixed(3)).join(','));
  }
  checks.push({ id: 'CQ9', ok: glbAnimal.source === 'gltf' && poses.size >= 8 && idleMorph < .000001, source: glbAnimal.source, poses: poses.size, idleMorph });
  checks.push({ id: 'CQ10', ok: minIdleFeet === 4 && minMovingFeet >= 2, minIdleFeet, minMovingFeet, maxIdleFootHeight });
  glbAmbience.dispose();
} finally { GLTFLoader.prototype.load = loadOriginal; globalThis.fetch = fetchOriginal; }

for (const check of checks) console.log(`${check.id} ${check.ok ? 'PASSA' : 'FALHA'} ${JSON.stringify(check)}`);
const failures = checks.filter(c => !c.ok).map(c => c.id);
if (mut) { const expected = [].concat(targets[mut]); const exact = JSON.stringify(failures) === JSON.stringify(expected); console.log(`MUTANTE ${mut} ${exact ? expected.length > 1 ? 'MULTIALVO-EXATO' : 'ISOLADO' : 'FALHOU'} ${failures.join(',')}`); process.exitCode = exact ? 0 : 1; } else process.exitCode = failures.length ? 1 : 0;
