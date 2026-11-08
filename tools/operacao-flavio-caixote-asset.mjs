// Derivado da Operação Flávio: caixote de carga low-poly (12 tris) com o detalhe assado em textura.
// Fonte CC0 (Poly Haven wooden_crate_01, public/models/props/caixote_madeira.glb) preservada; o
// bake projeta a malha original em cada face da caixa (z-buffer ortográfico) e lê albedo/ORM nos
// UVs originais; a normal assada é a da malha alta (tábuas, tampa, alças) no espaço da face.
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP } from '@gltf-transform/extensions';
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const source = 'public/models/props/caixote_madeira.glb';
const target = 'public/models/props/operacao_decola/caixote_carga.glb';
const manifesto = 'public/models/props/operacao_decola/asset-manifest.json';
const W = 1024, H = 512, CW = Math.floor(W / 3), CH = H / 2;   // atlas 3 × 2: uma célula por face
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const hash = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

// Malha alta: triângulos com posição, normal e UV (os nós do GLB não têm transformação).
const fonte = await io.read(source);
const tris = [];
let trisAntes = 0;
for (const mesh of fonte.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
  const P = prim.getAttribute('POSITION'), N = prim.getAttribute('NORMAL'), T = prim.getAttribute('TEXCOORD_0');
  const idx = prim.getIndices().getArray();
  trisAntes += idx.length / 3;
  const v = (i) => ({ p: P.getElement(i, []), n: N.getElement(i, []), uv: T.getElement(i, []) });
  for (let i = 0; i < idx.length; i += 3) tris.push([v(idx[i]), v(idx[i + 1]), v(idx[i + 2])]);
}
const mat = fonte.getRoot().listMaterials()[0];
const decodifica = async (tex) => {
  const { data, info } = await sharp(Buffer.from(tex.getImage())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
};
const albedo = await decodifica(mat.getBaseColorTexture()), orm = await decodifica(mat.getMetallicRoughnessTexture());
const amostra = (img, u, v) => {   // bilinear com repetição (sampler da fonte é REPEAT)
  const x = (((u % 1) + 1) % 1) * img.w - 0.5, y = (((v % 1) + 1) % 1) * img.h - 0.5;
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, out = [0, 0, 0];
  for (const [dx, dy, wgt] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) {
    const xi = ((x0 + dx) % img.w + img.w) % img.w, yi = ((y0 + dy) % img.h + img.h) % img.h, o = (yi * img.w + xi) * 4;
    for (let k = 0; k < 3; k++) out[k] += img.data[o + k] * wgt;
  }
  return out;
};

// A caixa é o corpo (tábuas com |z| > 0,15 dão o x); as alças de corda saem 6 cm além dele e
// ficam fora da caixa: o bake as projeta na face da ponta em vez de faixas escuras nas laterais.
const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
for (const t of tris) for (const { p } of t) for (let k = 0; k < 3; k++) {
  if (k === 0 && Math.abs(p[2]) <= 0.15) continue;
  min[k] = Math.min(min[k], p[k]); max[k] = Math.max(max[k], p[k]);
}
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
// Faces [normal, direita, cima] com direita × cima = normal (vista de fora).
const FACES = [
  [[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]], [[0, 1, 0], [1, 0, 0], [0, 0, -1]],
  [[0, -1, 0], [1, 0, 0], [0, 0, 1]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
];
const faixa = (eixo) => { const a = [min, max].map((m) => dot(eixo, m)); return [Math.min(...a), Math.max(...a)]; };
const cor = Buffer.alloc(W * H * 4), normal = Buffer.alloc(W * H * 4), ormOut = Buffer.alloc(W * H * 4);
FACES.forEach(([n, R, U], f) => {
  const ox = (f % 3) * CW, oy = Math.floor(f / 3) * CH, [r0, r1] = faixa(R), [u0, u1] = faixa(U);
  const prof = new Float32Array(CW * CH).fill(-Infinity), dono = new Int32Array(CW * CH).fill(-1), bari = new Float32Array(CW * CH * 3);
  tris.forEach((t, ti) => {
    const s = t.map(({ p }) => [(dot(R, p) - r0) / (r1 - r0) * CW, (1 - (dot(U, p) - u0) / (u1 - u0)) * CH, dot(n, p)]);
    const area = (s[1][0] - s[0][0]) * (s[2][1] - s[0][1]) - (s[2][0] - s[0][0]) * (s[1][1] - s[0][1]);
    if (Math.abs(area) < 1e-12) return;
    const xa = Math.max(0, Math.floor(Math.min(s[0][0], s[1][0], s[2][0]))), xb = Math.min(CW - 1, Math.ceil(Math.max(s[0][0], s[1][0], s[2][0])));
    const ya = Math.max(0, Math.floor(Math.min(s[0][1], s[1][1], s[2][1]))), yb = Math.min(CH - 1, Math.ceil(Math.max(s[0][1], s[1][1], s[2][1])));
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w0 = ((s[1][0] - px) * (s[2][1] - py) - (s[2][0] - px) * (s[1][1] - py)) / area;
      const w1 = ((s[2][0] - px) * (s[0][1] - py) - (s[0][0] - px) * (s[2][1] - py)) / area, w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const z = w0 * s[0][2] + w1 * s[1][2] + w2 * s[2][2], i = y * CW + x;
      if (z <= prof[i]) continue;
      prof[i] = z; dono[i] = ti; bari.set([w0, w1, w2], i * 3);
    }
  });
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const i = y * CW + x, o = ((oy + y) * W + ox + x) * 4;
    if (dono[i] < 0) { cor.set([58, 36, 22, 255], o); normal.set([128, 128, 255, 255], o); ormOut.set([255, 220, 0, 255], o); continue; }
    const t = tris[dono[i]], b = bari.subarray(i * 3, i * 3 + 3);
    const uv = [0, 1].map((k) => b[0] * t[0].uv[k] + b[1] * t[1].uv[k] + b[2] * t[2].uv[k]);
    const N = [0, 1, 2].map((k) => b[0] * t[0].n[k] + b[1] * t[1].n[k] + b[2] * t[2].n[k]), len = Math.hypot(...N) || 1;
    const [cr, cg, cb] = amostra(albedo, uv[0], uv[1]), [, rg, rb] = amostra(orm, uv[0], uv[1]);
    cor.set([cr, cg, cb, 255], o);
    ormOut.set([255, rg, rb, 255], o);
    // Convenção OpenGL do glTF: verde aponta para o topo da imagem (o "cima" da face).
    normal.set([dot(N, R) / len, dot(N, U) / len, Math.max(dot(N, n) / len, 0.05)].map((c) => Math.round((c * 0.5 + 0.5) * 255)).concat(255), o);
  }
});
const webp = (buf) => sharp(buf, { raw: { width: W, height: H, channels: 4 } }).removeAlpha().webp({ quality: 88 }).toBuffer();

// Caixa de 12 tris nas medidas da fonte; UVs recuados 1,5 px para a célula não sangrar no mipmap.
const doc = new Document(), buffer = doc.createBuffer();
doc.createExtension(EXTTextureWebP).setRequired(true);
const pos = [], nor = [], uvs = [], ind = [];
FACES.forEach(([n, R, U], f) => {
  const ox = (f % 3) * CW, oy = Math.floor(f / 3) * CH, [r0, r1] = faixa(R), [u0, u1] = faixa(U), nd = faixa(n)[1], base = pos.length / 3;
  for (const [s, t] of [[0, 1], [1, 1], [1, 0], [0, 0]]) {
    const r = r0 + s * (r1 - r0), u = u0 + (1 - t) * (u1 - u0);
    pos.push(...[0, 1, 2].map((k) => R[k] * r + U[k] * u + n[k] * nd));
    nor.push(...n);
    uvs.push((ox + 1.5 + s * (CW - 3)) / W, (oy + 1.5 + t * (CH - 3)) / H);
  }
  ind.push(base, base + 1, base + 2, base, base + 2, base + 3);
});
const acc = (tipo, arr, Ctor) => doc.createAccessor().setType(tipo).setArray(new Ctor(arr)).setBuffer(buffer);
const tex = async (nome, buf) => doc.createTexture(nome).setImage(new Uint8Array(await webp(buf))).setMimeType('image/webp');
const material = doc.createMaterial('caixote_carga').setRoughnessFactor(1).setMetallicFactor(1)
  .setBaseColorTexture(await tex('caixote_carga_cor', cor))
  .setNormalTexture(await tex('caixote_carga_normal', normal))
  .setMetallicRoughnessTexture(await tex('caixote_carga_orm', ormOut));
const prim = doc.createPrimitive().setMaterial(material).setIndices(acc('SCALAR', ind, Uint16Array))
  .setAttribute('POSITION', acc('VEC3', pos, Float32Array)).setAttribute('NORMAL', acc('VEC3', nor, Float32Array))
  .setAttribute('TEXCOORD_0', acc('VEC2', uvs, Float32Array));
const node = doc.createNode('caixote_carga').setMesh(doc.createMesh('caixote_carga').addPrimitive(prim));
doc.createScene('caixote_carga').addChild(node);
await io.write(target, doc);

const entrada = {
  id: 'caixote-carga', provider: 'Poly Haven wooden_crate_01 (CC0) · derivado local: caixa de 12 tris com bake projetado',
  source, sourceSHA256: hash(source), runtime: target, bytes: readFileSync(target).length, sha256: hash(target),
  trianglesBefore: trisAntes, trianglesAfter: ind.length / 3, textures: `${W}×${H} webp (cor, normal, ORM)`,
  tool: 'tools/operacao-flavio-caixote-asset.mjs',
};
const json = JSON.parse(readFileSync(manifesto, 'utf8'));
json.assets = [...json.assets.filter((a) => a.id !== entrada.id), entrada];
writeFileSync(manifesto, JSON.stringify(json, null, 2) + '\n');
console.log(JSON.stringify(entrada, null, 2));
