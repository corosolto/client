/* sonda: mede a PORTA NATIVA (recesso na fachada +z) de cada casa do kit lajes.
   Uso: node scratchpad/sonda-porta-kit.mjs  (rascunho da régua ESC-lajes) */
import { THREE } from '../tools/eval/harness.mjs';
import fs from 'node:fs';

export function glbTris(file) {
  const b = fs.readFileSync(file);
  const jsonLen = b.readUInt32LE(12);
  const j = JSON.parse(b.slice(20, 20 + jsonLen).toString());
  let off = 20 + jsonLen;
  const binLen = b.readUInt32LE(off);
  const bin = b.slice(off + 8, off + 8 + binLen);
  const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const readAcc = (ai) => {
    const a = j.accessors[ai], bv = j.bufferViews[a.bufferView];
    const base = (bv.byteOffset || 0) + (a.byteOffset || 0);
    const stride = bv.byteStride || 12;
    const out = [];
    for (let i = 0; i < a.count; i++) {
      if (a.componentType === 5126) out.push([dv.getFloat32(base + i * stride, true), dv.getFloat32(base + i * stride + 4, true), dv.getFloat32(base + i * stride + 8, true)]);
      else throw new Error('componentType não suportado: ' + a.componentType);
    }
    return out;
  };
  const tris = [];
  const walk = (ni, parent) => {
    const n = j.nodes[ni];
    const m = parent.clone();
    if (n.matrix) m.multiply(new THREE.Matrix4().fromArray(n.matrix));
    if (n.translation) m.multiply(new THREE.Matrix4().makeTranslation(...n.translation));
    if (n.rotation) m.multiply(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().fromArray(n.rotation)));
    if (n.scale) m.multiply(new THREE.Matrix4().makeScale(...n.scale));
    if (n.mesh !== undefined) {
      for (const p of j.meshes[n.mesh].primitives) {
        const pos = readAcc(p.attributes.POSITION);
        const idx = [];
        if (p.indices !== undefined) {
          const ia = j.accessors[p.indices], ibv = j.bufferViews[ia.bufferView];
          const ib = (ibv.byteOffset || 0) + (ia.byteOffset || 0);
          for (let i = 0; i < ia.count; i++) idx.push(ia.componentType === 5123 ? dv.getUint16(ib + i * 2, true) : dv.getUint32(ib + i * 4, true));
        } else for (let i = 0; i < pos.length; i++) idx.push(i);
        for (let i = 0; i < idx.length; i += 3) {
          const t = [pos[idx[i]], pos[idx[i + 1]], pos[idx[i + 2]]].map((v) => new THREE.Vector3(...v).applyMatrix4(m));
          tris.push(t);
        }
      }
    }
    for (const c of (n.children || [])) walk(c, m);
  };
  const I = new THREE.Matrix4();
  for (const ni of j.scenes[j.scene || 0].nodes) walk(ni, I);
  return tris;
}

const IDS = ['lajes_casa_01', 'lajes_casa_02', 'lajes_casa_03', 'lajes_casa_04', 'lajes_casa_05', 'lajes_casa_06', 'lajes_casa_07'];
for (const id of IDS) {
  const tris = glbTris(`public/models/props/${id}.glb`);
  const geo = new THREE.BufferGeometry();
  const verts = [];
  for (const t of t3flat(tris)) verts.push(t);
  function t3flat(ts) { const out = []; for (const t of ts) for (const v of t) out.push(v.x, v.y, v.z); return out; }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
  mesh.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(mesh);
  // fachada +z: maior z entre triângulos do módulo térreo (y<2.3)
  let facadeZ = -1e9;
  for (const t of tris) if (Math.max(t[0].y, t[1].y, t[2].y) < 2.3) facadeZ = Math.max(facadeZ, t[0].z, t[1].z, t[2].z);
  const ray = new THREE.Raycaster();
  const hitZ = (x, y) => {
    ray.set(new THREE.Vector3(x, y, facadeZ + 3), new THREE.Vector3(0, 0, -1));
    const h = ray.intersectObject(mesh, false);
    return h.length ? h[0].point.z : -1e9;
  };
  const cols = [];
  for (let x = -1.3; x <= 1.3; x += 0.05) {
    let top = 0;
    for (let y = 0.06; y <= 2.2; y += 0.03) {
      const h = hitZ(x, y);
      if (h > facadeZ - 0.8 && h < facadeZ - 0.12) top = y;
    }
    if (top > 0.8) cols.push([+x.toFixed(2), +top.toFixed(2)]);
  }
  const topMax = cols.length ? Math.max(...cols.map((c) => c[1])) : 0;
  console.log(id, `bbox y ${bb.min.y.toFixed(2)}..${bb.max.y.toFixed(2)} | fachadaZ ${facadeZ.toFixed(2)} | colunas c/ recesso: ${cols.length} | porta topo máx ${topMax.toFixed(2)}`);
}
