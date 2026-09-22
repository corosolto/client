#!/usr/bin/env node
/** Fecha KXG12: mãos e ações completas, pump/gatilho/cartucho próprios e inspect. */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, unpartition } from '@gltf-transform/functions';
import * as THREE from '../../../public/vendor/three.module.js';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SOURCE_SHA = '71dd4edd43da77c7a52af01b2481e2f71cca57507bbe88674ce0b674a62986c7';
const FOUNDATION_SHA = 'aed9fd871b9b9281f3a7fbe7db2baab0095cc5f5f5cc7cbd802ae31cabd5d102';
const option = (name) => (process.argv.find((value) => value.startsWith(`--${name}=`)) || '').slice(name.length + 3);
if (!option('source') || !option('foundation') || !option('output-dir')) throw new Error('uso: --source=<shotgun-v8.glb> --foundation=<smg.glb> --output-dir=<fora-do-git>');
const source = path.resolve(option('source'));
const foundation = path.resolve(option('foundation'));
const outputDir = path.resolve(option('output-dir'));
if (!path.relative(REPO, outputDir).startsWith('..')) throw new Error('output-dir precisa ficar fora do Git');
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

/**
 * A KXG12 traz a manga até o braço superior e uma faixa longa do antebraço.
 * Essas faces ficam entre a câmera e a arma e dominam o quadro. Mantemos o
 * punho da manga, as luvas e as mãos; removemos somente os triângulos cuja
 * influência dominante pertence ao braço proximal. A correção mora na malha.
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
    throw new Error('manga Shotgun sem topologia/skin triangular esperada');
  }
  const jointNames = skin.listJoints().map((node) => node.getName());
  const proximal = /^(?:upperarm_twist_01|lowerarm)_[lr]$/;
  const dominantJoint = (vertex) => {
    let slot = 0;
    for (let lane = 1; lane < 4; lane += 1) if (weights[vertex * 4 + lane] > weights[vertex * 4 + slot]) slot = lane;
    return jointNames[joints[vertex * 4 + slot]] || '';
  };
  const kept = [];
  let removedTriangles = 0;
  for (let offset = 0; offset + 2 < indices.length; offset += 3) {
    const triangle = [indices[offset], indices[offset + 1], indices[offset + 2]];
    if (triangle.some((vertex) => proximal.test(dominantJoint(vertex)))) removedTriangles += 1;
    else kept.push(...triangle);
  }
  if (removedTriangles < 1) throw new Error('manga Shotgun não expôs faces proximais para correção');
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

/**
 * O doador está numa base curta em espaço de câmera. O pull de ADS do contrato
 * (4 cm) ficava maior que a distância aparente do produto e aproximava a arma
 * até cortar mecanismo e mãos. Rebaseamos o conjunto no próprio GLB: escala e
 * distância crescem na mesma proporção, logo o idle projetado não muda, mas o
 * deslocamento métrico do ADS passa a ter a proporção esperada. Nenhuma câmera,
 * FOV, frame compartilhado ou configuração de runtime é alterada.
 */
const reframeProduct = (document, arms) => {
  const root = document.getRoot();
  const scene = root.listScenes()[0];
  const cameraNode = root.listNodes().find((node) => node.getCamera());
  if (!scene || !cameraNode) throw new Error('Shotgun sem scene/câmera para rebase do produto');
  const cameraWorld = new THREE.Matrix4().fromArray(cameraNode.getWorldMatrix());
  const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(-8.9), 0, 0));
  const runtimeFrame = new THREE.Matrix4().compose(
    new THREE.Vector3(0.057, -0.114, -0.159), rotation, new THREE.Vector3(1, 1, 1));
  const productScale = 5;
  const effectiveFrame = new THREE.Matrix4().compose(
    new THREE.Vector3(-0.0402, 0.0107, -0.1739).multiplyScalar(productScale),
    rotation, new THREE.Vector3(productScale, productScale, productScale));
  const matrix = cameraWorld.clone().multiply(runtimeFrame.clone().invert())
    .multiply(effectiveFrame).multiply(cameraWorld.clone().invert());
  const product = document.createNode('VM_PRODUCT_SHOTGUN').setMatrix(matrix.toArray()).setExtras({
    contract: 'product-first-frame', scale: productScale,
    preservesIdleProjection: true, runtimeFrameUntouched: true,
  });
  product.addChild(arms);
  scene.addChild(product);
  return { node: product.getName(), scale: productScale, matrix: matrix.toArray() };
};
const sourceBytes = await fs.readFile(source);
const foundationBytes = await fs.readFile(foundation);
if (sourceBytes.length !== 25019108 || digest(sourceBytes) !== SOURCE_SHA) throw new Error('fonte shotgun ausente ou divergente');
if (foundationBytes.length !== 3764304 || digest(foundationBytes) !== FOUNDATION_SHA) throw new Error('fundação de texturas compartilhadas ausente ou divergente');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(source);
const foundationDocument = await io.read(foundation);
const root = document.getRoot();
const byName = (name) => root.listNodes().find((node) => node.getName() === name);
const clips = new Map(root.listAnimations().map((clip) => [clip.getName(), clip]));
const expected = ['equip_rifle','idle','reload_end','reload_loop','reload_start','shoot'];
if ([...clips.keys()].sort().join(',') !== expected.sort().join(',')) throw new Error(`clips shotgun divergiram: ${[...clips.keys()]}`);
const arms = byName('RIG_FP_ARMS');
const rig = byName('RIG_WEAPON_SHOTGUN');
const gun = byName('GEO_WEAPON_SHOTGUN_KSG.001')?.setName('GEO_WEAPON_SHOTGUN_KXG12');
const shell = byName('Gauge')?.setName('MINT_AMMO_SHOTGUN_GAUGE');
const pump = byName('Pump')?.setName('MINT_MECH_SHOTGUN_PUMP');
const trigger = byName('Trigger')?.setName('MINT_MECH_SHOTGUN_TRIGGER');
if (![arms, rig, gun, shell, pump, trigger].every(Boolean)) throw new Error('fonte shotgun sem arma, mãos ou mecanismos completos');
// Os nove atlas de braços já são carregados uma vez pelo runtime. Trocar apenas
// seus bytes por placeholders preserva nomes/materiais e elimina ~19 MB duplicados.
const placeholders = new Map(foundationDocument.getRoot().listTextures().map((texture) => [texture.getName(), texture]));
for (const texture of root.listTextures()) {
  const placeholder = placeholders.get(texture.getName());
  if (placeholder) texture.setImage(placeholder.getImage()).setMimeType(placeholder.getMimeType());
}
rig.addChild(document.createNode('MINT_WEAPON_SHOTGUN').setExtras({ contract: 'baked-marker' }));
// O rig da KXG12 está rotacionado em relação ao eixo do arquivo. A boca real,
// medida na extremidade do cano, fica neste ponto local; usar `z=-80` apontava
// o contrato para trás apesar de a malha visível estar correta.
rig.addChild(document.createNode('SOCKET_MINT_MUZZLE')
  .setTranslation([-1.150224, -6.009773, 34.933628]).setExtras({ contract: 'muzzle' }));
rig.addChild(document.createNode('SOCKET_MINT_SIGHT').setTranslation([0, 0, -22]).setExtras({ contract: 'sight' }));
const buffer = root.listBuffers()[0] || document.createBuffer();
const accessor = (name, type, values) => document.createAccessor(name).setType(type).setArray(new Float32Array(values)).setBuffer(buffer);
const addChannel = (clip, node, targetPath, times, values, type) => {
  const sampler = document.createAnimationSampler()
    .setInput(accessor(`${clip.getName()}_${node.getName()}_${targetPath}_times`, 'SCALAR', times))
    .setOutput(accessor(`${clip.getName()}_${node.getName()}_${targetPath}`, type, values)).setInterpolation('LINEAR');
  clip.addSampler(sampler).addChannel(document.createAnimationChannel().setTargetNode(node).setTargetPath(targetPath).setSampler(sampler));
};
// O pacote não move o gatilho apesar de possuir o bone. A curva local fecha em
// 0,36 s e deixa o restante do shoot para o recuo e o ciclo completo do pump.
const shoot = clips.get('shoot');
const triggerChannel = shoot.listChannels().find((channel) => channel.getTargetNode() === trigger && channel.getTargetPath() === 'rotation');
if (!triggerChannel) throw new Error('shoot sem canal do gatilho');
const triggerOutput = triggerChannel.getSampler().getOutput();
const triggerTimes = Array.from(triggerChannel.getSampler().getInput().getArray());
const triggerValues = Array.from(triggerOutput.getArray());
const multiply = (a, b) => [
  a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],
  a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],
  a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],
  a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2],
];
for (let i = 0; i < triggerTimes.length; i += 1) {
  const t = triggerTimes[i];
  const phase = t >= 0.36 ? 0 : Math.sin(Math.PI * t / 0.36);
  const angle = phase * 0.18;
  const base = triggerValues.slice(i * 4, i * 4 + 4);
  const value = multiply(base, [Math.sin(angle / 2), 0, 0, Math.cos(angle / 2)]);
  triggerValues.splice(i * 4, 4, ...value);
}
triggerOutput.setArray(new Float32Array(triggerValues));
// Inspect autocontido: congela a pose completa do idle e move o conjunto pela
// raiz. Arma e duas mãos viajam juntas, evitando herança de pose da recarga.
const inspect = document.createAnimation('inspect');
const inspectTimes = [0, 0.35, 0.8, 1.25, 1.7, 2.1];
for (const idleChannel of clips.get('idle').listChannels()) {
  const target = idleChannel.getTargetNode();
  if (target === arms) continue;
  const targetPath = idleChannel.getTargetPath();
  const output = idleChannel.getSampler().getOutput();
  const stride = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[output.getType()];
  if (!stride) throw new Error(`canal idle não suportado: ${output.getType()}`);
  const first = Array.from(output.getArray().slice(0, stride));
  addChannel(inspect, target, targetPath, inspectTimes, inspectTimes.flatMap(() => first), output.getType());
}
const qx = (degrees) => { const angle = degrees * Math.PI / 360; return [Math.sin(angle), 0, 0, Math.cos(angle)]; };
const qy = (degrees) => { const angle = degrees * Math.PI / 360; return [0, Math.sin(angle), 0, Math.cos(angle)]; };
const qz = (degrees) => { const angle = degrees * Math.PI / 360; return [0, 0, Math.sin(angle), Math.cos(angle)]; };
const inspectEuler = [[0,0,0],[-2,-5,2],[-4,-12,5],[-2,9,-4],[0,4,-1],[0,0,0]];
const inspectRotations = inspectEuler.flatMap(([x,y,z]) => multiply(multiply(qx(x), qy(y)), qz(z)));
addChannel(inspect, arms, 'translation', inspectTimes, [0,0,0, 0.008,0.004,-0.004, 0.020,0.012,-0.010, 0.014,0.008,-0.007, 0.005,0.002,-0.002, 0,0,0], 'VEC3');
addChannel(inspect, arms, 'rotation', inspectTimes, inspectRotations, 'VEC4');
const sleeve = trimProximalSleeve(document);
const productFrame = reframeProduct(document, arms);
await fs.mkdir(outputDir, { recursive: true });
const output = path.join(outputDir, 'shotgun-baked-runtime.glb');
await document.transform(prune({ keepExtras: true }), unpartition());
await io.write(output, document);
const outputBytes = await fs.readFile(output);
const report = {
  schemaVersion: 1, weapon: 'shotgun', displayName: 'M3 CONVERSA FIADA', ready: false,
  source: { file: source, bytes: sourceBytes.length, sha256: SOURCE_SHA },
  sharedTextureFoundation: { file: foundation, bytes: foundationBytes.length, sha256: FOUNDATION_SHA },
  preservation: { originalClips: expected, addedClips: ['inspect'], armsRig: arms.getName(), weaponRig: rig.getName(), weaponMesh: gun.getName(), mechanisms: [shell.getName(), pump.getName(), trigger.getName()] },
  productFirst: { sleeve, frame: productFrame },
  product: { file: output, bytes: outputBytes.length, sha256: digest(outputBytes) },
};
await fs.writeFile(path.join(outputDir, 'build.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`SHOTGUN_FINAL_OK ${JSON.stringify(report)}`);
