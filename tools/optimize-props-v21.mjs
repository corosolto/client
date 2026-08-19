/* Otimiza os props da frente E v2.1 (plans/13): dedup/prune + WebP, sem decimar
   malha que o Mint já entrega low-poly. Uso: node tools/optimize-props-v21.mjs [filtro] */
import { statSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const outDir = 'public/models/props';

// tex: fauna usa 256² (optimize-ambient-fauna); caixa_dagua original usou 512²
const jobs = [
  { src: 'references/glb/grama_corrego_01_mint.glb', out: `${outDir}/grama_corrego_01.glb`, tex: 256 },
  { src: 'references/glb/grama_corrego_02_mint.glb', out: `${outDir}/grama_corrego_02.glb`, tex: 256 },
  { src: 'references/glb/planta_corrego_taboa_mint.glb', out: `${outDir}/planta_corrego_taboa.glb`, tex: 256 },
  { src: 'references/glb/planta_corrego_taioba_mint.glb', out: `${outDir}/planta_corrego_taioba.glb`, tex: 256 },
  { src: 'references/glb/caixa_dagua_azul_mint.glb', out: `${outDir}/caixa_dagua_azul.glb`, tex: 512 },
  { src: 'references/glb/caixa_dagua_preta_mint.glb', out: `${outDir}/caixa_dagua_preta.glb`, tex: 512 },
  { src: 'references/glb/caixa_dagua_fibra_mint.glb', out: `${outDir}/caixa_dagua_fibra.glb`, tex: 512 },
];

function triCount(doc) {
  let tris = 0;
  for (const mesh of doc.getRoot().listMeshes())
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices();
      tris += (idx ? idx.getCount() : prim.getAttribute('POSITION').getCount()) / 3;
    }
  return Math.round(tris);
}

const filtro = process.argv.slice(2);
for (const job of jobs) {
  if (filtro.length && !filtro.some((t) => job.src.includes(t))) continue;
  const doc = await io.read(job.src);
  for (const a of doc.getRoot().listAnimations()) a.dispose();
  const antes = triCount(doc);
  await doc.transform(
    dedup(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [job.tex, job.tex] }),
    prune(),
  );
  await io.write(job.out, doc);
  console.log(`${job.out}: ${triCount(doc)} tris (bruto ${antes}), ${(statSync(job.out).size / 1024) | 0} KB`);
}
