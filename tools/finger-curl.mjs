// Add a "curl" bone per hand to a Meshy GLB and re-weight the finger-area vertices to
// it, so the hand can close into a grip (the 24-bone Meshy rig has no finger bones).
// With --chain, add a second, identically named child at the middle phalanx. The runtime
// rotates both and the fingertips inherit two bends instead of moving as a flat paddle.
//
// usage: node tools/finger-curl.mjs <in.glb> <out.glb> [--chain]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';
import * as THREE from '../public/vendor/three.module.js';

const [, , inPath, outPath] = process.argv;
const CHAIN = process.argv.includes('--chain');
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
  const tipPivot = handW.clone().add(fwd.clone().multiplyScalar(0.115));
  const curlTip = CHAIN
    ? doc.createNode(`${H.curl}_Tip`).setTranslation([
        tipPivot.x - knuckle.x,
        tipPivot.y - knuckle.y,
        tipPivot.z - knuckle.z,
      ])
    : null;
  if (curlTip) curlBone.addChild(curlTip);

  for (const skin of root.listSkins()) {
    const joints = skin.listJoints();
    const hIdx = joints.findIndex(j => j === handBone);
    if (hIdx < 0) continue;
    skin.addJoint(curlBone);
    const cIdx = joints.length; // new joint index (after append)
    if (curlTip) skin.addJoint(curlTip);
    const tIdx = curlTip ? joints.length + 1 : null;
    // inverse bind matrix for the curl bone (identity at bind = knuckle position)
    const ibm = skin.getInverseBindMatrices().getArray();
    const handIBM = ibm.slice(hIdx * 16, hIdx * 16 + 16);
    const newIbm = new Float32Array(ibm.length + (curlTip ? 32 : 16));
    newIbm.set(ibm, 0);
    // curl IBM: translate so the knuckle maps to origin (approx, reuse hand's rotation)
    const m = new THREE.Matrix4().fromArray(handIBM);
    const t = new THREE.Matrix4().makeTranslation(-knuckle.x, -knuckle.y, -knuckle.z).multiply(m);
    newIbm.set(t.toArray(), ibm.length);
    if (curlTip) {
      const tt = new THREE.Matrix4().makeTranslation(-tipPivot.x, -tipPivot.y, -tipPivot.z).multiply(m);
      newIbm.set(tt.toArray(), ibm.length + 16);
    }
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
          if (slot >= 0) {
            // Na cadeia, a metade distal segue o segundo osso. Como ele é filho do
            // primeiro, recebe as duas rotações e produz uma curva em vez de uma pá.
            jArr[vi * 4 + slot] = curlTip && f > 0.55 ? tIdx : cIdx;
            wArr[vi * 4 + slot] = move;
          }
          else wArr[vi * 4 + handSlot] += move; // restore: no free slot, keep full hand weight
        }
        jAttr.setArray(jArr); wAttr.setArray(wArr);
      }
    }
  }
}

await doc.transform(prune({ keepLeaves: true }));
await io.write(outPath, doc);
console.log('ok:', outPath, CHAIN ? '(curl chain)' : '(single curl)');
