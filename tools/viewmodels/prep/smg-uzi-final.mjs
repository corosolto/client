#!/usr/bin/env node
/**
 * Assa a malha pública própria da Uzi sobre a fundação privada Striker-V.
 * O pente é separado da malha por uma região congelada e acompanha o bone Mag
 * das duas recargas. Ferrolho e gatilho próprios ficam visíveis e animados.
 * Produto e recibo de build permanecem fora do Git.
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, unpartition } from '@gltf-transform/functions';
import * as THREE from '../../../public/vendor/three.module.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const FOUNDATION_SHA = 'aed9fd871b9b9281f3a7fbe7db2baab0095cc5f5f5cc7cbd802ae31cabd5d102';
const BODY_SHA = '213b06a54610f35bf7315d6e85946604688315b9074f01f6040c2c33b3cf5edd';
const NORM = 0.4709197651663405;
const option = (name) => (process.argv.find((value) => value.startsWith(`--${name}=`)) || '').slice(name.length + 3);
if (!option('foundation') || !option('body') || !option('output-dir')) {
  throw new Error('uso: --foundation=<smg-runtime.glb> --body=<uzi.glb> --output-dir=<fora-do-git>');
}
const foundation = path.resolve(option('foundation'));
const body = path.resolve(option('body'));
const outputDir = path.resolve(option('output-dir'));
if (!path.relative(REPO, outputDir).startsWith('..')) throw new Error('output-dir precisa ficar fora do Git');
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const foundationBytes = await fs.readFile(foundation);
const bodyBytes = await fs.readFile(body);
if (digest(foundationBytes) !== FOUNDATION_SHA || digest(bodyBytes) !== BODY_SHA) {
  throw new Error('fonte Striker-V/Uzi ausente ou divergente');
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(foundation);
const bodyDocument = await io.read(body);
const bodyRoot = bodyDocument.getRoot();
const bodyScene = bodyRoot.listScenes()[0];
const bodyNode = bodyRoot.listNodes().find((node) => node.getMesh());
const sourceMesh = bodyNode?.getMesh();
const primitive = sourceMesh?.listPrimitives()[0];
if (!bodyScene || !bodyNode || !sourceMesh || !primitive || sourceMesh.listPrimitives().length !== 1) {
  throw new Error('malha pública Uzi deveria conter uma cena, um nó e uma primitiva');
}
const positions = primitive.getAttribute('POSITION');
const indices = primitive.getIndices();
if (!positions || !indices || indices.getCount() !== 14280 || positions.getCount() !== 6597) {
  throw new Error(`topologia Uzi divergente: ${positions?.getCount()}/${indices?.getCount()}`);
}

// A região do pente é a única que desce abaixo de y=-0,16 e está contida
// nesta seção estreita do receiver. Selecionar qualquer vértice baixo inclui
// as faces longas das laterais e congela exatamente 84 triângulos.
const sourceIndices = indices.getArray();
const selected = [];
const remaining = [];
const value = [];
for (let cursor = 0; cursor < sourceIndices.length; cursor += 3) {
  const triangle = [sourceIndices[cursor], sourceIndices[cursor + 1], sourceIndices[cursor + 2]];
  const points = triangle.map((index) => { const point = []; positions.getElement(index, point); return point; });
  const isMagazine = points.some((point) => point[1] < -0.16)
    && points.every((point) => point[0] >= -0.08 && point[0] <= 0.06
      && point[2] >= -0.06 && point[2] <= 0.06);
  (isMagazine ? selected : remaining).push(...triangle);
}
if (selected.length / 3 !== 84 || remaining.length / 3 !== 4676) {
  throw new Error(`corte do pente Uzi divergente: mag=${selected.length / 3} corpo=${remaining.length / 3}`);
}
const indexType = sourceIndices.constructor;
primitive.setIndices(bodyDocument.createAccessor('UZI_BODY_INDICES').setType('SCALAR')
  .setArray(new indexType(remaining)).setBuffer(bodyRoot.listBuffers()[0]));
const magPrimitive = bodyDocument.createPrimitive().setMaterial(primitive.getMaterial())
  .setMode(primitive.getMode()).setIndices(bodyDocument.createAccessor('UZI_MAG_INDICES').setType('SCALAR')
    .setArray(new indexType(selected)).setBuffer(bodyRoot.listBuffers()[0]));
for (const semantic of primitive.listSemantics()) magPrimitive.setAttribute(semantic, primitive.getAttribute(semantic));
const magMesh = bodyDocument.createMesh('MINT_WEAPON_MAG_UZI_MESH').addPrimitive(magPrimitive);
const magSourceNode = bodyDocument.createNode('MINT_WEAPON_MAG_UZI_SOURCE').setMesh(magMesh);
bodyScene.addChild(magSourceNode);

const map = mergeDocuments(document, bodyDocument);
const copiedScene = map.get(bodyScene);
const copiedBody = map.get(bodyNode);
const copiedMag = map.get(magSourceNode);
if (!copiedScene || !copiedBody || !copiedMag) throw new Error('merge Uzi não preservou os nós esperados');
copiedScene.removeChild(copiedBody).removeChild(copiedMag);
copiedScene.dispose();

const root = document.getRoot();
const byName = (name) => root.listNodes().find((node) => node.getName() === name);
const rig = byName('RIG_WEAPON_SMG');
const arms = byName('RIG_FP_ARMS');
const magBone = byName('Mag');
const donor = byName('GEO_WEAPON_SMG_SKM_Striker-V.001');
if (!rig || !arms || !magBone || !donor) throw new Error('fundação Striker-V incompleta');
donor.dispose();

// Posição congelada a partir da montagem real no idle, acrescida do giro que
// torna a silhueta lateral legível. O holder escala 100 porque o rig está em cm.
const mint = document.createNode('MINT_WEAPON_UZI')
  .setTranslation([-2.2361595215, 1.2949438980, -2.7272194248])
  .setRotation([0.0143455375, -0.0000001658, 0.0000000142, 0.9998970975])
  .setScale([100.0000107717, 100.0000107717, 100.0000107717]);
rig.addChild(mint);
const trim = document.createNode('UZI_TRIM')
  .setRotation([-0.0665279314, 0.2999732953, -0.0209761762, 0.9513937442])
  .setScale([NORM, NORM, NORM]);
mint.addChild(trim);
const sourceOrientation = document.createNode('UZI_SOURCE_ORIENTATION')
  .setTranslation([0, 0, 0.07984375])
  .setRotation([0, 0.7071067812, 0, -0.7071067812]);
trim.addChild(sourceOrientation);
copiedBody.setName('GEO_WEAPON_UZI').setTranslation([0, 0, 0]).setRotation([0, 0, 0, 1]).setScale([1, 1, 1]);
sourceOrientation.addChild(copiedBody);

// Preserva a posição de repouso da mesma geometria, porém sob o bone Mag, que
// já acompanha as mãos nas duas recargas da fonte.
const worldSource = new THREE.Matrix4().fromArray(sourceOrientation.getWorldMatrix());
const worldMag = new THREE.Matrix4().fromArray(magBone.getWorldMatrix());
const magLocal = worldMag.clone().invert().multiply(worldSource);
copiedMag.setName('MINT_WEAPON_MAG_UZI').setMatrix(magLocal.toArray());
magBone.addChild(copiedMag);

const buffer = root.listBuffers()[0] || document.createBuffer();
const accessor = (name, type, values, ArrayType = Float32Array) => document.createAccessor(name)
  .setType(type).setArray(new ArrayType(values)).setBuffer(buffer);
const boxMesh = (name, size, material) => {
  const [x, y, z] = size.map((axis) => axis / 2);
  const faces = [
    [[1,0,0], [[x,-y,-z],[x,y,-z],[x,y,z],[x,-y,z]]], [[-1,0,0], [[-x,-y,z],[-x,y,z],[-x,y,-z],[-x,-y,-z]]],
    [[0,1,0], [[-x,y,-z],[-x,y,z],[x,y,z],[x,y,-z]]], [[0,-1,0], [[-x,-y,z],[-x,-y,-z],[x,-y,-z],[x,-y,z]]],
    [[0,0,1], [[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]]], [[0,0,-1], [[x,-y,-z],[-x,-y,-z],[-x,y,-z],[x,y,-z]]],
  ];
  const vertex = [], normal = [], index = [];
  for (const [faceIndex, [n, corners]] of faces.entries()) {
    for (const corner of corners) { vertex.push(...corner); normal.push(...n); }
    const offset = faceIndex * 4; index.push(offset,offset+1,offset+2,offset,offset+2,offset+3);
  }
  const part = document.createPrimitive().setMaterial(material)
    .setAttribute('POSITION', accessor(`${name}_POSITION`, 'VEC3', vertex))
    .setAttribute('NORMAL', accessor(`${name}_NORMAL`, 'VEC3', normal))
    .setIndices(accessor(`${name}_INDICES`, 'SCALAR', index, Uint16Array));
  return document.createMesh(`${name}_MESH`).addPrimitive(part);
};
const mechanismMaterial = document.createMaterial('UZI_MECHANISM_DARK')
  .setBaseColorFactor([0.035, 0.04, 0.045, 1]).setMetallicFactor(0.82).setRoughnessFactor(0.28);
const bolt = document.createNode('MINT_MECH_UZI_BOLT').setMesh(boxMesh('UZI_BOLT', [0.08, 0.018, 0.052], mechanismMaterial))
  .setTranslation([0.04, 0.276, 0]);
const trigger = document.createNode('MINT_MECH_UZI_TRIGGER').setMesh(boxMesh('UZI_TRIGGER', [0.018, 0.065, 0.016], mechanismMaterial))
  .setTranslation([-0.06, -0.002, 0]).setRotation([0, 0, -0.0871557, 0.9961947]);
sourceOrientation.addChild(bolt).addChild(trigger);

// Sockets medidos na malha pública bruta: cano frontal e alça superior.
sourceOrientation.addChild(document.createNode('SOCKET_MINT_MUZZLE').setTranslation([0.4980, 0.20924, -0.00103]));
sourceOrientation.addChild(document.createNode('SOCKET_MINT_SIGHT').setTranslation([0.09350, 0.33887, 0.00149]));

const channel = (clip, node, targetPath, times, values, type) => {
  const sampler = document.createAnimationSampler()
    .setInput(accessor(`${clip.getName()}_${node.getName()}_${targetPath}_times`, 'SCALAR', times))
    .setOutput(accessor(`${clip.getName()}_${node.getName()}_${targetPath}`, type, values))
    .setInterpolation('LINEAR');
  clip.addSampler(sampler).addChannel(document.createAnimationChannel()
    .setTargetNode(node).setTargetPath(targetPath).setSampler(sampler));
};
const sourceClips = root.listAnimations().map((clip) => clip.getName()).sort();
if (sourceClips.join(',') !== ['idle','reload_empty','reload_tactical'].sort().join(',')) {
  throw new Error(`clips da fonte divergiram: ${sourceClips.join(',')}`);
}
const idle = root.listAnimations().find((clip) => clip.getName() === 'idle');
const elementSize = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const holdIdlePose = (clip, times, omit = new Set()) => {
  for (const idleChannel of idle.listChannels()) {
    const node = idleChannel.getTargetNode();
    const targetPath = idleChannel.getTargetPath();
    if (omit.has(`${node.getName()}:${targetPath}`)) continue;
    const output = idleChannel.getSampler().getOutput();
    const size = elementSize[output.getType()];
    if (!size) throw new Error(`canal idle não suportado: ${node.getName()}:${targetPath}:${output.getType()}`);
    const value = Array.from(output.getArray().slice(0, size));
    channel(clip, node, targetPath, times, times.flatMap(() => value), output.getType());
  }
};
const shootTimes = [0, 0.045, 0.09, 0.15, 0.22];
const shoot = document.createAnimation('shoot');
// Os clips próprios precisam ser autocontidos. Sem a pose completa do idle,
// shoot/inspect herdavam a última recarga e podiam enquadrar a arma fora da tela.
holdIdlePose(shoot, shootTimes, new Set([`${arms.getName()}:translation`]));
channel(shoot, bolt, 'translation', shootTimes, [0.04,0.276,0, 0.01,0.276,0, -0.045,0.276,0, 0.012,0.276,0, 0.04,0.276,0], 'VEC3');
channel(shoot, trigger, 'rotation', shootTimes, [0,0,-0.0871557,0.9961947, 0,0,-0.16,0.987, 0,0,-0.25,0.9682, 0,0,-0.14,0.9901, 0,0,-0.0871557,0.9961947], 'VEC4');
channel(shoot, arms, 'translation', shootTimes, [0,0,0, 0.008,0.006,-0.004, 0.025,0.014,-0.010, 0.009,0.005,-0.004, 0,0,0], 'VEC3');
const empty = root.listAnimations().find((clip) => clip.getName() === 'reload_empty');
channel(empty, bolt, 'translation', [0, 3.15, 3.42, 3.72, 4.34], [0.04,0.276,0, 0.04,0.276,0, -0.05,0.276,0, 0.0,0.276,0, 0.04,0.276,0], 'VEC3');
const inspect = document.createAnimation('inspect');
const inspectTimes = [0, 0.35, 0.75, 1.10, 1.45, 1.80];
holdIdlePose(inspect, inspectTimes, new Set([
  `${arms.getName()}:translation`, `${arms.getName()}:rotation`,
]));
channel(inspect, arms, 'translation', inspectTimes, [0,0,0, 0.03,0.008,-0.006, 0.09,0.02,-0.014, 0.12,0.024,-0.012, 0.06,0.01,-0.006, 0,0,0], 'VEC3');
channel(inspect, arms, 'rotation', inspectTimes, [0,0,0,1, 0,0,0.01,0.99995, 0,0,0.02,0.9998, 0,0,0.025,0.999687, 0,0,0.0125,0.999922, 0,0,0,1], 'VEC4');

await fs.mkdir(outputDir, { recursive: true });
const output = path.join(outputDir, 'uzi-baked-runtime.glb');
await document.transform(unpartition());
await io.write(output, document);
const outputBytes = await fs.readFile(output);
const report = {
  schemaVersion: 1, weapon: 'uzi', displayName: 'UZI RA-TA-TA', ready: false,
  foundation: { file: foundation, bytes: foundationBytes.length, sha256: FOUNDATION_SHA },
  source: { file: body, bytes: bodyBytes.length, sha256: BODY_SHA },
  preservation: { originalClips: sourceClips, addedClips: ['shoot','inspect'], bodyTriangles: remaining.length / 3,
    magazineTriangles: selected.length / 3, armsRig: 'RIG_FP_ARMS', weaponRig: 'RIG_WEAPON_SMG',
    mechanisms: ['MINT_WEAPON_MAG_UZI','MINT_MECH_UZI_BOLT','MINT_MECH_UZI_TRIGGER'] },
  product: { file: output, bytes: outputBytes.length, sha256: digest(outputBytes) },
};
await fs.writeFile(path.join(outputDir, 'build.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`UZI_FINAL_OK ${JSON.stringify(report)}`);
