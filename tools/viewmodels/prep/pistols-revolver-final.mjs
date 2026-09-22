#!/usr/bin/env node
/** Fecha o revólver .38 com o candidato Viper-357 já retargetado e otimizado. Mantém
 * malha, duas skins, três ações e mecanismos; acrescenta inspect e o contrato
 * baked. Produto e recibo de build ficam fora do Git. */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SOURCE_SHA = 'ddb088750bbdd4db455aa415ea8b74e59d6178733687f172cdf647d32cec1516';
const option = (name) => (process.argv.find((value) => value.startsWith(`--${name}=`)) || '').slice(name.length + 3);
if (!option('source') || !option('output-dir')) throw new Error('uso: --source=<revolver-runtime.glb> --output-dir=<fora-do-git>');
const source = path.resolve(option('source'));
const outputDir = path.resolve(option('output-dir'));
if (!path.relative(REPO, outputDir).startsWith('..')) throw new Error('output-dir precisa ficar fora do Git');
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

/**
 * A pose KINEMATION de pistola inclui manga até o ombro. Essas faces cruzam o
 * plano da câmera e fazem o braço dominar o quadro. Mantemos antebraços,
 * luvas, mãos, pesos e ações; removemos somente triângulos cuja influência
 * dominante é o twist do braço superior.
 */
const trimProximalSleeve = (document) => {
  const root = document.getRoot();
  const clothNode = root.listNodes().find((node) => node.getName() === 'GEO_FP_SK_Cloth_01');
  const skin = clothNode?.getSkin();
  const primitive = clothNode?.getMesh()?.listPrimitives()[0];
  const joints = primitive?.getAttribute('JOINTS_0')?.getArray();
  const weights = primitive?.getAttribute('WEIGHTS_0')?.getArray();
  const indices = primitive?.getIndices()?.getArray();
  if (!skin || !primitive || !joints || !weights || !indices || primitive.getMode() !== 4) {
    throw new Error('manga Revólver .38 sem topologia/skin triangular esperada');
  }
  const jointNames = skin.listJoints().map((node) => node.getName());
  const upperarm = new Set(['upperarm_twist_01_l', 'upperarm_twist_01_r']);
  const dominantJoint = (vertex) => {
    let slot = 0;
    for (let lane = 1; lane < 4; lane += 1) if (weights[vertex * 4 + lane] > weights[vertex * 4 + slot]) slot = lane;
    return jointNames[joints[vertex * 4 + slot]] || '';
  };
  const kept = [];
  let removedTriangles = 0;
  for (let offset = 0; offset + 2 < indices.length; offset += 3) {
    const triangle = [indices[offset], indices[offset + 1], indices[offset + 2]];
    if (triangle.some((vertex) => upperarm.has(dominantJoint(vertex)))) removedTriangles += 1;
    else kept.push(...triangle);
  }
  if (removedTriangles < 1) throw new Error('manga Revólver .38 não expôs faces proximais para correção');
  const used = [...new Set(kept)].sort((a, b) => a - b);
  const remap = new Map(used.map((vertex, index) => [vertex, index]));
  for (const semantic of primitive.listSemantics()) {
    const accessor = primitive.getAttribute(semantic);
    const source = accessor.getArray();
    const stride = accessor.getElementSize();
    const compact = new source.constructor(used.length * stride);
    for (let next = 0; next < used.length; next += 1) {
      const previous = used[next];
      for (let lane = 0; lane < stride; lane += 1) compact[next * stride + lane] = source[previous * stride + lane];
    }
    primitive.setAttribute(semantic, accessor.clone().setArray(compact));
  }
  const IndexArray = used.length > 65535 ? Uint32Array : Uint16Array;
  primitive.setIndices(primitive.getIndices().clone().setArray(new IndexArray(kept.map((vertex) => remap.get(vertex)))));
  return { beforeVertices: joints.length / 4, afterVertices: used.length,
    beforeTriangles: indices.length / 3, afterTriangles: kept.length / 3, removedTriangles };
};
const sourceBytes = await fs.readFile(source);
if (digest(sourceBytes) !== SOURCE_SHA) throw new Error('fonte Revólver .38 Viper-357 ausente ou divergente');

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(source);
const root = document.getRoot();
const byName = (name) => root.listNodes().find((node) => node.getName() === name);
const sourceClips = root.listAnimations().map((clip) => clip.getName()).sort();
if (sourceClips.join(',') !== ['idle', 'reload_empty', 'shoot'].sort().join(',')) throw new Error(`clips da fonte divergiram: ${sourceClips.join(',')}`);
for (const name of ['MINT_WEAPON_REVOLVER38', 'SOCKET_MINT_MUZZLE', 'SOCKET_MINT_SIGHT']) if (byName(name)) throw new Error(`fonte já contém ${name}; receita precisa ser revista`);
const socket = byName('SOCKET_WEAPON_REVOLVER');
const weaponRig = byName('RIG_WEAPON_REVOLVER');
const armsRig = byName('RIG_FP_ARMS');
for (const name of ['GEO_WEAPON_REVOLVER_python.001', 'Drum', 'CraneArm', 'Ejector', 'Trigger', 'Hammer', 'hand_l', 'hand_r']) if (!byName(name)) throw new Error(`rig Revólver .38 incompleto: ${name}`);
if (!socket || !weaponRig || !armsRig) throw new Error('raízes Revólver .38 incompletas');
// Rebase intrínseco do pacote, em espaço do export original. A câmera aponta
// para +Z nesse arquivo; deslocar o rig nesse eixo aumenta a distância óptica
// sem alterar câmera, FOV, frame compartilhado ou runtime.
const productRebase = document.createNode('PRODUCT_REBASE_REVOLVER38').setTranslation([-0.025, -0.04, 0.115]);
root.listScenes()[0].addChild(productRebase);
productRebase.addChild(armsRig);
socket.addChild(document.createNode('MINT_WEAPON_REVOLVER38'));
// O Viper-357 aponta o cano em -Y do rig. Os dois pontos ficam no eixo real da
// arma e o sight permanece mais perto da câmera; unidades do rig são cm.
weaponRig.addChild(document.createNode('SOCKET_MINT_SIGHT').setTranslation([0, 1.0, 0]));
weaponRig.addChild(document.createNode('SOCKET_MINT_MUZZLE').setTranslation([0.334679, 1.522319, -15.211058]));

const buffer = root.listBuffers()[0] || document.createBuffer();
const times = new Float32Array([0, 0.35, 0.75, 1.10, 1.45, 1.80]);
const translations = new Float32Array([0,0,0, 0.02,0.008,-0.006, 0.07,0.02,-0.014, 0.09,0.024,-0.012, 0.04,0.01,-0.006, 0,0,0]);
const rotationValues = [];
for (const angle of [0, 0.02, 0.04, 0.05, 0.025, 0]) rotationValues.push(0, 0, Math.sin(angle / 2), Math.cos(angle / 2));
const timeAccessor = document.createAccessor('inspect_times').setType('SCALAR').setArray(times).setBuffer(buffer);
const translationAccessor = document.createAccessor('inspect_translation').setType('VEC3').setArray(translations).setBuffer(buffer);
const rotationAccessor = document.createAccessor('inspect_rotation').setType('VEC4').setArray(new Float32Array(rotationValues)).setBuffer(buffer);
const inspect = document.createAnimation('inspect');
// Inspect precisa ser autônomo. Um clipe que anima somente a raiz herda a
// última pose da recarga no AnimationMixer e pode deixar arma/mãos fora do
// quadro. Congelamos a primeira amostra do idle em todos os canais do rig ao
// longo do inspect; o gesto da raiz continua sendo acrescentado abaixo.
const inspectHoldTimes = document.createAccessor('inspect_hold_times').setType('SCALAR')
  .setArray(new Float32Array([0, 1.80])).setBuffer(buffer);
const idle = root.listAnimations().find((clip) => clip.getName() === 'idle');
let heldChannels = 0;
for (const channel of idle?.listChannels() || []) {
  if (channel.getTargetNode() === armsRig) continue;
  const sourceOutput = channel.getSampler()?.getOutput();
  if (!sourceOutput) continue;
  const sourceArray = sourceOutput.getArray();
  const stride = sourceOutput.getElementSize();
  const held = new sourceArray.constructor(stride * 2);
  for (let lane = 0; lane < stride; lane += 1) held[lane] = held[stride + lane] = sourceArray[lane];
  const output = document.createAccessor(`inspect_hold_${heldChannels}`)
    .setType(sourceOutput.getType()).setArray(held).setBuffer(buffer);
  const sampler = document.createAnimationSampler().setInput(inspectHoldTimes).setOutput(output).setInterpolation('LINEAR');
  inspect.addSampler(sampler).addChannel(document.createAnimationChannel()
    .setTargetNode(channel.getTargetNode()).setTargetPath(channel.getTargetPath()).setSampler(sampler));
  heldChannels += 1;
}
if (heldChannels < 40) throw new Error(`idle não forneceu pose completa ao inspect (${heldChannels} canais)`);
for (const [targetPath, accessor] of [['translation', translationAccessor], ['rotation', rotationAccessor]]) {
  const sampler = document.createAnimationSampler().setInput(timeAccessor).setOutput(accessor).setInterpolation('LINEAR');
  inspect.addSampler(sampler).addChannel(document.createAnimationChannel().setTargetNode(armsRig).setTargetPath(targetPath).setSampler(sampler));
}
const sleeve = trimProximalSleeve(document);
await fs.mkdir(outputDir, { recursive: true });
const output = path.join(outputDir, 'revolver-runtime.glb');
await io.write(output, document);
const outputBytes = await fs.readFile(output);
const report = { schemaVersion: 1, weapon: 'revolver38', displayName: 'REVÓLVER .38 "TROVÃO"', ready: false,
  source: { file: source, bytes: sourceBytes.length, sha256: SOURCE_SHA },
  preservation: { originalClips: sourceClips, addedClip: 'inspect', inspectHeldChannels: heldChannels, mesh: 'GEO_WEAPON_REVOLVER_python.001', armsRig: 'RIG_FP_ARMS', weaponRig: 'RIG_WEAPON_REVOLVER', sleeve, productRebase: [-0.025,-0.04,0.115] },
  sockets: { muzzleParent: 'RIG_WEAPON_REVOLVER', muzzleLocal: [0.334679,1.522319,-15.211058], sightParent: 'RIG_WEAPON_REVOLVER', sightLocal: [0,1,0] },
  product: { file: output, bytes: outputBytes.length, sha256: digest(outputBytes) } };
await fs.writeFile(path.join(outputDir, 'build.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`REVOLVER_FINAL_OK ${JSON.stringify(report)}`);
