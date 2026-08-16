// G2-R14C — compressão de memória dos viewmodels fpvm (crash OOM do dono):
// o peso dos arms_*.glb é GEOMETRIA densa Tripo (~650K tris cada; pistol 1.4M) — as
// texturas JÁ são 512 webp desde a R-saga (só arms_pistol tem 4K JPEG). Aplica os
// parâmetros validados do tools/optimize-fpvm.mjs (weld 0.0005 + simplify ratio 0.45 /
// error 0.0005 — o default destrói sights/rail/dedos) + textura max 1024 webp
// (no-op p/ as 512; o 4K da pistol desce). In-place: escreve tmp e move.
// Uso: node tools/g2r14c-compress.mjs [arquivo1,arquivo2,...]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, textureCompress, weld, simplify } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { readdirSync, statSync, renameSync } from 'node:fs';
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const DIR = 'public/models/fpvm';
const ONLY = process.argv[2] ? process.argv[2].split(',') : null;
const files = readdirSync(DIR).filter(f => f.startsWith('arms_') && f.endsWith('.glb') && (!ONLY || ONLY.includes(f)));

const stats = (d) => {
  let v = 0, t = 0;
  for (const m of d.getRoot().listMeshes()) for (const p of m.listPrimitives()) {
    v += p.getAttribute('POSITION').getCount();
    t += (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3;
  }
  return { v, t };
};

console.log('arquivo | disco antes→depois | tris antes→depois | tex GPU antes→depois');
for (const f of files) {
  const p = `${DIR}/${f}`;
  const before = statSync(p).size;
  const doc = await io.read(p);
  const s0 = stats(doc);
  let gpu0 = 0;
  for (const t of doc.getRoot().listTextures()) {
    const meta = await sharp(Buffer.from(t.getImage())).metadata();
    gpu0 += (meta.width * meta.height * 4 * 1.33);
  }
  await doc.transform(
    weld({ tolerance: 0.0005 }),
    simplify({ simplifier: MeshoptSimplifier, ratio: 0.45, error: 0.0005 }),
    dedup(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }),
    prune(),
  );
  const tmp = p.replace(/\.glb$/, '.out.glb');   // NodeIO infere o formato pela EXTENSÃO — tem que ser .glb
  await io.write(tmp, doc);
  renameSync(tmp, p);
  const after = statSync(p).size;
  const doc2 = await io.read(p);
  const s1 = stats(doc2);
  let gpu1 = 0;
  for (const t of doc2.getRoot().listTextures()) {
    const meta = await sharp(Buffer.from(t.getImage())).metadata();
    gpu1 += (meta.width * meta.height * 4 * 1.33);
  }
  console.log(`${f} | ${(before / 1048576).toFixed(1)}→${(after / 1048576).toFixed(1)}MB | ${(s0.t / 1000) | 0}K→${(s1.t / 1000) | 0}K | ${(gpu0 / 1048576).toFixed(1)}→${(gpu1 / 1048576).toFixed(1)}MB`);
}
