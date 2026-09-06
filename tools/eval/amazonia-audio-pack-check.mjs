import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { carregarMapIds } from '../audio/map-ids.mjs';

const root = mkdtempSync(join(tmpdir(), 'amazonia-audio-'));
const audio = join(root, 'audio'), manifestPath = join(audio, 'manifest.json');
const asset = 'audio/water.wav';
const ledger = join(root, 'ledger.json');
const helper = 'tools/audio/complete-amazonia-soundscape.mjs';
const run = (file, args = []) => spawnSync(process.execPath, [file, ...args], { encoding: 'utf8' });
const check = () => run('tools/eval/assets-check.mjs', [`--raiz=${root}`, `--ledger=${ledger}`, '--so=runtime-audio']);
try {
  mkdirSync(audio);
  writeFileSync(join(root, asset), 'fixture');
  writeFileSync(ledger, JSON.stringify({ prefixoDerivado: 'audio/piloto/', raizesRuntime: [], fontes: {}, derivados: [], piloto: [] }));
  const original = { fixtureCapacity: Array(250).fill(asset), mapSoundscapes: Object.fromEntries(
    carregarMapIds().filter(id => id !== 'amazonia').map(id => [id, { loops: [{ src: asset, vol: .13 }], shots: [{ srcs: [asset], minGap: 18, maxGap: 52, vol: .14 }] }])) };
  writeFileSync(manifestPath, JSON.stringify(original));
  assert.notEqual(check().status, 0, 'pack antigo deve reprovar sem Amazônia');
  if (!process.argv.includes('--mutante=sem-preparacao')) {
    const prepared = run(helper, [`--raiz=${root}`]);
    assert.equal(prepared.status, 0, prepared.stderr || prepared.stdout);
  }
  assert.equal(check().status, 0, 'pack preparado precisa passar o verificador real');
  const prepared = JSON.parse(readFileSync(manifestPath));
  assert.deepEqual(prepared.mapSoundscapes.amazonia.loops, original.mapSoundscapes.corrego.loops);
  assert.deepEqual(prepared.mapSoundscapes.amazonia.shots, original.mapSoundscapes.parque_treta.shots);
  const first = readFileSync(manifestPath, 'utf8');
  assert.equal(run(helper, [`--raiz=${root}`]).status, 0);
  assert.equal(readFileSync(manifestPath, 'utf8'), first, 'preparo idempotente');
  delete prepared.mapSoundscapes.amazonia;
  assert.deepEqual(prepared, original, 'nenhum mapa ou campo existente alterado');
  delete prepared.mapSoundscapes.loja_h;
  writeFileSync(manifestPath, JSON.stringify(prepared));
  assert.equal(run(helper, [`--raiz=${root}`]).status, 0);
  assert.notEqual(check().status, 0, 'não mascarar outro mapa ausente');
  writeFileSync(manifestPath, JSON.stringify({ fixtureCapacity: original.fixtureCapacity }));
  const legacy = readFileSync(manifestPath, 'utf8');
  assert.equal(run(helper, [`--raiz=${root}`]).status, 0);
  assert.equal(readFileSync(manifestPath, 'utf8'), legacy, 'pack legado conserva fallback do mapa');
  console.log('AMAP: pack antigo reprovado, extensão válida, idempotência e mapas preservados.');
} finally { rmSync(root, { recursive: true, force: true }); }
