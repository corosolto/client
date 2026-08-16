// Add ONE "curl" bone per hand to a Meshy GLB and re-weight the finger-area vertices to
// it, so the hand can close into a grip (the 24-bone Meshy rig has no finger bones).
// The curl bone is a child of the hand bone at the knuckles; vertices keep part of the
// hand weight near the wrist and shift to the curl bone toward the fingertips.
//
// usage: node tools/finger-curl.mjs <in.glb> <out.glb>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';
import * as THREE from '../public/vendor/three.module.js';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) { console.error('usage: finger-curl <in> <out>'); process.exit(1); }
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inPath);
const root = doc.getRoot();

const HANDS = [
  { hand: 'RightHand', curl: 'Curl_R', elbow: 'RightForeArm' },
  { hand: 'LeftHand', curl: 'Curl_L', elbow: 'LeftForeArm' },
];

for (const H of HANDS) {
  const handBone = root.listNodes().find(n => n.getName() === H.hand);
  const elbowBone = root.listNodes().find(n => n.getName() === H.elbow);
  if (!handBone || !elbowBone) { console.warn('sem osso', H.hand); continue; }

  // knuckle pivot: hand bone position + a bit along the forearm→hand direction
  const worldPos = (node) => {
    const chain = [];
    for (let n = node; n; n = (root.listNodes().find(x => x.listChildren().includes(n)) || null)) chain.unshift(n);
    let p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1);
    for (const n of chain) {
      const lp = new THREE.Vector3().fromArray(n.getTranslation()).multiply(sc).applyQuaternion(q);
      p.add(lp);
      q.multiply(new THREE.Quaternion().fromArray(n.getRotation()));
      sc.multiply(new THREE.Vector3().fromArray(n.getScale()));
    }
    return p;
  };
  const handW = worldPos(handBone);
  const elbowW = worldPos(elbowBone);
  const fwd = handW.clone().sub(elbowW).normalize();
  const knuckle = handW.clone().add(fwd.clone().multiplyScalar(0.07)); // ~7cm past wrist
  // curl bone (child of hand bone), local offset toward knuckle
  const curlBone = doc.createNode(H.curl)
    .setTranslation([knuckle.x - handW.x, knuckle.y - handW.y, knuckle.z - handW.z]);
  handBone.addChild(curlBone);

  for (const skin of root.listSkins()) {
    const joints = skin.listJoints();
    const hIdx = joints.findIndex(j => j === handBone);
    if (hIdx < 0) continue;
    skin.addJoint(curlBone);
    const cIdx = joints.length; // new joint index (after append)
    // inverse bind matrix for the curl bone (identity at bind = knuckle position)
    const ibm = skin.getInverseBindMatrices().getArray();
    const handIBM = ibm.slice(hIdx * 16, hIdx * 16 + 16);
    const newIbm = new Float32Array(ibm.length + 16);
    newIbm.set(ibm, 0);
    // curl IBM: translate so the knuckle maps to origin (approx, reuse hand's rotation)
    const m = new THREE.Matrix4().fromArray(handIBM);
    const t = new THREE.Matrix4().makeTranslation(-knuckle.x, -knuckle.y, -knuckle.z).multiply(m);
    newIbm.set(t.toArray(), ibm.length);
    skin.getInverseBindMatrices().setArray(newIbm);

    for (const mesh of root.listMeshes()) {
      for (const prim of mesh.listPrimitives()) {
        const skinnedMesh = mesh.listParents().find(p => p.propertyType === 'Node' && p.getSkin && p.getSkin());
        if (!skinnedMesh) continue;
        const posAttr = prim.getAttribute('POSITION');
        const jAttr = prim.getAttribute('JOINTS_0');
        const wAttr = prim.getAttribute('WEIGHTS_0');
        if (!posAttr || !jAttr || !wAttr) continue;
        const pArr = posAttr.getArray();
        const count = posAttr.getCount();
        const jArr = jAttr.getArray(), wArr = wAttr.getArray();
        // knuckle→fingertip direction per vertex (from knuckle toward the vertex)
        for (let vi = 0; vi < count; vi++) {
          // find this vertex's hand-bone slot (strongest influence)
          let handSlot = -1, handWv = 0;
          for (let s = 0; s < 4; s++) if (jArr[vi * 4 + s] === hIdx && wArr[vi * 4 + s] > handWv) { handSlot = s; handWv = wArr[vi * 4 + s]; }
          if (handSlot < 0 || handWv < 0.3) continue; // not a hand vertex
          const px = pArr[vi * 3], py = pArr[vi * 3 + 1], pz = pArr[vi * 3 + 2];
          const d = new THREE.Vector3(px, py, pz).sub(knuckle);
          const along = d.dot(fwd); // 0 at knuckle, + along fingers
          const f = Math.max(0, Math.min(1, along / 0.09)); // full curl ~9cm past knuckle
          if (f <= 0) continue;
          const move = handWv * f;
          wArr[vi * 4 + handSlot] = handWv - move;
          // put the moved weight into a free slot, else replace the smallest other slot
          // put the moved weight into a FREE slot; if none free, skip (weight stays on hand)
          let slot = -1;
          for (let s = 0; s < 4; s++) if (wArr[vi * 4 + s] === 0) { slot = s; break; }
          if (slot >= 0) { jArr[vi * 4 + slot] = cIdx; wArr[vi * 4 + slot] = move; }
          else wArr[vi * 4 + handSlot] += move; // restore: no free slot, keep full hand weight
        }
        jAttr.setArray(jArr); wAttr.setArray(wArr);
      }
    }
  }
}

await doc.transform(prune({ keepLeaves: true }));
await io.write(outPath, doc);
console.log('ok:', outPath);
