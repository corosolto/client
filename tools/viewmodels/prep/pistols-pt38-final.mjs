#!/usr/bin/env node
/**
 * Fecha a PT-38 a partir do produto KINEMATION X18/G18 aprovado pelo dono.
 * A receita não substitui malha, skins, materiais ou as quatro ações originais:
 * acrescenta somente inspect no root comum e sockets medidos no idle. O produto
 * e o relatório ficam fora do Git.
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as THREE from '../../../public/vendor/three.module.js';
import { GLTFLoader } from '../../../public/vendor/addons/loaders/GLTFLoader.js';

globalThis.Image = class {
  constructor() { this.onload = null; this.width = 1; this.height = 1; }
  set src(value) { this._src = value; queueMicrotask(() => this.onload?.()); }
};
globalThis.self = globalThis;
globalThis.ImageData = class { constructor(data, width, height) { Object.assign(this, { data, width, height }); } };

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SOURCE_SHA = 'edb77908eadffd90fa3c2152ac00386372bf3002d20fb2c4d324d15ddad17e05';
const option = (name) => (process.argv.find((value) => value.startsWith(`--${name}=`)) || '').slice(name.length + 3);
const source = path.resolve(option('source'));
const outputDir = path.resolve(option('output-dir'));
if (!option('source') || !option('output-dir')) throw new Error('uso: --source=<pistol-runtime.glb> --output-dir=<fora-do-git>');
if (!path.relative(REPO, outputDir).startsWith('..')) throw new Error('output-dir precisa ficar fora do Git');
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const sourceBytes = await fs.readFile(source);
if (digest(sourceBytes) !== SOURCE_SHA) throw new Error('fonte PT-38 aprovada ausente ou divergente');

// Mede os sockets no idle real do produto aprovado. O parent local é calculado
// depois de o mixer aplicar o primeiro frame, evitando usar bind pose como pose.
const loader = new GLTFLoader();
const arrayBuffer = sourceBytes.buffer.slice(sourceBytes.byteOffset, sourceBytes.byteOffset + sourceBytes.byteLength);
const runtime = await loader.parseAsync(arrayBuffer, '');
const idle = runtime.animations.find((clip) => clip.name === 'idle');
if (!idle) throw new Error('idle da fonte PT-38 ausente');
const mixer = new THREE.AnimationMixer(runtime.scene);
mixer.clipAction(idle).reset().play();
mixer.setTime(0);
runtime.scene.updateMatrixWorld(true);
const localPoint = (parentName, point) => {
  const parent = runtime.scene.getObjectByName(parentName);
  if (!parent) throw new Error(`parent de socket ausente: ${parentName}`);
  return new THREE.Vector3(...point).applyMatrix4(parent.matrixWorld.clone().invert()).toArray();
};
// Pontos medidos no inventário deformado: centro da boca e topo traseiro do slide.
const muzzleLocal = localPoint('Barrel', [-0.0490, 1.6020, 0.4364]);
const sightLocal = localPoint('Slider', [-0.0490, 1.6178, 0.3500]);

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(source);
const root = document.getRoot();
const byName = (name) => root.listNodes().find((node) => node.getName() === name);
const sourceClips = root.listAnimations().map((clip) => clip.getName()).sort();
if (sourceClips.join(',') !== ['idle', 'reload_empty', 'reload_tactical', 'shoot'].sort().join(',')) {
  throw new Error(`clips da fonte divergiram: ${sourceClips.join(',')}`);
}
for (const name of ['MINT_WEAPON_PISTOL', 'SOCKET_MINT_MUZZLE', 'SOCKET_MINT_SIGHT']) {
  if (byName(name)) throw new Error(`fonte já contém ${name}; receita precisa ser revista`);
}
const markerParent = byName('SOCKET_WEAPON_PISTOL');
const barrel = byName('Barrel');
const slider = byName('Slider');
const rig = byName('RIG_FP_ARMS');
if (!markerParent || !barrel || !slider || !rig) throw new Error('rig aprovado incompleto');
markerParent.addChild(document.createNode('MINT_WEAPON_PISTOL'));
barrel.addChild(document.createNode('SOCKET_MINT_MUZZLE').setTranslation(muzzleLocal));
slider.addChild(document.createNode('SOCKET_MINT_SIGHT').setTranslation(sightLocal));

const buffer = root.listBuffers()[0] || document.createBuffer();
const times = new Float32Array([0, 0.35, 0.75, 1.10, 1.45, 1.80]);
const translations = new Float32Array([
  0, 0, 0,
  0.020, 0.008, -0.006,
  0.070, 0.020, -0.014,
  0.090, 0.024, -0.012,
  0.040, 0.010, -0.006,
  0, 0, 0,
]);
const rotationValues = [];
for (const angle of [0, 0.02, 0.04, 0.05, 0.025, 0]) {
  rotationValues.push(0, 0, Math.sin(angle / 2), Math.cos(angle / 2));
}
const timeAccessor = document.createAccessor('inspect_times').setType('SCALAR').setArray(times).setBuffer(buffer);
const translationAccessor = document.createAccessor('inspect_translation').setType('VEC3')
  .setArray(translations).setBuffer(buffer);
const rotationAccessor = document.createAccessor('inspect_rotation').setType('VEC4')
  .setArray(new Float32Array(rotationValues)).setBuffer(buffer);
const inspect = document.createAnimation('inspect');
const addChannel = (pathName, accessor) => {
  const sampler = document.createAnimationSampler()
    .setInput(timeAccessor).setOutput(accessor).setInterpolation('LINEAR');
  inspect.addSampler(sampler);
  inspect.addChannel(document.createAnimationChannel()
    .setTargetNode(rig).setTargetPath(pathName).setSampler(sampler));
};
addChannel('translation', translationAccessor);
addChannel('rotation', rotationAccessor);

await fs.mkdir(outputDir, { recursive: true });
const output = path.join(outputDir, 'pistol-runtime.glb');
await io.write(output, document);
const outputBytes = await fs.readFile(output);
const report = {
  schemaVersion: 1,
  weapon: 'pistol',
  displayName: 'PT-38',
  ready: false,
  source: { file: source, bytes: sourceBytes.length, sha256: SOURCE_SHA },
  preservation: {
    originalClips: sourceClips,
    addedClip: 'inspect',
    mesh: 'GEO_WEAPON_PISTOL_SK_G18',
    armsRig: 'RIG_FP_ARMS',
    weaponRig: 'RIG_WEAPON_PISTOL',
  },
  sockets: { muzzleParent: 'Barrel', muzzleLocal, sightParent: 'Slider', sightLocal },
  product: { file: output, bytes: outputBytes.length, sha256: digest(outputBytes) },
};
await fs.writeFile(path.join(outputDir, 'build.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`PT38_FINAL_OK ${JSON.stringify(report)}`);
