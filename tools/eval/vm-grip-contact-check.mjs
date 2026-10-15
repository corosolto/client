#!/usr/bin/env node
// #991: contato no GLB servido; Node substitui só I/O, sem reduzir o rig ou a malha.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as THREE from '../../public/vendor/three.module.js';
import { GLTFLoader } from '../../public/vendor/addons/loaders/GLTFLoader.js';
import { referencialCaboFaca } from '../../public/js/vmgrip.js';
import { meshTriangles, intersectionPairs, containedVertices, jointWeight, CONTACT_EPSILON } from './lib/vm-contact.mjs';
const ROOT = path.resolve(import.meta.dirname, '../..');
const digest = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const invariantTracks = (clips, allowed) => digest(clips.map(c => ({ name: c.name, duration: c.duration,
  tracks: c.tracks.map(t => [t.name, [...t.times], allowed.has(t.name) ? null : [...t.values], t.getInterpolation()]).sort((a,b) => a[0].localeCompare(b[0])) })));
function absoluteImports(source, file) {
  return source.replace(/(from\s*|import\()(['"])([^'"]+)\2/g, (all, prefix, quote, name) => {
    const target = name === 'three' ? path.join(ROOT, 'public/vendor/three.module.js')
      : name.startsWith('three/addons/') ? path.join(ROOT, 'public/vendor/addons', name.slice(13))
      : name.startsWith('.') ? path.resolve(path.dirname(file), name) : null;
    return target ? `${prefix}${quote}${pathToFileURL(target).href}${quote}` : all;
  });
}
async function consumer(file, edits = []) {
  let source = fs.readFileSync(file, 'utf8');
  for (const [from, to] of edits) { if (!source.includes(from)) throw Error('seam/mutante não aplicou'); source = source.replace(from, to); }
  return import(`data:text/javascript;base64,${Buffer.from(absoluteImports(source, file)).toString('base64')}`);
}
export async function carregarSemTexturas(file) {
  const bytes = fs.readFileSync(file), length = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + length));
  for (const material of json.materials || []) {
    if (material.pbrMetallicRoughness) {
      delete material.pbrMetallicRoughness.baseColorTexture;
      delete material.pbrMetallicRoughness.metallicRoughnessTexture;
    }
    delete material.normalTexture; delete material.occlusionTexture; delete material.emissiveTexture;
  }
  delete json.images; delete json.textures; delete json.samplers;
  const raw = Buffer.from(JSON.stringify(json));
  const chunk = Buffer.concat([raw, Buffer.alloc((4 - raw.length % 4) % 4, 32)]);
  const binary = bytes.subarray(20 + length), header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + chunk.length + binary.length, 8);
  header.writeUInt32LE(chunk.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  const output = Buffer.concat([header, chunk, binary]);
  return new GLTFLoader().parseAsync(output.buffer.slice(output.byteOffset, output.byteOffset + output.length), '');
}


function gap(one, two) {
  let best = Infinity;
  const point = new THREE.Vector3(), triangle = new THREE.Triangle();
  for (const vertex of new Set(one.flatMap(t => t.points))) for (const target of two) {
    if (target.box.distanceToPoint(vertex) >= best) continue;
    triangle.set(...target.points).closestPointToPoint(vertex, point);
    best = Math.min(best, point.distanceTo(vertex));
    if (best < 0.00005) return best;
  }
  return best;
}
function cuffRatio(mesh, triangles) {
  const a = mesh.geometry.attributes, skeleton = mesh.skeleton;
  const hand = skeleton.bones.findIndex(b => b.name === 'hand_r');
  const scale = new THREE.Vector3().setFromMatrixScale(mesh.bindMatrix).x
    * skeleton.bones[hand].getWorldScale(new THREE.Vector3()).x
    / new THREE.Vector3().setFromMatrixScale(skeleton.boneInverses[hand].clone().invert()).x;
  let worst = 0;
  for (const t of triangles) {
    if (!t.ids.some(i => jointWeight(mesh, i, /^lowerarm(?:_twist_01)?_r$/) > 0.1)) continue;
    for (let k = 0; k < 3; k++) {
      const next = (k + 1) % 3;
      const rest = new THREE.Vector3().fromBufferAttribute(a.position, t.ids[k])
        .distanceTo(new THREE.Vector3().fromBufferAttribute(a.position, t.ids[next])) * scale;
      if (rest >= 0.001) worst = Math.max(worst, t.points[k].distanceTo(t.points[next]) / rest);
    }
  }
  return worst;
}
export async function knife(root, baseline, mutation) {
  const gltf = await carregarSemTexturas(path.join(root, 'knife/knife-baked-runtime.glb'));
  const allowed = new Set(), original = invariantTracks(gltf.animations, allowed);
  const originalParent = gltf.scene.getObjectByName('MELEE_KNIFE').parent;
  const edits = [];
  const { KnifeMeleeViewModel } = await consumer(path.join(ROOT, 'public/js/meleevm.js'), edits);
  const parent = new THREE.Group(), controller = new KnifeMeleeViewModel({ parent }); controller._accept(gltf);
  controller.setWeapon('knife');
  const scene = controller.scene, blade = scene.getObjectByName('MELEE_KNIFE');
  if (mutation === 'faca-solta') { blade.geometry = blade.geometry.clone(); blade.geometry.translate(100, 0, 0); }
  for (const clip of gltf.animations) {
    const name = { ombro: 'upperarm_r.position', trajetoria: 'MELEE_KNIFE.position', manga: 'lowerarm_twist_01_r.position' }[mutation];
    if (!name) continue;
    let track = clip.tracks.find(t => t.name === name);
    if (!track && mutation === 'manga') {
      const position = scene.getObjectByName('lowerarm_twist_01_r').position.toArray();
      track = new THREE.VectorKeyframeTrack(name, [0, clip.duration], [...position, ...position]); clip.tracks.push(track);
    }
    if (!track) throw Error(`mutante ${mutation} sem track`);
    for (let i = 0; i < track.values.length; i += 3) track.values[i] += mutation === 'trajetoria' ? 1 : mutation === 'manga' ? 100 : 10;
  }
  if (mutation === 'manga') {
    controller.mixer.stopAllAction(); controller.mixer.uncacheRoot(scene);
    controller.actions = new Map(gltf.animations.map(clip => [clip.name, controller.mixer.clipAction(clip)]));
  }
  const samples = [];
  blade.geometry.computeBoundingBox();
  const box = blade.geometry.boundingBox, cut = box.min.z + (box.max.z - box.min.z) / 3;
  const handleReference = referencialCaboFaca(blade.geometry);
  const measure = (clip, sample, kind) => {
    parent.updateMatrixWorld(true);
    const glove = scene.getObjectByName('GEO_FP_SK_Glove_01'), all = meshTriangles(glove);
    const palm = all.filter(t => t.ids.every(i => jointWeight(glove, i, /^hand_r$/) > 0.75));
    const handle = meshTriangles(blade, ids => ids.every(i => blade.geometry.attributes.position.getZ(i) < cut));
    if (!palm.length || !handle.length) throw Error('régua sem palma/cabo');
    const axis = handleReference.axis.clone().transformDirection(blade.matrixWorld);
    const across = scene.getObjectByName('index_01_r').getWorldPosition(new THREE.Vector3())
      .sub(scene.getObjectByName('pinky_01_r').getWorldPosition(new THREE.Vector3())).normalize();
    const angle = THREE.MathUtils.radToDeg(Math.acos(Math.min(1, Math.abs(axis.dot(across)))));
    const contacts = ['index', 'middle', 'ring', 'pinky', 'thumb'].map(finger => {
      const pattern = new RegExp(`^${finger}_0._r$`);
      return gap(all.filter(t => t.ids.every(i => jointWeight(glove, i, pattern) > 0.5)), handle);
    }).sort((a,b) => a-b);
    samples.push({ clip, sample, kind, angle, palmPairs: intersectionPairs(palm, handle).length + containedVertices(palm, meshTriangles(blade)),
      thirdContactGap: contacts[2], cuffRatio: cuffRatio(glove, all) });
  };
  for (const [name, action] of controller.actions) {
    controller.mixer.stopAllAction(); action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
    for (let sample = 0; sample <= 12; sample++) {
      controller.mixer.setTime(Math.min(action.getClip().duration - 1e-5, action.getClip().duration * sample / 12));
      controller.update(0); measure(name, sample, 'clip');
    }
  }
  for (const kind of ['quick', 'heavy']) {
    controller.mixer.stopAllAction(); controller.current = null; controller.attackMotion = null;
    controller._play('Idle'); controller.update(0.1); controller.attack(kind);
    for (let tick = 0; tick <= 9; tick++) {
      controller.update(tick === 0 ? 0 : 1/240); measure(`${kind}-in`, tick, 'transition');
    }
    const seconds = kind === 'quick' ? 0.36 : 0.62;
    for (let elapsed = 9/240; elapsed < seconds - 0.02; elapsed += 1/240) controller.update(Math.min(1/240, seconds - 0.02 - elapsed));
    for (let tick = 0; tick <= 15; tick++) {
      controller.update(tick === 0 ? 0 : 1/240); measure(`${kind}-out`, tick, 'transition');
    }
  }
  return { samples, invariantTracks: original === invariantTracks(gltf.animations, allowed), hierarchy: blade.parent === originalParent,
    worstAngle: Math.max(...samples.map(s => s.angle)), palmPairs: Math.max(...samples.map(s => s.palmPairs)),
    thirdContactGap: Math.max(...samples.map(s => s.thirdContactGap)), cuffRatio: Math.max(...samples.map(s => s.cuffRatio)) };
}
export async function revolver(root, baseline, mutation) {
  globalThis.window = { location: { search: '?vmauthored=1&vmfabrica=0', href: 'http://localhost/' } };
  const gltf = await carregarSemTexturas(path.join(root, 'revolver/revolver-runtime.glb'));
  const allowed = new Set(['index_01_r', 'index_02_r', 'index_03_r'].map(n => `${n}.quaternion`));
  const original = invariantTracks(gltf.animations, allowed);
  globalThis.__vmFixture = gltf;
  const edits = [
    ["const NODE_RUNTIME = typeof process !== 'undefined' && Boolean(process.versions?.node);", 'const NODE_RUNTIME = false;'],
    ['      loadFamilyGltf(key),', '      Promise.resolve(globalThis.__vmFixture),'],
    ['      golden ? Promise.resolve(null) : generalMotions(),', '      Promise.resolve(null),'],
  ];
  if (baseline) edits.push(["      if (key === 'revolver#revolver38') corrigirPegaRevolver(product);", '']);
  if (baseline || mutation === 'ads-grip') edits.push(['    ajustarPegaADS(active, this.adsAmount);', '']);
  if (mutation === 'ads-pop') edits.push(['    ajustarPegaADS(active, this.adsAmount);', "    ajustarPegaADS(active, this.adsAmount);\n    if (this.adsAmount > 0.99 && this.adsAmount < 1) active.scene.getObjectByName('hand_r').position.x += 1;"]);
  if (mutation === 'ads-time') edits.push(['entry.adsAction.setEffectiveWeight(weight); entry.mixer.update(0);', 'entry.adsAction.setEffectiveWeight(weight); entry.mixer.update(0.01);']);
  if (mutation === 'ads-scale') edits.push(['    ajustarPegaADS(active, this.adsAmount);', "    ajustarPegaADS(active, this.adsAmount);\n    if (this.adsAmount > 0 && this.adsAmount < 1) active.scene.getObjectByName('hand_r').scale.setScalar(1.1);"]);
  const { AuthoredViewModels } = await consumer(path.join(ROOT, 'public/js/authoredvm.js'), edits);
  const parent = new THREE.Group(), controller = new AuthoredViewModels(parent);
  controller.setWeapon('revolver38');
  const entry = await controller.pending.get('revolver#revolver38'); delete globalThis.__vmFixture;
  if (!entry || controller.entry() !== entry) throw Error('régua fora do produto K da .38');
  for (let i = 0; i < 90; i++) controller.update(1 / 60);
  if (mutation === 'dedo-solto') for (const clip of entry.clips.values()) {
    let track = clip.tracks.find(t => t.name === 'index_01_r.position');
    if (!track) {
      const position = entry.scene.getObjectByName('index_01_r').position.toArray();
      track = new THREE.VectorKeyframeTrack('index_01_r.position', [0, clip.duration], [...position, ...position]);
      clip.tracks.push(track);
    }
    for (let i = 2; i < track.values.length; i += 3) track.values[i] += 10;
    entry.mixer.uncacheClip(clip);
  }
  const meshes = []; entry.scene.traverse(o => { if (o.isMesh && /GEO_WEAPON/.test(o.name + o.parent.name)) meshes.push(o); });
  const glove = entry.scene.getObjectByName('GEO_FP_SK_Glove_01'), samples = [], endpointJumps = [], clocks = [], scales = [], states = [];
  const hand = entry.scene.getObjectByName('hand_r'), joints = []; hand.traverse(bone => { if (bone.isBone) joints.push(bone); });
  for (const clip of entry.clips.values()) {
    entry.mixer.stopAllAction();
    const additive = /^ads$/i.test(clip.name);
    for (const base of (additive ? ['idle', 'shoot'].map(key => entry.clips.get(key)) : [clip])) {
    entry.mixer.clipAction(base).reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if (additive && entry.adsAction) entry.adsAction.reset().play();
    const weights = additive ? [0, 1e-6, ...Array.from({ length: 11 }, (_, i) => (i + 1) / 12), 1 - 1e-6, 1] : Array.from({ length: 13 }, (_, i) => i / 12);
    for (const phase of additive ? [0, 0.25, 0.5, 0.75, 0.999] : [null]) {
    const poses = new Map();
    for (let sample = 0; sample < weights.length; sample++) {
      const amount = weights[sample];
      if (additive && entry.adsAction) entry.adsAction.setEffectiveWeight(amount);
      controller.setAim('revolver38', 0); controller.update(0);
      entry.mixer.setTime(Math.min(base.duration - 1e-5, base.duration * (phase ?? sample / 12)));
      const time = entry.mixer.time, serial = entry.serial, queue = [...entry.queue], scale = hand.scale.clone();
      const actions = [entry.adsAction, ...[...entry.clips.values()].map(c => entry.mixer.existingAction(c))].filter(Boolean);
      const times = actions.map(action => action.time);
      controller.setAim('revolver38', additive ? amount : 0); controller.update(0); parent.updateMatrixWorld(true);
      clocks.push(Math.max(Math.abs(entry.mixer.time - time), ...actions.map((action,i) => Math.abs(action.time - times[i]))));
      scales.push(hand.scale.distanceTo(scale)); states.push(entry.serial === serial && entry.queue.length === queue.length && entry.queue.every((action,i) => action === queue[i]));
      const finger = meshTriangles(glove, ids => ids.some(i => jointWeight(glove, i, /^index_0._r$/) > 0.5));
      const metal = meshes.filter(m => m.material.name === 'CoroSolto_chrome').flatMap(m => meshTriangles(m,
        ids => ids.every(i => jointWeight(m, i, /^neutral_bone$/) > 0.5)));
      const trigger = meshes.flatMap(m => meshTriangles(m, ids => ids.some(i => jointWeight(m, i, /^Trigger$/) > 0.5)));
      if (!finger.length || !metal.length || !trigger.length) throw Error('régua sem índice/metal/gatilho');
      samples.push({ clip: additive ? `ads-${base.name.toLowerCase()}` : clip.name, phase, sample, amount: additive ? amount : 0, guardPairs: intersectionPairs(finger, metal).length + containedVertices(finger, metal),
        triggerGap: gap(finger, trigger) });
      if (additive && [0, 1e-6, 1 - 1e-6, 1].includes(amount)) poses.set(amount, joints.map(bone => bone.getWorldPosition(new THREE.Vector3())));
    }
    if (additive) for (const [a,b] of [[0,1e-6],[1 - 1e-6,1]]) endpointJumps.push(Math.max(...poses.get(a).map((point,i) => point.distanceTo(poses.get(b)[i]))));
    }
    entry.mixer.stopAllAction();
    }
  }
  return { samples, invariantTracks: original === invariantTracks([...entry.clips.values()], allowed),
    endpointJump: Math.max(...endpointJumps), clockDrift: Math.max(...clocks), scaleDrift: Math.max(...scales), statePreserved: states.every(Boolean), guardPairs: Math.max(...samples.map(s => s.guardPairs)),
    triggerGap: Math.max(...samples.filter(s => /shoot|fire/i.test(s.clip)).map(s => s.triggerGap)) };
}
function checksRevolver(result) {
  return { guardaMato: result.guardPairs === 0,
    gatilho: Number.isFinite(result.triggerGap) && result.triggerGap <= 0.005,
    relogio: result.clockDrift === 0 && result.statePreserved,
    escalaMao: result.scaleDrift === 0,
    extremosADS: Number.isFinite(result.endpointJump) && result.endpointJump <= CONTACT_EPSILON,
    somenteDedos: result.invariantTracks };
}
export async function avaliarRevolver(root, { baseline = false, mutation = '' } = {}) {
  const result = await revolver(root, baseline, mutation), checks = checksRevolver(result);
  return { ok: Object.values(checks).every(Boolean), checks, revolver: result };
}
export async function avaliar(root, { baseline = false, mutation = '' } = {}) {
  const before = await knife(root, true, '');
  const knifeResult = baseline ? before : await knife(root, false, mutation);
  const revolverResult = await revolver(root, baseline, mutation);
  const checks = {
    palma: knifeResult.palmPairs === 0,
    contato: knifeResult.thirdContactGap <= 0.005,
    cabo: knifeResult.worstAngle <= 15,
    manga: knifeResult.cuffRatio > 0 && knifeResult.cuffRatio < before.cuffRatio,
    tracksProtegidos: knifeResult.invariantTracks,
    hierarquia: knifeResult.hierarchy,
    transicao: knifeResult.samples.filter(s => s.kind === 'transition').every(s => s.palmPairs === 0 && s.thirdContactGap <= 0.005),
    ...checksRevolver(revolverResult),
  };
  return { ok: Object.values(checks).every(Boolean), checks, baselineCuff: before.cuffRatio, knife: knifeResult, revolver: revolverResult };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.env.CSBRASIL_VM_ASSET_ROOT;
  if (!root) throw Error('defina CSBRASIL_VM_ASSET_ROOT: ausência de asset não aprova');
  const report = await (process.argv.includes('--revolver-only') ? avaliarRevolver : avaliar)(root, { baseline: process.argv.includes('--baseline'), mutation: process.env.VM_CONTACT_MUTANT || '' });
  if (process.env.VM_CONTACT_REPORT) fs.writeFileSync(process.env.VM_CONTACT_REPORT, JSON.stringify(report, null, 2));
  for (const [name, ok] of Object.entries(report.checks)) console.log(`${ok ? 'PASSA' : 'FALHA'} ${name}`);
  console.log(JSON.stringify({ ok: report.ok, knife: report.knife && { samples: report.knife.samples.length, angle: report.knife.worstAngle,
    palmPairs: report.knife.palmPairs, thirdContactGap: report.knife.thirdContactGap, cuffRatio: report.knife.cuffRatio },
    baselineCuff: report.baselineCuff, revolver: { samples: report.revolver.samples.length, guardPairs: report.revolver.guardPairs, endpointJump: report.revolver.endpointJump, triggerGap: report.revolver.triggerGap } }));
  if (!report.ok) process.exitCode = 1;
}
