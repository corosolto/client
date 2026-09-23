#!/usr/bin/env node
/**
 * Reescala a arma de um produto K em torno de um socket dela (ex.: `grip_r`), sem mexer nas
 * mãos: o socket fica no mesmo ponto em todo quadro de todo clipe, o resto da arma (filhos,
 * carregador, sockets de mira) cresce `--fator` vezes. Pose default e trilhas TRS do nó são
 * reescritas com M' = M · T(g) · S(k) · T(−g), isto é T' = T + R·S·(1−k)·g e S' = k·S.
 *
 * Uso: node scale-weapon-about-socket.mjs --entrada=<glb> --saida=<glb fora do Git>
 *        --no=MINT_WEAPON_AKM --socket=grip_r --fator=1.4
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as THREE from '../../../public/vendor/three.module.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const option = (name) => (process.argv.find((v) => v.startsWith(`--${name}=`)) || '').slice(name.length + 3);
const [entrada, saida, alvo, socketName] = ['entrada', 'saida', 'no', 'socket'].map(option);
const k = Number(option('fator'));
if (!entrada || !saida || !alvo || !socketName || !(k > 0)) throw new Error('uso: --entrada --saida --no --socket --fator');
if (!path.relative(REPO, path.resolve(saida)).startsWith('..')) throw new Error('saída precisa ficar fora do Git');

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(path.resolve(entrada));
const root = document.getRoot();
const node = root.listNodes().find((n) => n.getName() === alvo);
const socket = node?.listChildren().find((n) => n.getName() === socketName);
if (!node || !socket) throw new Error(`nó ${alvo} ou socket filho ${socketName} ausente`);
const g = new THREE.Vector3(...socket.getTranslation());

const sampleAt = (channel, time, size, fallback) => {
  if (!channel) return fallback;
  const input = channel.getSampler().getInput().getArray();
  const output = channel.getSampler().getOutput().getArray();
  const cubic = channel.getSampler().getInterpolation() === 'CUBICSPLINE';
  const stride = cubic ? size * 3 : size;
  const at = (i) => Array.from(output.slice(i * stride + (cubic ? size : 0), i * stride + (cubic ? size : 0) + size));
  if (time <= input[0]) return at(0);
  const last = input.length - 1;
  if (time >= input[last]) return at(last);
  let i = 0;
  while (input[i + 1] < time) i += 1;
  const a = at(i), b = at(i + 1);
  if (channel.getSampler().getInterpolation() === 'STEP') return a;
  const f = (time - input[i]) / (input[i + 1] - input[i]);
  if (size === 4) return new THREE.Quaternion(...a).slerp(new THREE.Quaternion(...b), f).toArray();
  return a.map((x, j) => x + (b[j] - x) * f);
};
const shifted = (t, r, s) => {
  const offset = g.clone().multiplyScalar(1 - k).multiply(new THREE.Vector3(...s)).applyQuaternion(new THREE.Quaternion(...r));
  return new THREE.Vector3(...t).add(offset).toArray();
};

const channels = [];
for (const animation of root.listAnimations()) {
  const mine = animation.listChannels().filter((c) => c.getTargetNode() === node);
  const byPath = Object.fromEntries(mine.map((c) => [c.getTargetPath(), c]));
  // Saída compartilhada com outro sampler: clona antes de reescrever, senão muda outro nó junto.
  for (const c of mine) {
    const output = c.getSampler().getOutput();
    if (output.listParents().filter((p) => p.propertyType === 'AnimationSampler').length > 1) c.getSampler().setOutput(output.clone());
  }
  channels.push({ animation, byPath });
}
for (const { byPath } of channels) {
  const translation = byPath.translation, rotation = byPath.rotation, scale = byPath.scale;
  if (translation) {
    const input = translation.getSampler().getInput().getArray();
    const output = translation.getSampler().getOutput();
    if (translation.getSampler().getInterpolation() === 'CUBICSPLINE') throw new Error('translação cúbica não suportada');
    const values = Array.from(output.getArray());
    for (let i = 0; i < input.length; i += 1) {
      const r = sampleAt(rotation, input[i], 4, node.getRotation());
      const s = sampleAt(scale, input[i], 3, node.getScale());
      values.splice(i * 3, 3, ...shifted(values.slice(i * 3, i * 3 + 3), r, s));
    }
    output.setArray(new Float32Array(values));
  }
  if (scale) {
    const output = scale.getSampler().getOutput();
    output.setArray(new Float32Array(Array.from(output.getArray()).map((x) => x * k)));
  }
  if (!translation && (rotation || scale)) throw new Error('clipe anima rotação/escala sem translação: pivô não fica fixo');
}
node.setTranslation(shifted(node.getTranslation(), node.getRotation(), node.getScale()));
node.setScale(node.getScale().map((x) => x * k));
node.setExtras({ ...(node.getExtras() || {}), escalaEmTornoDe: { socket: socketName, fator: k, tool: 'tools/viewmodels/prep/scale-weapon-about-socket.mjs' } });
fs.mkdirSync(path.dirname(path.resolve(saida)), { recursive: true });
await io.write(path.resolve(saida), document);
const bytes = fs.readFileSync(path.resolve(saida));
console.log(JSON.stringify({ ok: true, saida: path.resolve(saida), bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), fator: k, socket: socketName, clipes: channels.filter((c) => Object.keys(c.byPath).length).map((c) => c.animation.getName()) }));
