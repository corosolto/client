#!/usr/bin/env node
// Gate causal do primeiro candidato final da família AR. O asset permanece
// externo; o repositório contém apenas receita, contrato, hashes e medições.
import * as THREE from '../../../public/vendor/three.module.js';
import { GLTFLoader } from '../../../public/vendor/addons/loaders/GLTFLoader.js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

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

const ROOT = new URL('../../..', import.meta.url).pathname;
const ASSET_ROOT = path.resolve(process.env.CSBRASIL_VM_ASSET_ROOT
  || '/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-root');
const manifest = JSON.parse(readFileSync(path.join(ROOT, 'tools/viewmodels/rifle-candidates.json'), 'utf8'));
const cfg = manifest.candidates.m4;
const file = path.join(ASSET_ROOT, cfg.file);
const REQUIRED = ['idle', 'equip_rifle', 'shoot', 'reload_tactical', 'reload_empty', 'inspect'];

async function load() {
  const bytes = readFileSync(file);
  const loader = new GLTFLoader();
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return { bytes, gltf: await loader.parseAsync(buffer, '') };
}

function inspect(gltf) {
  const failures = [];
  const check = (condition, message) => { if (!condition) failures.push(message); };
  const scene = gltf.scene;
  const clips = new Map(gltf.animations.map((clip) => [clip.name, clip]));
  const gun = scene.getObjectByName('MINT_WEAPON_M4');
  const mag = scene.getObjectByName('MINT_WEAPON_M4_MAG');
  const rig = scene.getObjectByName('RIG_FP_ARMS');
  const muzzle = scene.getObjectByName('SOCKET_MINT_MUZZLE');
  const sight = scene.getObjectByName('SOCKET_MINT_SIGHT');
  check(!!gun, 'corpo MINT_WEAPON_M4 ausente');
  check(!!mag, 'carregador separado ausente');
  check(!!rig, 'rig de mãos ausente');
  check(!!muzzle && !!sight, 'sockets ADS/muzzle ausentes');
  check(gltf.cameras.some((camera) => camera.isPerspectiveCamera), 'câmera viewmodel ausente');
  for (const name of REQUIRED) check(clips.has(name), `clipe ${name} ausente`);
  check(gltf.animations.length === REQUIRED.length, `catálogo de clipes inesperado (${[...clips.keys()]})`);
  const handMaterials = new Set();
  scene.traverse((node) => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) if (/CoroSolto_(FP_|Mandrake_)/i.test(material?.name || '')) handMaterials.add(material.name);
  });
  check(handMaterials.size >= 3, `camadas de mãos insuficientes (${[...handMaterials]})`);

  const mixer = new THREE.AnimationMixer(scene);
  const sample = (name, count = 30) => {
    const clip = clips.get(name);
    if (!clip || !gun || !mag || !rig) return [];
    mixer.stopAllAction();
    const action = mixer.clipAction(clip).reset().play();
    const rows = [];
    for (let index = 0; index <= count; index += 1) {
      const time = index === count ? Math.max(0, clip.duration - 1e-4) : clip.duration * index / count;
      mixer.setTime(time); scene.updateMatrixWorld(true);
      const gunInv = gun.matrixWorld.clone().invert();
      rows.push({
        mag: mag.getWorldPosition(new THREE.Vector3()).applyMatrix4(gunInv),
        gun: gun.getWorldPosition(new THREE.Vector3()),
        rig: rig.getWorldPosition(new THREE.Vector3()),
      });
    }
    action.stop(); mixer.update(0); scene.updateMatrixWorld(true);
    return rows;
  };
  const excursion = (rows, key) => rows.length ? Math.max(...rows.map((row) => row[key].distanceTo(rows[0][key]))) : 0;
  const endpoint = (rows, key) => rows.length ? rows.at(-1)[key].distanceTo(rows[0][key]) : Infinity;
  const metrics = {};
  const idleRows = sample('idle');
  const idleGun = idleRows[0]?.gun;
  for (const name of REQUIRED) {
    const rows = sample(name);
    metrics[name] = {
      magExcursion: +excursion(rows, 'mag').toFixed(4),
      gunExcursion: +excursion(rows, 'gun').toFixed(4),
      rigGunDrift: rows.length ? +(Math.max(...rows.map((row) => row.rig.distanceTo(row.gun)))
        - Math.min(...rows.map((row) => row.rig.distanceTo(row.gun)))).toFixed(4) : null,
      endGun: +endpoint(rows, 'gun').toFixed(4),
      endToIdle: rows.length && idleGun ? +rows.at(-1).gun.distanceTo(idleGun).toFixed(4) : null,
      endMag: +endpoint(rows, 'mag').toFixed(4),
    };
  }
  for (const name of ['reload_tactical', 'reload_empty']) {
    check(metrics[name]?.magExcursion >= 0.30, `${name}: carregador não sai do poço`);
    check(metrics[name]?.endMag <= 0.01, `${name}: carregador não reassenta`);
    check(metrics[name]?.endGun <= 0.02, `${name}: arma não retorna ao idle`);
  }
  check(metrics.shoot?.gunExcursion >= 0.04 && metrics.shoot?.gunExcursion <= 0.12, 'shoot sem recuo próprio ou exagerado');
  check(metrics.inspect?.gunExcursion >= 0.15 && metrics.inspect?.gunExcursion <= 0.40, 'inspect sem leitura lateral ou exagerado');
  check(metrics.equip_rifle?.gunExcursion >= 0.25 && metrics.equip_rifle?.endToIdle <= 0.02, 'equip não entra e assenta no idle');
  check(metrics.shoot?.rigGunDrift <= 0.005, 'shoot: mãos perderam contato rígido com a arma');
  check(metrics.inspect?.rigGunDrift <= 0.05, 'inspect: mãos perderam contato rígido com a arma');
  check(metrics.equip_rifle?.rigGunDrift <= 0.005, 'equip_rifle: mãos perderam contato rígido com a arma');
  const tactical = clips.get('reload_tactical');
  const empty = clips.get('reload_empty');
  const signature = (clip) => createHash('sha256').update(Buffer.concat(clip.tracks.map((track) =>
    Buffer.from(track.values.buffer, track.values.byteOffset, track.values.byteLength)))).digest('hex');
  if (tactical && empty) check(signature(tactical) !== signature(empty), 'recargas tática e vazia são idênticas');

  if (gun && muzzle && sight) {
    const box = new THREE.Box3().setFromObject(gun);
    const expanded = box.clone().expandByScalar(0.02);
    check(expanded.containsPoint(muzzle.getWorldPosition(new THREE.Vector3())), 'muzzle fora da arma');
    check(expanded.containsPoint(sight.getWorldPosition(new THREE.Vector3())), 'sight fora da arma');
  }
  return { failures, metrics };
}

const { bytes, gltf } = await load();
const failures = [];
if (createHash('sha256').update(bytes).digest('hex') !== cfg.sha256) failures.push('SHA-256 divergente do manifesto');
if (bytes.length !== cfg.bytes) failures.push('tamanho divergente do manifesto');
const primary = inspect(gltf); failures.push(...primary.failures);

const mutants = [];
async function mutant(name, mutate) {
  const { gltf: copy } = await load();
  mutate(copy);
  const result = inspect(copy);
  const bitten = result.failures.length > 0;
  mutants.push({ name, bitten, firstFailure: result.failures[0] || null });
  if (!bitten) failures.push(`mutante não mordeu: ${name}`);
}
await mutant('sem-shoot', (copy) => { copy.animations = copy.animations.filter((clip) => clip.name !== 'shoot'); });
await mutant('sem-mag', (copy) => { copy.scene.getObjectByName('MINT_WEAPON_M4_MAG')?.removeFromParent(); });
await mutant('mag-congelado', (copy) => {
  for (const clip of copy.animations.filter((item) => /^reload_/.test(item.name))) {
    for (const track of clip.tracks.filter((item) => item.name.startsWith('MINT_WEAPON_M4_MAG.'))) {
      const stride = track.values.length / track.times.length;
      for (let i = stride; i < track.values.length; i += 1) track.values[i] = track.values[i % stride];
    }
  }
});
await mutant('recargas-iguais', (copy) => {
  const empty = copy.animations.find((clip) => clip.name === 'reload_empty');
  const tactical = copy.animations.find((clip) => clip.name === 'reload_tactical');
  tactical.tracks = empty.tracks.map((track) => track.clone());
});
await mutant('sem-sight', (copy) => { copy.scene.getObjectByName('SOCKET_MINT_SIGHT')?.removeFromParent(); });
await mutant('sem-camera', (copy) => { copy.cameras.length = 0; });
await mutant('inspect-parado', (copy) => {
  const clip = copy.animations.find((item) => item.name === 'inspect');
  for (const track of clip.tracks.filter((item) => /^(MINT_WEAPON_M4|RIG_FP_ARMS|VM_PACKAGE_M4)\./.test(item.name))) {
    const stride = track.values.length / track.times.length;
    for (let i = stride; i < track.values.length; i += 1) track.values[i] = track.values[i % stride];
  }
});

console.log(`VM_RIFLE_M4=${JSON.stringify({ ok: failures.length === 0, file, bytes: bytes.length,
  sha256: cfg.sha256, clips: REQUIRED, metrics: primary.metrics, mutants, failures })}`);
if (failures.length) process.exitCode = 1;
