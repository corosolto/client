import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';
import { readdirSync, statSync } from 'node:fs';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const SRC = '/tmp/props_raw', OUT = 'public/models/props';
for (const f of readdirSync(SRC).filter(f => f.endsWith('.glb'))) {
  const id = f.replace('.glb', '');
  const doc = await io.read(`${SRC}/${f}`);
  for (const a of doc.getRoot().listAnimations()) a.dispose();
  await doc.transform(dedup(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }), prune());
  await io.write(`${OUT}/${id}.glb`, doc);
  console.log(`${id}: ${(statSync(`${OUT}/${id}.glb`).size / 1024) | 0} KB`);
}
