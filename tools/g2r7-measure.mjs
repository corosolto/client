// Mede o gun-space (stock→muzzle) de um viewmodel estático Tripo arbitrário.
// Mesma heurística do g2-gunspace.mjs: eixo = Z do model space; muzzle = centroide dos
// vértices com z>maxZ-0.06; stock = centroide dos z<minZ+0.12. Imprime no formato de
// entrada do VM_GUNSPACE (vmattach.js) + bounds gerais p/ framing.
// Uso: node tools/g2r7-measure.mjs <glb>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9], nv = 0;
const prims = [];
for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) {
  const a = p.getAttribute('POSITION'); if (!a) continue;
  prims.push(a.getArray()); nv += a.getCount();
  const bmin = a.getMin([]), bmax = a.getMax([]);
  for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], bmin[i]); mx[i] = Math.max(mx[i], bmax[i]); }
}
console.log(`verts=${nv} prims=${prims.length} bounds min=[${mn.map(v=>v.toFixed(3))}] max=[${mx.map(v=>v.toFixed(3))}]`);
const ctr = (pred) => { let s = [0,0,0], c = 0;
  for (const a of prims) for (let i = 0; i < a.length; i += 3) { const p = [a[i], a[i+1], a[i+2]]; if (!pred(p)) continue; s[0]+=p[0]; s[1]+=p[1]; s[2]+=p[2]; c++; }
  return { p: s.map(v => v / (c || 1)), c }; };
const mz = ctr(p => p[2] > mx[2] - 0.06), st = ctr(p => p[2] < mn[2] + 0.12);
const axis = [mz.p[0]-st.p[0], mz.p[1]-st.p[1], mz.p[2]-st.p[2]];
const L = Math.hypot(...axis);
console.log(`muzzle=[${mz.p.map(v=>v.toFixed(3))}] (n=${mz.c})  stock=[${st.p.map(v=>v.toFixed(3))}] (n=${st.c})  L=${L.toFixed(3)}`);
console.log(`axis=[${axis.map((v) => (v / L).toFixed(3))}]`);
console.log(`VM_GUNSPACE entry: { stock: [${st.p.map(v=>v.toFixed(3))}], muzzle: [${mz.p.map(v=>v.toFixed(3))}] },`);
