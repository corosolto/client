// Probe: distância de cada vértice "oliva" ao vértice de pele mais próximo + cor do texel.
// Decide o raio da adjacência que separa LUVA (colada na pele) de CORPO DA ARMA.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const [glb] = process.argv.slice(2);
const doc = await io.read(glb);
const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
const pos = prim.getAttribute('POSITION').getArray();
const uv = prim.getAttribute('TEXCOORD_0').getArray();
const tex = doc.getRoot().listTextures().find(t => t.getName().startsWith('Color'));
const { data: img, info } = await sharp(Buffer.from(tex.getImage())).raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const n = pos.length / 3;
const sample = (u, v) => {
  const x = Math.min(W - 1, Math.max(0, Math.round(u * (W - 1)))), y = Math.min(H - 1, Math.max(0, Math.round(v * (H - 1))));
  const i = (y * W + x) * 3; return [img[i] / 255, img[i + 1] / 255, img[i + 2] / 255];
};
const isSkin = (R, G, B) => R > 0.42 && R - B > 0.10 && R - G > 0.03;
const isOlive = (R, G, B) => G >= R - 0.02 && R >= B - 0.02 && G < 0.55 && (R - B) < 0.12;
const skin = [], olive = [];
for (let i = 0; i < n; i++) {
  const [r, g, b] = sample(uv[i * 2], uv[i * 2 + 1]);
  if (isSkin(r, g, b)) skin.push(i); else if (isOlive(r, g, b)) olive.push(i);
}
console.log('skin verts', skin.length, 'olive verts', olive.length);
// grid de pele
const CELL = 0.05, grid = new Map();
const key = (x, y, z) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)},${Math.floor(z / CELL)}`;
for (const vi of skin) { const k = key(pos[vi*3], pos[vi*3+1], pos[vi*3+2]); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(vi); }
const dist = (vi) => {
  const x = pos[vi*3], y = pos[vi*3+1], z = pos[vi*3+2];
  const cx = Math.floor(x/CELL), cy = Math.floor(y/CELL), cz = Math.floor(z/CELL);
  let best = 1e9;
  for (let dx=-3;dx<=3;dx++) for (let dy=-3;dy<=3;dy++) for (let dz=-3;dz<=3;dz++) {
    const cell = grid.get(`${cx+dx},${cy+dy},${cz+dz}`); if (!cell) continue;
    for (const sv of cell) { const d = Math.hypot(pos[sv*3]-x, pos[sv*3+1]-y, pos[sv*3+2]-z); if (d<best) best=d; }
  }
  return best;
};
const buckets = {};
for (const vi of olive) {
  const d = dist(vi);
  const b = d > 0.2 ? 'far>0.2' : (Math.floor(d / 0.02) * 0.02).toFixed(2);
  buckets[b] = (buckets[b] || 0) + 1;
}
console.log('distância do oliva à pele mais próxima:');
for (const k of Object.keys(buckets).sort()) console.log(' ', k, buckets[k]);
// luminância dos texeis oliva perto vs longe
let nearL = [], farL = [];
for (const vi of olive) {
  const [r, g, b] = sample(uv[vi*2], uv[vi*2+1]);
  const l = 0.299*r + 0.587*g + 0.114*b;
  (dist(vi) < 0.05 ? nearL : farL).push(l);
}
const med = a => a.length ? a.sort((x,y)=>x-y)[a.length>>1].toFixed(3) : '-';
console.log('luma mediana oliva: perto(<0.05)', med(nearL), 'longe', med(farL));
