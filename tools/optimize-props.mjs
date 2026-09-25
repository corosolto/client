import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';
import { readdirSync, statSync } from 'node:fs';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const SRC = process.argv[2] || '/tmp/props_raw';
const OUT = process.argv[3] || 'public/models/props';
const MAX_TEXTURE = Number(process.argv[4] || 1024);
for (const f of readdirSync(SRC).filter(f => f.endsWith('.glb'))) {
  const id = f.replace('.glb', '');
  const doc = await io.read(`${SRC}/${f}`);
  for (const a of doc.getRoot().listAnimations()) a.dispose();
  await doc.transform(dedup(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [MAX_TEXTURE, MAX_TEXTURE] }), prune());
  await io.write(`${OUT}/${id}.glb`, doc);
  console.log(`${id}: ${(statSync(`${OUT}/${id}.glb`).size / 1024) | 0} KB`);
}
