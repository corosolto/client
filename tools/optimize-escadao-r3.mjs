// Originais Mint preservados fora do Git; processamento explícito e reproduzível.
// node tools/optimize-escadao-r3.mjs <diretorio-do-pack> <diretorio-de-saida>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, textureCompress, weld, simplify, getBounds } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
const [src, out] = process.argv.slice(2);
if (!src || !out) throw Error('Informe os diretórios de entrada e saída');
mkdirSync(out, { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
await MeshoptSimplifier.ready;
const receipt = [];
for (const [input, id, tex, ratio] of [
  ['01-escadao-casa-residencial-r3.glb', 'escadao_casa_r3', 1024, 1],
  ['02-escadao-mato-de-fresta-r3.glb', 'escadao_mato_r3', 256, .16],
]) {
  const path = `${src}/${input}`, doc = await io.read(path);
  for (const a of doc.getRoot().listAnimations()) a.dispose();
  if (ratio < 1) await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio, error: .01 }));
  await doc.transform(dedup(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [tex, tex] }), prune());
  const file = `${out}/${id}.glb`;
  await io.write(file, doc);
  const r = doc.getRoot();
  receipt.push({ id, input, sourceSha256: sha(path), file, finalSha256: sha(file), bytes: statSync(file).size,
    bounds: getBounds(r.listScenes()[0]), triangles: r.listMeshes().reduce((s,m) => s + m.listPrimitives().reduce((s,p) => s + (p.getIndices()?.getCount() || p.getAttribute('POSITION').getCount())/3, 0), 0),
    meshes: r.listMeshes().length, materials: r.listMaterials().length, textures: r.listTextures().map(t => ({ size: t.getSize(), mime: t.getMimeType() })), ratio });
}
writeFileSync(`${out}/processing.json`, JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt, null, 2));
