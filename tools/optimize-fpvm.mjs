// Otimização SEGURA de viewmodel estático Tripo (arms+arma, mesh único denso).
// Parâmetros validados na saga arms_rifle (HANDOFF 28/07 #3.4): weld c/ tolerância
// 0.0005 + simplify ratio 0.45 / error 0.0005 (o default error 0.02 destrói
// sights/rail/dedos) + textura 512 webp. SEMPRE validar com render depois.
// Uso: node tools/optimize-fpvm.mjs <in.glb> <out.glb> [texSize] [ratio]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, textureCompress, weld, simplify } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { statSync } from 'node:fs';
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const [IN, OUT] = [process.argv[2], process.argv[3]];
const TS = +(process.argv[4] || 512), RATIO = +(process.argv[5] || 0.45);
const doc = await io.read(IN);
for (const a of doc.getRoot().listAnimations()) a.dispose();
await doc.transform(
  weld({ tolerance: 0.0005 }),
  simplify({ simplifier: MeshoptSimplifier, ratio: RATIO, error: 0.0005 }),
  dedup(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [TS, TS] }),
  prune(),
);
await io.write(OUT, doc);
const stats = (label, d) => {
  let v = 0, t = 0;
  for (const m of d.getRoot().listMeshes()) for (const p of m.listPrimitives()) {
    v += p.getAttribute('POSITION').getCount();
    t += (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3;
  }
  console.log(`${label}: ${(v / 1000) | 0}K verts, ${(t / 1000) | 0}K tris`);
};
stats('out', doc);
console.log(`${OUT}: ${(statSync(OUT).size / 1024 / 1024).toFixed(1)} MB`);
