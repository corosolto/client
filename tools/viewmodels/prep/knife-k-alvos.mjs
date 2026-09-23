#!/usr/bin/env node
/* Alvos da faca K: amostra a faca aprovada (knife-hires.glb, rig L) no espaço de câmera
   que o jogo mostra — câmera do GLB, pacote ×0,0135 e deslocado como em meleevm.js — e
   grava, por clipe, a matriz da faca e o referencial anatômico de cada palma. O Blender
   (knife-k-build.py) leva as mãos do rig K a esses referenciais por IK.
   Uso: node tools/viewmodels/prep/knife-k-alvos.mjs <saida-fora-do-git> */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';
import * as THREE from '../../../public/vendor/three.module.js';
import { GLTFLoader } from '../../../public/vendor/addons/loaders/GLTFLoader.js';

globalThis.self = globalThis;
globalThis.Image = class { constructor() { this.onload = null; this.width = 1; this.height = 1; } set src(value) { this._src = value; queueMicrotask(() => this.onload?.()); } };
globalThis.ImageData = class { constructor(data, width, height) { Object.assign(this, { data, width, height }); } };
const quiet = (fn) => (...args) => !/texture|PropertyBinding/i.test(String(args[0] || '')) && fn(...args);
console.warn = quiet(console.warn);
console.error = quiet(console.error);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SOURCE = path.join(ROOT, 'public/models/viewmodels/coro/melee/knife-hires.glb');
const SOURCE_SHA = '3e04fbcb67480cec0638ca552d308379c5bff7c5689ae39c8aa88e566c992621';
// Enquadramento aprovado da faca L (meleevm.js antes do K): escala e deslocamento do pacote.
const PACKAGE_SCALE = 0.0135;
const PACKAGE_OFFSET = new THREE.Vector3(0.18, -0.12, -0.25);
const FPS = 30;
const out = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !path.relative(ROOT, out).startsWith('..')) throw new Error('saída precisa ficar fora do repositório');
fs.mkdirSync(out, { recursive: true });
const bytes = fs.readFileSync(SOURCE);
if (crypto.createHash('sha256').update(bytes).digest('hex') !== SOURCE_SHA) throw new Error('knife-hires.glb diverge da faca aprovada');

const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const scene = gltf.scene;
let camera = null;
scene.updateMatrixWorld(true);
scene.traverse((object) => { if (!camera && object.isPerspectiveCamera) camera = object; });
camera.updateMatrixWorld(true);
const view = new THREE.Matrix4().makeTranslation(PACKAGE_OFFSET.x, PACKAGE_OFFSET.y, PACKAGE_OFFSET.z)
  .multiply(new THREE.Matrix4().makeScale(PACKAGE_SCALE, PACKAGE_SCALE, PACKAGE_SCALE))
  .multiply(camera.matrixWorld.clone().invert());
const knife = scene.getObjectByName('coro_solto_project_knife');
const bone = (name) => { const found = scene.getObjectByName(name); if (!found) throw new Error(`osso ${name} ausente`); return found; };
const HANDS = {
  r: { wrist: bone('R_wrist_026'), middle: bone('R_middle1_035'), index: bone('R_point1_031'), pinky: bone('R_pink1_044') },
  l: { wrist: bone('L_wrist_02'), middle: bone('L_middle1_011'), index: bone('L_point1_07'), pinky: bone('L_pink1_020') },
};
const at = (object) => object.getWorldPosition(new THREE.Vector3()).applyMatrix4(view);
// Palma: origem entre punho e nó do dedo médio; X = dedos, Y = lateral (indicador−mínimo) ortogonalizada.
function palm(hand) {
  const wrist = at(hand.wrist), middle = at(hand.middle);
  const x = middle.clone().sub(wrist).normalize();
  const lateral = at(hand.index).sub(at(hand.pinky));
  const y = lateral.sub(x.clone().multiplyScalar(lateral.dot(x))).normalize();
  const z = new THREE.Vector3().crossVectors(x, y);
  const origin = wrist.clone().add(middle).multiplyScalar(0.5);
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(origin);
}
// Faca: afim exata a partir de 4 vértices não coplanares (skin rígido num osso só).
const position = knife.geometry.attributes.position;
const pick = (() => {
  const box = new THREE.Box3().setFromBufferAttribute(position);
  const corners = [box.min, new THREE.Vector3(box.max.x, box.min.y, box.min.z),
    new THREE.Vector3(box.min.x, box.max.y, box.min.z), new THREE.Vector3(box.min.x, box.min.y, box.max.z)];
  const v = new THREE.Vector3();
  return corners.map((corner) => {
    let best = 0, dist = Infinity;
    for (let index = 0; index < position.count; index += 1) {
      const d = v.fromBufferAttribute(position, index).distanceToSquared(corner);
      if (d < dist) { dist = d; best = index; }
    }
    return best;
  });
})();
const homogeneous = (points) => new THREE.Matrix4().set(
  points[0].x, points[1].x, points[2].x, points[3].x,
  points[0].y, points[1].y, points[2].y, points[3].y,
  points[0].z, points[1].z, points[2].z, points[3].z,
  1, 1, 1, 1);
const restInverse = homogeneous(pick.map((index) => new THREE.Vector3().fromBufferAttribute(position, index))).invert();
function knifeMatrix() {
  const posed = pick.map((index) => {
    const v = new THREE.Vector3().fromBufferAttribute(position, index);
    knife.applyBoneTransform(index, v);
    return v.applyMatrix4(knife.matrixWorld).applyMatrix4(view);
  });
  return homogeneous(posed).multiply(restInverse);
}

const mixer = new THREE.AnimationMixer(scene);
const clips = {};
for (const clip of gltf.animations) {
  const frames = [];
  const count = Math.max(1, Math.round(clip.duration * FPS));
  for (let frame = 0; frame <= count; frame += 1) {
    const time = Math.min(clip.duration, frame / FPS);
    mixer.stopAllAction();
    mixer.clipAction(clip).reset().play();
    mixer.setTime(time);
    scene.updateMatrixWorld(true);
    frames.push({ time: +time.toFixed(5), knife: knifeMatrix().elements, r: palm(HANDS.r).elements, l: palm(HANDS.l).elements });
  }
  clips[clip.name] = { duration: clip.duration, frames };
}
mixer.stopAllAction();
mixer.clipAction(gltf.animations.find((clip) => clip.name === 'Idle')).reset().play();
mixer.setTime(0);
scene.updateMatrixWorld(true);
const palmLength = Object.fromEntries(Object.entries(HANDS).map(([side, hand]) => [side, +at(hand.wrist).distanceTo(at(hand.middle)).toFixed(5)]));
const cameraOut = { yfov: camera.fov * Math.PI / 180, aspect: camera.aspect, znear: camera.near, zfar: camera.far };
fs.writeFileSync(path.join(out, 'knife-l-alvos.json'), `${JSON.stringify({ schemaVersion: 1, source: path.relative(ROOT, SOURCE), sourceSha256: SOURCE_SHA, fps: FPS, packageScale: PACKAGE_SCALE, packageOffset: PACKAGE_OFFSET.toArray(), camera: cameraOut, palmLength, clips })}\n`);

// Malha da faca em repouso (sem skin), no mesmo espaço local que as matrizes acima.
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(SOURCE);
const root = document.getRoot();
const node = root.listNodes().find((item) => item.getName() === 'coro_solto_project_knife');
node.setSkin(null);
for (const primitive of node.getMesh().listPrimitives()) {
  for (const semantic of ['JOINTS_0', 'WEIGHTS_0']) primitive.setAttribute(semantic, null);
}
for (const other of root.listNodes()) if (other !== node) other.dispose();
for (const skin of root.listSkins()) skin.dispose();
for (const animation of root.listAnimations()) animation.dispose();
for (const cam of root.listCameras()) cam.dispose();
const sceneDoc = root.listScenes()[0];
for (const child of sceneDoc.listChildren()) sceneDoc.removeChild(child);
node.setTranslation([0, 0, 0]).setRotation([0, 0, 0, 1]).setScale([1, 1, 1]);
sceneDoc.addChild(node);
await document.transform(prune());
await io.write(path.join(out, 'knife-l-malha.glb'), document);
console.log(`KNIFE_K_ALVOS=${JSON.stringify({ out, palmLength, clips: Object.fromEntries(Object.entries(clips).map(([k, v]) => [k, v.frames.length])), camera: cameraOut })}`);
