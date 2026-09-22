#!/usr/bin/env node
/**
 * Gate causal da M400 no rig KINEMATION.
 *
 * A versão anterior deste arquivo fixava a arquitetura antiga: ossos
 * `*_metarig`, pente de reposição, trava e bolt catch separados, e contagens de
 * vértice do produto assado sobre o pacote golden da AK. Aquela M400 reprovava
 * o contrato de rig com ZERO de 55 ossos de braço — re-fixar o gate no produto
 * velho seria carimbar o defeito. O que ele cobra agora é o contrato novo.
 *
 * Reduções assumidas nesta reautoria, e declaradas de propósito: a trava do
 * pente e o bolt catch deixaram de ser peças móveis separadas (a gramática AR
 * do pacote KINEMATION não tem canais para elas) e voltaram a fazer parte do
 * corpo. Em troca, a arma entra no rig único do arsenal.
 */
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
console.warn = (...args) => !/Couldn't load texture/.test(String(args[0] || '')) && warn(...args);
console.error = (...args) => !/Couldn't load texture/.test(String(args[0] || '')) && error(...args);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ASSET_ROOT = path.resolve(process.env.CSBRASIL_VM_ASSET_ROOT
  || '/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-root');
const REQUIRED = ['idle', 'equip_rifle', 'shoot', 'reload_tactical', 'reload_empty', 'inspect'];
const contrato = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/viewmodels/rig-contract.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/viewmodels/rifle-candidates.json'), 'utf8'));
const cfg = manifest.candidates.m400;
const file = path.join(ASSET_ROOT, cfg.file);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

if (!fs.existsSync(file)) {
  console.log(`VM_RIFLE_M400=${JSON.stringify({ ok: false, failures: [`produto ausente em ${file}`] })}`);
  process.exit(1);
}
const bytes = fs.readFileSync(file);
check(createHash('sha256').update(bytes).digest('hex') === cfg.sha256, 'SHA-256 diverge do manifesto');
check(bytes.length === cfg.bytes, 'tamanho diverge do manifesto');
check(cfg.ready === false, 'm400 precisa permanecer ready:false');

const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const scene = gltf.scene;
const clips = new Map(gltf.animations.map((clip) => [clip.name, clip]));
const gun = scene.getObjectByName('MINT_WEAPON_M400');
const mag = scene.getObjectByName('MINT_WEAPON_M400_MAG');
const muzzle = scene.getObjectByName('SOCKET_MINT_MUZZLE');
const sight = scene.getObjectByName('SOCKET_MINT_SIGHT');
check(Boolean(gun), 'corpo MINT_WEAPON_M400 ausente');
check(Boolean(mag), 'carregador separado ausente');
check(Boolean(muzzle && sight), 'sockets de mira e boca do cano ausentes');
check(gltf.cameras.some((camera) => camera.isPerspectiveCamera), 'câmera viewmodel ausente');

// R3: o rig é o do arsenal, não um esqueleto próprio. É o ponto da reautoria.
const ossos = new Set();
scene.traverse((object) => { if (object.isBone) ossos.add(object.name); });
const faltando = contrato.rig.ossosDeBraco.filter((osso) => !ossos.has(osso));
check(faltando.length === 0, `fora do rig do arsenal: faltam ${faltando.length} ossos (ex.: ${faltando.slice(0, 3).join(', ')})`);

// R3: as mãos são as do rig comum, com as três camadas que recebem o atlas.
const camadas = new Set();
scene.traverse((object) => {
  if (!object.isMesh) return;
  for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
    if (/CoroSolto_FP_(Hand|Glove|Cloth)$/i.test(material?.name || '')) camadas.add(material.name);
  }
});
check(camadas.size === 3, `camadas de mãos do rig comum incompletas (${[...camadas]})`);
// A malha de mãos tem de estar PINTADA no rig do arsenal, não só existir: é o
// que separa a reautoria de uma troca cosmética de material.
let maosNoRig = false;
scene.traverse((object) => {
  if (!object.isSkinnedMesh) return;
  const materiais = Array.isArray(object.material) ? object.material : [object.material];
  if (!materiais.some((material) => /CoroSolto_FP_(Hand|Glove|Cloth)$/i.test(material?.name || ''))) return;
  if ((object.skeleton?.bones || []).some((bone) => bone.name === 'hand_l')) maosNoRig = true;
});
check(maosNoRig, 'mãos não estão skinadas no rig do arsenal');

// R5: catálogo de ações igual ao das irmãs de família.
for (const name of REQUIRED) check(clips.has(name), `clipe ${name} ausente`);
check(gltf.animations.length === REQUIRED.length, `catálogo de clipes inesperado (${[...clips.keys()]})`);

// Mecanismo: o carregador sai do poço nas duas recargas e volta ao lugar.
const mixer = new THREE.AnimationMixer(scene);
const excursao = (name, node) => {
  const clip = clips.get(name);
  if (!clip || !node) return null;
  mixer.stopAllAction();
  const action = mixer.clipAction(clip).reset().play();
  const amostras = [];
  for (let index = 0; index <= 40; index += 1) {
    mixer.setTime(clip.duration * index / 40);
    scene.updateMatrixWorld(true);
    amostras.push(node.getWorldPosition(new THREE.Vector3()));
  }
  action.stop();
  return {
    excursao: +Math.max(...amostras.map((p) => p.distanceTo(amostras[0]))).toFixed(4),
    volta: +amostras.at(-1).distanceTo(amostras[0]).toFixed(4),
  };
};
const metricas = {};
for (const name of ['reload_tactical', 'reload_empty']) {
  const medida = excursao(name, mag);
  metricas[name] = medida;
  check(medida && medida.excursao >= 0.05, `${name} não tira o carregador do poço`);
  check(medida && medida.volta <= 0.02, `${name} não devolve o carregador ao lugar`);
}
const idle = excursao('idle', mag);
metricas.idle = idle;
check(idle && idle.excursao <= 0.01, 'carregador se mexe no idle');

console.log(`VM_RIFLE_M400=${JSON.stringify({ ok: failures.length === 0, file, bytes: bytes.length, sha256: cfg.sha256, ossosDoContrato: contrato.rig.ossosDeBraco.length - faltando.length, camadasDeMao: [...camadas], clips: [...clips.keys()], metricas, failures })}`);
if (failures.length) process.exitCode = 1;
