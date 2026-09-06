#!/usr/bin/env node
// Vercel V7: pack com 13 overrides não cobre Lajes. Reusar Quebrada, sem esconder outros mapas faltantes.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { carregarMapIds } from '../audio/map-ids.mjs';

const root = resolve(new URL('../..', import.meta.url).pathname);
let source = readFileSync(join(root, 'tools/audio/lajes-soundscape.mjs'), 'utf8');
const mutation = process.argv.find(arg => arg.startsWith('--mutante='))?.split('=')[1];
const mutations = {
  'sem-lajes': ["result.mapSoundscapes.lajes = structuredClone(donor);", 'void donor;'],
  'sobrescreve-autorado': ["Object.hasOwn(overrides, 'lajes')", 'false'],
  'clone-compartilhado': ['structuredClone(donor)', 'donor'],
};
if (mutation) {
  assert.ok(mutations[mutation], 'Mutante desconhecido');
  const changed = source.replace(...mutations[mutation]);
  assert.notEqual(changed, source, 'MUTANTE NÃO APLICOU'); source = changed;
}
const { completeLajesSoundscape } = await import(`data:text/javascript,${encodeURIComponent(source)}`);
const donor = { loops: [{ src: 'audio/a/wind.wav', global: true, pos: [0, 0, 0], radius: 240, vol: .06 }], shots: [{ srcs: ['audio/a/rustling.wav'], minGap: 24, maxGap: 68, vol: .15 }] };
const baseline = { mapSoundscapes: { quebrada: structuredClone(donor), loja_h: { synth: { kind: 'indoor-hum', vol: .02 } } }, weapons: { ak: ['audio/a/ak.wav'] } };
const before = structuredClone(baseline), result = completeLajesSoundscape(baseline);
assert.deepEqual(result.mapSoundscapes.lajes, donor, 'LSA1 Lajes ausente após adaptação do pack');
assert.deepEqual(baseline, before, 'LSA2 helper alterou o manifest de entrada');
result.mapSoundscapes.lajes.loops[0].pos[0] = 10;
assert.deepEqual(baseline, before, 'LSA2 alias Lajes alterou o doador de entrada');
assert.deepEqual(result.mapSoundscapes.quebrada, donor, 'LSA2 alias Lajes alterou Quebrada');
assert.deepEqual(result.weapons, baseline.weapons, 'LSA3 conteúdo não relacionado alterado');
assert.equal(result.mapSoundscapes.corrego, undefined, 'LSA3 helper mascarou outro mapa ausente');
for (const authored of [donor, { synth: { kind: 'indoor-hum', vol: .012 } }, null]) {
  const input = { mapSoundscapes: { quebrada: donor, lajes: authored } };
  assert.equal(completeLajesSoundscape(input), input, 'LSA4 override existente deve ser preservado, inclusive inválido para gate reprovar');
}
for (const legacy of [{}, { mapSoundscapes: {} }, { mapSoundscapes: null }]) {
  assert.equal(completeLajesSoundscape(legacy), legacy, 'LSA5 legado/public preview alterado');
}
for (const invalid of [undefined, {}, { synth: { kind: 'indoor-hum' } }, { loops: [{ src: '' }], shots: donor.shots }, { loops: donor.loops, shots: [{ srcs: [] }] }]) {
  assert.throws(() => completeLajesSoundscape({ mapSoundscapes: { loja_h: {}, quebrada: invalid } }), /Quebrada/, 'LSA6 doador inválido não deve inventar ambiência');
}
console.log('PASS LSA1–LSA6 helper puro: Lajes, isolamento, escopo, autorado, legado e doador válido');

const temp = mkdtempSync(join(tmpdir(), 'lajes-audio-fetch-'));
try {
  for (const dir of ['scripts', 'tools/audio', 'public/audio', 'bin', 'pack']) mkdirSync(join(temp, dir), { recursive: true });
  copyFileSync(join(root, 'tools/audio/lajes-soundscape.mjs'), join(temp, 'tools/audio/lajes-soundscape.mjs'));
  const fetch = readFileSync(join(root, 'scripts/fetch-audio.sh'), 'utf8').replaceAll('/tmp/csbrasil-audio.zip', join(temp, 'download.zip'));
  writeFileSync(join(temp, 'scripts/fetch-audio.sh'), fetch);
  writeFileSync(join(temp, 'bin/curl'), `#!/usr/bin/env bash\nwhile [ "$#" -gt 0 ]; do if [ "$1" = "-o" ]; then shift; cp "$FIXTURE_ZIP" "$1"; exit 0; fi; shift; done\nexit 2\n`, { mode: 0o755 });
  const runFetch = vercel => spawnSync('bash', ['scripts/fetch-audio.sh'], { cwd: temp, encoding: 'utf8', env: { ...process.env, VERCEL: vercel, AUDIO_PACK_URL: 'https://example.invalid/fixture.zip', AUDIO_PACK_SHA256: '', BLOB_READ_WRITE_TOKEN: '', PATH: `${join(temp, 'bin')}:${process.env.PATH}`, FIXTURE_ZIP: join(temp, 'pack.zip') } });
  const path = join(temp, 'public/audio/manifest.json');
  writeFileSync(path, JSON.stringify(baseline));
  const cached = runFetch(''); assert.equal(cached.status, 0, cached.stderr);
  assert.deepEqual(JSON.parse(readFileSync(path)).mapSoundscapes.lajes, donor, 'LSA7 early exit ignorou adaptação de Lajes');
  writeFileSync(join(temp, 'pack/manifest.json'), JSON.stringify(baseline));
  const zip = spawnSync('zip', ['-q', join(temp, 'pack.zip'), 'manifest.json'], { cwd: join(temp, 'pack'), encoding: 'utf8' }); assert.equal(zip.status, 0, zip.stderr);
  const fresh = runFetch('1'); assert.equal(fresh.status, 0, fresh.stderr);
  assert.deepEqual(JSON.parse(readFileSync(path)).mapSoundscapes.lajes, donor, 'LSA8 unzip ignorou adaptação de Lajes');
  console.log('PASS LSA7–LSA8 fetch real em cache e após unzip, sem rede');

  mkdirSync(join(temp, 'public/audio/a'), { recursive: true });
  for (const name of ['wind', 'rustling']) writeFileSync(join(temp, `public/audio/a/${name}.wav`), 'fixture sem audio');
  const full = { fixtureCapacity: Array(250).fill('audio/a/wind.wav'), mapSoundscapes: Object.fromEntries(carregarMapIds().filter(id => id !== 'lajes').map(id => [id, structuredClone(donor)])) };
  const ledger = join(temp, 'ledger.json');
  writeFileSync(ledger, JSON.stringify({ prefixoDerivado: 'audio/piloto/', raizesRuntime: [], fontes: {}, derivados: [], piloto: [] }));
  const gate = value => {
    writeFileSync(path, JSON.stringify(value));
    return spawnSync(process.execPath, [join(root, 'tools/eval/assets-check.mjs'), `--raiz=${join(temp, 'public')}`, `--ledger=${ledger}`, '--so=runtime-audio'], { cwd: root, encoding: 'utf8' });
  };
  const red = gate(full); assert.notEqual(red.status, 0); assert.match(red.stderr + red.stdout, /lajes/);
  const green = gate(completeLajesSoundscape(full)); assert.equal(green.status, 0, green.stderr + green.stdout);
  delete full.mapSoundscapes.corrego;
  const missingOther = gate(completeLajesSoundscape(full)); assert.notEqual(missingOther.status, 0); assert.match(missingOther.stderr + missingOther.stdout, /corrego/);
  console.log('PASS LSA9–LSA10 ASSETS-CHECK real: 13/14 vermelho → 14/14 verde; outro mapa ausente continua vermelho');
} finally { rmSync(temp, { recursive: true, force: true }); }
