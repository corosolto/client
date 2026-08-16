import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, textureCompress, weld, simplify } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { readdirSync, statSync } from 'node:fs';
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const SRC = process.argv[2], OUT = process.argv[3] || 'public/models/props', TS = +(process.argv[4]||512), RATIO = +(process.argv[5]||0.45);
for (const f of readdirSync(SRC).filter(f => f.endsWith('.glb'))) {
  const id = f.replace('.glb','');
  try {
    const doc = await io.read(`${SRC}/${f}`);
    for (const a of doc.getRoot().listAnimations()) a.dispose();
    await doc.transform(
      weld(),
      simplify({ simplifier: MeshoptSimplifier, ratio: RATIO, error: 0.02 }),
      dedup(),
      textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [TS, TS] }),
      prune(),
    );
    await io.write(`${OUT}/${id}.glb`, doc);
    console.log(`${id}: ${(statSync(`${OUT}/${id}.glb`).size/1024)|0} KB`);
  } catch(e){ console.log(`${id}: ERR ${e.message}`); }
}
