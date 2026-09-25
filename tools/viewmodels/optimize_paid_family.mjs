#!/usr/bin/env node
/* De-dup das texturas de braço do catálogo pago (BUG-75 M4): as mesmas 9 imagens
   (18,3 MB) viajavam embutidas em TODOS os GLBs de família (~300 MB redundantes,
   e cada troca de arma parseava 23 MB — os travamentos). Elas saem UMA vez para
   shared/ (normais 4096→2048, B/ORM→1024) e cada GLB fica com placeholder 1×1
   com o MESMO nome de textura; o runtime religa por nome no load. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';
import { NodeIO } from '../../node_modules/@gltf-transform/core/dist/index.js';
import { ALL_EXTENSIONS } from '../../node_modules/@gltf-transform/extensions/dist/index.js';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const positional = process.argv.slice(2).filter((value) => !value.startsWith('--'));
/* --familia=pistol: só reescreve o GLB dessa família e deixa shared/ como está.
   Rebuild de uma família não pode tocar o binário das outras 14. */
const SO_FAMILIA = (process.argv.find((value) => value.startsWith('--familia=')) || '').slice(10);
const PRIVATE_ROOT = positional[0] || '/Users/ruben/csbrasil-private-assets/generated/viewmodels';
const CHARACTER_TEXTURES = positional[1]
  || '/Users/ruben/csbrasil-private-assets/generated/extracted/Assets/KINEMATION/FPSAnimationPack/Character/Textures';
const ARM_TEXTURE = /^T_(?:Arm|Cloth|Glove)01_(B|N|ORM)$/;
const TARGET = { B: { size: 1024, quality: 85 }, N: { size: 2048, quality: 80 }, ORM: { size: 1024, quality: 85 } };

if (!path.relative(REPO_ROOT, PRIVATE_ROOT).startsWith('..')) {
  throw new Error('catálogo licenciado precisa ficar fora do repositório público');
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const sharedDir = path.join(PRIVATE_ROOT, 'shared');
await fs.mkdir(sharedDir, { recursive: true });
const placeholder = await sharp({
  create: { width: 1, height: 1, channels: 4, background: { r: 128, g: 128, b: 128, alpha: 1 } },
}).webp({ quality: 60 }).toBuffer();

const catalog = JSON.parse(await fs.readFile(path.join(PRIVATE_ROOT, 'catalog.json'), 'utf8'));
const families = [...catalog.families.map((f) => f.family), 'grenade'].filter((f) => !SO_FAMILIA || f === SO_FAMILIA);
if (SO_FAMILIA && !families.length) throw new Error(`família ${SO_FAMILIA} não está no catálogo`);
const shared = {};
const report = { schemaVersion: 1, families: {}, shared: {} };

for (const part of SO_FAMILIA ? [] : ['Arm', 'Cloth', 'Glove']) {
  for (const [kind, spec] of Object.entries(TARGET)) {
    const name = `T_${part}01_${kind}`;
    const source = path.join(CHARACTER_TEXTURES, `${name}.png`);
    const image = await sharp(source)
      .resize(spec.size, spec.size, { fit: 'fill' })
      .webp({ quality: spec.quality })
      .toBuffer();
    await fs.writeFile(path.join(sharedDir, `${name}.webp`), image);
    shared[name] = image.byteLength;
  }
}

for (const family of families) {
  const file = path.join(PRIVATE_ROOT, family, `${family}-runtime.glb`);
  const before = (await fs.stat(file)).size;
  const document = await io.read(file);
  let replaced = 0;
  for (const texture of document.getRoot().listTextures()) {
    const match = ARM_TEXTURE.exec(texture.getName() || '');
    if (!match) continue;
    const name = texture.getName();
    texture.setImage(placeholder);
    texture.setMimeType('image/webp');
    replaced += 1;
  }
  if (replaced) await io.write(file, document);
  const after = (await fs.stat(file)).size;
  report.families[family] = { beforeBytes: before, afterBytes: after, replaced };
  console.log(`${family.padEnd(9)} ${(before / 1048576).toFixed(1).padStart(5)} MiB -> ${(after / 1048576).toFixed(1).padStart(5)} MiB (${replaced} texturas)`);
}

if (SO_FAMILIA) {
  // Relatório e manifesto de shared/ ficam como estavam; só a família pedida muda.
  const previous = JSON.parse(await fs.readFile(path.join(PRIVATE_ROOT, 'optimize-report.json'), 'utf8').catch(() => '{"families":{},"shared":{}}'));
  report.shared = previous.shared || {};
  report.families = { ...(previous.families || {}), ...report.families };
  for (const [name, entry] of Object.entries(report.shared)) shared[name] = entry.bytes;
} else {
  report.shared = Object.fromEntries(Object.entries(shared).map(([name, bytes]) => [name, { url: `shared/${name}.webp`, bytes }]));
  await fs.writeFile(path.join(sharedDir, 'shared-manifest.json'), `${JSON.stringify(report.shared, null, 2)}\n`);
}
const sharedTotal = Object.values(shared).reduce((sum, bytes) => sum + bytes, 0);
await fs.writeFile(path.join(PRIVATE_ROOT, 'optimize-report.json'), `${JSON.stringify(report, null, 2)}\n`);
const total = Object.values(report.families).reduce((sum, f) => sum + f.afterBytes, 0);
console.log(`shared: ${(sharedTotal / 1048576).toFixed(1)} MiB em ${Object.keys(shared).length} texturas · catálogo: ${(total / 1048576).toFixed(1)} MiB`);
console.log(`CORO_PAID_VIEWMODEL_OPTIMIZE=${JSON.stringify({ families: families.length, sharedBytes: sharedTotal, catalogBytes: total })}`);
