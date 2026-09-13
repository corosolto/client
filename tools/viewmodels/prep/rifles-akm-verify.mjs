#!/usr/bin/env node
// Gate causal do candidato AKM. O asset permanece
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
const cfg = manifest.candidates.akm;
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
  const gun = scene.getObjectByName('MINT_WEAPON_AKM');
  const mag = scene.getObjectByName('MINT_WEAPON_AKM_MAG');
  const replacement = scene.getObjectByName('MINT_WEAPON_AKM_REPLACEMENT_MAG');
  const release = scene.getObjectByName('MINT_MAG_RELEASE_AKM');
  const rig = scene.getObjectByName('RIG_FP_ARMS');
  const rifleBone = scene.getObjectByName('Rifle_metarig');
  const magBone = scene.getObjectByName('Mag_metarig');
  const replacementBone = scene.getObjectByName('Mag001_metarig');
  const hand = scene.getObjectByName('handL_metarig');
  const rightHand = scene.getObjectByName('handR_metarig');
  const muzzle = scene.getObjectByName('SOCKET_MINT_MUZZLE');
  const sight = scene.getObjectByName('SOCKET_MINT_SIGHT');
  check(!!gun, 'corpo MINT_WEAPON_AKM ausente');
  check(!!mag, 'carregador separado ausente');
  check(!!replacement, 'carregador de reposição separado ausente');
  check(!!release, 'trava real do pente separada ausente');
  check(!!rig, 'rig de mãos ausente');
  check(!!muzzle && !!sight, 'sockets ADS/muzzle ausentes');
  check(gltf.cameras.some((camera) => camera.isPerspectiveCamera), 'câmera viewmodel ausente');
  check(!!rifleBone && !!magBone && !!replacementBone, 'bones mecânicos da família AK ausentes');
  // O glTF expande vértices por normais/UV; as contagens pós-round-trip
  // congelam as três ilhas obtidas da AKM pública soldada.
  check((gun?.geometry?.attributes?.position?.count || 0) === 6296,
  `corpo não corresponde à malha AKM pública (${gun?.geometry?.attributes?.position?.count || 0} vértices)`);
  check((mag?.geometry?.attributes?.position?.count || 0) === 624,
    `carregador AKM não corresponde ao volume integral (${mag?.geometry?.attributes?.position?.count || 0} vértices)`);
  check((replacement?.geometry?.attributes?.position?.count || 0) === 624,
    `carregador de reposição AKM divergente (${replacement?.geometry?.attributes?.position?.count || 0} vértices)`);
  check((release?.geometry?.attributes?.position?.count || 0) === 140,
    `trava do pente AKM divergente (${release?.geometry?.attributes?.position?.count || 0} vértices)`);
  for (const name of REQUIRED) check(clips.has(name), `clipe ${name} ausente`);
  check(gltf.animations.length === REQUIRED.length, `catálogo de clipes inesperado (${[...clips.keys()]})`);
  const handMaterials = new Set();
  scene.traverse((node) => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) if (/CoroSolto_(FP_|Mandrake_)/i.test(material?.name || '')) handMaterials.add(material.name);
  });
  check(handMaterials.size >= 2, `camadas de mãos insuficientes (${[...handMaterials]})`);

  const mixer = new THREE.AnimationMixer(scene);
  const sample = (name, count = 30) => {
    const clip = clips.get(name);
    if (!clip || !gun || !mag || !rig || !rifleBone || !magBone || !replacementBone) return [];
    mixer.stopAllAction();
    const action = mixer.clipAction(clip).reset().play();
    const rows = [];
    for (let index = 0; index <= count; index += 1) {
      const time = index === count ? Math.max(0, clip.duration - 1e-4) : clip.duration * index / count;
      mixer.setTime(time); scene.updateMatrixWorld(true);
      const rifle = rifleBone.getWorldPosition(new THREE.Vector3());
      const installed = magBone.getWorldPosition(new THREE.Vector3());
      const fresh = replacementBone.getWorldPosition(new THREE.Vector3());
      rows.push({
        mag: installed.sub(rifle),
        replacement: fresh.sub(rifle),
        gun: rifle,
        rig: rig.getWorldPosition(new THREE.Vector3()),
        handToMag: hand ? Math.min(hand.getWorldPosition(new THREE.Vector3()).distanceTo(
          magBone.getWorldPosition(new THREE.Vector3())), hand.getWorldPosition(new THREE.Vector3()).distanceTo(
          replacementBone.getWorldPosition(new THREE.Vector3()))) : Infinity,
        rightToGun: rightHand ? rightHand.getWorldPosition(new THREE.Vector3()).distanceTo(rifle) : Infinity,
      });
    }
    action.stop(); mixer.update(0); scene.updateMatrixWorld(true);
    return rows;
  };
  const excursion = (rows, key) => rows.length ? Math.max(...rows.map((row) => row[key].distanceTo(rows[0][key]))) : 0;
  const endpoint = (rows, key) => rows.length ? rows.at(-1)[key].distanceTo(rows[0][key]) : Infinity;
  const trackExcursion = (clipName, prefix) => {
    const track = clips.get(clipName)?.tracks.find((item) => item.name.startsWith(prefix));
    if (!track) return 0;
    const stride = track.values.length / track.times.length;
    let maximum = 0;
    for (let offset = stride; offset < track.values.length; offset += stride) {
      let square = 0;
      for (let axis = 0; axis < stride; axis += 1) square += (track.values[offset + axis] - track.values[axis]) ** 2;
      maximum = Math.max(maximum, Math.sqrt(square));
    }
    return maximum;
  };
  const metrics = {};
  const idleRows = sample('idle');
  const idleGun = idleRows[0]?.gun;
  for (const name of REQUIRED) {
    const rows = sample(name);
    metrics[name] = {
      magExcursion: +excursion(rows, 'mag').toFixed(4),
      replacementExcursion: +excursion(rows, 'replacement').toFixed(4),
      releaseExcursion: release ? +trackExcursion(name, 'Safety_metarig.position').toFixed(4) : null,
      gunExcursion: +excursion(rows, 'gun').toFixed(4),
      rigGunDrift: rows.length ? +(Math.max(...rows.map((row) => row.rig.distanceTo(row.gun)))
        - Math.min(...rows.map((row) => row.rig.distanceTo(row.gun)))).toFixed(4) : null,
      endGun: +endpoint(rows, 'gun').toFixed(4),
      endToIdle: rows.length && idleGun ? +rows.at(-1).gun.distanceTo(idleGun).toFixed(4) : null,
      endMag: +endpoint(rows, 'mag').toFixed(4),
      handToMagMin: rows.length ? +Math.min(...rows.map((row) => row.handToMag)).toFixed(4) : null,
      rightContactDrift: rows.length ? +(Math.max(...rows.map((row) => row.rightToGun))
        - Math.min(...rows.map((row) => row.rightToGun))).toFixed(4) : null,
    };
  }
  for (const name of ['reload_tactical', 'reload_empty']) {
    check(Math.max(metrics[name]?.magExcursion || 0, metrics[name]?.replacementExcursion || 0) >= 0.45,
      `${name}: carregadores não percorrem remoção e encaixe curvo`);
    check(metrics[name]?.endToIdle <= 0.15, `${name}: arma não fecha perto do idle`);
  }
  check(metrics.shoot?.gunExcursion >= 0.04 && metrics.shoot?.gunExcursion <= 0.12, 'shoot sem recuo próprio ou exagerado');
  check(metrics.reload_tactical?.releaseExcursion >= 0.004, 'reload_tactical sem pressão da trava do pente');
  check(metrics.reload_empty?.releaseExcursion >= 0.004, 'reload_empty sem pressão da trava do pente');
  check(metrics.reload_tactical?.handToMagMin <= 0.27, 'reload_tactical: mão esquerda não alcança o pente curvo');
  check(metrics.reload_empty?.handToMagMin <= 0.27, 'reload_empty: mão esquerda não alcança o pente curvo');
  check(metrics.inspect?.gunExcursion >= 0.15 && metrics.inspect?.gunExcursion <= 0.40, 'inspect sem leitura lateral ou exagerado');
  check(metrics.equip_rifle?.gunExcursion >= 0.25 && metrics.equip_rifle?.endToIdle <= 0.02, 'equip não entra e assenta no idle');
  check(metrics.shoot?.rightContactDrift <= 0.08, 'shoot: mão direita perdeu o punho');
  check(metrics.inspect?.rightContactDrift <= 0.08, 'inspect: mão direita perdeu o punho');
  const tactical = clips.get('reload_tactical');
  const empty = clips.get('reload_empty');
  const signature = (clip) => createHash('sha256').update(Buffer.concat(clip.tracks.map((track) =>
    Buffer.from(track.values.buffer, track.values.byteOffset, track.values.byteLength)))).digest('hex');
  if (tactical && empty) check(signature(tactical) !== signature(empty), 'recargas tática e vazia são idênticas');

  if (gun && muzzle && sight) {
    gun.computeBoundingBox();
    const localDimensions = gun.boundingBox.getSize(new THREE.Vector3());
    check(Math.abs(Math.max(localDimensions.x, localDimensions.y, localDimensions.z) - 0.88) <= 0.04,
      `comprimento visual AKM ${Math.max(localDimensions.x, localDimensions.y, localDimensions.z).toFixed(4)} fora de 0,88 m`);
    const expanded = gun.boundingBox.clone().applyMatrix4(gun.matrixWorld).expandByScalar(0.03);
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
await mutant('sem-mag', (copy) => { copy.scene.getObjectByName('MINT_WEAPON_AKM_MAG')?.removeFromParent(); });
await mutant('mag-congelado', (copy) => {
  for (const clip of copy.animations.filter((item) => /^reload_/.test(item.name))) {
    for (const track of clip.tracks.filter((item) => /^(Mag_metarig|Mag001_metarig)\./.test(item.name))) {
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
await mutant('comando-congelado', (copy) => {
  for (const clip of copy.animations.filter((item) => /^reload_/.test(item.name))) {
   for (const track of clip.tracks.filter((item) => item.name.startsWith('Safety_metarig.'))) {
    const stride = track.values.length / track.times.length;
    for (let i = stride; i < track.values.length; i += 1) track.values[i] = track.values[i % stride];
   }
  }
});
await mutant('corpo-trocado', (copy) => {
  copy.scene.getObjectByName('MINT_WEAPON_AKM').geometry = copy.scene.getObjectByName('MINT_WEAPON_AKM_MAG').geometry;
});
await mutant('inspect-parado', (copy) => {
  const clip = copy.animations.find((item) => item.name === 'inspect');
  for (const track of clip.tracks.filter((item) => item.name.startsWith('metarig_rootJoint.'))) {
    const stride = track.values.length / track.times.length;
    for (let i = stride; i < track.values.length; i += 1) track.values[i] = track.values[i % stride];
  }
});

console.log(`VM_RIFLE_AKM=${JSON.stringify({ ok: failures.length === 0, file, bytes: bytes.length,
  sha256: cfg.sha256, clips: REQUIRED, metrics: primary.metrics, mutants, failures })}`);
if (failures.length) process.exitCode = 1;
