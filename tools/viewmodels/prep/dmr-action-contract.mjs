#!/usr/bin/env node
/**
 * Completa a gramática de ações das DMR sem trocar rig, mãos ou mecanismos.
 *
 * A candidata preserva o `idle` inteiro como pose de base (201 canais de
 * braços) e acrescenta movimento no root do rig. Assim inspect/shoot não
 * derrubam as mãos para a bind pose, que aconteceria com um clipe só de root.
 * Produtos ficam fora do Git e continuam `ready:false` no manifesto público.
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SOURCES = {
  rem700: {
    sha256: '088ea869a4bed472bf2ce798bf83b0dae581d6ea3a0bbc78473624c9ef9f5b4d',
    output: 'rem700-baked-runtime.glb',
    // Pose autorada no produto, em espaço do pacote original. Corresponde ao
    // delta de câmera medido pela régua 3:2, convertido pela câmera embutida;
    // câmera/FOV e FAMILY_FRAME permanecem intactos.
    packageTranslation: [0.1289, 0.0774, 0.024],
  },
  g3sg1: { sha256: '10c08eecd3b7d71d5036830f8e4aa5f5c71e2829e89bee48fa225fdad3391a1e', output: 'g3sg1-baked-runtime.glb' },
};
const option = (name) => (process.argv.find((arg) => arg.startsWith(`--${name}=`)) || '').slice(name.length + 3);
const weapon = option('weapon');
const source = path.resolve(option('source') || '.');
const outputDir = path.resolve(option('output-dir') || '.');
if (!SOURCES[weapon] || !option('source') || !option('output-dir')) {
  throw new Error('uso: --weapon=<rem700|g3sg1> --source=<glb legado> --output-dir=<fora-do-git>');
}
if (!path.relative(REPO, outputDir).startsWith('..')) throw new Error('output-dir precisa ficar fora do Git');
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const sourceBytes = await fs.readFile(source);
if (digest(sourceBytes) !== SOURCES[weapon].sha256) throw new Error(`fonte ${weapon} ausente ou divergente`);

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(source);
const root = document.getRoot();
const buffer = root.listBuffers()[0] || document.createBuffer();
const idle = root.listAnimations().find((clip) => clip.getName() === 'idle');
const arms = root.listNodes().find((node) => node.getName() === 'RIG_FP_ARMS');
if (!idle || !arms) throw new Error(`${weapon}: idle/rig de braços ausente`);

if (SOURCES[weapon].packageTranslation) {
  const scene = root.getDefaultScene() || root.listScenes()[0];
  const packageNode = document.createNode(`VM_PACKAGE_${weapon.toUpperCase()}`)
    .setTranslation(SOURCES[weapon].packageTranslation);
  scene.addChild(packageNode);
  packageNode.addChild(arms);
}

const cloneIdle = (name) => {
  if (root.listAnimations().some((clip) => clip.getName() === name)) throw new Error(`${weapon}: clipe ${name} já existe`);
  const clip = document.createAnimation(name);
  const samplers = new Map();
  for (const channel of idle.listChannels()) {
    const sourceSampler = channel.getSampler();
    let sampler = samplers.get(sourceSampler);
    if (!sampler) {
      sampler = document.createAnimationSampler()
        .setInput(sourceSampler.getInput()).setOutput(sourceSampler.getOutput())
        .setInterpolation(sourceSampler.getInterpolation());
      samplers.set(sourceSampler, sampler);
      clip.addSampler(sampler);
    }
    clip.addChannel(document.createAnimationChannel()
      .setTargetNode(channel.getTargetNode()).setTargetPath(channel.getTargetPath()).setSampler(sampler));
  }
  return clip;
};

const addTrack = (clip, node, targetPath, times, values, type) => {
  const input = document.createAccessor(`${clip.getName()}_${node.getName()}_times`)
    .setType('SCALAR').setArray(new Float32Array(times)).setBuffer(buffer);
  const output = document.createAccessor(`${clip.getName()}_${node.getName()}_${targetPath}`)
    .setType(type).setArray(new Float32Array(values)).setBuffer(buffer);
  const sampler = document.createAnimationSampler().setInput(input).setOutput(output).setInterpolation('LINEAR');
  clip.addSampler(sampler).addChannel(document.createAnimationChannel()
    .setTargetNode(node).setTargetPath(targetPath).setSampler(sampler));
};

const addInspect = () => {
  const clip = cloneIdle('inspect');
  addTrack(clip, arms, 'translation', [0, .32, .72, 1.10, 1.48, 1.80],
    [0,0,0, .018,.006,-.004, .06,.022,-.012, .075,.026,-.01, .035,.009,-.005, 0,0,0], 'VEC3');
  const rotations = [];
  for (const angle of [0, .018, .042, .05, .024, 0]) rotations.push(0, 0, Math.sin(angle / 2), Math.cos(angle / 2));
  addTrack(clip, arms, 'rotation', [0, .32, .72, 1.10, 1.48, 1.80], rotations, 'VEC4');
};

addInspect();
if (weapon === 'g3sg1') {
  const clip = cloneIdle('shoot');
  addTrack(clip, arms, 'translation', [0, .045, .11, .22], [0,0,0, 0,.012,.032, 0,.005,.012, 0,0,0], 'VEC3');
  const rotations = [];
  for (const angle of [0, -.026, -.01, 0]) rotations.push(Math.sin(angle / 2), 0, 0, Math.cos(angle / 2));
  addTrack(clip, arms, 'rotation', [0, .045, .11, .22], rotations, 'VEC4');
}

await fs.mkdir(outputDir, { recursive: true });
const output = path.join(outputDir, SOURCES[weapon].output);
await io.write(output, document);
const bytes = await fs.readFile(output);
const report = { schemaVersion: 1, weapon, ready: false,
  source: { bytes: sourceBytes.length, sha256: SOURCES[weapon].sha256 },
  product: { file: output, bytes: bytes.length, sha256: digest(bytes) },
  actions: root.listAnimations().map((clip) => clip.getName()) };
await fs.writeFile(path.join(outputDir, 'actions-build.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`DMR_ACTION_CONTRACT_OK ${JSON.stringify(report)}`);
