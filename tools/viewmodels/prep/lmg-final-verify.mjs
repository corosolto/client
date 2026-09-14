#!/usr/bin/env node
// Gate causal da LMG final. O estado anterior falha sem manifesto/produto baked.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as THREE from '../../../public/vendor/three.module.js';
import { GLTFLoader } from '../../../public/vendor/addons/loaders/GLTFLoader.js';
globalThis.Image = class { constructor() { this.onload = null; this.width = 1; this.height = 1; } set src(value) { this._src = value; queueMicrotask(() => this.onload?.()); } };
globalThis.self = globalThis;
globalThis.ImageData = class { constructor(data, width, height) { Object.assign(this, { data, width, height }); } };
const warn = console.warn, error = console.error;
console.warn = (...args) => !String(args[0] || '').startsWith("THREE.GLTFLoader: Couldn't load texture blob:") && warn(...args);
console.error = (...args) => String(args[0] || '') !== "THREE.GLTFLoader: Couldn't load texture" && error(...args);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ASSET_ROOT = path.resolve(process.env.CSBRASIL_VM_ASSET_ROOT || '/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-root');
const MANIFEST = path.join(ROOT, 'tools/viewmodels/heavy-candidates.json');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
const cfg = manifest.candidates?.lmg;
check(Boolean(cfg), 'entrada lmg ausente do manifesto');
const file = cfg ? path.join(ASSET_ROOT, cfg.file) : '';
check(Boolean(file) && fs.existsSync(file), `produto lmg ausente em ${file || '<sem rota>'}`);
if (!file || !fs.existsSync(file)) {
  console.log(`VM_HEAVY_LMG=${JSON.stringify({ ok: false, file, failures })}`);
  process.exit(1);
}
const bytes = fs.readFileSync(file);
const loader = new GLTFLoader();
const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
const gltf = await loader.parseAsync(buffer, '');
const trackMotion = (document, clipName, trackName) => {
  const track = document.animations.find((clip) => clip.name === clipName)?.tracks.find((candidate) => candidate.name === trackName);
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
// O saque desta família vem do pacote General do runtime, como na P90.
const required = ['idle', 'shoot', 'reload_tactical', 'reload_empty', 'inspect'];
const scene = gltf.scene;
const gun = scene.getObjectByName('GEO_WEAPON_LMG_MGX5');
const mint = scene.getObjectByName('MINT_WEAPON_LMG');
const muzzle = scene.getObjectByName('SOCKET_MINT_MUZZLE');
const sight = scene.getObjectByName('SOCKET_MINT_SIGHT');
const arms = scene.getObjectByName('RIG_FP_ARMS');
const weapon = scene.getObjectByName('RIG_WEAPON_LMG');
const box = scene.getObjectByName('MINT_AMMO_LMG_BOX');
const belt = scene.getObjectByName('MINT_AMMO_LMG_BELT');
const cover = scene.getObjectByName('MINT_MECH_LMG_COVER');
const tray = scene.getObjectByName('MINT_MECH_LMG_FEED_TRAY');
const charger = scene.getObjectByName('MINT_MECH_LMG_CHARGER');
const handL = scene.getObjectByName('hand_l');
const handR = scene.getObjectByName('hand_r');
check(cfg.ready === false, 'lmg precisa permanecer ready:false');
check(createHash('sha256').update(bytes).digest('hex') === cfg.sha256, 'SHA-256 diverge do manifesto');
check(bytes.length === cfg.bytes, 'tamanho diverge do manifesto');
for (const name of required) check(clips.has(name), `clip ${name} ausente`);
check(Boolean(gun && (gun.isMesh || gun.children.some((child) => child.isMesh))), 'malha MGX5 própria não preservada');
check(Boolean(mint && muzzle && sight), 'marcador baked e sockets ADS/muzzle ausentes');
check(Boolean(arms && weapon && box && belt && cover && tray && charger), 'rig, cinto/caixa ou mecanismos próprios incompletos');
check(Boolean(handL && handR), 'duas mãos completas ausentes');
check(gltf.cameras.some((camera) => camera.isPerspectiveCamera), 'câmera viewmodel ausente');
const mixer = new THREE.AnimationMixer(scene);
const sample = (name, count = 50) => {
  const clip = clips.get(name); if (!clip) return [];
  mixer.stopAllAction(); const action = mixer.clipAction(clip).reset().play(); const rows = [];
  for (let index = 0; index <= count; index += 1) {
    mixer.setTime(index === count ? Math.max(0, clip.duration - 1e-4) : clip.duration * index / count);
    scene.updateMatrixWorld(true);
    rows.push(Object.fromEntries(Object.entries({ gun, box, belt, cover, tray, charger, left: handL, right: handR })
      .map(([key, node]) => [key, node.getWorldPosition(new THREE.Vector3())])));
  }
  action.stop(); mixer.update(0); return rows;
};
const excursion = (rows, key) => rows.length ? Math.max(...rows.map((row) => row[key].distanceTo(rows[0][key]))) : 0;
const endpoint = (rows, key) => rows.length ? rows.at(-1)[key].distanceTo(rows[0][key]) : Infinity;
const drift = (rows, key) => rows.length ? +(Math.max(...rows.map((row) => row[key].distanceTo(row.gun))) - Math.min(...rows.map((row) => row[key].distanceTo(row.gun)))).toFixed(4) : null;
const metrics = {};
for (const name of required) {
  const rows = sample(name);
  metrics[name] = Object.fromEntries(['gun', 'box', 'belt', 'cover', 'tray', 'charger', 'left', 'right'].map((key) => [`${key}Excursion`, +excursion(rows, key).toFixed(4)]));
  metrics[name].gunEndpoint = +endpoint(rows, 'gun').toFixed(4);
  metrics[name].boxEndpoint = +endpoint(rows, 'box').toFixed(4);
  metrics[name].rightGripDrift = drift(rows, 'right');
  metrics[name].leftGripDrift = drift(rows, 'left');
}
// Cinto em cm no rig da arma (um elo = 0,89); raiz dos braços em metro.
check(trackMotion(gltf, 'shoot', 'MINT_AMMO_LMG_BELT.position') >= 0.5, 'shoot não puxa o cinto próprio');
check(trackMotion(gltf, 'shoot', 'RIG_FP_ARMS.position') >= 0.01, 'shoot sem recuo do conjunto');
check(metrics.shoot?.rightGripDrift <= 0.02 && metrics.shoot?.leftGripDrift <= 0.02, 'shoot solta uma das mãos da arma');
for (const name of ['reload_tactical', 'reload_empty']) {
  check(metrics[name]?.boxExcursion >= 0.5, `${name} não troca a caixa própria`);
  check(metrics[name]?.coverExcursion >= 0.5, `${name} não abre a tampa própria`);
  check(metrics[name]?.leftExcursion >= 0.15, `${name} não move a mão de apoio`);
  check(metrics[name]?.rightExcursion >= 0.15, `${name} não move a mão forte`);
  check(metrics[name]?.gunEndpoint <= 0.01 && metrics[name]?.boxEndpoint <= 0.01, `${name} não devolve arma e caixa ao idle`);
}
check(metrics.reload_empty?.trayExcursion >= 0.4, 'reload_empty não assenta o cinto na bandeja');
check(metrics.inspect?.gunExcursion >= 0.02, 'inspect sem leitura do conjunto');
check(metrics.inspect?.gunEndpoint <= 0.01, 'inspect não fecha no idle');
check(metrics.inspect?.rightGripDrift <= 0.02, 'inspect rompe contato da mão forte');
const mutants = [];
const freezeTracks = (copy, clipPattern, trackPattern) => {
  for (const clip of copy.animations.filter((candidate) => clipPattern.test(candidate.name))) for (const track of clip.tracks.filter((candidate) => trackPattern.test(candidate.name))) {
    const stride = track.values.length / track.times.length;
    for (let offset = stride; offset < track.values.length; offset += stride) for (let lane = 0; lane < stride; lane += 1) track.values[offset + lane] = track.values[lane];
  }
};
const sampleOf = (copy, name, nodeName, count = 50) => {
  const clip = copy.animations.find((candidate) => candidate.name === name); const node = copy.scene.getObjectByName(nodeName);
  if (!clip || !node) return 0;
  const copyMixer = new THREE.AnimationMixer(copy.scene); const action = copyMixer.clipAction(clip).reset().play(); const rows = [];
  for (let index = 0; index <= count; index += 1) { copyMixer.setTime(clip.duration * index / count); copy.scene.updateMatrixWorld(true); rows.push(node.getWorldPosition(new THREE.Vector3())); }
  action.stop();
  return Math.max(...rows.map((row) => row.distanceTo(rows[0])));
};
async function mutant(name, mutate, verify) {
  const copy = await loader.parseAsync(buffer.slice(0), ''); mutate(copy);
  const bitten = verify(copy); mutants.push({ name, bitten }); if (!bitten) failures.push(`mutante não mordeu: ${name}`);
}
await mutant('sem-inspect', (copy) => { copy.animations = copy.animations.filter((clip) => clip.name !== 'inspect'); }, (copy) => !copy.animations.some((clip) => clip.name === 'inspect'));
await mutant('sem-sight', (copy) => copy.scene.getObjectByName('SOCKET_MINT_SIGHT')?.removeFromParent(), (copy) => !copy.scene.getObjectByName('SOCKET_MINT_SIGHT'));
await mutant('sem-arma', (copy) => copy.scene.getObjectByName('GEO_WEAPON_LMG_MGX5')?.removeFromParent(), (copy) => !copy.scene.getObjectByName('GEO_WEAPON_LMG_MGX5'));
await mutant('sem-caixa', (copy) => copy.scene.getObjectByName('MINT_AMMO_LMG_BOX')?.removeFromParent(), (copy) => !copy.scene.getObjectByName('MINT_AMMO_LMG_BOX'));
await mutant('sem-marker', (copy) => copy.scene.getObjectByName('MINT_WEAPON_LMG')?.removeFromParent(), (copy) => !copy.scene.getObjectByName('MINT_WEAPON_LMG'));
await mutant('cinto-congelado', (copy) => freezeTracks(copy, /^shoot$/, /^MINT_AMMO_LMG_BELT\./), (copy) => trackMotion(copy, 'shoot', 'MINT_AMMO_LMG_BELT.position') < 0.5);
await mutant('caixa-congelada', (copy) => freezeTracks(copy, /^reload_tactical$/, /^MINT_AMMO_LMG_BOX\./), (copy) => sampleOf(copy, 'reload_tactical', 'MINT_AMMO_LMG_BOX') < 0.5);
await mutant('tampa-congelada', (copy) => freezeTracks(copy, /^reload_empty$/, /^MINT_MECH_LMG_COVER\./), (copy) => sampleOf(copy, 'reload_empty', 'MINT_MECH_LMG_COVER') < 0.5);
await mutant('apoio-congelado', (copy) => freezeTracks(copy, /^reload_tactical$/, /^(clavicle|upperarm|lowerarm|hand)_l\./), (copy) => sampleOf(copy, 'reload_tactical', 'hand_l') < 0.15);
await mutant('inspect-parado', (copy) => freezeTracks(copy, /^inspect$/, /^RIG_FP_ARMS\./), (copy) => trackMotion(copy, 'inspect', 'RIG_FP_ARMS.quaternion') < 0.02);
console.log(`VM_HEAVY_LMG=${JSON.stringify({ ok: failures.length === 0, file, bytes: bytes.length, sha256: cfg.sha256, clips: required, metrics, mutants, failures })}`);
if (failures.length) process.exitCode = 1;
