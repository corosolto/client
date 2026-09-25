#!/usr/bin/env node
/* De-dup das texturas de braço do catálogo pago (BUG-75 M4): as mesmas 9 imagens
   (18,3 MB) viajavam embutidas em TODOS os GLBs de família (~300 MB redundantes,
   e cada troca de arma parseava 23 MB — os travamentos). Elas saem UMA vez para
   shared/ (normais 4096→2048, B/ORM→1024) e cada GLB fica com placeholder 1×1
   com o MESMO nome de textura; o runtime religa por nome no load. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
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
const INPUT = (process.argv.find((value) => value.startsWith('--input=')) || '').slice(8);
const OUTPUT = (process.argv.find((value) => value.startsWith('--output=')) || '').slice(9);
const REPORT = (process.argv.find((value) => value.startsWith('--report=')) || '').slice(9);
if (Boolean(INPUT) !== Boolean(OUTPUT)) throw new Error('--input e --output precisam ser usados juntos');
if (INPUT && !SO_FAMILIA) throw new Error('--familia é obrigatório com --input/--output');
const PRIVATE_ROOT = positional[0] || '/Users/ruben/csbrasil-private-assets/generated/viewmodels';
const CHARACTER_TEXTURES = positional[1]
  || '/Users/ruben/csbrasil-private-assets/generated/extracted/Assets/KINEMATION/FPSAnimationPack/Character/Textures';
const ARM_TEXTURE = /^T_(?:Arm|Cloth|Glove)01_(B|N|ORM)$/;
const TARGET = { B: { size: 1024, quality: 85 }, N: { size: 2048, quality: 80 }, ORM: { size: 1024, quality: 85 } };

const outsideRepo = (candidate) => path.relative(REPO_ROOT, path.resolve(candidate)).startsWith('..');
for (const candidate of INPUT ? [INPUT, OUTPUT] : [PRIVATE_ROOT]) {
  if (!outsideRepo(candidate)) throw new Error('catálogo licenciado precisa ficar fora do repositório público');
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const sharedDir = path.join(PRIVATE_ROOT, 'shared');
if (!INPUT) await fs.mkdir(sharedDir, { recursive: true });
const placeholder = await sharp({
  create: { width: 1, height: 1, channels: 4, background: { r: 128, g: 128, b: 128, alpha: 1 } },
}).webp({ quality: 60 }).toBuffer();

const catalog = INPUT ? null : JSON.parse(await fs.readFile(path.join(PRIVATE_ROOT, 'catalog.json'), 'utf8'));
const families = INPUT
  ? [SO_FAMILIA]
  : [...catalog.families.map((f) => f.family), 'grenade'].filter((f) => !SO_FAMILIA || f === SO_FAMILIA);
if (SO_FAMILIA && !families.length) throw new Error(`família ${SO_FAMILIA} não está no catálogo`);
const shared = {};
const report = { schemaVersion: 2, mode: INPUT ? 'explicit-file' : 'catalog', families: {}, shared: {} };

for (const part of (SO_FAMILIA || INPUT) ? [] : ['Arm', 'Cloth', 'Glove']) {
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
  const inputFile = INPUT ? path.resolve(INPUT) : path.join(PRIVATE_ROOT, family, `${family}-runtime.glb`);
  const outputFile = INPUT ? path.resolve(OUTPUT) : inputFile;
  const beforeBuffer = await fs.readFile(inputFile);
  const before = beforeBuffer.byteLength;
  const beforeSha256 = crypto.createHash('sha256').update(beforeBuffer).digest('hex');
  const document = await io.read(inputFile);
  let replaced = 0;
  for (const texture of document.getRoot().listTextures()) {
    const match = ARM_TEXTURE.exec(texture.getName() || '');
    if (!match) continue;
    const name = texture.getName();
    texture.setImage(placeholder);
    texture.setMimeType('image/webp');
    replaced += 1;
  }
  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  if (replaced || inputFile !== outputFile) await io.write(outputFile, document);
  const afterBuffer = await fs.readFile(outputFile);
  const after = afterBuffer.byteLength;
  const afterSha256 = crypto.createHash('sha256').update(afterBuffer).digest('hex');
  report.families[family] = {
    input: inputFile, output: outputFile, beforeBytes: before, afterBytes: after,
    beforeSha256, afterSha256, replaced,
  };
  console.log(`${family.padEnd(9)} ${(before / 1048576).toFixed(1).padStart(5)} MiB -> ${(after / 1048576).toFixed(1).padStart(5)} MiB (${replaced} texturas)`);
}

if (INPUT) {
  const reportFile = path.resolve(REPORT || `${OUTPUT}.optimize.json`);
  if (!outsideRepo(reportFile)) throw new Error('relatório do catálogo licenciado precisa ficar fora do repositório público');
  await fs.mkdir(path.dirname(reportFile), { recursive: true });
  await fs.writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`);
} else if (SO_FAMILIA) {
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
console.log(`CORO_PAID_VIEWMODEL_OPTIMIZE=${JSON.stringify({ mode: report.mode, families: families.length, sharedBytes: sharedTotal, catalogBytes: total })}`);
