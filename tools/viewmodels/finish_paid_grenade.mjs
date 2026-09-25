#!/usr/bin/env node
/* Acabamento do viewmodel K da granada, depois do bind_paid_grenade.mjs.
   O runtime (authoredvm.throwUtility) toca throw_start→loop→end em 1,05 s e solta o
   projétil a 58%; os clipes crus do pack somam 6,4 s (o loop de espera tem 3,4 s) e o
   pino nunca sai da granada. Aqui: início ×0,5, espera curta, pino e argola vão para
   os dedos da mão esquerda, a granada some da mão no arremesso e `equip` = subida.
   Uso: node tools/viewmodels/finish_paid_grenade.mjs <bound.glb> <saida.glb> */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';
import * as THREE from '../../public/vendor/three.module.js';
import { GLTFLoader } from '../../public/vendor/addons/loaders/GLTFLoader.js';

globalThis.self = globalThis;
globalThis.Image = class { constructor() { this.onload = null; this.width = 1; this.height = 1; } set src(value) { this._src = value; queueMicrotask(() => this.onload?.()); } };
globalThis.ImageData = class { constructor(data, width, height) { Object.assign(this, { data, width, height }); } };
const quiet = (fn) => (...args) => !/texture/i.test(String(args[0] || '')) && fn(...args);
console.warn = quiet(console.warn);
console.error = quiet(console.error);

const [input, output] = process.argv.slice(2).map((file) => path.resolve(file || ''));
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
if (!input || !output) throw new Error('uso: finish_paid_grenade.mjs <bound.glb> <saida.glb>');
if (!path.relative(repoRoot, output).startsWith('..')) throw new Error(`GLB licenciado não entra no repositório: ${output}`);

// Tempos no relógio ORIGINAL dos clipes do pack (medidos: dedos da mão esquerda mais
// perto da argola em 0,45 s do throw_start; pico de velocidade da mão direita em 0,35 s
// do throw_end).
const START_SCALE = 0.5;
const LOOP_KEEP = 0.1;
const EQUIP_END = 0.3;
const PIN_REACH = [0.35, 0.45];
const RELEASE = 0.30;
const FPS = 30;

const bytes = fs.readFileSync(input);
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const scene = gltf.scene;
const clips = Object.fromEntries(gltf.animations.map((clip) => [clip.name, clip]));
for (const name of ['idle', 'throw_start', 'throw_loop', 'throw_end']) if (!clips[name]) throw new Error(`clipe ${name} ausente`);
const mixer = new THREE.AnimationMixer(scene);
const pose = (name, time) => {
  mixer.stopAllAction();
  mixer.clipAction(clips[name]).reset().play();
  mixer.setTime(Math.min(time, clips[name].duration));
  scene.updateMatrixWorld(true);
};
const world = (object) => object.matrixWorld.clone();
const handL = scene.getObjectByName('hand_l');
const pinchBones = ['index_03_l', 'thumb_03_l'].map((name) => scene.getObjectByName(name));
if (!handL || pinchBones.some((bone) => !bone)) throw new Error('rig sem hand_l/index_03_l/thumb_03_l');

const roots = scene.children.flatMap(function all(object) { return [object, ...object.children.flatMap(all)]; })
  .filter((object) => /^UTILITY_(HE|FLASH|SMOKE)$/.test(object.name));
if (roots.length !== 3) throw new Error(`esperava 3 granadas, achei ${roots.length}`);

// Peças puxadas: argola (líder) e pino, filhos diretos da raiz da granada.
const pulls = roots.map((root) => {
  const pieces = root.children.filter((child) => /(?:^|_)(pin|ring)$/.test(child.name));
  const lead = pieces.find((child) => /ring$/.test(child.name));
  if (!lead) throw new Error(`${root.name} sem argola`);
  return { root, lead, pieces };
});

// Âncora na mão esquerda: no fim da aproximação a argola está entre indicador e polegar.
pose('throw_start', PIN_REACH[1]);
const pinch = pinchBones.reduce((sum, bone) => sum.add(bone.getWorldPosition(new THREE.Vector3())), new THREE.Vector3()).multiplyScalar(0.5);
for (const pull of pulls) {
  const leadWorld = world(pull.lead);
  const position = new THREE.Vector3(), rotation = new THREE.Quaternion(), size = new THREE.Vector3();
  leadWorld.decompose(position, rotation, size);
  const target = new THREE.Matrix4().compose(pinch, rotation, size);
  pull.inHand = world(handL).invert().multiply(target);
  pull.rest = new Map(pull.pieces.map((piece) => [piece, piece.matrix.clone()]));
  pull.leadRestInverse = pull.lead.matrix.clone().invert();
}

const smooth = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
// Transformação local de cada peça num instante: presa à granada, em trânsito ou na mão.
function pieceLocals(pull, weight) {
  const parentInverse = world(pull.root).invert();
  const leadHand = parentInverse.clone().multiply(world(handL)).multiply(pull.inHand);
  const leadRest = pull.rest.get(pull.lead);
  const p0 = new THREE.Vector3(), q0 = new THREE.Quaternion(), s0 = new THREE.Vector3();
  const p1 = new THREE.Vector3(), q1 = new THREE.Quaternion(), s1 = new THREE.Vector3();
  leadRest.decompose(p0, q0, s0);
  leadHand.decompose(p1, q1, s1);
  const lead = new THREE.Matrix4().compose(p0.lerp(p1, weight), q0.slerp(q1, weight), s0.lerp(s1, weight));
  const result = new Map();
  for (const piece of pull.pieces) {
    const relative = pull.leadRestInverse.clone().multiply(pull.rest.get(piece));
    result.set(piece.name, lead.clone().multiply(relative));
  }
  return result;
}

// Trilhas novas: tempo novo → matriz local por peça.
const tracks = {};
const sample = (clip, fromOriginal, toNew, weightAt) => {
  const rows = [];
  const duration = clips[clip].duration;
  const end = Math.min(duration, fromOriginal[1]);
  for (let step = 0; ; step += 1) {
    const time = Math.min(end, fromOriginal[0] + step / FPS);
    pose(clip, time);
    const row = { time: toNew(time), pieces: new Map() };
    for (const pull of pulls) for (const [name, matrix] of pieceLocals(pull, weightAt(time))) row.pieces.set(name, matrix);
    rows.push(row);
    if (time >= end) break;
  }
  return rows;
};
tracks.idle = sample('idle', [0, clips.idle.duration], (t) => t, () => 0);
tracks.equip = sample('throw_start', [0, EQUIP_END], (t) => t, () => 0);
tracks.throw_start = sample('throw_start', [0, clips.throw_start.duration], (t) => t * START_SCALE, (t) => smooth(PIN_REACH[0], PIN_REACH[1], t));
tracks.throw_loop = sample('throw_loop', [0, LOOP_KEEP], (t) => t, () => 1);
tracks.throw_end = sample('throw_end', [0, clips.throw_end.duration], (t) => t, () => 1);

// ---- escrita no documento glTF ----
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(input);
const root = document.getRoot();
const buffer = root.listBuffers()[0];
const nodeByName = new Map(root.listNodes().map((node) => [node.getName(), node]));
const animation = (name) => root.listAnimations().find((clip) => clip.getName() === name);
const accessor = (type, array) => document.createAccessor().setType(type).setArray(array).setBuffer(buffer);

// Recorta/reescala os canais existentes de um clipe (acessores clonados: nada compartilhado).
function retime(clip, { scale = 1, keep = Infinity }) {
  for (const sampler of clip.listSamplers()) {
    const times = sampler.getInput().getArray();
    const values = sampler.getOutput().getArray();
    const size = values.length / times.length;
    const outTimes = [], outValues = [];
    for (let index = 0; index < times.length; index += 1) {
      if (times[index] > keep + 1e-6) {
        if (outTimes.at(-1) < keep - 1e-6) {
          const before = index - 1, span = times[index] - times[before], k = (keep - times[before]) / span;
          outTimes.push(keep);
          for (let lane = 0; lane < size; lane += 1) {
            outValues.push(values[before * size + lane] + (values[index * size + lane] - values[before * size + lane]) * k);
          }
        }
        break;
      }
      outTimes.push(times[index] * scale);
      for (let lane = 0; lane < size; lane += 1) outValues.push(values[index * size + lane]);
    }
    sampler.setInput(accessor('SCALAR', new Float32Array(outTimes)));
    sampler.setOutput(accessor(sampler.getOutput().getType(), new Float32Array(outValues)));
  }
}
function duplicate(source, name, keep) {
  const copy = document.createAnimation(name);
  for (const channel of source.listChannels()) {
    const sampler = channel.getSampler();
    const cloned = document.createAnimationSampler()
      .setInput(sampler.getInput()).setOutput(sampler.getOutput()).setInterpolation(sampler.getInterpolation());
    copy.addSampler(cloned).addChannel(document.createAnimationChannel()
      .setTargetNode(channel.getTargetNode()).setTargetPath(channel.getTargetPath()).setSampler(cloned));
  }
  retime(copy, { keep });
  return copy;
}
const equip = duplicate(animation('throw_start'), 'equip', EQUIP_END);
retime(animation('throw_start'), { scale: START_SCALE });
retime(animation('throw_loop'), { keep: LOOP_KEEP });

function addTrack(clip, node, pathName, times, values, interpolation = 'LINEAR') {
  const sampler = document.createAnimationSampler()
    .setInput(accessor('SCALAR', new Float32Array(times)))
    .setOutput(accessor(pathName === 'rotation' ? 'VEC4' : 'VEC3', new Float32Array(values)))
    .setInterpolation(interpolation);
  clip.addSampler(sampler).addChannel(document.createAnimationChannel().setTargetNode(node).setTargetPath(pathName).setSampler(sampler));
}
const clipDocs = { idle: animation('idle'), equip, throw_start: animation('throw_start'), throw_loop: animation('throw_loop'), throw_end: animation('throw_end') };
for (const [name, rows] of Object.entries(tracks)) {
  for (const pull of pulls) for (const piece of pull.pieces) {
    const node = nodeByName.get(piece.name);
    const t = [], tr = [], ro = [], sc = [];
    for (const row of rows) {
      const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
      row.pieces.get(piece.name).decompose(p, q, s);
      t.push(row.time); tr.push(...p.toArray()); ro.push(...q.toArray()); sc.push(...s.toArray());
    }
    addTrack(clipDocs[name], node, 'translation', t, tr);
    addTrack(clipDocs[name], node, 'rotation', t, ro);
    addTrack(clipDocs[name], node, 'scale', t, sc);
  }
}
// A granada sai da mão no arremesso: escala zero em STEP; nos outros clipes, constante.
for (const pull of pulls) {
  const node = nodeByName.get(pull.root.name);
  const s = node.getScale();
  for (const [name, clip] of Object.entries(clipDocs)) {
    const end = name === 'throw_end' ? clips.throw_end.duration : Math.max(0.001, ...tracks[name].map((row) => row.time));
    if (name === 'throw_end') addTrack(clip, node, 'scale', [0, RELEASE, end], [...s, 0, 0, 0, 0, 0, 0], 'STEP');
    else addTrack(clip, node, 'scale', [0, end], [...s, ...s], 'STEP');
  }
}
// Acessores antigos dos clipes reescritos ficam órfãos; sem poda eles viajam no GLB.
await document.transform(prune({ propertyTypes: ['accessor'] }));
await io.write(output, document);
const report = {
  schemaVersion: 1, input, output, bytes: fs.statSync(output).size,
  clips: Object.fromEntries(root.listAnimations().map((clip) => [clip.getName(),
    +Math.max(...clip.listSamplers().map((sampler) => sampler.getInput().getMax([])[0])).toFixed(3)])),
  timing: { START_SCALE, LOOP_KEEP, EQUIP_END, PIN_REACH, RELEASE },
  pulls: pulls.map((pull) => ({ root: pull.root.name, pieces: pull.pieces.map((piece) => piece.name) })),
};
fs.writeFileSync(path.join(path.dirname(output), 'finish-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`CORO_PAID_GRENADE_FINISH=${JSON.stringify(report)}`);
