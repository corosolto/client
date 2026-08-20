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
  { src: 'references/glb/varal_roupas_01_mint.glb', out: `${outDir}/varal_roupas_01.glb`, tex: 512 },
  { src: 'references/glb/varal_roupas_02_mint.glb', out: `${outDir}/varal_roupas_02.glb`, tex: 512 },
  // pipa/heli/avião passam antes pelo split-props-v21.mjs (nós animáveis)
  { src: 'references/glb/pipa_papel_split.glb', out: `${outDir}/pipa_papel.glb`, tex: 256 },
  { src: 'references/glb/helicoptero_pm_split.glb', out: `${outDir}/helicoptero_pm.glb`, tex: 512 },
  { src: 'references/glb/aviao_faixa_split.glb', out: `${outDir}/aviao_faixa.glb`, tex: 512 },
  // BUG-64 jardim da mansão (frente C v2.1): 8 espécies tropicais, folha em card com alfa
  // trunkShade: escurece só a ilha de UV dos vértices baixos (tronco liso branco/limão reprovado)
  { src: 'references/glb/palmeira_imperial_mint.glb', out: `${outDir}/palmeira_imperial.glb`, tex: 512, trunkShade: [0.55, 0.47, 0.4] },
  { src: 'references/glb/palmeira_ravenala_mint.glb', out: `${outDir}/palmeira_ravenala.glb`, tex: 512 },
  { src: 'references/glb/heliconia_mint.glb', out: `${outDir}/heliconia.glb`, tex: 512 },
  { src: 'references/glb/costela_adao_mint.glb', out: `${outDir}/costela_adao.glb`, tex: 512 },
  { src: 'references/glb/bananeira_mint.glb', out: `${outDir}/bananeira.glb`, tex: 512 },
  { src: 'references/glb/ixora_mint.glb', out: `${outDir}/ixora.glb`, tex: 512 },
  { src: 'references/glb/agave_mint.glb', out: `${outDir}/agave.glb`, tex: 512 },
  { src: 'references/glb/samambaia_mint.glb', out: `${outDir}/samambaia.glb`, tex: 512 },
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
  if (job.trunkShade) {
    /* Split por altura: tris INTEIROS nos 42% inferiores (tronco) ganham um clone do
       material com baseColorFactor escurecido — a textura e as folhas ficam intactas. */
    const [fr, fg, fb] = job.trunkShade;
    for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION'), idx = prim.getIndices();
      if (!pos || !idx) continue;
      const el = [];
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i < pos.getCount(); i++) { const y = pos.getElement(i, el)[1]; if (y < lo) lo = y; if (y > hi) hi = y; }
      const corte = lo + (hi - lo) * 0.42;
      const baixos = [], altos = [];
      for (let t = 0; t < idx.getCount(); t += 3) {
        const tri = [idx.getScalar(t), idx.getScalar(t + 1), idx.getScalar(t + 2)];
        (tri.every((v) => pos.getElement(v, el)[1] <= corte) ? baixos : altos).push(...tri);
      }
      if (!baixos.length || !altos.length) continue;
      const matEscuro = prim.getMaterial().clone();
      matEscuro.setBaseColorFactor([fr, fg, fb, 1]);
      const idxBaixo = doc.createAccessor().setArray(new Uint32Array(baixos)).setType('SCALAR');
      const tronco = doc.createPrimitive().setIndices(idxBaixo).setMaterial(matEscuro);
      for (const nome of prim.listSemantics()) tronco.setAttribute(nome, prim.getAttribute(nome));
      mesh.addPrimitive(tronco);
      prim.setIndices(doc.createAccessor().setArray(new Uint32Array(altos)).setType('SCALAR'));
      console.log(`  trunkShade: ${baixos.length / 3} tris de tronco com fator (${fr},${fg},${fb})`);
    }
  }
  await doc.transform(
    dedup(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [job.tex, job.tex] }),
    prune(),
  );
  await io.write(job.out, doc);
  console.log(`${job.out}: ${triCount(doc)} tris (bruto ${antes}), ${(statSync(job.out).size / 1024) | 0} KB`);
}
