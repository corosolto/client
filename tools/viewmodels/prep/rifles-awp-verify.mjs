#!/usr/bin/env node
/** Gate causal da AWP reautorada sobre o rig KINEMATION comum. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as THREE from '../../../public/vendor/three.module.js';
import { GLTFLoader } from '../../../public/vendor/addons/loaders/GLTFLoader.js';

globalThis.Image = class { constructor() { this.onload = null; this.width = 1; this.height = 1; } set src(v) { this._src = v; queueMicrotask(() => this.onload?.()); } };
globalThis.self = globalThis;
globalThis.ImageData = class { constructor(d, w, h) { Object.assign(this, { data: d, width: w, height: h }); } };
const warn = console.warn, error = console.error;
console.warn = (...args) => !/Couldn't load texture|PropertyBinding/.test(String(args[0] || '')) && warn(...args);
console.error = (...args) => !/Couldn't load texture/.test(String(args[0] || '')) && error(...args);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ASSET_ROOT = path.resolve(process.env.CSBRASIL_VM_ASSET_ROOT
  || '/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-root');
const REQUIRED = ['idle', 'equip_rifle', 'shoot', 'reload_tactical', 'reload_empty', 'inspect'];
const contrato = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/viewmodels/rig-contract.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/viewmodels/rifle-candidates.json'), 'utf8'));
const cfg = manifest.candidates.awp;
const file = path.join(ASSET_ROOT, cfg.file);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

if (!fs.existsSync(file)) {
  console.log(`VM_RIFLE_AWP=${JSON.stringify({ ok: false, failures: [`produto ausente em ${file}`] })}`);
  process.exit(1);
}

async function load() {
  const bytes = fs.readFileSync(file);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return { bytes, gltf: await new GLTFLoader().parseAsync(buffer, '') };
}

function inspect(gltf) {
  const localFailures = [];
  const localCheck = (condition, message) => { if (!condition) localFailures.push(message); };
  const scene = gltf.scene;
  const clips = new Map(gltf.animations.map((clip) => [clip.name, clip]));
  const gun = scene.getObjectByName('MINT_WEAPON_AWP');
  const mag = scene.getObjectByName('MINT_WEAPON_AWP_MAG');
  const bolt = scene.getObjectByName('MINT_BOLT_AWP');
  const muzzle = scene.getObjectByName('SOCKET_MINT_MUZZLE');
  const sight = scene.getObjectByName('SOCKET_MINT_SIGHT');
  localCheck(Boolean(gun), 'corpo MINT_WEAPON_AWP ausente');
  localCheck(Boolean(mag), 'pente integral separado ausente');
  localCheck(Boolean(bolt), 'alavanca real do ferrolho ausente');
  localCheck(Boolean(muzzle && sight), 'sockets de ADS e boca ausentes');
  localCheck(gltf.cameras.some((camera) => camera.isPerspectiveCamera), 'câmera viewmodel ausente');

  const bones = new Set();
  scene.traverse((object) => { if (object.isBone) bones.add(object.name); });
  const missingBones = contrato.rig.ossosDeBraco.filter((bone) => !bones.has(bone));
  localCheck(missingBones.length === 0,
    `fora do rig KINEMATION: faltam ${missingBones.length} ossos (${missingBones.slice(0, 3).join(', ')})`);

  const handLayers = new Set();
  let handsSkinned = false;
  scene.traverse((object) => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (/CoroSolto_FP_(Hand|Glove|Cloth)$/i.test(material?.name || '')) handLayers.add(material.name);
    }
    if (object.isSkinnedMesh
      && materials.some((material) => /CoroSolto_FP_(Hand|Glove|Cloth)$/i.test(material?.name || ''))
      && (object.skeleton?.bones || []).some((bone) => bone.name === 'hand_l')) handsSkinned = true;
  });
  localCheck(handLayers.size === 3, `camadas de mãos KINEMATION incompletas (${[...handLayers]})`);
  localCheck(handsSkinned, 'mãos não estão skinadas no rig KINEMATION');

  localCheck((gun?.geometry?.attributes?.position?.count || 0) === 6116,
    `corpo não corresponde à AWP pública (${gun?.geometry?.attributes?.position?.count || 0} vértices)`);
  localCheck((mag?.geometry?.attributes?.position?.count || 0) === 294,
    `pente integral divergente (${mag?.geometry?.attributes?.position?.count || 0} vértices)`);
  localCheck((bolt?.geometry?.attributes?.position?.count || 0) === 78,
    `alavanca do ferrolho divergente (${bolt?.geometry?.attributes?.position?.count || 0} vértices)`);
  localCheck(!scene.getObjectByName('MINT_MAG_RELEASE_AWP'),
    'produto inventa trava de pente que a fonte traz fundida ao receiver');
  if (gun) {
    gun.geometry.computeBoundingBox();
    const size = gun.geometry.boundingBox.getSize(new THREE.Vector3());
    const visualLength = Math.max(size.x, size.y, size.z) * Math.max(gun.scale.x, gun.scale.y, gun.scale.z);
    localCheck(Math.abs(visualLength - 1.15) <= 0.004,
      `comprimento visual ${visualLength.toFixed(4)} fora de 1,15 m`);
  }

  for (const name of REQUIRED) localCheck(clips.has(name), `clipe ${name} ausente`);
  localCheck(gltf.animations.length === REQUIRED.length,
    `catálogo de clipes inesperado (${[...clips.keys()]})`);

  const mixer = new THREE.AnimationMixer(scene);
  const sample = (name, count = 40) => {
    const clip = clips.get(name);
    if (!clip || !gun || !mag || !bolt) return [];
    mixer.stopAllAction();
    const action = mixer.clipAction(clip).reset().play();
    const rows = [];
    for (let index = 0; index <= count; index += 1) {
      const time = index === count ? Math.max(0, clip.duration - 1e-4) : clip.duration * index / count;
      mixer.setTime(time);
      scene.updateMatrixWorld(true);
      const gunWorld = gun.getWorldPosition(new THREE.Vector3());
      rows.push({
        gun: gunWorld,
        mag: mag.getWorldPosition(new THREE.Vector3()).sub(gunWorld),
        bolt: bolt.getWorldPosition(new THREE.Vector3()).sub(gunWorld),
      });
    }
    action.stop();
    mixer.update(0);
    return rows;
  };
  const excursion = (rows, key) => rows.length
    ? Math.max(...rows.map((row) => row[key].distanceTo(rows[0][key]))) : 0;
  const endpoint = (rows, key) => rows.length
    ? rows.at(-1)[key].distanceTo(rows[0][key]) : Infinity;
  const metrics = {};
  const idleRows = sample('idle');
  const idleGun = idleRows[0]?.gun;
  for (const name of REQUIRED) {
    const rows = sample(name);
    metrics[name] = {
      gunExcursion: +excursion(rows, 'gun').toFixed(4),
      magExcursion: +excursion(rows, 'mag').toFixed(4),
      boltExcursion: +excursion(rows, 'bolt').toFixed(4),
      endGun: +endpoint(rows, 'gun').toFixed(4),
      endToIdle: rows.length && idleGun ? +rows.at(-1).gun.distanceTo(idleGun).toFixed(4) : null,
      endMag: +endpoint(rows, 'mag').toFixed(4),
      endBolt: +endpoint(rows, 'bolt').toFixed(4),
    };
  }
  localCheck(metrics.idle?.gunExcursion <= 0.005 && metrics.idle?.magExcursion <= 0.005,
    'idle não permanece estável');
  for (const name of ['reload_tactical', 'reload_empty']) {
    localCheck(metrics[name]?.magExcursion >= 0.05, `${name} não tira o pente do poço`);
    localCheck(metrics[name]?.endMag <= 0.02, `${name} não devolve o pente ao poço`);
    localCheck(metrics[name]?.endBolt <= 0.01, `${name} não devolve o ferrolho ao fechamento`);
  }
  localCheck(metrics.reload_tactical?.boltExcursion <= 0.001, 'reload_tactical não deveria ciclar o ferrolho');
  localCheck(metrics.reload_empty?.boltExcursion >= 0.08, 'reload_empty sem ciclo do ferrolho');
  localCheck(metrics.shoot?.boltExcursion >= 0.08, 'shoot não cicla o ferrolho');
  localCheck(metrics.shoot?.endBolt <= 0.01, 'shoot não devolve o ferrolho ao fechamento');
  localCheck(metrics.shoot?.gunExcursion >= 0.01 && metrics.shoot?.endToIdle <= 0.02,
    'shoot não tem recuo causal e retorno');
  localCheck(metrics.inspect?.gunExcursion >= 0.05 && metrics.inspect?.endToIdle <= 0.02,
    'inspect não mostra a arma e retorna');
  localCheck(metrics.equip_rifle?.gunExcursion >= 0.10 && metrics.equip_rifle?.endToIdle <= 0.03,
    'equip_rifle não tem saque causal e retorno');
  const tactical = clips.get('reload_tactical');
  const empty = clips.get('reload_empty');
  const signature = (clip) => createHash('sha256').update(Buffer.concat(clip.tracks.map((track) =>
    Buffer.from(track.values.buffer, track.values.byteOffset, track.values.byteLength)))).digest('hex');
  if (tactical && empty) localCheck(signature(tactical) !== signature(empty),
    'recargas tática e vazia são idênticas');
  return { failures: localFailures, metrics, bones: bones.size, missingBones, handLayers: [...handLayers] };
}

const { bytes, gltf } = await load();
check(createHash('sha256').update(bytes).digest('hex') === cfg.sha256, 'SHA-256 diverge do manifesto');
check(bytes.length === cfg.bytes, 'tamanho diverge do manifesto');
check(cfg.ready === false, 'AWP precisa permanecer ready:false');
const primary = inspect(gltf);
failures.push(...primary.failures);

const mutants = [];
async function mutant(name, mutate) {
  const { gltf: copy } = await load();
  mutate(copy);
  const result = inspect(copy);
  const bitten = result.failures.length > 0;
  mutants.push({ name, bitten, firstFailure: result.failures[0] || null });
  if (!bitten) failures.push(`mutante não mordeu: ${name}`);
}
await mutant('sem-osso-do-contrato', (copy) => {
  copy.scene.getObjectByName(contrato.rig.ossosDeBraco[0])?.removeFromParent();
});
await mutant('sem-maos', (copy) => { copy.scene.getObjectByName('GEO_FP_SK_Hand')?.removeFromParent(); });
await mutant('sem-shoot', (copy) => { copy.animations = copy.animations.filter((clip) => clip.name !== 'shoot'); });
await mutant('sem-mag', (copy) => { copy.scene.getObjectByName('MINT_WEAPON_AWP_MAG')?.removeFromParent(); });
await mutant('mag-congelado', (copy) => {
  for (const clip of copy.animations.filter((item) => /^reload_/.test(item.name))) {
    for (const track of clip.tracks.filter((item) => item.name.startsWith('MINT_WEAPON_AWP_MAG.'))) {
      const stride = track.values.length / track.times.length;
      for (let index = stride; index < track.values.length; index += 1) track.values[index] = track.values[index % stride];
    }
  }
});
await mutant('sem-ferrolho', (copy) => { copy.scene.getObjectByName('MINT_BOLT_AWP')?.removeFromParent(); });
await mutant('ferrolho-congelado', (copy) => {
  for (const clip of copy.animations.filter((item) => /^reload_/.test(item.name))) {
    for (const track of clip.tracks.filter((item) => item.name.startsWith('MINT_BOLT_AWP.'))) {
      const stride = track.values.length / track.times.length;
      for (let index = stride; index < track.values.length; index += 1) track.values[index] = track.values[index % stride];
    }
  }
});
await mutant('ferrolho-tiro-congelado', (copy) => {
  const clip = copy.animations.find((item) => item.name === 'shoot');
  for (const track of clip?.tracks.filter((item) => item.name.startsWith('MINT_BOLT_AWP.')) || []) {
    const stride = track.values.length / track.times.length;
    for (let index = stride; index < track.values.length; index += 1) {
      track.values[index] = track.values[index % stride];
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
await mutant('corpo-trocado', (copy) => {
  copy.scene.getObjectByName('MINT_WEAPON_AWP').geometry = copy.scene.getObjectByName('MINT_WEAPON_AWP_MAG').geometry;
});
for (const actionName of ['inspect', 'equip_rifle']) {
  await mutant(`${actionName}-parado`, (copy) => {
    const clip = copy.animations.find((item) => item.name === actionName);
    for (const track of clip.tracks.filter((item) => item.name.startsWith('VM_PACKAGE_AWP.'))) {
      const stride = track.values.length / track.times.length;
      for (let index = stride; index < track.values.length; index += 1) track.values[index] = track.values[index % stride];
    }
  });
}

console.log(`VM_RIFLE_AWP=${JSON.stringify({ ok: failures.length === 0, file,
  bytes: bytes.length, sha256: cfg.sha256, rigBones: primary.bones,
  handLayers: primary.handLayers, clips: REQUIRED, metrics: primary.metrics,
  mutants, failures })}`);
if (failures.length) process.exitCode = 1;
