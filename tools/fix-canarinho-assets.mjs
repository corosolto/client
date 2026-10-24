#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { compactCanarinhoTail } from './canarinho-tail.mjs';

const MANIFEST_PATH = 'public/models/skins/manifest.json';
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const report = [];

async function compact(id, file, hashed = false) {
  const document = await io.read(file);
  const before = compactCanarinhoTail(document);
  const bytes = Buffer.from(await io.writeBinary(document));
  let output = file;
  const hash = sha256(bytes);
  if (hashed) {
    output = join('public/models/skins', `${id}-${hash.slice(0, 12)}.glb`);
    if (output !== file) rmSync(file);
    const entry = manifest.skins[id];
    entry.model = `/${output.slice('public/'.length)}`;
    entry.sha256 = hash;
    entry.bytes = bytes.length;
  }
  writeFileSync(output, bytes);
  report.push({ id, input: basename(file), output: basename(output), changed: before.changed, scale: before.scale || 1, tailDepthRatio: before.ratio, bytes: bytes.length, sha256: hash });
}

await compact('canarinho', 'public/models/characters/canarinho.glb');
for (const id of ['canarinho-drip', 'canarinho-mandrake', 'canarinho-cyborg']) {
  await compact(id, `public${manifest.skins[id].model}`, true);
}
writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
