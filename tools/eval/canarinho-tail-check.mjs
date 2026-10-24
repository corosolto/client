#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { inspectCanarinhoTail } from '../canarinho-tail.mjs';

const mutant = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
if (mutant && mutant !== 'cauda-gigante') throw new Error(`mutante desconhecido: ${mutant}`);

const manifest = JSON.parse(readFileSync('public/models/skins/manifest.json', 'utf8'));
const files = [
  ['canarinho', 'public/models/characters/canarinho.glb'],
  ...['canarinho-drip', 'canarinho-mandrake', 'canarinho-cyborg'].map((id) => [id, `public${manifest.skins[id].model}`]),
];
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const failures = [];
for (const [id, file] of files) {
  const document = await io.read(file);
  const report = inspectCanarinhoTail(document);
  assert(report.tails.length >= 2, `${id}: cauda não identificada`);
  const ratio = report.ratio * (mutant === 'cauda-gigante' ? 2 : 1);
  const ok = ratio <= 0.22;
  console.log(`${ok ? '✓' : '✗'} ${id.padEnd(20)} ${report.tails.length} componentes · profundidade ${(ratio * 100).toFixed(1)}% da altura`);
  if (!ok) failures.push(`${id}=${(ratio * 100).toFixed(1)}%`);
}

if (mutant) {
  assert(failures.length, 'mutação passou: uma cauda 2× maior não foi rejeitada');
  console.log(`\n== ${mutant}: mutante reprovado como devia (${failures.join(' · ')})`);
  process.exit(0);
}
assert.equal(failures.length, 0, `cauda gigante: ${failures.join(' · ')} (teto 22%)`);
console.log('\nAPROVADO — todas as variantes do Canarinho mantêm cauda proporcional.');
