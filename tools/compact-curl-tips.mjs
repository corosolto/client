// Compacta apenas os vertices influenciados pelos ossos Curl_*_Tip criados por
// finger-curl.mjs --chain. A cadeia curva os dedos; esta etapa encurta as falanges
// distais para que mãos muito abertas do gerador leiam como punho na arma.
// Uso: node tools/compact-curl-tips.mjs <entrada.glb> <saida.glb> [fator=0.45]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as THREE from '../public/vendor/three.module.js';

const [, , input, output, factorArg = '0.45'] = process.argv;
const factor = Number(factorArg);
const ALL_CURL = process.argv.includes('--all');
if (!input || !output || !Number.isFinite(factor) || factor <= 0 || factor > 1) {
  console.error('uso: compact-curl-tips <entrada.glb> <saida.glb> [fator 0..1]');
  process.exit(1);
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);
const root = doc.getRoot();
const parentOf = (node) => root.listNodes().find((candidate) => candidate.listChildren().includes(node)) || null;
const worldPosition = (node) => {
  const chain = [];
  for (let current = node; current; current = parentOf(current)) chain.unshift(current);
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  for (const current of chain) {
    position.add(new THREE.Vector3().fromArray(current.getTranslation()).multiply(scale).applyQuaternion(rotation));
    rotation.multiply(new THREE.Quaternion().fromArray(current.getRotation()));
    scale.multiply(new THREE.Vector3().fromArray(current.getScale()));
  }
  return position;
};

let changed = 0;
for (const skin of root.listSkins()) {
  const joints = skin.listJoints();
  const tips = new Map();
  joints.forEach((joint, index) => {
    if ((ALL_CURL ? /^Curl_[LR](?:_Tip)?$/ : /^Curl_[LR]_Tip$/).test(joint.getName())) {
      tips.set(index, worldPosition(joint));
    }
  });
  if (!tips.size) continue;
  for (const mesh of root.listMeshes()) for (const primitive of mesh.listPrimitives()) {
    const position = primitive.getAttribute('POSITION');
    const jointAttr = primitive.getAttribute('JOINTS_0');
    const weightAttr = primitive.getAttribute('WEIGHTS_0');
    if (!position || !jointAttr || !weightAttr) continue;
    const p = [], j = [], w = [];
    for (let vertex = 0; vertex < position.getCount(); vertex++) {
      jointAttr.getElement(vertex, j);
      weightAttr.getElement(vertex, w);
      let pivot = null, influence = 0;
      for (let slot = 0; slot < 4; slot++) {
        if (tips.has(j[slot]) && w[slot] > influence) {
          pivot = tips.get(j[slot]);
          influence = w[slot];
        }
      }
      if (!pivot || influence <= 1e-6) continue;
      position.getElement(vertex, p);
      const point = new THREE.Vector3(...p);
      const compacted = pivot.clone().lerp(point, factor);
      point.lerp(compacted, influence);
      position.setElement(vertex, point.toArray());
      changed++;
    }
  }
}
if (!changed) throw new Error('nenhum vertice Curl_*_Tip encontrado');
await io.write(output, doc);
console.log(`compact-curl-tips: ${changed} vertices fator=${factor}${ALL_CURL ? ' all-curl' : ''} -> ${output}`);
