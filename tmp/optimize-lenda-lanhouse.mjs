// Otimização segura do personagem: dedup + texturas WebP 1K + prune.
// Deliberadamente sem quantize/simplify, que já explodiram skin no GPU real.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';
import { statSync } from 'node:fs';

const [, , input, output] = process.argv;
if (!input || !output) throw new Error('uso: node script input.glb output.glb');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(input);
for (const animation of document.getRoot().listAnimations()) animation.dispose();
await document.transform(
  dedup(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }),
  prune(),
);
await io.write(output, document);
console.log(JSON.stringify({ input, output, beforeBytes: statSync(input).size, afterBytes: statSync(output).size }));
