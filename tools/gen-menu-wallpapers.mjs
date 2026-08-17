#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SELF = fileURLToPath(import.meta.url);
const SOURCE_DIR = join(ROOT, 'public', 'img');
const OUTPUT_DIR = join(SOURCE_DIR, 'walls-3x2');
const MANIFEST = join(OUTPUT_DIR, 'manifest.json');
const CHECK = process.argv.includes('--check');
const MUTANT = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
const RECIPE = MUTANT === 'defasado' ? '3x2-v0' : '3x2-v1';

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const sources = readdirSync(SOURCE_DIR)
  .filter((file) => /^wall-\d+\.webp$/.test(file))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

async function dimensions(source) {
  const meta = await sharp(source).metadata();
  if (!meta.width || !meta.height) throw new Error(`dimensões inválidas: ${source}`);
  return { width: meta.width, sourceHeight: meta.height, height: Math.round(meta.width / 1.5) };
}

async function generate(source, output) {
  const { width, sourceHeight, height } = await dimensions(source);
  const top = Math.floor((height - sourceHeight) / 2);
  const feather = Math.min(64, Math.max(24, top));
  const background = await sharp(source)
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .blur(30)
    .modulate({ brightness: 0.55, saturation: 0.78 })
    .toBuffer();
  const mask = Buffer.from(`<svg width="${width}" height="${sourceHeight}"><defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="white" stop-opacity="0"/><stop offset="${feather / sourceHeight}" stop-color="white"/><stop offset="${1 - feather / sourceHeight}" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#fade)"/></svg>`);
  const foreground = await sharp(source)
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
  await sharp(background)
    .composite([{ input: foreground, left: 0, top }])
    .webp({ quality: 90, smartSubsample: true, effort: 6 })
    .toFile(output);
}

async function expectedRecord(file) {
  const source = join(SOURCE_DIR, file);
  const output = join(OUTPUT_DIR, file);
  const { width, height } = await dimensions(source);
  return {
    sourceSha256: sha256(source),
    outputSha256: existsSync(output) ? sha256(output) : '',
    width,
    height,
  };
}

if (!sources.length) throw new Error(`nenhum wallpaper em ${SOURCE_DIR}`);

if (CHECK) {
  if (!existsSync(MANIFEST)) throw new Error('variantes 3:2 ausentes; rode `npm run menuwalls`');
  const current = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const expectedFiles = sources.map((file) => basename(file));
  const currentFiles = Object.keys(current.files || {});
  if (current.recipe !== RECIPE || current.generatorSha256 !== sha256(SELF)
    || JSON.stringify(currentFiles) !== JSON.stringify(expectedFiles)) {
    throw new Error('manifesto 3:2 defasado; rode `npm run menuwalls`');
  }
  for (const file of sources) {
    const expected = await expectedRecord(file);
    if (JSON.stringify(current.files[file]) !== JSON.stringify(expected)) {
      throw new Error(`${file} defasado; rode \`npm run menuwalls\``);
    }
  }
  console.log(`MENUWALLS: ${sources.length} variantes 3:2 em dia`);
} else {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const file of sources) await generate(join(SOURCE_DIR, file), join(OUTPUT_DIR, file));
  const files = {};
  for (const file of sources) files[file] = await expectedRecord(file);
  writeFileSync(MANIFEST, `${JSON.stringify({ recipe: RECIPE, generatorSha256: sha256(SELF), files }, null, 2)}\n`);
  console.log(`MENUWALLS: geradas ${sources.length} variantes 3:2`);
}
