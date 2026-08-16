// Otimização textura-only dos personagens Tribos Urbanas (rig do Meshy/Mint).
// resize 1024 + webp + prune/dedup. NUNCA quantize/simplify (malha skinned explode no GPU real,
// invisível no headless). Dropa as animações embutidas — o jogo faz bind dos clips compartilhados
// (models/anims/mixamo) por nome de osso. Uso: node tools/optimize-tribos.mjs
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';
import { readdirSync, statSync } from 'node:fs';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const SRC = process.argv[2] || '/tmp/tribos_raw';
const OUT = 'public/models/characters';
for (const f of readdirSync(SRC).filter((f) => f.endsWith('.glb'))) {
  const id = f.replace('.glb', '');
  const doc = await io.read(`${SRC}/${f}`);
  for (const a of doc.getRoot().listAnimations()) a.dispose();
  await doc.transform(
    dedup(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }),
    prune(),
  );
  await io.write(`${OUT}/${id}.glb`, doc);
  console.log(`${id}: ${(statSync(`${OUT}/${id}.glb`).size / 1024) | 0} KB`);
}
console.log('DONE');
