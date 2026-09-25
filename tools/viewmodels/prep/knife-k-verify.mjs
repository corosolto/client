#!/usr/bin/env node
/** Gate causal da faca K (knife-k-build.py): rig K, mãos, clipes do contrato VM_MELEE,
 *  câmera da faca aprovada, lâmina presa à mão direita em todos os quadros. */
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
const REQUIRED = ['Idle', 'Draw', 'Slash', 'Stab', 'QuickThrust', 'HeavyStab', 'Inspect'];
// Faca L aprovada: VFOV 50° em 3:2 (knife-hires.glb). A K herda a mesma lente.
const APPROVED_YFOV = 50;
// Cabo na palma: distância cabo↔centro da palma K no espaço do jogo. A faca L aprovada
// chega a 11 cm no Slash (a lâmina gira na mão), medido pelo mesmo ponto nos alvos.
const GRIP_MAX_M = 0.12;
// Curso da PONTA da lâmina: golpe e saque têm de varrer a tela.
const TIP_TRAVEL_MIN_M = 0.06;
const contrato = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/viewmodels/rig-contract.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/viewmodels/melee-candidates.json'), 'utf8'));
const cfg = manifest.candidates.knife;
const file = path.join(ASSET_ROOT, cfg.file);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
if (!fs.existsSync(file)) {
  console.log(`VM_KNIFE_K=${JSON.stringify({ ok: false, failures: [`produto ausente em ${file}`] })}`);
  process.exit(1);
}

async function load() {
  const bytes = fs.readFileSync(file);
  return { bytes, gltf: await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '') };
}

function inspect(gltf) {
  const local = [];
  const localCheck = (condition, message) => { if (!condition) local.push(message); };
  const scene = gltf.scene;
  const clips = new Map(gltf.animations.map((clip) => [clip.name, clip]));
  const knife = scene.getObjectByName('MELEE_KNIFE');
  const camera = gltf.cameras.find((item) => item.isPerspectiveCamera);
  localCheck(Boolean(knife), 'malha MELEE_KNIFE ausente');
  localCheck(Boolean(camera), 'câmera viewmodel ausente');
  if (camera) localCheck(Math.abs(camera.fov - APPROVED_YFOV) < 0.05 && Math.abs(camera.aspect - 1.5) < 1e-3,
    `câmera ${camera.fov.toFixed(2)}°/${camera.aspect.toFixed(3)} ≠ faca aprovada ${APPROVED_YFOV}°/1,5`);
  const bones = new Set();
  scene.traverse((object) => { if (object.isBone) bones.add(object.name); });
  const missing = contrato.rig.ossosDeBraco.filter((bone) => !bones.has(bone));
  localCheck(missing.length === 0, `fora do rig KINEMATION: faltam ${missing.length} ossos (${missing.slice(0, 3).join(', ')})`);
  const layers = new Set();
  let skinned = false;
  scene.traverse((object) => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) if (/CoroSolto_FP_(Hand|Glove|Cloth)$/i.test(material?.name || '')) layers.add(material.name);
    if (object.isSkinnedMesh && (object.skeleton?.bones || []).some((bone) => bone.name === 'hand_r')) skinned = true;
  });
  localCheck(layers.size === 3, `camadas de mãos KINEMATION incompletas (${[...layers]})`);
  localCheck(skinned, 'mãos não estão skinadas no rig KINEMATION');
  for (const name of REQUIRED) localCheck(clips.has(name), `clipe ${name} ausente`);
  if (!knife || !camera) return { failures: local };

  // Espaço do jogo: câmera do GLB na origem (meleevm desfaz a raiz VM_KNIFE_UNITS).
  scene.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  const view = camera.matrixWorld.clone().invert();
  const mixer = new THREE.AnimationMixer(scene);
  const handle = new THREE.Vector3();
  knife.geometry.computeBoundingBox();
  const box = knife.geometry.boundingBox;
  // Cabo = terço de trás do eixo mais longo da malha.
  const size = box.getSize(new THREE.Vector3());
  const axis = size.x > size.y && size.x > size.z ? 'x' : size.y > size.z ? 'y' : 'z';
  const metrics = {};
  const probe = (name, count = 40) => {
    const clip = clips.get(name);
    if (!clip) return null;
    mixer.stopAllAction();
    mixer.clipAction(clip).reset().play();
    let worstGrip = 0, travel = 0, first = null, last = null, tipFirst = null, tipTravel = 0;
    for (let index = 0; index <= count; index += 1) {
      mixer.setTime(Math.min(clip.duration - 1e-4, clip.duration * index / count));
      scene.updateMatrixWorld(true);
      const scale = 0.0135;
      const toGame = (v) => v.applyMatrix4(view).multiplyScalar(scale);
      handle.copy(box.getCenter(new THREE.Vector3()));
      handle[axis] = box.min[axis] + (box.max[axis] - box.min[axis]) * 0.18;
      const handleGame = toGame(handle.clone().applyMatrix4(knife.matrixWorld));
      const wrist = toGame(scene.getObjectByName('hand_r').getWorldPosition(new THREE.Vector3()));
      const knuckle = toGame(scene.getObjectByName('middle_01_r').getWorldPosition(new THREE.Vector3()));
      const palm = wrist.add(knuckle).multiplyScalar(0.5);
      const grip = Math.min(handleGame.distanceTo(palm),
        toGame(box.max.clone().applyMatrix4(knife.matrixWorld)).distanceTo(palm),
        toGame(box.min.clone().applyMatrix4(knife.matrixWorld)).distanceTo(palm));
      worstGrip = Math.max(worstGrip, grip);
      const tipLocal = box.getCenter(new THREE.Vector3());
      tipLocal[axis] = box.max[axis];
      const tip = toGame(tipLocal.applyMatrix4(knife.matrixWorld));
      if (!tipFirst) tipFirst = tip.clone();
      tipTravel = Math.max(tipTravel, tip.distanceTo(tipFirst));
      if (!first) first = handleGame.clone();
      travel = Math.max(travel, handleGame.distanceTo(first));
      last = handleGame.clone();
    }
    return { worstGrip: +worstGrip.toFixed(4), travel: +travel.toFixed(4), tipTravel: +tipTravel.toFixed(4), endToStart: +last.distanceTo(first).toFixed(4) };
  };
  for (const name of REQUIRED) metrics[name] = probe(name);
  for (const name of REQUIRED) {
    if (metrics[name]) localCheck(metrics[name].worstGrip <= GRIP_MAX_M, `${name}: faca sai da mão direita (${(metrics[name].worstGrip * 100).toFixed(1)} cm)`);
  }
  for (const name of ['Slash', 'Stab', 'QuickThrust', 'HeavyStab', 'Draw']) {
    localCheck((metrics[name]?.tipTravel ?? 0) >= TIP_TRAVEL_MIN_M, `${name}: golpe sem curso da ponta (${metrics[name]?.tipTravel})`);
  }
  localCheck((metrics.Inspect?.travel ?? 0) >= 0.05 && (metrics.Inspect?.endToStart ?? 1) <= 0.01, 'Inspect não mostra a lâmina e volta');
  return { failures: local, metrics, bones: bones.size, layers: [...layers] };
}

const { bytes, gltf } = await load();
check(createHash('sha256').update(bytes).digest('hex') === cfg.sha256, 'SHA-256 diverge do manifesto');
check(bytes.length === cfg.bytes, 'tamanho diverge do manifesto');
check(cfg.ready === false, 'produto K da faca aguarda nova aprovação do dono (ready:false no manifesto)');
const primary = inspect(gltf);
failures.push(...primary.failures);

const mutants = [];
async function mutant(name, mutate) {
  const { gltf: copy } = await load();
  mutate(copy);
  const bitten = inspect(copy).failures.length > 0;
  mutants.push({ name, bitten });
  if (!bitten) failures.push(`mutante não mordeu: ${name}`);
}
await mutant('sem-maos', (copy) => { copy.scene.getObjectByName('GEO_FP_SK_Hand')?.removeFromParent(); });
await mutant('sem-inspect', (copy) => { copy.animations = copy.animations.filter((clip) => clip.name !== 'Inspect'); });
await mutant('faca-solta', (copy) => {
  for (const clip of copy.animations) for (const track of clip.tracks.filter((item) => item.name === 'MELEE_KNIFE.position')) {
    for (let index = 0; index < track.values.length; index += 3) track.values[index + 1] += 12;
  }
});
await mutant('golpe-parado', (copy) => {
  const clip = copy.animations.find((item) => item.name === 'Stab');
  clip.tracks = clip.tracks.map((track) => {
    const stride = track.values.length / track.times.length;
    for (let index = stride; index < track.values.length; index += 1) track.values[index] = track.values[index % stride];
    return track;
  });
});
await mutant('lente-trocada', (copy) => { copy.cameras[0].fov = 74; });
await mutant('fora-do-rig', (copy) => { copy.scene.getObjectByName(contrato.rig.ossosDeBraco[0])?.removeFromParent(); });

console.log(`VM_KNIFE_K=${JSON.stringify({ ok: failures.length === 0, file, bytes: bytes.length, sha256: cfg.sha256,
  rigBones: primary.bones, handLayers: primary.layers, metrics: primary.metrics, mutants, failures })}`);
if (failures.length) process.exitCode = 1;
