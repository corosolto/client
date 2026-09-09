#!/usr/bin/env node
/* Passe final do GLB assado (BUG-75): remove as malhas genéricas do pack (a
   Mint já está dentro; os BONES ficam — o pente cavalga o Mag), troca as
   texturas de braço por placeholder 1×1 (o shared/ religa no load) e poda.
   Uso: node tools/viewmodels/strip_baked_family.mjs <arquivo.glb> */
import fs from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';
import { NodeIO } from '../../node_modules/@gltf-transform/core/dist/index.js';
import { ALL_EXTENSIONS } from '../../node_modules/@gltf-transform/extensions/dist/index.js';
import { prune } from '../../node_modules/@gltf-transform/functions/dist/index.js';

const alvo = process.argv[2];
if (!alvo) throw new Error('uso: strip_baked_family.mjs <arquivo.glb>');
const ARM_TEXTURE = /^T_(?:Arm|Cloth|Glove)01_(?:B|N|ORM)$/;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(alvo);
const root = document.getRoot();
const antes = (await fs.stat(alvo)).size;

let removidas = 0;
for (const node of root.listNodes()) {
  if (/GEO_WEAPON_/.test(node.getName() || '') && node.getMesh()) {
    node.setMesh(null);
    removidas += 1;
  }
}
const placeholder = await sharp({
  create: { width: 1, height: 1, channels: 4, background: { r: 128, g: 128, b: 128, alpha: 1 } },
}).webp({ quality: 60 }).toBuffer();
let trocadas = 0;
for (const texture of root.listTextures()) {
  if (!ARM_TEXTURE.test(texture.getName() || '')) continue;
  texture.setImage(placeholder);
  texture.setMimeType('image/webp');
  trocadas += 1;
}
// idle volta ao nome de contrato (o export do Blender prefixa com o objeto).
for (const animation of root.listAnimations()) {
  if (/idle$/i.test(animation.getName() || '')) animation.setName('idle');
}
await document.transform(prune({ keepLeaves: true }));
await io.write(alvo, document);
const depois = (await fs.stat(alvo)).size;
console.log(`CORO_BAKED_STRIP=${JSON.stringify({
  alvo: path.basename(alvo), removidas, trocadas,
  antesMiB: Number((antes / 1048576).toFixed(1)), depoisMiB: Number((depois / 1048576).toFixed(1)),
})}`);
