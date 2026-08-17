/* Otimiza os três GLBs de fauna sem quantizar skinned meshes.
   Uso: node tools/optimize-ambient-fauna.mjs */
import { mkdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const outDir = 'public/models/ambient';
mkdirSync(outDir, { recursive: true });

const jobs = [
  { src: 'references/glb/rat_animated.glb', out: `${outDir}/rat_animated.glb`, skinned: true },
  { src: 'references/glb/pigeon.glb', out: `${outDir}/pigeon_ground.glb`, skinned: true },
  { src: 'references/glb/pigeon_in_flight.glb', out: `${outDir}/pigeon_flight.glb`, skinned: false },
  // tint: sRGB #C68642/#E4C59A em linear — Shiba original é marrom escuro com marcações cinzas
  { src: 'references/glb/quaternius_shiba_inu.glb', out: `${outDir}/dog_caramelo.glb`, skinned: true, fixSkin: true,
    tint: { Main: [.564, .238, .055, 1], Main_Light: [.775, .557, .322, 1] } },
];

for (const job of jobs) {
  let input = job.src;
  if (!job.skinned) {
    input = '/tmp/csbr-pigeon-flight-decimated.glb';
    const blender = process.env.BLENDER_BIN || '/Applications/Blender.app/Contents/MacOS/Blender';
    const run = spawnSync(blender, ['--background', '--python', 'tools/blender-decimate-static.py', '--', job.src, input, '0.015'],
      { stdio: 'inherit' });
    if (run.status !== 0) throw new Error(`Blender falhou ao decimar ${job.src}`);
  }
  const doc = await io.read(input);
  if (job.tint) {
    for (const material of doc.getRoot().listMaterials()) {
      const color = job.tint[material.getName()];
      if (color) material.setBaseColorFactor(color);
    }
  }
  // skin.skeleton do Quaternius aponta para nó que não é raiz comum (erro Khronos); three.js ignora o hint
  if (job.fixSkin) for (const skin of doc.getRoot().listSkins()) skin.setSkeleton(null);
  if (job.skinned) {
    await doc.transform(
      dedup(),
      textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [256, 256] }),
      prune(),
    );
  } else {
    await doc.transform(
      dedup(),
      textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [256, 256] }),
      prune(),
    );
  }
  await io.write(job.out, doc);
  const root = doc.getRoot();
  const triangles = root.listMeshes().flatMap((mesh) => mesh.listPrimitives()).reduce((sum, primitive) => {
    const accessor = primitive.getIndices() || primitive.getAttribute('POSITION');
    return sum + (accessor ? accessor.getCount() / 3 : 0);
  }, 0);
  console.log(`${job.out}: ${Math.round(statSync(job.out).size / 1024)} KiB · ${Math.round(triangles)} tri · ${root.listAnimations().map((clip) => clip.getName()).join(', ') || 'estático'}`);
}
