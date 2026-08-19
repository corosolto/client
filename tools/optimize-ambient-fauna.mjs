/* Otimiza os três GLBs de fauna sem quantizar skinned meshes.
   Uso: node tools/optimize-ambient-fauna.mjs */
import { mkdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, resample, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const outDir = 'public/models/ambient';
mkdirSync(outDir, { recursive: true });

const jobs = [
  { src: 'references/glb/rat_animated.glb', out: `${outDir}/rat_animated.glb`, skinned: true },
  { src: 'references/glb/pigeon.glb', out: `${outDir}/pigeon_ground.glb`, skinned: true },
  // pigeon_flight.glb saiu na v2.1 (dono: pombo de asas abertas estáticas no céu não
  // existe mais) — o acervo Quaternius não tem pássaro riggado com voo animado
  // tint: sRGB #C68642/#E4C59A em linear — Shiba original é marrom escuro com marcações cinzas
  { src: 'references/glb/quaternius_shiba_inu.glb', out: `${outDir}/dog_caramelo.glb`, skinned: true, fixSkin: true,
    tint: { Main: [.564, .238, .055, 1], Main_Light: [.775, .557, .322, 1] } },
  // BUG-57 fauna do córrego: Mint já entrega low-poly (4,9-5k tris); só comprime textura
  { src: 'references/glb/jacare_corrego_mint.glb', out: `${outDir}/jacare_corrego.glb`, skinned: false, noDecimate: true },
  // brighten 1.45: textura Mint saiu lum~69 vs dog_caramelo ~86-165 — ficaria blob
  // escuro na margem do canal; clareia mantendo o marrom-avermelhado (padrão do tint do dog)
  { src: 'references/glb/capivara_corrego_mint.glb', out: `${outDir}/capivara_corrego.glb`, skinned: false, noDecimate: true, brighten: 1.45 },
  // v2.1 frente D (BUG-57): espécies novas Quaternius CC0 via Poly Pizza; keepClips
  // corta os clipes que o controlador nunca toca (a vaca traz 24 e pesa 1 MB crua)
  { src: 'references/glb/quaternius_cat.glb', out: `${outDir}/cat_telhado.glb`, skinned: true, fixSkin: true,
    keepClips: /(^|\|)(Idle|Walk|Run)$/ },
  { src: 'references/glb/quaternius_chicken_a.glb', out: `${outDir}/galinha_campo.glb`, skinned: true, fixSkin: true,
    keepClips: /(^|\|)(Idle|Walk)$/ },
  { src: 'references/glb/quaternius_cow.glb', out: `${outDir}/vaca_campo.glb`, skinned: true, fixSkin: true,
    keepClips: /^(Idle|Walk|Gallop)$/ },
];

const filtroArgs = process.argv.slice(2);
for (const job of jobs) {
  // `node tools/optimize-ambient-fauna.mjs jacare` roda só jobs cujo src casa algum termo
  if (filtroArgs.length && !filtroArgs.some((t) => job.src.includes(t))) continue;
  let input = job.src;
  if (!job.skinned && !job.noDecimate) {
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
  if (job.keepClips) for (const clip of doc.getRoot().listAnimations()) {
    if (!job.keepClips.test(clip.getName())) clip.dispose();
  }
  if (job.brighten) {
    for (const texture of doc.getRoot().listTextures()) {
      const boosted = await sharp(Buffer.from(texture.getImage()))
        .modulate({ brightness: job.brighten }).png().toBuffer();
      texture.setImage(boosted, 'image/png');
      texture.setMimeType('image/png');
    }
  }
  if (job.skinned) {
    await doc.transform(
      resample(),
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
