#!/usr/bin/env node
// Gate causal da shotgun final. O estado anterior falha sem manifesto/produto baked.
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
const DEDOS = {
  indicador: ['index_01_', 'index_02_', 'index_03_'],
  medio: ['middle_01_', 'middle_02_', 'middle_03_'],
  anelar: ['ring_01_', 'ring_02_', 'ring_03_'],
  minimo: ['pinky_01_', 'pinky_02_', 'pinky_03_'],
  polegar: ['thumb_01_', 'thumb_02_', 'thumb_03_'],
};
const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
const cfg = manifest.candidates?.shotgun;
check(Boolean(cfg), 'entrada shotgun ausente do manifesto');
const file = cfg ? path.join(ASSET_ROOT, cfg.file) : '';
check(Boolean(file) && fs.existsSync(file), `produto shotgun ausente em ${file || '<sem rota>'}`);
if (!file || !fs.existsSync(file)) {
  console.log(`VM_HEAVY_SHOTGUN=${JSON.stringify({ ok: false, file, failures })}`);
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
const required = ['idle', 'shoot', 'equip_rifle', 'reload_start', 'reload_loop', 'reload_end', 'inspect'];
const scene = gltf.scene;
const gun = scene.getObjectByName('GEO_WEAPON_SHOTGUN_KXG12');
const mint = scene.getObjectByName('MINT_WEAPON_SHOTGUN');
const muzzle = scene.getObjectByName('SOCKET_MINT_MUZZLE');
const sight = scene.getObjectByName('SOCKET_MINT_SIGHT');
const arms = scene.getObjectByName('RIG_FP_ARMS');
const weapon = scene.getObjectByName('RIG_WEAPON_SHOTGUN');
const shell = scene.getObjectByName('MINT_AMMO_SHOTGUN_GAUGE');
const pump = scene.getObjectByName('MINT_MECH_SHOTGUN_PUMP');
const trigger = scene.getObjectByName('MINT_MECH_SHOTGUN_TRIGGER');
const handL = scene.getObjectByName('hand_l');
const handR = scene.getObjectByName('hand_r');
check(cfg.ready === false, 'shotgun precisa permanecer ready:false');
check(createHash('sha256').update(bytes).digest('hex') === cfg.sha256, 'SHA-256 diverge do manifesto');
check(bytes.length === cfg.bytes, 'tamanho diverge do manifesto');
for (const name of required) check(clips.has(name), `clip ${name} ausente`);
check(Boolean(gun && (gun.isMesh || gun.children.some((child) => child.isMesh))), 'malha KXG12 própria não preservada');
check(Boolean(mint && muzzle && sight), 'marcador baked e sockets ADS/muzzle ausentes');
check(Boolean(arms && weapon && shell && pump && trigger), 'rig, munição ou mecanismos próprios incompletos');
check(Boolean(handL && handR), 'duas mãos completas ausentes');
check(gltf.cameras.some((camera) => camera.isPerspectiveCamera), 'câmera viewmodel ausente');

const medeContatoDedos = (document, mutante = '') => {
  const cena = document.scene;
  const idle = document.animations.find((clip) => clip.name === 'idle');
  let idleMixer = null;
  if (idle) {
    idleMixer = new THREE.AnimationMixer(cena);
    idleMixer.clipAction(idle).play();
    idleMixer.setTime(0);
  }
  if (mutante) {
    const hand = cena.getObjectByName(mutante === 'left' ? 'hand_l' : 'hand_r');
    if (!hand) throw new Error(`mutante de contato sem mão ${mutante}`);
    hand.position.addScalar(20);
  }
  cena.updateMatrixWorld(true);
  // A raiz de produto rebasa escala/distância para que o pull métrico de ADS
  // tenha a proporção correta. Contato é propriedade da malha/rig, então a
  // medida volta ao espaço intrínseco do produto antes de calcular distâncias.
  const product = cena.getObjectByName('VM_PRODUCT_SHOTGUN');
  const productInverse = product ? product.matrixWorld.clone().invert() : new THREE.Matrix4();

  const triangulos = [];
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
  cena.getObjectByName('RIG_WEAPON_SHOTGUN')?.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const pos = mesh.geometry?.attributes?.position;
    if (!pos) return;
    const index = mesh.geometry.index;
    const total = index ? index.count : pos.count;
    for (let offset = 0; offset + 2 < total; offset += 3) {
      const at = (lane, out) => {
        const vi = index ? index.getX(offset + lane) : offset + lane;
        out.fromBufferAttribute(pos, vi);
        if (mesh.isSkinnedMesh) mesh.applyBoneTransform(vi, out);
        return out.applyMatrix4(mesh.matrixWorld).applyMatrix4(productInverse).clone();
      };
      triangulos.push(new THREE.Triangle(at(0, va), at(1, vb), at(2, vc)));
    }
  });
  if (!triangulos.length) throw new Error('contato shotgun sem triângulos de arma');

  const pontos = new Map();
  cena.traverse((mesh) => {
    if (!mesh.isSkinnedMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (!materials.some((material) => /CoroSolto_(?:FP_(?:Hand|Gloves?|Cloth)|Mandrake_Sleeves)/i.test(material?.name || ''))) return;
    const pos = mesh.geometry?.attributes?.position;
    const indices = mesh.geometry?.attributes?.skinIndex;
    const weights = mesh.geometry?.attributes?.skinWeight;
    if (!pos || !indices || !weights) return;
    mesh.skeleton.update();
    const boneNames = mesh.skeleton.bones.map((bone) => bone.name || '');
    for (let vi = 0; vi < pos.count; vi += 1) {
      const slots = [
        [indices.getX(vi), weights.getX(vi)], [indices.getY(vi), weights.getY(vi)],
        [indices.getZ(vi), weights.getZ(vi)], [indices.getW(vi), weights.getW(vi)],
      ];
      const dominante = slots.find(([, weight]) => weight > 0.55);
      if (!dominante) continue;
      const boneName = boneNames[dominante[0]] || '';
      let key = '';
      for (const [finger, bones] of Object.entries(DEDOS)) for (const side of ['r', 'l']) {
        if (bones.some((bone) => boneName === `${bone}${side}`)) key = `${finger}_${side}`;
      }
      if (!key) continue;
      const point = new THREE.Vector3().fromBufferAttribute(pos, vi);
      mesh.applyBoneTransform(vi, point);
      point.applyMatrix4(mesh.matrixWorld).applyMatrix4(productInverse);
      if (!pontos.has(key)) pontos.set(key, []);
      pontos.get(key).push(point);
    }
  });
  const closest = new THREE.Vector3();
  const result = {};
  for (const [key, vertices] of pontos) {
    let best = Infinity;
    for (const point of vertices) for (const triangle of triangulos) {
      triangle.closestPointToPoint(point, closest);
      best = Math.min(best, closest.distanceTo(point));
    }
    result[key] = +(best * 1000).toFixed(2);
  }
  idleMixer?.stopAllAction();
  idleMixer?.uncacheRoot(cena);
  return result;
};

const contatoIdleMm = medeContatoDedos(gltf);
const limiteContato = (finger) => /^(?:minimo|polegar)_/.test(finger) ? 16 : 8;
check(Object.keys(contatoIdleMm).length === 10, `contato mediu ${Object.keys(contatoIdleMm).length}/10 dedos`);
for (const [finger, mm] of Object.entries(contatoIdleMm)) {
  const limit = limiteContato(finger);
  check(mm <= limit, `contato ${finger} ${mm.toFixed(1)} mm (> ${limit} mm)`);
}

const contaTriangulosMangaProximal = (document) => {
  const cloth = document.scene.getObjectByName('GEO_FP_SK_Cloth_01');
  const index = cloth?.geometry?.index;
  const indices = cloth?.geometry?.attributes?.skinIndex;
  const weights = cloth?.geometry?.attributes?.skinWeight;
  if (!cloth?.isSkinnedMesh || !index || !indices || !weights) return Infinity;
  const boneNames = cloth.skeleton.bones.map((bone) => bone.name || '');
  const dominantBone = (vertex) => {
    const slots = [
      [indices.getX(vertex), weights.getX(vertex)], [indices.getY(vertex), weights.getY(vertex)],
      [indices.getZ(vertex), weights.getZ(vertex)], [indices.getW(vertex), weights.getW(vertex)],
    ];
    return boneNames[slots.reduce((best, slot) => slot[1] > best[1] ? slot : best)[0]] || '';
  };
  let total = 0;
  for (let offset = 0; offset + 2 < index.count; offset += 3) {
    if ([0, 1, 2].some((lane) => /^(?:upperarm_twist_01|lowerarm)_[lr]$/.test(dominantBone(index.getX(offset + lane))))) total += 1;
  }
  return total;
};
// Revisão L1 (crítico r2): a manga cortada no antebraço virou o "punho oco vermelho na boca
// do cano". O braço tem de ir inteiro até o ombro; o teto de tela do braço é do eval:vm-frame.
const triangulosMangaProximal = contaTriangulosMangaProximal(gltf);
check(Number.isFinite(triangulosMangaProximal) && triangulosMangaProximal >= 2000,
  `manga cortada ou ausente: ${triangulosMangaProximal} triângulos no braço/antebraço (punho oco)`);

const mixer = new THREE.AnimationMixer(scene);
const productScale = scene.getObjectByName('VM_PRODUCT_SHOTGUN')
  ?.getWorldScale(new THREE.Vector3()).x || 1;
const sample = (name, count = 50) => {
  const clip = clips.get(name); if (!clip) return [];
  mixer.stopAllAction(); const action = mixer.clipAction(clip).reset().play(); const rows = [];
  for (let index = 0; index <= count; index += 1) {
    mixer.setTime(index === count ? Math.max(0, clip.duration - 1e-4) : clip.duration * index / count);
    scene.updateMatrixWorld(true);
    rows.push(Object.fromEntries(Object.entries({ gun, shell, pump, trigger, left: handL, right: handR })
      .map(([key, node]) => [key, node.getWorldPosition(new THREE.Vector3())])));
  }
  action.stop(); mixer.update(0); return rows;
};
const excursion = (rows, key) => rows.length ? Math.max(...rows.map((row) => row[key].distanceTo(rows[0][key]))) / productScale : 0;
const endpoint = (rows, key) => rows.length ? rows.at(-1)[key].distanceTo(rows[0][key]) / productScale : Infinity;
const metrics = {};
for (const name of required) {
  const rows = sample(name);
  metrics[name] = Object.fromEntries(['gun','shell','pump','trigger','left','right'].map((key) => [`${key}Excursion`, +excursion(rows, key).toFixed(4)]));
  metrics[name].gunEndpoint = +endpoint(rows, 'gun').toFixed(4);
  metrics[name].rightGripDrift = rows.length ? +((Math.max(...rows.map((row) => row.right.distanceTo(row.gun))) - Math.min(...rows.map((row) => row.right.distanceTo(row.gun)))) / productScale).toFixed(4) : null;
}
check(trackMotion(gltf, 'shoot', 'MINT_MECH_SHOTGUN_PUMP.position') >= 0.05, 'shoot não cicla o pump próprio');
check(trackMotion(gltf, 'shoot', 'MINT_MECH_SHOTGUN_TRIGGER.quaternion') >= 0.02, 'shoot não aciona o gatilho próprio');
check(metrics.reload_loop?.shellExcursion >= 0.05, 'reload_loop não move o cartucho');
check(metrics.reload_loop?.leftExcursion >= 0.05, 'reload_loop não move a mão de carga');
check(metrics.inspect?.gunExcursion >= 0.02, 'inspect sem leitura do conjunto');
check(metrics.inspect?.gunEndpoint <= 0.01, 'inspect não fecha no idle');
check(metrics.inspect?.rightGripDrift <= 0.02, 'inspect rompe contato da mão forte');
const mutants = [];
const freezeTracks = (copy, clipPattern, trackPattern) => {
  let frozen = 0;
  for (const clip of copy.animations.filter((candidate) => clipPattern.test(candidate.name))) for (const track of clip.tracks.filter((candidate) => trackPattern.test(candidate.name))) {
    const stride = track.values.length / track.times.length;
    for (let offset = stride; offset < track.values.length; offset += stride) for (let lane = 0; lane < stride; lane += 1) track.values[offset + lane] = track.values[lane];
    frozen += 1;
  }
  return frozen;
};
const requireFreeze = (copy, clipPattern, trackPattern) => {
  if (!freezeTracks(copy, clipPattern, trackPattern)) throw new Error(`mutação não aplicou: ${clipPattern}/${trackPattern}`);
};
async function mutant(name, mutate, verify) {
  const copy = await loader.parseAsync(buffer.slice(0), ''); mutate(copy);
  const bitten = verify(copy); mutants.push({ name, bitten }); if (!bitten) failures.push(`mutante não mordeu: ${name}`);
}
await mutant('sem-inspect', (copy) => { copy.animations = copy.animations.filter((clip) => clip.name !== 'inspect'); }, (copy) => !copy.animations.some((clip) => clip.name === 'inspect'));
await mutant('sem-sight', (copy) => copy.scene.getObjectByName('SOCKET_MINT_SIGHT')?.removeFromParent(), (copy) => !copy.scene.getObjectByName('SOCKET_MINT_SIGHT'));
await mutant('sem-arma', (copy) => copy.scene.getObjectByName('GEO_WEAPON_SHOTGUN_KXG12')?.removeFromParent(), (copy) => !copy.scene.getObjectByName('GEO_WEAPON_SHOTGUN_KXG12'));
await mutant('sem-cartucho', (copy) => copy.scene.getObjectByName('MINT_AMMO_SHOTGUN_GAUGE')?.removeFromParent(), (copy) => !copy.scene.getObjectByName('MINT_AMMO_SHOTGUN_GAUGE'));
await mutant('sem-marker', (copy) => copy.scene.getObjectByName('MINT_WEAPON_SHOTGUN')?.removeFromParent(), (copy) => !copy.scene.getObjectByName('MINT_WEAPON_SHOTGUN'));
await mutant('pump-congelado', (copy) => requireFreeze(copy, /^shoot$/, /^MINT_MECH_SHOTGUN_PUMP\./), (copy) => trackMotion(copy, 'shoot', 'MINT_MECH_SHOTGUN_PUMP.position') < 0.05);
await mutant('gatilho-congelado', (copy) => requireFreeze(copy, /^shoot$/, /^MINT_MECH_SHOTGUN_TRIGGER\./), (copy) => trackMotion(copy, 'shoot', 'MINT_MECH_SHOTGUN_TRIGGER.quaternion') < 0.02);
await mutant('cartucho-congelado', (copy) => requireFreeze(copy, /^reload_loop$/, /^MINT_AMMO_SHOTGUN_GAUGE\./), (copy) => trackMotion(copy, 'reload_loop', 'MINT_AMMO_SHOTGUN_GAUGE.position') < 0.05);
await mutant('inspect-parado', (copy) => requireFreeze(copy, /^inspect$/, /^RIG_FP_ARMS\./), (copy) => trackMotion(copy, 'inspect', 'RIG_FP_ARMS.quaternion') < 0.02);
await mutant('solta-mao-esquerda', () => {}, (copy) => Object.entries(medeContatoDedos(copy, 'left')).some(([finger, mm]) => finger.endsWith('_l') && mm > limiteContato(finger)));
await mutant('solta-mao-direita', () => {}, (copy) => Object.entries(medeContatoDedos(copy, 'right')).some(([finger, mm]) => finger.endsWith('_r') && mm > limiteContato(finger)));
await mutant('manga-cortada', (copy) => {
  const cloth = copy.scene.getObjectByName('GEO_FP_SK_Cloth_01');
  const antebraco = cloth.skeleton.bones.findIndex((bone) => bone.name === 'lowerarm_twist_01_l');
  const { skinIndex, skinWeight } = cloth.geometry.attributes;
  for (let vertex = 0; vertex < skinIndex.count; vertex += 1) {
    skinIndex.setXYZW(vertex, antebraco, 0, 0, 0);
    skinWeight.setXYZW(vertex, 1, 0, 0, 0);
  }
}, (copy) => contaTriangulosMangaProximal(copy) < 2000);
console.log(`VM_HEAVY_SHOTGUN=${JSON.stringify({ ok: failures.length === 0, file, bytes: bytes.length, sha256: cfg.sha256, clips: required, metrics, contatoIdleMm, triangulosMangaProximal, mutants, failures })}`);
if (failures.length) process.exitCode = 1;
