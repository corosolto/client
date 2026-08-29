#!/usr/bin/env node
/* Baka os clipes COMPARTILHADOS do pack (idle-respiração, walk, sprint, equip,
   pickup, jump) UMA vez em shared/general-runtime.glb — só esqueleto e tracks
   por NOME de bone; o runtime aplica em qualquer família (mesmo rig UE) como
   camada aditiva/one-shot. BUG-75 M7. Mesmo maquinário do assemble por família. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { AnimationMixer, LoopOnce, Matrix4, Quaternion, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { NodeIO } from '../../node_modules/@gltf-transform/core/dist/index.js';
import { ALL_EXTENSIONS } from '../../node_modules/@gltf-transform/extensions/dist/index.js';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const PRIVATE_ROOT = '/Users/ruben/csbrasil-private-assets/generated/viewmodels';
const EXTRACTED = '/Users/ruben/csbrasil-private-assets/generated/extracted';
const ANIMATIONS = path.join(EXTRACTED, 'Assets/KINEMATION/FPSAnimationPack/Animations');
const ASSIMP = '/opt/homebrew/bin/assimp';
const FPS = 60;
// nome do clipe no runtime → arquivo FBX de origem (todos arms-only).
const GENERAL_CLIPS = [
  ['idle_breath', 'General/Character/A_FP_Idle.FBX'],
  ['walk', 'General/Character/A_FP_Walk.FBX'],
  ['sprint', 'General/Character/A_FP_Sprint.FBX'],
  ['sprint_tac', 'General/Character/A_FP_Tactical_Sprint.FBX'],
  ['equip_rifle', 'General/Character/A_FP_Rifle_Equip.FBX'],
  ['unequip_rifle', 'General/Character/A_FP_Rifle_Unequip.FBX'],
  ['unequip_pistol', 'General/Character/A_FP_Pistol_UnEquip.FBX'],
  ['pickup', 'General/Character/A_FP_PickUp_Item.FBX'],
];

if (!path.relative(REPO_ROOT, PRIVATE_ROOT).startsWith('..')) {
  throw new Error('saída licenciada precisa ficar fora do repositório público');
}

function convertFbx(source, output) {
  const result = spawnSync(ASSIMP, ['export', source, output, '-fglb2'], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Assimp falhou em ${source}:\n${result.stdout}\n${result.stderr}`);
}

async function stripRenderables(source) {
  const glb = await fs.readFile(source);
  const chunks = [];
  for (let offset = 12; offset < glb.length;) {
    const length = glb.readUInt32LE(offset);
    const type = glb.readUInt32LE(offset + 4);
    chunks.push({ type, data: glb.subarray(offset + 8, offset + 8 + length) });
    offset += 8 + length;
  }
  const jsonChunk = chunks.find((chunk) => chunk.type === 0x4e4f534a);
  const json = JSON.parse(jsonChunk.data.toString('utf8').replace(/\0+$/g, ''));
  for (const node of json.nodes || []) { delete node.mesh; delete node.skin; }
  for (const key of ['meshes', 'skins', 'materials', 'textures', 'images', 'samplers']) delete json[key];
  const jsonBytes = Buffer.from(JSON.stringify(json), 'utf8');
  const paddedJson = Buffer.alloc(Math.ceil(jsonBytes.length / 4) * 4, 0x20);
  jsonBytes.copy(paddedJson);
  jsonChunk.data = paddedJson;
  const total = 12 + chunks.reduce((sum, chunk) => sum + 8 + chunk.data.length, 0);
  const output = Buffer.alloc(total);
  output.writeUInt32LE(0x46546c67, 0);
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(total, 8);
  let offset = 12;
  for (const chunk of chunks) {
    output.writeUInt32LE(chunk.data.length, offset);
    output.writeUInt32LE(chunk.type, offset + 4);
    chunk.data.copy(output, offset + 8);
    offset += 8 + chunk.data.length;
  }
  await fs.writeFile(source, output);
}

async function loadAnimation(source) {
  const bytes = await fs.readFile(source);
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const gltf = await new Promise((resolve, reject) => {
    new GLTFLoader().parse(arrayBuffer, '', resolve, reject);
  });
  if (gltf.animations.length !== 1) throw new Error(`esperava 1 animação em ${source}, achei ${gltf.animations.length}`);
  return gltf;
}

function pushQuaternion(values, quaternion, previous) {
  if (previous && previous.dot(quaternion) < 0) {
    quaternion.set(-quaternion.x, -quaternion.y, -quaternion.z, -quaternion.w);
  }
  values.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
  return quaternion.clone();
}

function nodeMatrix(node) {
  return new Matrix4().compose(
    new Vector3().fromArray(node.getTranslation()),
    new Quaternion().fromArray(node.getRotation()),
    new Vector3().fromArray(node.getScale()),
  );
}

function sampleTargets(gltf, targetNames, targetNodes) {
  const mixer = new AnimationMixer(gltf.scene);
  const clip = gltf.animations[0];
  const action = mixer.clipAction(clip);
  action.setLoop(LoopOnce, 0);
  action.clampWhenFinished = true;
  action.play();
  const frameCount = Math.round(clip.duration * FPS);
  const times = new Float32Array(frameCount + 1);
  const topLevel = new Set(['ik_foot_root', 'ik_hand_root', 'pelvis']);
  const matrix = new Matrix4();
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  const tracks = new Map();
  const sourceAnchor = gltf.scene.getObjectByName('ik_hand_root');
  const targetAnchor = targetNodes.get('ik_hand_root');
  if (!sourceAnchor || !targetAnchor) throw new Error('sem âncora ik_hand_root para converter eixos');
  sourceAnchor.updateMatrix();
  const axisConversion = nodeMatrix(targetAnchor).multiply(sourceAnchor.matrix.clone().invert());
  for (const name of targetNames) {
    const source = gltf.scene.getObjectByName(name);
    if (!source) continue;
    tracks.set(name, { translation: [], rotation: [], scale: [], previous: null, source });
  }
  for (let frame = 0; frame <= frameCount; frame += 1) {
    const time = Math.min(frame / FPS, clip.duration);
    times[frame] = time;
    mixer.setTime(time);
    for (const [name, track] of tracks) {
      track.source.updateMatrix();
      if (topLevel.has(name)) {
        matrix.multiplyMatrices(axisConversion, track.source.matrix);
        matrix.decompose(position, quaternion, scale);
      } else {
        position.copy(track.source.position);
        quaternion.copy(track.source.quaternion);
        scale.copy(track.source.scale);
      }
      track.translation.push(position.x, position.y, position.z);
      track.previous = pushQuaternion(track.rotation, quaternion, track.previous);
      track.scale.push(scale.x, scale.y, scale.z);
    }
  }
  mixer.stopAllAction();
  return { duration: clip.duration, times, tracks };
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(path.join(PRIVATE_ROOT, 'ak/ak.glb'));
const root = document.getRoot();
// Vira esqueleto puro: nós e nomes ficam; malha/material/skin/câmera/clipes saem.
for (const item of [...root.listAnimations()]) item.dispose();
for (const item of [...root.listSkins()]) item.dispose();
for (const item of [...root.listMeshes()]) item.dispose();
for (const item of [...root.listMaterials()]) item.dispose();
for (const item of [...root.listTextures()]) item.dispose();
for (const item of [...root.listCameras()]) item.dispose();
const targetNodes = new Map(root.listNodes().map((node) => [node.getName(), node]));
const armTargets = [...targetNodes.keys()].filter((name) => !/^(SOCKET_WEAPON|RIG_WEAPON|GEO_)/.test(name));
const buffer = root.listBuffers()[0];
const rawRoot = path.join(PRIVATE_ROOT, 'shared/raw-general');
await fs.mkdir(rawRoot, { recursive: true });

const report = { schemaVersion: 1, clips: [] };
for (const [clipName, relative] of GENERAL_CLIPS) {
  const fbx = path.join(ANIMATIONS, relative);
  try { await fs.access(fbx); } catch { console.warn(`ausente: ${relative}`); continue; }
  const glb = path.join(rawRoot, `${clipName}.glb`);
  convertFbx(fbx, glb);
  await stripRenderables(glb);
  const gltf = await loadAnimation(glb);
  const sample = sampleTargets(gltf, armTargets, targetNodes);
  const animation = document.createAnimation(clipName);
  for (const [name, track] of sample.tracks) {
    const node = targetNodes.get(name);
    for (const [pathName, values, itemSize] of [
      ['translation', track.translation, 3],
      ['rotation', track.rotation, 4],
      ['scale', track.scale, 3],
    ]) {
      const input = document.createAccessor().setType('SCALAR').setArray(sample.times).setBuffer(buffer);
      const output = document.createAccessor()
        .setType(itemSize === 4 ? 'VEC4' : 'VEC3')
        .setArray(new Float32Array(values))
        .setBuffer(buffer);
      const sampler = document.createAnimationSampler().setInput(input).setOutput(output).setInterpolation('LINEAR');
      const channel = document.createAnimationChannel().setTargetNode(node).setTargetPath(pathName).setSampler(sampler);
      animation.addSampler(sampler).addChannel(channel);
    }
  }
  report.clips.push({ name: clipName, duration: Number(sample.duration.toFixed(3)), bones: sample.tracks.size });
}

const target = path.join(PRIVATE_ROOT, 'shared/general-runtime.glb');
await io.write(target, document);
report.bytes = (await fs.stat(target)).size;
await fs.writeFile(path.join(PRIVATE_ROOT, 'shared/general-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`CORO_PAID_GENERAL_ASSEMBLY=${JSON.stringify(report)}`);
