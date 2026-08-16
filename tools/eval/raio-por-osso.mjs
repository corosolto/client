// Diagnóstico: de ONDE vem o raioSkin. Mesma conta do char-probe (C7), mas
// quebrada POR OSSO DOMINANTE, para separar "corpo genuinamente largo" (spine/hips)
// de "osso no lugar errado" (braço/perna/cabeça).
// uso: node raio-por-osso.mjs <a.glb> [b.glb ...]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as THREE from 'three';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const TARGET_H = 1.72;

function worldMap(doc) {
  const info = new Map();
  for (const n of doc.getRoot().listNodes()) info.set(n, new THREE.Matrix4().compose(
    new THREE.Vector3().fromArray(n.getTranslation()),
    new THREE.Quaternion().fromArray(n.getRotation()),
    new THREE.Vector3().fromArray(n.getScale())));
  const parent = new Map();
  for (const n of doc.getRoot().listNodes()) for (const c of n.listChildren()) parent.set(c, n);
  const wm = new Map();
  const world = (n) => {
    if (wm.has(n)) return wm.get(n);
    const p = parent.get(n);
    const m = p ? new THREE.Matrix4().multiplyMatrices(world(p), info.get(n)) : info.get(n).clone();
    wm.set(n, m); return m;
  };
  for (const n of doc.getRoot().listNodes()) world(n);
  return { wm, parent };
}
const med = (a) => (a.length ? a.slice().sort((x, y) => x - y)[a.length >> 1] : null);

function distSeg(p, a, b) {
  const ab = new THREE.Vector3().subVectors(b, a), ap = new THREE.Vector3().subVectors(p, a);
  let t = ab.lengthSq() > 1e-9 ? ap.dot(ab) / ab.lengthSq() : 0;
  t = Math.max(0, Math.min(1, t));
  return new THREE.Vector3().copy(a).addScaledVector(ab, t).distanceTo(p);
}

for (const file of process.argv.slice(2)) {
  const doc = await io.read(file);
  const skin = doc.getRoot().listSkins()[0];
  const joints = skin.listJoints();
  const { wm, parent } = worldMap(doc);
  const jIdx = new Map(joints.map((j, i) => [j, i]));
  const jpos = joints.map((j) => new THREE.Vector3().setFromMatrixPosition(wm.get(j)));
  const kids = joints.map(() => []);
  joints.forEach((j, i) => j.listChildren().forEach((c) => { if (jIdx.has(c)) kids[i].push(jIdx.get(c)); }));

  // vértices em espaço de MALHA -> mundo, via matriz do nó da malha
  const pts = [];
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const nd of doc.getRoot().listNodes()) {
    const mesh = nd.getMesh(); if (!mesh) continue;
    // glTF: o transform do NÓ de malha skinada é IGNORADO (as joint matrices já
    // levam o vértice ao mundo). Aplicar wm aqui dava H=0,017 m — o 0,01 da Armature.
    for (const prim of mesh.listPrimitives()) {
      const P = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0');
      if (!P || !J) continue;
      const M = nd.getSkin() ? new THREE.Matrix4() : wm.get(nd);
      const el = [], je = [], we = [];
      for (let i = 0; i < P.getCount(); i++) {
        P.getElement(i, el);
        const v = new THREE.Vector3(el[0], el[1], el[2]).applyMatrix4(M);
        J.getElement(i, je); W.getElement(i, we);
        let bi = -1, bw = 0;
        for (let k = 0; k < 4; k++) if (we[k] > bw) { bw = we[k]; bi = je[k]; }
        for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], v.getComponent(k)); mx[k] = Math.max(mx[k], v.getComponent(k)); }
        if (bw > 0.5 && bi >= 0) pts.push({ v, bi });
      }
    }
  }
  const H = mx[1] - mn[1];
  const S = TARGET_H / H;                       // mesma normalização do char-probe
  const porOsso = new Map();
  const todos = [];
  for (const { v, bi } of pts) {
    let d = Infinity;
    if (kids[bi].length) for (const c of kids[bi]) d = Math.min(d, distSeg(v, jpos[bi], jpos[c]));
    else d = v.distanceTo(jpos[bi]);
    d *= S;
    todos.push(d);
    const nm = joints[bi].getName();
    if (!porOsso.has(nm)) porOsso.set(nm, []);
    porOsso.get(nm).push(d);
  }
  // CONTRAFACTUAL: e se o vértice dominado por uma junta FOLHA fosse contado no PAI?
  // Folha rígida (head_end, headfront, Curl_*) deforma EXATAMENTE igual ao pai
  // (jointWorld·IBM é idêntico quando o filho é rígido), então trocar o rótulo não muda
  // um pixel na tela — mas muda a régua, porque folha não tem segmento e vira distância
  // a um PONTO.
  const paiIdx = joints.map((j) => { const p = parent.get(j); return jIdx.has(p) ? jIdx.get(p) : -1; });
  const remap = [];
  for (const { v, bi } of pts) {
    const b2 = (kids[bi].length === 0 && paiIdx[bi] >= 0) ? paiIdx[bi] : bi;
    let d = Infinity;
    if (kids[b2].length) for (const c of kids[b2]) d = Math.min(d, distSeg(v, jpos[b2], jpos[c]));
    else d = v.distanceTo(jpos[b2]);
    remap.push(d * S);
  }
  remap.sort((a, b) => a - b);
  todos.sort((a, b) => a - b);
  const p50 = todos[todos.length >> 1], p95 = todos[Math.floor(todos.length * 0.95)];
  const r50 = remap[remap.length >> 1], r95 = remap[Math.floor(remap.length * 0.95)];
  console.log(`\n### ${file.split('/').pop()}  verts=${pts.length}  H=${H.toFixed(3)} (escala ${S.toFixed(3)})  larg=${((mx[0] - mn[0]) * S).toFixed(3)} prof=${((mx[2] - mn[2]) * S).toFixed(3)}`);
  console.log(`raioSkinP50=${p50.toFixed(3)}  P95=${p95.toFixed(3)}   | folha->pai: P50=${r50.toFixed(3)} P95=${r95.toFixed(3)}`);
  const linhas = [...porOsso.entries()].map(([nm, a]) => ({ nm, n: a.length, p50: med(a), p95: a.slice().sort((x, y) => x - y)[Math.floor(a.length * 0.95)] }));
  linhas.sort((a, b) => b.n * b.p50 - a.n * a.p50);
  console.log('osso'.padEnd(18), 'n'.padStart(6), 'p50'.padStart(7), 'p95'.padStart(7), '  contrib(n*p50)');
  for (const l of linhas.slice(0, 14)) {
    console.log(l.nm.padEnd(18), String(l.n).padStart(6), l.p50.toFixed(3).padStart(7), l.p95.toFixed(3).padStart(7), '  ' + (l.n * l.p50).toFixed(0));
  }
}
