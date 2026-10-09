/* Props Mint da Piscina da Treta: material canônico fosco (BAR-CONSISTENCIA §3.2, sem
   normal/MR), albedo WebP no teto de texel do mapa e malha simplificada para caber no
   orçamento med de PIS5. Uso: node tools/optimize-piscina-props.mjs [filtro] */
import { statSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, textureCompress, weld, simplify } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const outDir = 'public/models/props';

// tex: 512 px em 2,7 m e 256 px em ~2 m ficam a ≤1,5× dos 128 px/m do mapa.
const jobs = [
  { id: 'piscina_espreguicadeira', tex: 256, tris: 1500, erro: 0.04, cor: '#294984' },
  { id: 'piscina_armarios', tex: 512, tris: 1500, erro: 0.04 },
  { id: 'piscina_banco', tex: 256, tris: 1000, erro: 0.04 },
  { id: 'piscina_escada', tex: 256, tris: 1500, metal: true },
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
  if (filtro.length && !filtro.some((t) => job.id.includes(t))) continue;
  const src = `references/glb/${job.id}_mint.glb`, out = `${outDir}/${job.id}.glb`;
  const doc = await io.read(src);
  const antes = triCount(doc);
  for (const m of doc.getRoot().listMaterials()) {
    m.setNormalTexture(null).setMetallicRoughnessTexture(null).setOcclusionTexture(null);
    // Inox da escada é elemento de jogo (saída da piscina): único metal permitido aqui.
    m.setRoughnessFactor(job.metal ? 0.4 : 0.9).setMetallicFactor(job.metal ? 0.8 : 0);
    // `cor`: puxa a média do albedo para a família de cor do mapa (o mesmo navy de MAT.chair).
    const tex = m.getBaseColorTexture();
    if (job.cor && tex) {
      const { channels } = await sharp(Buffer.from(tex.getImage())).stats();
      const lin = (c) => ((c / 255) <= 0.04045 ? (c / 255) / 12.92 : (((c / 255) + 0.055) / 1.055) ** 2.4);
      const alvo = [1, 3, 5].map((i) => lin(parseInt(job.cor.slice(i, i + 2), 16)));
      const media = channels.slice(0, 3).map((c) => lin(c.mean));
      m.setBaseColorFactor([...alvo.map((a, i) => Math.min(1, a / media[i])), 1]);
    }
  }
  const ratio = Math.min(1, job.tris / antes);
  await doc.transform(
    dedup(),
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio, error: job.erro ?? 0.01 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [job.tex, job.tex] }),
    prune(),
  );
  await io.write(out, doc);
  console.log(`${out}: ${triCount(doc)} tris (bruto ${antes}), ${(statSync(out).size / 1024) | 0} KB`);
}
