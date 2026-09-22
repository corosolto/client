#!/usr/bin/env node
// Gate causal da PT-38 final. O estado anterior precisa falhar porque não há
// manifesto final, clip inspect nem sockets de mira no produto aprovado antigo.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as THREE from '../../../public/vendor/three.module.js';
import { GLTFLoader } from '../../../public/vendor/addons/loaders/GLTFLoader.js';

globalThis.Image = class {
  constructor() { this.onload = null; this.width = 1; this.height = 1; }
  set src(value) { this._src = value; queueMicrotask(() => this.onload?.()); }
};
globalThis.self = globalThis;
globalThis.ImageData = class { constructor(data, width, height) { Object.assign(this, { data, width, height }); } };
const warn = console.warn;
const error = console.error;
console.warn = (...args) => !String(args[0] || '').startsWith("THREE.GLTFLoader: Couldn't load texture blob:") && warn(...args);
console.error = (...args) => String(args[0] || '') !== "THREE.GLTFLoader: Couldn't load texture" && error(...args);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ASSET_ROOT = path.resolve(process.env.CSBRASIL_VM_ASSET_ROOT
  || '/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-root');
const MANIFEST = path.join(ROOT, 'tools/viewmodels/sidearm-candidates.json');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

if (!fs.existsSync(MANIFEST)) {
  failures.push('manifesto final de armas curtas ausente');
  console.log(`VM_PISTOL_PT38=${JSON.stringify({ ok: false, failures })}`);
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const cfg = manifest.candidates?.pistol;
check(Boolean(cfg), 'entrada PT-38 ausente do manifesto');
const file = cfg ? path.join(ASSET_ROOT, cfg.file) : '';
check(Boolean(file) && fs.existsSync(file), `produto PT-38 ausente em ${file || '<sem rota>'}`);
if (!file || !fs.existsSync(file)) {
  console.log(`VM_PISTOL_PT38=${JSON.stringify({ ok: false, file, failures })}`);
  process.exit(1);
}

const bytes = fs.readFileSync(file);
const loader = new GLTFLoader();
const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
const gltf = await loader.parseAsync(buffer, '');
const trackMotion = (document, clipName, trackName) => {
  const track = document.animations.find((clip) => clip.name === clipName)?.tracks
    .find((candidate) => candidate.name === trackName);
  if (!track) return 0;
  const stride = track.values.length / track.times.length;
  let maximum = 0;
  for (let offset = stride; offset < track.values.length; offset += stride) {
    let square = 0;
    for (let lane = 0; lane < stride; lane += 1) square += (track.values[offset + lane] - track.values[lane]) ** 2;
    maximum = Math.max(maximum, Math.sqrt(square));
  }
  return maximum;
};
const clips = new Map(gltf.animations.map((clip) => [clip.name, clip]));
const required = ['idle', 'shoot', 'reload_tactical', 'reload_empty', 'inspect'];
const scene = gltf.scene;
const gun = scene.getObjectByName('GEO_WEAPON_PISTOL_SK_G18');
const mint = scene.getObjectByName('MINT_WEAPON_PISTOL');
const muzzle = scene.getObjectByName('SOCKET_MINT_MUZZLE');
const sight = scene.getObjectByName('SOCKET_MINT_SIGHT');
const arms = scene.getObjectByName('RIG_FP_ARMS');
const weapon = scene.getObjectByName('RIG_WEAPON_PISTOL');
const mag = scene.getObjectByName('Mag');
const slider = scene.getObjectByName('Slider');
const trigger = scene.getObjectByName('Trigger');
const handL = scene.getObjectByName('hand_l');
const handR = scene.getObjectByName('hand_r');
check(cfg.ready === false, 'PT-38 precisa permanecer ready:false');
check(createHash('sha256').update(bytes).digest('hex') === cfg.sha256, 'SHA-256 diverge do manifesto');
check(bytes.length === cfg.bytes, 'tamanho diverge do manifesto');
for (const name of required) check(clips.has(name), `clip ${name} ausente`);
check(gltf.animations.length === required.length, `catálogo inesperado de clips (${[...clips.keys()]})`);
check(Boolean(gun && (gun.isSkinnedMesh || gun.getObjectByProperty('isSkinnedMesh', true))),
  'malha licenciada G18 não preservada');
check(Boolean(mint && muzzle && sight), 'marcador baked e sockets ADS/muzzle ausentes');
check(Boolean(arms && weapon && mag && slider && trigger), 'rig/mecanismos próprios incompletos');
check(Boolean(handL && handR), 'duas mãos completas ausentes');
check(gltf.cameras.some((camera) => camera.isPerspectiveCamera), 'câmera viewmodel ausente');

const mixer = new THREE.AnimationMixer(scene);
const sample = (name, count = 40) => {
  const clip = clips.get(name);
  if (!clip) return [];
  mixer.stopAllAction();
  const action = mixer.clipAction(clip).reset().play();
  const rows = [];
  for (let index = 0; index <= count; index += 1) {
    mixer.setTime(index === count ? Math.max(0, clip.duration - 1e-4) : clip.duration * index / count);
    scene.updateMatrixWorld(true);
    rows.push({
      gun: gun.getWorldPosition(new THREE.Vector3()),
      mag: mag.getWorldPosition(new THREE.Vector3()),
      slider: slider.getWorldPosition(new THREE.Vector3()),
      trigger: trigger.getWorldPosition(new THREE.Vector3()),
      left: handL.getWorldPosition(new THREE.Vector3()),
      right: handR.getWorldPosition(new THREE.Vector3()),
    });
  }
  action.stop(); mixer.update(0); scene.updateMatrixWorld(true);
  return rows;
};
const excursion = (rows, key) => rows.length
  ? Math.max(...rows.map((row) => row[key].distanceTo(rows[0][key]))) : 0;
const endpoint = (rows, key) => rows.length ? rows.at(-1)[key].distanceTo(rows[0][key]) : Infinity;
const metrics = {};
for (const name of required) {
  const rows = sample(name);
  metrics[name] = Object.fromEntries(['gun', 'mag', 'slider', 'trigger', 'left', 'right']
    .map((key) => [`${key}Excursion`, +excursion(rows, key).toFixed(4)]));
  metrics[name].gunEndpoint = +endpoint(rows, 'gun').toFixed(4);
  metrics[name].rightGripDrift = rows.length
    ? +(Math.max(...rows.map((row) => row.right.distanceTo(row.gun)))
      - Math.min(...rows.map((row) => row.right.distanceTo(row.gun)))).toFixed(4) : null;
}
check(metrics.shoot?.sliderExcursion >= 0.015, 'shoot não move o slide próprio');
check(metrics.shoot?.triggerExcursion >= 0.001, 'shoot não move o gatilho próprio');
check(metrics.reload_tactical?.magExcursion >= 0.18, 'reload_tactical não remove o pente');
check(metrics.reload_empty?.magExcursion >= 0.18, 'reload_empty não remove o pente');
check(metrics.inspect?.gunExcursion >= 0.025, 'inspect sem leitura do conjunto');
check(metrics.inspect?.gunEndpoint <= 0.005, 'inspect não fecha no idle');
check(metrics.inspect?.rightGripDrift <= 0.01, 'inspect rompe contato da mão forte');
check(trackMotion(gltf, 'reload_tactical', 'Mag.position') >= 18, 'reload_tactical sem trajetória própria do pente');
check(trackMotion(gltf, 'reload_empty', 'Mag.position') >= 18, 'reload_empty sem trajetória própria do pente');
check(trackMotion(gltf, 'shoot', 'Slider.position') >= 4, 'shoot sem curso próprio do slide');
check(trackMotion(gltf, 'shoot', 'Trigger.quaternion') >= 0.15, 'shoot sem acionamento próprio do gatilho');
check(trackMotion(gltf, 'inspect', 'RIG_FP_ARMS.position') >= 0.08, 'inspect sem movimento autorado do pacote');

const mutants = [];
const freezeTracks = (copy, clipPattern, trackPattern) => {
  for (const clip of copy.animations.filter((candidate) => clipPattern.test(candidate.name))) {
    for (const track of clip.tracks.filter((candidate) => trackPattern.test(candidate.name))) {
      const stride = track.values.length / track.times.length;
      for (let offset = stride; offset < track.values.length; offset += stride) {
        for (let lane = 0; lane < stride; lane += 1) track.values[offset + lane] = track.values[lane];
      }
    }
  }
};
async function mutant(name, mutate) {
  const copy = await loader.parseAsync(buffer.slice(0), '');
  mutate(copy);
  const local = [];
  if (!copy.animations.some((clip) => clip.name === 'inspect')) local.push('inspect ausente');
  if (!copy.scene.getObjectByName('SOCKET_MINT_SIGHT')) local.push('sight ausente');
  if (!copy.scene.getObjectByName('GEO_WEAPON_PISTOL_SK_G18')) local.push('arma ausente');
  if (!copy.scene.getObjectByName('Mag')) local.push('pente ausente');
  if (!copy.scene.getObjectByName('MINT_WEAPON_PISTOL')) local.push('marcador baked ausente');
  if (!copy.cameras.some((camera) => camera.isPerspectiveCamera)) local.push('câmera ausente');
  if (trackMotion(copy, 'reload_tactical', 'Mag.position') < 18) local.push('pente tático congelado');
  if (trackMotion(copy, 'reload_empty', 'Mag.position') < 18) local.push('pente vazio congelado');
  if (trackMotion(copy, 'shoot', 'Slider.position') < 4) local.push('slide congelado');
  if (trackMotion(copy, 'shoot', 'Trigger.quaternion') < 0.15) local.push('gatilho congelado');
  if (trackMotion(copy, 'inspect', 'RIG_FP_ARMS.position') < 0.08) local.push('inspect parado');
  mutants.push({ name, bitten: local.length > 0, firstFailure: local[0] || null });
  if (!local.length) failures.push(`mutante não mordeu: ${name}`);
}
await mutant('sem-inspect', (copy) => { copy.animations = copy.animations.filter((clip) => clip.name !== 'inspect'); });
await mutant('sem-sight', (copy) => { copy.scene.getObjectByName('SOCKET_MINT_SIGHT')?.removeFromParent(); });
await mutant('sem-arma', (copy) => { copy.scene.getObjectByName('GEO_WEAPON_PISTOL_SK_G18')?.removeFromParent(); });
await mutant('sem-pente', (copy) => { copy.scene.getObjectByName('Mag')?.removeFromParent(); });
await mutant('sem-marker-baked', (copy) => { copy.scene.getObjectByName('MINT_WEAPON_PISTOL')?.removeFromParent(); });
await mutant('sem-camera', (copy) => { copy.cameras.length = 0; });
await mutant('pente-congelado', (copy) => freezeTracks(copy, /^reload_/, /^Mag\./));
await mutant('slide-congelado', (copy) => freezeTracks(copy, /^shoot$/, /^Slider\./));
await mutant('gatilho-congelado', (copy) => freezeTracks(copy, /^shoot$/, /^Trigger\./));
await mutant('inspect-parado', (copy) => freezeTracks(copy, /^inspect$/, /^RIG_FP_ARMS\./));

console.log(`VM_PISTOL_PT38=${JSON.stringify({ ok: failures.length === 0, file,
  bytes: bytes.length, sha256: cfg.sha256, clips: required, metrics, mutants, failures })}`);
if (failures.length) process.exitCode = 1;
