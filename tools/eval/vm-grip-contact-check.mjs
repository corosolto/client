#!/usr/bin/env node
// #991: contato no GLB servido; Node substitui só I/O, sem reduzir o rig ou a malha.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as THREE from '../../public/vendor/three.module.js';
import { GLTFLoader } from '../../public/vendor/addons/loaders/GLTFLoader.js';
import { referencialCaboFaca } from '../../public/js/vmgrip.js';
import { meshTriangles, intersectionPairs, containedVertices, jointWeight } from './lib/vm-contact.mjs';
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
async function knife(root, baseline, mutation) {
  const gltf = await carregarSemTexturas(path.join(root, 'knife/knife-baked-runtime.glb'));
  const allowed = new Set();
  const original = invariantTracks(gltf.animations, allowed);
  const edits = [];
  const { KnifeMeleeViewModel } = await consumer(path.join(ROOT, 'public/js/meleevm.js'), edits);
  const parent = new THREE.Group(), controller = new KnifeMeleeViewModel({ parent }); controller._accept(gltf);
  const blade = controller.scene.getObjectByName('MELEE_KNIFE');
  if (mutation === 'faca-solta') { blade.geometry = blade.geometry.clone(); blade.geometry.translate(100, 0, 0); }
  if (mutation === 'ombro') for (const clip of gltf.animations) {
    const track = clip.tracks.find(t => t.name === 'upperarm_r.position');
    if (!track) throw Error('mutante ombro sem track');
    for (let i = 0; i < track.values.length; i += 3) track.values[i] += 10;
  }
  if (mutation === 'trajetoria') for (const clip of gltf.animations) {
    const track = clip.tracks.find(t => t.name === 'MELEE_KNIFE.position');
    if (!track) throw Error('mutante trajetória sem track');
    for (let i = 0; i < track.values.length; i += 3) track.values[i] += 1;
  }
  if (mutation === 'manga') for (const clip of gltf.animations) {
    let track = clip.tracks.find(t => t.name === 'lowerarm_twist_01_r.position');
    if (!track) {
      const position = controller.scene.getObjectByName('lowerarm_twist_01_r').position.toArray();
      track = new THREE.VectorKeyframeTrack('lowerarm_twist_01_r.position', [0, clip.duration], [...position, ...position]);
      clip.tracks.push(track);
    }
    for (let i = 0; i < track.values.length; i += 3) track.values[i] += 100;

  }
  if (mutation === 'manga') {
    controller.mixer.stopAllAction(); controller.mixer.uncacheRoot(controller.scene);
    controller.actions = new Map(gltf.animations.map(clip => [clip.name, controller.mixer.clipAction(clip)]));
  }
  const samples = [];
  blade.geometry.computeBoundingBox();
  const box = blade.geometry.boundingBox, cut = box.min.z + (box.max.z - box.min.z) / 3;
  const handleAxis = referencialCaboFaca(blade.geometry).axis;
  for (const [name, action] of controller.actions) {
    controller.mixer.stopAllAction(); action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
    for (let sample = 0; sample <= 12; sample++) {
      controller.mixer.setTime(Math.min(action.getClip().duration - 1e-5, action.getClip().duration * sample / 12));
      parent.updateMatrixWorld(true);
      const scene = controller.scene, glove = scene.getObjectByName('GEO_FP_SK_Glove_01');
      const all = meshTriangles(glove);
      const palm = all.filter(t => t.ids.every(i => jointWeight(glove, i, /^hand_r$/) > 0.75));
      const handle = meshTriangles(blade, ids => ids.every(i => blade.geometry.attributes.position.getZ(i) < cut));
      if (!palm.length || !handle.length) throw Error('régua sem palma/cabo');
      const hand = scene.getObjectByName('hand_r'), inv = hand.matrixWorld.clone().invert();
      const axis = handleAxis.clone().transformDirection(blade.matrixWorld).transformDirection(inv);
      const across = scene.getObjectByName('index_01_r').getWorldPosition(new THREE.Vector3())
        .sub(scene.getObjectByName('pinky_01_r').getWorldPosition(new THREE.Vector3())).transformDirection(inv);
      const angle = THREE.MathUtils.radToDeg(Math.acos(Math.min(1, Math.abs(axis.dot(across)))));
      const contacts = ['index', 'middle', 'ring', 'pinky', 'thumb'].map(finger => {
        const pattern = new RegExp(`^${finger}_0._r$`);
        return gap(all.filter(t => t.ids.every(i => jointWeight(glove, i, pattern) > 0.5)), handle);
      }).sort((a, b) => a - b);
      samples.push({ clip: name, sample, angle, palmPairs: intersectionPairs(palm, handle).length + containedVertices(palm, meshTriangles(blade)),
        thirdContactGap: contacts[2], cuffRatio: cuffRatio(glove, all) });
    }
  }
  return { samples, invariantTracks: original === invariantTracks(gltf.animations, allowed),
    worstAngle: Math.max(...samples.map(s => s.angle)), palmPairs: Math.max(...samples.map(s => s.palmPairs)),
    thirdContactGap: Math.max(...samples.map(s => s.thirdContactGap)), cuffRatio: Math.max(...samples.map(s => s.cuffRatio)) };
}
async function revolver(root, baseline, mutation) {
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
  const { AuthoredViewModels } = await consumer(path.join(ROOT, 'public/js/authoredvm.js'), edits);
  const parent = new THREE.Group(), controller = new AuthoredViewModels(parent);
  const entry = await controller._loadFamily('revolver#revolver38'); delete globalThis.__vmFixture;
  if (!entry) throw Error('consumidor real não criou .38');
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
  const glove = entry.scene.getObjectByName('GEO_FP_SK_Glove_01'), samples = [];
  for (const clip of entry.clips.values()) {
    entry.mixer.stopAllAction();
    const additive = /^ads$/i.test(clip.name);
    const base = additive ? entry.clips.get('idle') : clip;
    entry.mixer.clipAction(base).reset().setEffectiveWeight(1).play();
    if (additive && !entry.adsAction) throw Error('ADS sem camada aditiva do consumidor');
    if (additive) entry.adsAction.reset().play();
    for (let sample = 0; sample <= 12; sample++) {
      if (additive) entry.adsAction.setEffectiveWeight(sample / 12);
      entry.mixer.setTime(Math.min(base.duration - 1e-5, base.duration * sample / 12)); parent.updateMatrixWorld(true);
      const finger = meshTriangles(glove, ids => ids.some(i => jointWeight(glove, i, /^index_0._r$/) > 0.5));
      const metal = meshes.filter(m => m.material.name === 'CoroSolto_chrome').flatMap(m => meshTriangles(m,
        ids => ids.every(i => jointWeight(m, i, /^neutral_bone$/) > 0.5)));
      const trigger = meshes.flatMap(m => meshTriangles(m, ids => ids.some(i => jointWeight(m, i, /^Trigger$/) > 0.5)));
      if (!finger.length || !metal.length || !trigger.length) throw Error('régua sem índice/metal/gatilho');
      samples.push({ clip: additive ? 'ads-additive' : clip.name, sample, guardPairs: intersectionPairs(finger, metal).length + containedVertices(finger, metal),
        triggerGap: gap(finger, trigger) });
    }
    entry.mixer.stopAllAction();
  }
  return { samples, invariantTracks: original === invariantTracks([...entry.clips.values()], allowed),
    guardPairs: Math.max(...samples.map(s => s.guardPairs)),
    triggerGap: Math.max(...samples.filter(s => /shoot|fire/i.test(s.clip)).map(s => s.triggerGap)) };
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
    trajetoriaOmbro: knifeResult.invariantTracks,
    guardaMato: revolverResult.guardPairs === 0,
    gatilho: Number.isFinite(revolverResult.triggerGap) && revolverResult.triggerGap <= 0.005,
    somenteDedos: revolverResult.invariantTracks,
  };
  return { ok: Object.values(checks).every(Boolean), checks, baselineCuff: before.cuffRatio, knife: knifeResult, revolver: revolverResult };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.env.CSBRASIL_VM_ASSET_ROOT;
  if (!root) throw Error('defina CSBRASIL_VM_ASSET_ROOT: ausência de asset não aprova');
  const report = await avaliar(root, { baseline: process.argv.includes('--baseline'), mutation: process.env.VM_CONTACT_MUTANT || '' });
  if (process.env.VM_CONTACT_REPORT) fs.writeFileSync(process.env.VM_CONTACT_REPORT, JSON.stringify(report, null, 2));
  for (const [name, ok] of Object.entries(report.checks)) console.log(`${ok ? 'PASSA' : 'FALHA'} ${name}`);
  console.log(JSON.stringify({ ok: report.ok, knife: { samples: report.knife.samples.length, angle: report.knife.worstAngle,
    palmPairs: report.knife.palmPairs, thirdContactGap: report.knife.thirdContactGap, cuffRatio: report.knife.cuffRatio },
    baselineCuff: report.baselineCuff, revolver: { samples: report.revolver.samples.length, guardPairs: report.revolver.guardPairs, triggerGap: report.revolver.triggerGap } }));
  if (!report.ok) process.exitCode = 1;
}
