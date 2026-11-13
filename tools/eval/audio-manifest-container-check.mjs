import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const dir = mkdtempSync(path.join(tmpdir(), 'corosolto-audio-contract-'));
const manifest = JSON.parse(readFileSync(path.join(root, 'public/audio/manifest.example.json'), 'utf8'));
const mutation = process.argv.includes('--mutante=container-cego');
let failures = 0;
try {
  for (const folder of ['public/audio', 'public/js']) mkdirSync(path.join(dir, folder), { recursive: true });
  for (const file of ['audio.js', 'main.js']) copyFileSync(path.join(root, 'public/js', file), path.join(dir, 'public/js', file));
  const target = path.join(dir, 'public/audio/manifest.example.json');
  writeFileSync(target, JSON.stringify(manifest));
  for (const args of [['init', '-q'], ['add', 'public/audio/manifest.example.json']]) {
    const result = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    assert(result.status === 0 && !result.error && !result.signal, 'fixture Git indisponível');
  }
  let validator = path.join(root, 'tools/eval/audio-manifest-marcas-check.mjs');
  if (mutation) {
    const source = readFileSync(validator, 'utf8');
    const guard = "if (!valor || typeof valor !== 'object' || Array.isArray(valor) || Object.keys(valor).length === 0) {";
    assert.equal(source.split(guard).length - 1, 1, 'mutante precisa aplicar exatamente uma vez');
    validator = path.join(dir, 'validator.mjs');
    writeFileSync(validator, source.replace(guard, 'if (false) {')
      .replace('Object.entries(valor)', "Object.entries(valor && typeof valor === 'object' ? valor : {})"));
    console.log('Mutação aplicada: container-cego');
  }
  const run = () => spawnSync(process.execPath, [validator], {
    cwd: dir, encoding: 'utf8', timeout: 10000,
  });
  const baseline = run();
  assert(baseline.status === 0 && !baseline.error && !baseline.signal, 'manifest válido precisa passar');
  for (const [name, value] of [['null', null], ['string', 'texto'], ['vazia', {}], ['array', []]]) {
    writeFileSync(target, JSON.stringify({ ...manifest, weapons: value }));
    const result = run();
    const output = `${result.stdout}${result.stderr}`;
    const detected = result.status === 1 && !result.error && !result.signal
      && output.includes('MARCA2:') && !/TypeError:|ReferenceError:|SyntaxError:/.test(output);
    console.log(`${detected ? '✓' : '✗'} família ${name}: validator real rejeita container inválido`);
    if (!detected) failures++;
  }
} finally { rmSync(dir, { recursive: true, force: true }); }
if (!mutation && !failures) {
  const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--mutante=container-cego'], {
    encoding: 'utf8', timeout: 30000,
  });
  const output = `${result.stdout}${result.stderr}`;
  assert(result.status === 1 && !result.error && !result.signal
    && output.includes('Mutação aplicada: container-cego')
    && ['null', 'string', 'vazia', 'array'].every((name) => output.includes(`✗ família ${name}: validator real rejeita container inválido`))
    && !/TypeError:|ReferenceError:|SyntaxError:/.test(output), 'guarda cega precisa reprovar quatro cláusulas semânticas');
  console.log('✓ mutação da guarda real reprovou os quatro containers');
}
if (failures) process.exitCode = 1;
