// G2-R9 (GAP3): two-tone da M4-HERÓI — FDE tan no handguard/rail, receiver preto.
// Edita a textura baseColor DENTRO de arms_m4.glb (offline, sem mudança de runtime).
// Mãos/luvas preservadas pelo classificador pele/oliva do vm-variant-tex.
// Região em gun-space (VM_GUNSPACE.m4): handguard = t 0.52-0.80, h -0.14..0.12.
// Uso: node tools/m4-twotone.mjs
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const GLB = 'public/models/fpvm/arms_m4.glb';
const GS = { stock: [-0.089, -0.052, -0.437], muzzle: [-0.001, 0.174, 0.468] };
const doc = await io.read(GLB);
const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
const pos = prim.getAttribute('POSITION').getArray();
const uv = prim.getAttribute('TEXCOORD_0').getArray();
const idx = prim.getIndices().getArray();
const tex = doc.getRoot().listTextures().find((t) => t.getName().startsWith('Color'));
const { data: img, info } = await sharp(Buffer.from(tex.getImage())).raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;

const isSkin = (r, g, b) => { const R = r / 255, G = g / 255, B = b / 255; return R > 0.42 && R - B > 0.10 && R - G > 0.03; };
const isGloveHue = (r, g, b) => { const R = r / 255, G = g / 255, B = b / 255; const l = 0.299 * R + 0.587 * G + 0.114 * B; return l > 0.20 && l < 0.62 && G >= R - 0.03 && G > B + 0.02; };

// gun-space
const st = GS.stock, ax = [GS.muzzle[0] - st[0], GS.muzzle[1] - st[1], GS.muzzle[2] - st[2]];
const L = Math.hypot(...ax); const a = ax.map((v) => v / L);
let up = [0, 1, 0]; const d = up[0] * a[0] + up[1] * a[1] + up[2] * a[2];
up = [up[0] - d * a[0], up[1] - d * a[1], up[2] - d * a[2]];
const ul = Math.hypot(...up); up = up.map((v) => v / ul);
const T = new Float32Array(pos.length / 3), HH = new Float32Array(pos.length / 3);
for (let vi = 0; vi < pos.length / 3; vi++) {
  const x = pos[vi * 3] - st[0], y = pos[vi * 3 + 1] - st[1], z = pos[vi * 3 + 2] - st[2];
  T[vi] = (x * a[0] + y * a[1] + z * a[2]) / L;
  HH[vi] = x * up[0] + y * up[1] + z * up[2];
}
// marca vértices do handguard; rasteriza triângulos ≥2 verts na região
const inGuard = (vi) => T[vi] >= 0.52 && T[vi] < 0.82 && HH[vi] > -0.14 && HH[vi] < 0.14;
const mask = new Uint8Array(W * H);
for (let t = 0; t < idx.length / 3; t++) {
  const A = idx[t * 3], B = idx[t * 3 + 1], C = idx[t * 3 + 2];
  if (inGuard(A) + inGuard(B) + inGuard(C) < 2) continue;
  const us = [uv[A * 2] * (W - 1), uv[B * 2] * (W - 1), uv[C * 2] * (W - 1)];
  const vs = [uv[A * 2 + 1] * (H - 1), uv[B * 2 + 1] * (H - 1), uv[C * 2 + 1] * (H - 1)];
  const x0 = Math.max(0, Math.floor(Math.min(...us)) - 2), x1 = Math.min(W - 1, Math.ceil(Math.max(...us)) + 2);
  const y0 = Math.max(0, Math.floor(Math.min(...vs)) - 2), y1 = Math.min(H - 1, Math.ceil(Math.max(...vs)) + 2);
  const dd = (us[1] - us[0]) * (vs[2] - vs[0]) - (us[2] - us[0]) * (vs[1] - vs[0]);
  if (Math.abs(dd) < 1e-9) continue;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const w0 = ((us[1] - x) * (vs[2] - y) - (us[2] - x) * (vs[1] - y)) / dd;
    const w1 = ((us[2] - x) * (vs[0] - y) - (us[0] - x) * (vs[2] - y)) / dd;
    const w2 = 1 - w0 - w1;
    if (w0 >= -0.02 && w1 >= -0.02 && w2 >= -0.02) mask[y * W + x] = 1;
  }
}
// aplica FDE no handguard (só texels de arma — pula pele/luva)
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
let painted = 0;
for (let i = 0; i < W * H; i++) {
  if (!mask[i]) continue;
  const r = img[i * 3], g = img[i * 3 + 1], b = img[i * 3 + 2];
  if (isSkin(r, g, b) || isGloveHue(r, g, b)) continue;
  const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const s = 0.55 + l * 0.9;   // preserva o sombreamento da textura original
  img[i * 3] = clamp(176 * s); img[i * 3 + 1] = clamp(150 * s); img[i * 3 + 2] = clamp(108 * s);   // FDE tan
  painted++;
}
tex.setImage(await sharp(img, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 92 }).toBuffer());
tex.setMimeType('image/webp');
await io.write(GLB, doc);
console.log(`two-tone aplicado: ${painted} texels FDE no handguard de`, GLB);
