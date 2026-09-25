#!/usr/bin/env node
/** Fecha a Deagle com o candidato DGL50 já retargetado e otimizado. Mantém
 * malha, duas skins, quatro ações e mecanismos; acrescenta inspect e o contrato
 * baked. Produto e recibo de build ficam fora do Git. */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SOURCE_SHA = '9716c72881076b8f1cddbdb72d35232a89fcc2c81538f95885156d2bcb0a7ffc';
const option = (name) => (process.argv.find((value) => value.startsWith(`--${name}=`)) || '').slice(name.length + 3);
if (!option('source') || !option('output-dir')) throw new Error('uso: --source=<deagle-runtime.glb> --output-dir=<fora-do-git>');
const source = path.resolve(option('source'));
const outputDir = path.resolve(option('output-dir'));
if (!path.relative(REPO, outputDir).startsWith('..')) throw new Error('output-dir precisa ficar fora do Git');
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

/**
 * O rig KINEMATION traz a manga até o ombro, mas essa parte cruza o plano da
 * câmera na pose de pistola e vira o assunto do quadro. Mantemos antebraços,
 * luvas, mãos, pesos e animações; removemos apenas faces da manga cuja
 * influência dominante é o twist do braço superior. A correção mora na malha
 * do produto, sem compensar com câmera, FOV ou frame compartilhado.
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
    throw new Error('manga Deagle sem topologia/skin triangular esperada');
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
  if (removedTriangles < 1) throw new Error('manga Deagle não expôs faces proximais para correção');
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
if (digest(sourceBytes) !== SOURCE_SHA) throw new Error('fonte Deagle DGL50 ausente ou divergente');

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(source);
const root = document.getRoot();
const byName = (name) => root.listNodes().find((node) => node.getName() === name);
const sourceClips = root.listAnimations().map((clip) => clip.getName()).sort();
if (sourceClips.join(',') !== ['idle', 'reload_empty', 'reload_tactical', 'shoot'].sort().join(',')) throw new Error(`clips da fonte divergiram: ${sourceClips.join(',')}`);
for (const name of ['MINT_WEAPON_DEAGLE', 'SOCKET_MINT_MUZZLE', 'SOCKET_MINT_SIGHT']) if (byName(name)) throw new Error(`fonte já contém ${name}; receita precisa ser revista`);
const socket = byName('SOCKET_WEAPON_DEAGLE');
const weaponRig = byName('RIG_WEAPON_DEAGLE');
const armsRig = byName('RIG_FP_ARMS');
for (const name of ['GEO_WEAPON_DEAGLE_Deagle.001', 'Mag', 'Slider', 'Trigger', 'Hammer', 'hand_l', 'hand_r']) if (!byName(name)) throw new Error(`rig Deagle incompleto: ${name}`);
if (!socket || !weaponRig || !armsRig) throw new Error('raízes Deagle incompletas');
socket.addChild(document.createNode('MINT_WEAPON_DEAGLE'));
// O DGL50 foi exportado com a arma em -Z e uma elevação pequena em Y. Os dois
// pontos ficam no eixo real da arma e o sight permanece mais perto da câmera;
// unidades do rig são cm. Estes valores são os do produto otimizado aprovado,
// agora reproduzidos diretamente pela receita antes da otimização.
weaponRig.addChild(document.createNode('SOCKET_MINT_SIGHT').setTranslation([0, 1.0, 0]));
weaponRig.addChild(document.createNode('SOCKET_MINT_MUZZLE').setTranslation([0.000002, 3.476398, -19.775789]));

const buffer = root.listBuffers()[0] || document.createBuffer();
const times = new Float32Array([0, 0.35, 0.75, 1.10, 1.45, 1.80]);
const translations = new Float32Array([0,0,0, 0.02,0.008,-0.006, 0.07,0.02,-0.014, 0.09,0.024,-0.012, 0.04,0.01,-0.006, 0,0,0]);
const rotationValues = [];
for (const angle of [0, 0.02, 0.04, 0.05, 0.025, 0]) rotationValues.push(0, 0, Math.sin(angle / 2), Math.cos(angle / 2));
const timeAccessor = document.createAccessor('inspect_times').setType('SCALAR').setArray(times).setBuffer(buffer);
const translationAccessor = document.createAccessor('inspect_translation').setType('VEC3').setArray(translations).setBuffer(buffer);
const rotationAccessor = document.createAccessor('inspect_rotation').setType('VEC4').setArray(new Float32Array(rotationValues)).setBuffer(buffer);
const inspect = document.createAnimation('inspect');
for (const [targetPath, accessor] of [['translation', translationAccessor], ['rotation', rotationAccessor]]) {
  const sampler = document.createAnimationSampler().setInput(timeAccessor).setOutput(accessor).setInterpolation('LINEAR');
  inspect.addSampler(sampler).addChannel(document.createAnimationChannel().setTargetNode(armsRig).setTargetPath(targetPath).setSampler(sampler));
}
const sleeve = trimProximalSleeve(document);
await fs.mkdir(outputDir, { recursive: true });
const output = path.join(outputDir, 'deagle-runtime.glb');
await io.write(output, document);
const outputBytes = await fs.readFile(output);
const report = { schemaVersion: 1, weapon: 'deagle', displayName: 'DEAGLE "MARTELO"', ready: false,
  source: { file: source, bytes: sourceBytes.length, sha256: SOURCE_SHA },
  preservation: { originalClips: sourceClips, addedClip: 'inspect', mesh: 'GEO_WEAPON_DEAGLE_Deagle.001', armsRig: 'RIG_FP_ARMS', weaponRig: 'RIG_WEAPON_DEAGLE', sleeve },
  sockets: { muzzleParent: 'RIG_WEAPON_DEAGLE', muzzleLocal: [0.000002,3.476398,-19.775789], sightParent: 'RIG_WEAPON_DEAGLE', sightLocal: [0,1,0] },
  product: { file: output, bytes: outputBytes.length, sha256: digest(outputBytes) } };
await fs.writeFile(path.join(outputDir, 'build.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`DEAGLE_FINAL_OK ${JSON.stringify(report)}`);
