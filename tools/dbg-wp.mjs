import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as THREE from '../public/vendor/three.module.js';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
function buildGraph(doc) {
  const nodes = new Map();
  for (const n of doc.getRoot().listNodes()) nodes.set(n.getName(), { n, name: n.getName(), parent: null, children: [], restP: new THREE.Vector3().fromArray(n.getTranslation()), restQ: new THREE.Quaternion().fromArray(n.getRotation()), restS: new THREE.Vector3().fromArray(n.getScale()) });
  for (const g of nodes.values()) for (const c of g.n.listChildren()) { const cg = nodes.get(c.getName()); if (cg) { cg.parent = g; g.children.push(cg); } }
  return nodes;
}
function worldPos(g) {
  const chain = []; for (let n = g; n; n = n.parent) chain.unshift(n);
  let pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3(1,1,1);
  for (const n of chain) {
    pos.add(n.restP.clone().multiply(scl).applyQuaternion(quat));
    quat.multiply(n.restQ); scl.multiply(n.restS);
  }
  return { pos, quat, scl };
}
const SG = buildGraph(await io.read(process.argv[2]));
const TG = buildGraph(await io.read(process.argv[3]));
const sp = SG.get('pelvis'), tp = TG.get('Hips');
console.log('SRC pelvis world:', worldPos(sp).pos.toArray().map(v=>+v.toFixed(3)), 'quat:', worldPos(sp).quat.toArray().map(v=>+v.toFixed(3)));
console.log('TGT hips world:', worldPos(tp).pos.toArray().map(v=>+v.toFixed(3)), 'parent scl:', worldPos(tp.parent).scl.toArray().map(v=>+v.toFixed(4)));
console.log('TGT hips restP:', tp.restP.toArray().map(v=>+v.toFixed(3)), 'tgt Armature restS:', tp.parent ? tp.parent.restS.toArray().map(v=>+v.toFixed(4)) : null);
