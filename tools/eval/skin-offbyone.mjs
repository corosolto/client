/* skin-offbyone.mjs — o osso que domina cada pedaço de carne está no lugar certo?
   Para cada junta, centroide dos vértices que ela DOMINA (peso > 0,5), e a distância
   desse centroide até: (a) a própria junta, (b) o pai, (c) o meio do segmento junta→pai,
   (d) o meio do segmento junta→filho.
   Se a carne cai sistematicamente em (c) e não em (d), o auto-skin está pintando cada
   membro com o osso DISTAL — o antebraço obedecendo ao punho.
   uso: node tools/eval/skin-offbyone.mjs <a.glb> [b.glb ...] */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as THREE from 'three';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const ALVO = /arm|leg|hand|foot|spine|head|neck|hips|shoulder|toe/i;

for (const file of process.argv.slice(2)) {
  const doc = await io.read(file);
  const skin = doc.getRoot().listSkins()[0];
  const joints = skin.listJoints();
  const jIdx = new Map(joints.map((j, i) => [j, i]));
  const parent = new Map();
  for (const n of doc.getRoot().listNodes()) for (const c of n.listChildren()) parent.set(c, n);
  const info = new Map();
  for (const n of doc.getRoot().listNodes()) info.set(n, new THREE.Matrix4().compose(
    new THREE.Vector3().fromArray(n.getTranslation()), new THREE.Quaternion().fromArray(n.getRotation()), new THREE.Vector3().fromArray(n.getScale())));
  const wm = new Map();
  const world = (n) => { if (wm.has(n)) return wm.get(n); const p = parent.get(n); const m = p ? new THREE.Matrix4().multiplyMatrices(world(p), info.get(n)) : info.get(n).clone(); wm.set(n, m); return m; };
  for (const n of doc.getRoot().listNodes()) world(n);
  const jp = joints.map((j) => new THREE.Vector3().setFromMatrixPosition(wm.get(j)));
  const kids = joints.map(() => []);
  joints.forEach((j, i) => j.listChildren().forEach((c) => { if (jIdx.has(c)) kids[i].push(jIdx.get(c)); }));
  const pai = joints.map((j) => (jIdx.has(parent.get(j)) ? jIdx.get(parent.get(j)) : -1));

  const acc = joints.map(() => new THREE.Vector3()), cnt = joints.map(() => 0);
  for (const nd of doc.getRoot().listNodes()) {
    const mesh = nd.getMesh(); if (!mesh || !nd.getSkin()) continue;
    for (const prim of mesh.listPrimitives()) {
      const P = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0');
      if (!P || !J) continue;
      const el = [], je = [], we = [];
      for (let i = 0; i < P.getCount(); i++) {
        P.getElement(i, el); J.getElement(i, je); W.getElement(i, we);
        let bi = -1, bw = 0;
        for (let k = 0; k < 4; k++) if (we[k] > bw) { bw = we[k]; bi = je[k]; }
        if (bw <= 0.5 || bi < 0) continue;
        acc[bi].add(new THREE.Vector3(el[0], el[1], el[2])); cnt[bi]++;
      }
    }
  }
  console.log(`\n### ${file.split('/').pop()}`);
  console.log('osso'.padEnd(16), 'n'.padStart(5), 'd(junta)'.padStart(9), 'd(meio p/PAI)'.padStart(14), 'd(meio p/FILHO)'.padStart(16), '  veredito');
  let votoPai = 0, votoFilho = 0;
  for (let i = 0; i < joints.length; i++) {
    const nm = joints[i].getName();
    if (!cnt[i] || !ALVO.test(nm)) continue;
    const c = acc[i].clone().multiplyScalar(1 / cnt[i]);
    const dJ = c.distanceTo(jp[i]);
    const mp = pai[i] >= 0 ? jp[i].clone().add(jp[pai[i]]).multiplyScalar(0.5) : null;
    const mf = kids[i].length ? jp[i].clone().add(jp[kids[i][0]]).multiplyScalar(0.5) : null;
    const dP = mp ? c.distanceTo(mp) : null, dF = mf ? c.distanceTo(mf) : null;
    let ver = '';
    if (dP != null && dF != null) {
      if (dP < dF * 0.75) { ver = 'PAI (distal: errado)'; votoPai++; }
      else if (dF < dP * 0.75) { ver = 'filho (ok)'; votoFilho++; }
      else ver = '~empate';
    }
    console.log(nm.padEnd(16), String(cnt[i]).padStart(5), dJ.toFixed(3).padStart(9),
      (dP != null ? dP.toFixed(3) : '-').padStart(14), (dF != null ? dF.toFixed(3) : '-').padStart(16), '  ' + ver);
  }
  console.log(`VOTO: segmento junta→PAI ${votoPai}  ×  junta→FILHO ${votoFilho}`);
}
