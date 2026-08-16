#!/usr/bin/env node
/* character-rig-check.mjs — contrato mecânico dos personagens GLB rigados.

   Mede o que o runtime de glbchars.js realmente precisa: Skin com cadeias anatômicas,
   JOINTS_0/WEIGHTS_0 válidos, clips obrigatórios ligados a nós existentes e o caminho
   AnimationMixer + SkeletonUtils ativo. Os limites vêm do formato e do acervo medido:
   os 44 personagens têm 24–28 juntas e pesos normalizados; não há teto estético aqui.

   Mutações: --mutante=sem-esqueleto|peso-zero|sem-cabeca|sem-clipe|sem-mixer */
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const GLBCHARS = 'public/js/glbchars.js';
const MODELS = 'public/models/characters';
const ANIMS = 'public/models/anims';
const mutante = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
const permitidos = new Set(['', 'sem-esqueleto', 'peso-zero', 'sem-cabeca', 'sem-clipe', 'sem-mixer']);
if (!permitidos.has(mutante)) {
  console.error(`mutante desconhecido: ${mutante}`);
  process.exit(2);
}

const source = fs.readFileSync(GLBCHARS, 'utf8');
const setBlock = /export const GLB_CHARS = new Set\(\[([\s\S]*?)\]\);/.exec(source)?.[1];
const list = (name) => [...(new RegExp(`const ${name} = \\[([^\\]]*)\\]`).exec(source)?.[1] || '').matchAll(/'([^']+)'/g)].map((m) => m[1]);
const ids = [...(setBlock || '').replace(/\/\/.*$/gm, '').matchAll(/'([^']+)'/g)].map((m) => m[1]);
const requiredStates = list('STATES');
if (!ids.length || !requiredStates.length) {
  console.error('RIG0 FALHA — não foi possível derivar GLB_CHARS/STATES de glbchars.js');
  process.exit(1);
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const failures = [];
let skinCount = 0;
let jointMin = Infinity;
let vertexCount = 0;
let clipCount = 0;
let maxWeightDeviation = 0;
const firstId = ids[0];
const anatomy = [
  ['cabeça', /head/i], ['mão esquerda', /left.?hand|hand.?l\b|l_hand/i],
  ['mão direita', /right.?hand|hand.?r\b|r_hand/i],
  ['pé esquerdo', /left.?foot|foot.?l\b|l_foot/i], ['pé direito', /right.?foot|foot.?r\b|r_foot/i],
];

for (const id of ids) {
  const modelPath = path.join(MODELS, `${id}.glb`);
  if (!fs.existsSync(modelPath)) { failures.push(`RIG1 ${id}: modelo ausente`); continue; }
  const model = await io.read(modelPath);
  const root = model.getRoot();
  const skins = id === firstId && mutante === 'sem-esqueleto' ? [] : root.listSkins();
  if (!skins.length) { failures.push(`RIG1 ${id}: nenhum Skin/esqueleto`); continue; }
  skinCount += skins.length;
  const joints = skins.flatMap((skin) => skin.listJoints());
  const jointNames = new Set(joints.map((joint) => joint.getName()));
  const nodeNames = new Set(root.listNodes().map((node) => node.getName()));
  jointMin = Math.min(jointMin, joints.length);
  if (joints.length < 24) failures.push(`RIG1 ${id}: somente ${joints.length} juntas; cadeia humanoide incompleta`);

  for (const [label, pattern] of anatomy) {
    const present = [...jointNames].some((name) => pattern.test(name));
    if (!present || (id === firstId && mutante === 'sem-cabeca' && label === 'cabeça')) failures.push(`RIG1 ${id}: sem ${label}`);
  }

  let skinnedPrimitives = 0;
  for (const mesh of root.listMeshes()) for (const primitive of mesh.listPrimitives()) {
    const jointAccessor = primitive.getAttribute('JOINTS_0');
    const weightAccessor = primitive.getAttribute('WEIGHTS_0');
    if (!jointAccessor && !weightAccessor) continue;
    skinnedPrimitives++;
    if (!jointAccessor || !weightAccessor || jointAccessor.getCount() !== weightAccessor.getCount()) {
      failures.push(`RIG2 ${id}: JOINTS_0/WEIGHTS_0 ausentes ou com contagens diferentes`);
      continue;
    }
    const jointArray = jointAccessor.getArray();
    const weightArray = weightAccessor.getArray();
    for (let vertex = 0; vertex < weightAccessor.getCount(); vertex++) {
      let sum = 0;
      for (let influence = 0; influence < 4; influence++) {
        const offset = vertex * 4 + influence;
        const weight = id === firstId && vertex === 0 && mutante === 'peso-zero' ? 0 : weightArray[offset];
        if (!Number.isFinite(weight) || weight < 0) failures.push(`RIG2 ${id}: peso inválido no vértice ${vertex}`);
        if (weight > 0 && jointArray[offset] >= joints.length) failures.push(`RIG2 ${id}: índice de junta fora do Skin no vértice ${vertex}`);
        sum += weight;
      }
      vertexCount++;
      maxWeightDeviation = Math.max(maxWeightDeviation, Math.abs(1 - sum));
      if (Math.abs(1 - sum) > 0.002) failures.push(`RIG2 ${id}: pesos somam ${sum.toFixed(4)} no vértice ${vertex}`);
    }
  }
  if (!skinnedPrimitives) failures.push(`RIG2 ${id}: nenhuma primitiva ligada ao Skin`);

  const animPath = path.join(ANIMS, `${id}.glb`);
  if (!fs.existsSync(animPath)) { failures.push(`RIG3 ${id}: pacote mesclado de animações ausente`); continue; }
  const animDoc = await io.read(animPath);
  const animations = animDoc.getRoot().listAnimations();
  const names = new Set(animations.map((animation) => animation.getName()));
  if (id === firstId && mutante === 'sem-clipe') names.delete(requiredStates[0]);
  for (const state of requiredStates) if (!names.has(state)) failures.push(`RIG3 ${id}: clip obrigatório ${state} ausente`);
  for (const animation of animations) {
    clipCount++;
    if (!animation.listChannels().length) failures.push(`RIG3 ${id}/${animation.getName()}: clip sem canais`);
    for (const channel of animation.listChannels()) {
      const target = channel.getTargetNode()?.getName();
      if (!target || !nodeNames.has(target)) failures.push(`RIG3 ${id}/${animation.getName()}: canal aponta para nó inexistente ${target || '(vazio)'}`);
    }
  }
}

const runtimeOk = /new THREE\.AnimationMixer\(model\)/.test(source)
  && /mixer\.clipAction\(clips\[name\]\)/.test(source)
  && /skeletonClone\(template\)/.test(source)
  && /this\.mixer\.update\(dt\)/.test(source)
  && mutante !== 'sem-mixer';
if (!runtimeOk) failures.push('RIG4 glbchars.js não clona o esqueleto e/ou não avança o AnimationMixer');

console.log(`RIG1 ${failures.some((f) => f.startsWith('RIG1')) ? 'FALHA' : 'PASSA'} — ${ids.length} modelos · ${skinCount} skins · mínimo ${Number.isFinite(jointMin) ? jointMin : 0} juntas`);
console.log(`RIG2 ${failures.some((f) => f.startsWith('RIG2')) ? 'FALHA' : 'PASSA'} — ${vertexCount} vértices · desvio máximo dos pesos ${maxWeightDeviation.toFixed(6)}`);
console.log(`RIG3 ${failures.some((f) => f.startsWith('RIG3')) ? 'FALHA' : 'PASSA'} — ${clipCount} clips com alvos existentes`);
console.log(`RIG4 ${runtimeOk ? 'PASSA' : 'FALHA'} — SkeletonUtils.clone + AnimationMixer no caminho real`);
if (failures.length) for (const failure of failures.slice(0, 20)) console.error(`  ✗ ${failure}`);
if (failures.length > 20) console.error(`  … ${failures.length - 20} falhas adicionais`);
process.exit(failures.length ? 1 : 0);
