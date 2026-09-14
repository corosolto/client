#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

const REQUIRED = { deagle: ['Slider', 'Hammer'], revolver: ['Drum', 'Hammer', 'Trigger'] };
// Resolução numérica; excursões e procedência: artifacts/viewmodels/fechamento-ruben/mechanical-fire-review/.
const EPSILON = 1e-6;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const nodeName = track => THREE.PropertyBinding.parseTrackName(track.name).nodeName;

function args(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    const [name, inline] = argv[i].replace(/^--/, '').split('=');
    if (name === 'mutantes') result[name] = true;
    else if (['before', 'after', 'arquivo', 'familia', 'assembly-report', 'saida'].includes(name)) {
      result[name] = inline ?? argv[++i];
      if (!result[name] || result[name].startsWith('--')) throw Error(`Valor ausente: --${name}`);
    } else throw Error(`Argumento desconhecido: ${argv[i]}`);
  }
  if (!REQUIRED[result.familia]) throw Error('--familia deve ser deagle ou revolver');
  if (!!result.before !== !!result.after || (!result.arquivo && !result.after)
    || (result.arquivo && result.after)) throw Error('Use --arquivo ou --before e --after');
  return result;
}

async function load(file) {
  const bytes = await fs.readFile(file);
  const jsonSize = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonSize));
  const bin = bytes.subarray(28 + jsonSize);
  const arms = json.skins?.find(skin => skin.name === 'RIG_FP_ARMS');
  if (!arms) throw Error(`${file}: RIG_FP_ARMS ausente`);
  const armNames = new Set(arms.joints.map(index => json.nodes[index].name));
  const clean = structuredClone(json);
  clean.materials = (clean.materials || []).map(material => ({ name: material.name }));
  for (const key of ['images', 'textures', 'samplers']) delete clean[key];
  const encoded = Buffer.from(JSON.stringify(clean));
  const padded = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 32); encoded.copy(padded);
  const glb = Buffer.alloc(28 + padded.length + bin.length);
  glb.writeUInt32LE(0x46546c67, 0); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(padded.length, 12); glb.writeUInt32LE(0x4e4f534a, 16); padded.copy(glb, 20);
  glb.writeUInt32LE(bin.length, 20 + padded.length); glb.writeUInt32LE(0x004e4942, 24 + padded.length);
  bin.copy(glb, 28 + padded.length);
  globalThis.ProgressEvent ??= class ProgressEvent {};
  const asset = await new GLTFLoader().parseAsync(glb.buffer, '');
  return { ...asset, file: path.resolve(file), sha256: hash(bytes), armNames };
}

async function authorship(file, family, explicit) {
  const reportPath = explicit || path.join(path.dirname(file), 'assembly-report.json');
  let bytes;
  try { bytes = await fs.readFile(reportPath); }
  catch (error) { if (error.code === 'ENOENT' && !explicit) return { source: 'unknown' }; throw error; }
  const report = JSON.parse(bytes);
  if (report.family !== family) throw Error('Família divergente no assembly-report');
  if (!explicit && path.resolve(report.output) !== path.resolve(file)) return { source: 'unknown' };
  return { source: report.clips.find(clip => clip.name === 'shoot')?.armsSource || 'unknown',
    report: path.resolve(reportPath), sha256: hash(bytes), declaredOutput: report.output,
    explicitAssociation: !!explicit };
}

function measure(asset, family, origin, mutation) {
  const scene = clone(asset.scene), clips = asset.animations.map(clip => clip.clone());
  const idle = clips.find(clip => clip.name === 'idle');
  let shoot = clips.find(clip => clip.name === 'shoot');
  if (mutation === 'shoot-ausente') shoot = null;
  if (shoot && mutation === 'mecanismos-imoveis') {
    for (const track of shoot.tracks.filter(track => !asset.armNames.has(nodeName(track)))) {
      const width = track.getValueSize();
      for (let i = width; i < track.values.length; i++) track.values[i] = track.values[i % width];
    }
  }
  if (shoot && mutation === 'bracos-mutados') {
    const track = shoot.tracks.find(track => asset.armNames.has(nodeName(track)) && track.name.endsWith('.position'));
    if (!track) throw Error('Mutante sem canal de braço');
    track.values[track.values.length - 3] += 1;
  }
  const checks = [], add = (name, ok, details = {}) => checks.push({ name, ok, ...details });
  add('shoot-presente', !!shoot);
  add('idle-presente', !!idle);
  const result = { family, file: asset.file, sha256: asset.sha256, authorship: origin, mutation, checks };
  if (!shoot || !idle) return { ...result, ok: false };
  add('duracao-positiva', Number.isFinite(shoot.duration) && shoot.duration > 0, { seconds: shoot.duration });
  add('tracks-finitos-sincronizados', shoot.tracks.every(track => track.times.length > 1
    && track.times[0] === 0 && Math.abs(track.times.at(-1) - shoot.duration) < EPSILON
    && [...track.times, ...track.values].every(Number.isFinite)));
  const mixer = new THREE.AnimationMixer(scene);
  const apply = (clip, time) => {
    mixer.stopAllAction();
    const action = mixer.clipAction(clip).reset().setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true; action.play(); mixer.setTime(time); scene.updateMatrixWorld(true);
  };
  apply(idle, 0);
  const idleArms = new Map([...asset.armNames].map(name => {
    const bone = scene.getObjectByName(name);
    return [name, { p: bone.position.clone(), q: bone.quaternion.clone().normalize(), s: bone.scale.clone() }];
  }));
  const reference = scene.getObjectByName('neutral_bone');
  add('referencia-corpo', !!reference);
  const weighted = Object.fromEntries(REQUIRED[family].map(name => [name, 0]));
  const indices = new THREE.Vector4(), weights = new THREE.Vector4();
  scene.traverse(mesh => {
    if (!mesh.isSkinnedMesh) return;
    const attributes = mesh.geometry.attributes;
    for (let i = 0; i < attributes.skinIndex.count; i++) {
      indices.fromBufferAttribute(attributes.skinIndex, i); weights.fromBufferAttribute(attributes.skinWeight, i);
      const names = new Set();
      for (let k = 0; k < 4; k++) if (weights.getComponent(k) > 0) {
        names.add(mesh.skeleton.bones[indices.getComponent(k)].name);
      }
      for (const name of names) if (name in weighted) weighted[name]++;
    }
  });
  add('mecanismos-com-geometria', Object.values(weighted).every(count => count > 0), { weightedVertices: weighted });
  const sampleTimes = [...new Set(shoot.tracks.flatMap(track => [...track.times]))].sort((a, b) => a - b);
  const times = [...sampleTimes, ...sampleTimes.slice(1).map((time, i) => (time + sampleTimes[i]) / 2)].sort((a, b) => a - b);
  const baseline = new Map(), motion = Object.fromEntries(REQUIRED[family].map(name => [name, { position: 0, angle: 0 }]));
  let armPosition = 0, armAngle = 0, armScale = 0;
  for (const time of times) {
    apply(shoot, time);
    for (const [name, rest] of idleArms) {
      const bone = scene.getObjectByName(name);
      armPosition = Math.max(armPosition, bone.position.distanceTo(rest.p));
      armAngle = Math.max(armAngle, bone.quaternion.clone().normalize().angleTo(rest.q));
      armScale = Math.max(armScale, bone.scale.distanceTo(rest.s));
    }
    if (!reference) continue;
    const inverse = reference.matrixWorld.clone().invert();
    for (const name of REQUIRED[family]) {
      const bone = scene.getObjectByName(name); if (!bone) continue;
      const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
      inverse.clone().multiply(bone.matrixWorld).decompose(p, q, s);
      q.normalize();
      if (!baseline.has(name)) baseline.set(name, { p: p.clone(), q: q.clone() });
      const first = baseline.get(name);
      motion[name].position = Math.max(motion[name].position, p.distanceTo(first.p));
      motion[name].angle = Math.max(motion[name].angle, q.angleTo(first.q));
    }
  }
  for (const [name, peak] of Object.entries(motion)) {
    const component = name === 'Slider' ? 'position' : 'angle';
    add(`movimento-${name}`, baseline.has(name) && peak[component] > EPSILON, { ...peak, requiredComponent: component });
  }
  const constantArms = origin.source === 'idle-with-procedural-recoil';
  if (constantArms) {
    const covered = new Set(shoot.tracks.map(track => track.name));
    add('bracos-cobertura-idle', idle.tracks.filter(track => asset.armNames.has(nodeName(track)))
      .every(track => covered.has(track.name)));
    add('bracos-iguais-idle', armPosition < EPSILON && armAngle < EPSILON && armScale < EPSILON,
      { position: armPosition, angle: armAngle, scale: armScale });
  }
  mixer.stopAllAction(); mixer.uncacheRoot(scene);
  return { ...result, ok: checks.every(check => check.ok), samples: times.length,
    armsPolicy: constantArms ? 'constant-idle-required' : 'constancy-not-required',
    armsObserved: { position: armPosition, angle: armAngle, scale: armScale } };
}

async function main() {
  const options = args(process.argv.slice(2));
  const file = options.arquivo || options.after;
  const asset = await load(file), origin = await authorship(file, options.familia, options['assembly-report']);
  const after = measure(asset, options.familia, origin);
  const result = { ok: after.ok, after };
  if (options.before) {
    result.before = measure(await load(options.before), options.familia, { source: 'unknown' });
    result.ok &&= !result.before.ok;
    result.beforeExpected = 'fail-before-fix';
  }
  if (options.mutantes) {
    const names = ['shoot-ausente', 'mecanismos-imoveis'];
    if (origin.source === 'idle-with-procedural-recoil') names.push('bracos-mutados');
    result.mutations = names.map(name => {
      const measured = measure(asset, options.familia, origin, name);
      return { name, detected: !measured.ok, failed: measured.checks.filter(check => !check.ok).map(check => check.name) };
    });
    result.ok &&= result.mutations.every(mutation => mutation.detected);
    const authored = measure(asset, options.familia, { source: 'authored-clip' }, 'bracos-mutados');
    result.authoredArmsControl = { ok: authored.ok, armsPolicy: authored.armsPolicy };
    result.ok &&= authored.ok;
  }
  const text = `${JSON.stringify(result, null, 2)}\n`;
  if (options.saida) await fs.writeFile(options.saida, text);
  console.log(text);
  if (!result.ok) process.exitCode = 1;
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
