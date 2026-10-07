// Retoque de textura por região do corpo, sem tocar malha, rig nem UV.
// Pinta os pixels escuros da textura base que caem nos triângulos de uma faixa do
// corpo (medida na pose de bind) com uma cor fixa ou com a cor média clara da faixa.
//
// Uso:
//   node tools/personagens/retoque-textura.mjs <in.glb> <out.glb> \
//     --faixa y0,y1,xmax[,frente] --limiar 40 (--cor '#3c3c42' | --cor media)
//
//   y0,y1   altura em fração da altura do modelo; xmax em metros a partir do centro
//   frente  1 = só o lado do rosto, 0 = volta inteira
//   limiar  canal mais claro (0-255) abaixo do qual o pixel é repintado
// Repetível: cada `--faixa` usa o `--limiar` e a `--cor` que vierem depois dela.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';

const [, , IN, OUT, ...rest] = process.argv;
if (!IN || !OUT) { console.error('uso: retoque-textura.mjs <in.glb> <out.glb> --faixa ... --limiar N --cor X'); process.exit(1); }
const faixas = [];
for (let i = 0; i < rest.length; i += 2) {
  if (rest[i] === '--faixa') faixas.push({ f: rest[i + 1].split(',').map(Number), limiar: 40, cor: 'media' });
  else if (rest[i] === '--limiar') faixas.at(-1).limiar = Number(rest[i + 1]);
  else if (rest[i] === '--cor') faixas.at(-1).cor = rest[i + 1];
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(IN);
const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
const pos = prim.getAttribute('POSITION').getArray();
const uv = prim.getAttribute('TEXCOORD_0').getArray();
const idx = prim.getIndices().getArray();
const tex = prim.getMaterial().getBaseColorTexture();
const { data, info } = await sharp(Buffer.from(tex.getImage())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;

let yMax = -Infinity; for (let i = 1; i < pos.length; i += 3) yMax = Math.max(yMax, pos[i]);
// Frente: a ponta do pé. Pela cabeça erra, porque cabelo e coque saem mais que o nariz.
let zSoma = 0;
for (let i = 0; i < pos.length; i += 3) if (pos[i + 1] < yMax * 0.04) zSoma += pos[i + 2];
const sinal = Math.sign(zSoma) || 1;

// Canal mais claro, não luminância: vermelho saturado tem luminância de preto.
const lum = (p) => Math.max(data[p], data[p + 1], data[p + 2]);
function triangulosDa([y0, y1, xmax, frente = 0]) {
  const out = [];
  for (let t = 0; t < idx.length; t += 3) {
    let cx = 0, cy = 0, cz = 0;
    for (let k = 0; k < 3; k++) { const v = idx[t + k] * 3; cx += pos[v]; cy += pos[v + 1]; cz += pos[v + 2]; }
    cx /= 3; cy /= 3; cz /= 3;
    if (cy < y0 * yMax || cy > y1 * yMax || Math.abs(cx) > xmax) continue;
    if (frente && cz * sinal <= 0) continue;
    out.push(t);
  }
  return out;
}
function pixelsDe(tris) {
  const set = new Set();
  for (const t of tris) {
    const p = [0, 1, 2].map((k) => [uv[idx[t + k] * 2] * W, uv[idx[t + k] * 2 + 1] * H]);
    const minX = Math.max(0, Math.floor(Math.min(...p.map((q) => q[0])))), maxX = Math.min(W - 1, Math.ceil(Math.max(...p.map((q) => q[0]))));
    const minY = Math.max(0, Math.floor(Math.min(...p.map((q) => q[1])))), maxY = Math.min(H - 1, Math.ceil(Math.max(...p.map((q) => q[1]))));
    const area = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const A = area(...p); if (!A) continue;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const q = [x + 0.5, y + 0.5];
      const w0 = area(p[1], p[2], q) / A, w1 = area(p[2], p[0], q) / A, w2 = 1 - w0 - w1;
      if (w0 >= -0.02 && w1 >= -0.02 && w2 >= -0.02) set.add((y * W + x) * 4);
    }
  }
  return set;
}

for (const fx of faixas) {
  const px = pixelsDe(triangulosDa(fx.f));
  let cor;
  if (fx.cor === 'media') {
    let r = 0, g = 0, b = 0, n = 0;
    for (const p of px) if (lum(p) > fx.limiar * 2) { r += data[p]; g += data[p + 1]; b += data[p + 2]; n++; }
    cor = n ? [r / n, g / n, b / n] : [128, 128, 128];
  } else {
    const h = parseInt(fx.cor.slice(1), 16); cor = [h >> 16, (h >> 8) & 255, h & 255];
  }
  let pintados = 0;
  for (const p of px) if (lum(p) < fx.limiar) { data[p] = cor[0]; data[p + 1] = cor[1]; data[p + 2] = cor[2]; pintados++; }
  console.log(`faixa ${fx.f.join(',')}: ${px.size} px na região, ${pintados} repintados com rgb(${cor.map(Math.round).join(',')})`);
}

const img = await sharp(data, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 90 }).toBuffer();
tex.setImage(img).setMimeType('image/webp');
await io.write(OUT, doc);
console.log(`-> ${OUT}`);
