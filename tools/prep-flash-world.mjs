#!/usr/bin/env node
// Prepara o flash.glb do Mint (1 m, texturas 2048) para o jogo: 13 cm, texturas 512, nó estável.
// Uso: node tools/prep-flash-world.mjs <flash.glb do Mint> public/models/granadas/flash-world.glb
import { NodeIO } from '@gltf-transform/core';
import { transformMesh, prune, dedup } from '@gltf-transform/functions';
import sharp from 'sharp';

const [,, IN, OUT] = process.argv;
if (!IN || !OUT) { console.error('uso: prep-flash-world.mjs <entrada.glb> <saida.glb>'); process.exit(1); }
const io = new NodeIO();
const doc = await io.read(IN);
const root = doc.getRoot();
const S = 0.13 / 0.998;   // bbox Y do Mint ±0,499 → 13 cm de altura
for (const mesh of root.listMeshes()) transformMesh(mesh, [S, 0, 0, 0, 0, S, 0, 0, 0, 0, S, 0, 0, 0, 0, 1]);
root.listNodes()[0].setName('UTILITY_FLASH_MINT');
root.listMeshes()[0].setName('flash_mint');
root.listMaterials()[0].setName('CoroSolto_Utility_flash_mint');
for (const tex of root.listTextures()) {
  let p = sharp(tex.getImage()).resize(512, 512, { fit: 'fill' });
  p = tex.getMimeType() === 'image/png' ? p.png({ compressionLevel: 9 }) : p.jpeg({ quality: 86, mozjpeg: true });
  tex.setImage(new Uint8Array(await p.toBuffer()));
}
await doc.transform(dedup(), prune());
await io.write(OUT, doc);
