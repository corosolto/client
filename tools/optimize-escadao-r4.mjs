import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, textureCompress, weld, simplify, getBounds } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const [sourceDir, outputDir = 'public/models/props', receiptDir = 'artifacts/escadao-visual/r4/assets', riggedCat] = process.argv.slice(2);
if (!sourceDir) throw Error('Uso: node tools/optimize-escadao-r4.mjs <pack-original> [saida] [recibos]');
mkdirSync(outputDir, { recursive: true });
mkdirSync(receiptDir, { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const hash = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const triangles = root => root.listMeshes().reduce((sum, mesh) => sum + mesh.listPrimitives().reduce((s, p) => s + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0), 0);
await MeshoptSimplifier.ready;
const receipts = [];
for (const [input, id, targetTriangles] of [
  ['01-gato-rajado-tabby-cat.glb', 'escadao_cat_r4', 6000],
  ['02-varanda-vivida-balcony-cluster.glb', 'escadao_varanda_r4', 5000],
  ['03-instalacao-eletrica-meter-box.glb', 'escadao_eletrica_r4', 3000],
]) {
  const source = resolve(sourceDir, input), processedSource = id === 'escadao_cat_r4' && riggedCat ? resolve(riggedCat) : source;
  const doc = await io.read(processedSource), root = doc.getRoot();
  const shifted = new Set();
  for (const animation of root.listAnimations()) {
    const offset = Math.min(...animation.listSamplers().map(s => s.getInput().getMin([])[0]));
    for (const sampler of animation.listSamplers()) {
      const input = sampler.getInput();
      if (!shifted.has(input)) {
        input.setArray(new Float32Array(Array.from(input.getArray(), t => t-offset)));
        shifted.add(input);
      }
    }
  }
  const originalTriangles = triangles(root);
  const ratio = Math.min(1, targetTriangles / originalTriangles);
  // A meta não autoriza perda de silhueta; erro limitado pode preservar mais triângulos.
  if (ratio < 1) await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio, error: .002 }));
  await doc.transform(dedup(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 90 }), prune());
  const file = resolve(outputDir, `${id}.glb`);
  await io.write(file, doc);
  const roundtrip = (await io.read(file)).getRoot();
  receipts.push({ id, source, sourceSha256: hash(source), sourceBytes: statSync(source).size, processedSource, processedSourceSha256: hash(processedSource), originalTriangles, targetTriangles, ratio, simplifyError: ratio < 1 ? .002 : null,
    file, sha256: hash(file), bytes: statSync(file).size, triangles: triangles(roundtrip), bounds: getBounds(roundtrip.listScenes()[0]),
    meshes: roundtrip.listMeshes().length, materials: roundtrip.listMaterials().length, animations: roundtrip.listAnimations().map(a => a.getName()),
    textures: roundtrip.listTextures().map(t => ({ dimensions: t.getSize(), mime: t.getMimeType() })),
    extensions: roundtrip.listExtensionsRequired().map(e => e.extensionName) });
}
writeFileSync(resolve(receiptDir, riggedCat ? 'processing.json' : 'processing-static.json'), JSON.stringify(receipts, null, 2)+'\n');
console.log(JSON.stringify(receipts, null, 2));
