#!/usr/bin/env node
/* Prepara o colete e o capacete do Mint para o runtime: textura 2048 → 1024 (cor/normal) e
   512 (metal/rugosidade) em JPEG, geometria em EXT_meshopt_compression. Não escala nem gira:
   o encaixe no corpo é medido por personagem em public/js/armadura-visual.js.
   Uso: node tools/optimize-armadura.mjs [origem] [destino]
   origem  default ~/csbrasil-private-assets/generated/mint-colete-flash-20261028
   destino default public/models/armadura (versionado; depois rode `npm run gen:assetrev`) */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { meshopt, prune, dedup } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ORIGEM = process.argv[2] || path.join(process.env.HOME || '', 'csbrasil-private-assets/generated/mint-colete-flash-20261028');
const DESTINO = process.argv[3] || 'public/models/armadura';
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
mkdirSync(DESTINO, { recursive: true });

for (const nome of ['colete', 'capacete']) {
  const entrada = path.join(ORIGEM, `${nome}.glb`), saida = path.join(DESTINO, `${nome}.glb`);
  const doc = await io.read(entrada);
  for (const mat of doc.getRoot().listMaterials()) {
    const lados = [[mat.getBaseColorTexture(), 1024], [mat.getNormalTexture(), 1024], [mat.getMetallicRoughnessTexture(), 512]];
    for (const [tex, lado] of lados) {
      if (!tex) continue;
      const img = await sharp(Buffer.from(tex.getImage())).resize(lado, lado, { fit: 'inside' }).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
      tex.setImage(new Uint8Array(img)).setMimeType('image/jpeg').setURI(`${nome}-${lado}.jpg`);
    }
  }
  await doc.transform(dedup(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await io.write(saida, doc);
  const buf = readFileSync(saida);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${saida}: saída não é GLB`);
  const sha = createHash('sha256').update(buf).digest('hex');
  console.log(`${nome}: ${(statSync(entrada).size / 1e6).toFixed(2)} MB -> ${(buf.length / 1e6).toFixed(2)} MB  v=${sha.slice(0, 10)}`);
}
