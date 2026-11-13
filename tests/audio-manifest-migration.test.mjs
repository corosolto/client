import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { normalizarManifestAudio } from '../public/js/audio_manifest.js';

const familia = {
  reload: ['audio/recarga.wav'], impactsBySurface: { concrete: ['audio/concreto.wav'] },
  characterImpact: { body: ['audio/corpo.wav'] },
  weaponSwitchByWeapon: { ak: ['audio/ak.wav'] }, uiByAction: { click: ['audio/click.wav'] },
};

test('migração preserva URLs, famílias desconhecidas e entrada', () => {
  const input = { cs: familia, voice: { F: ['audio/voz.mp3'] }, extensao: { futura: true } };
  const original = structuredClone(input);
  const out = normalizarManifestAudio(input);
  assert.deepEqual(out, { jogo: familia, voice: original.voice, extensao: original.extensao });
  assert.deepEqual(input, original);
  assert.equal(normalizarManifestAudio(out), out);
});

for (const jogo of [{}, null, { reload: ['audio/curadoria.wav'] }]) {
  test(`curadoria canônica explícita prevalece: ${JSON.stringify(jogo)}`, () => {
    assert.deepEqual(normalizarManifestAudio({ cs: familia, jogo }), { jogo });
  });
}

test('normalização não fabrica famílias nem aceita chave herdada como pacote', () => {
  for (const value of [null, undefined, [], 'inválido', { voice: {} }]) {
    assert.equal(normalizarManifestAudio(value), value);
  }
  const inherited = Object.create({ cs: familia });
  assert.equal(normalizarManifestAudio(inherited), inherited);
});

test('Sfx real recupera os cinco consumidores nos dois esquemas e no fallback', async t => {
  const location = Object.getOwnPropertyDescriptor(globalThis, 'location');
  const fetch = globalThis.fetch;
  globalThis.location = { search: '' };
  t.after(() => {
    globalThis.fetch = fetch;
    if (location) Object.defineProperty(globalThis, 'location', location);
    else delete globalThis.location;
  });
  const { Sfx } = await import('../public/js/audio.js');
  for (const [key, fallback] of [['cs', false], ['jogo', false], ['cs', true]]) {
    const calls = [], input = { [key]: structuredClone(familia) }, original = structuredClone(input);
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      return { ok: !(fallback && calls.length === 1), json: async () => input };
    };
    const sfx = new Sfx(), played = [];
    sfx._eventSample = url => { played.push(url); return true; };
    await sfx.loadManifest('revisão/teste');
    assert.equal(sfx._cs('reload'), familia.reload[0]);
    assert.equal(sfx.impact('concreto'), true);
    assert.equal(sfx.bodyImpact(false), true);
    assert.equal(sfx.weaponSwitch('ak', 'rifle'), true);
    assert.equal(sfx._uiAction('click', .3), true);
    assert.deepEqual(played, ['audio/concreto.wav', 'audio/corpo.wav', 'audio/ak.wav', 'audio/click.wav']);
    assert.deepEqual(input, original);
    assert.equal(calls.length, fallback ? 2 : 1);
    assert.equal(calls[0].url, 'audio/manifest.json?v=revis%C3%A3o%2Fteste');
    assert.equal(calls[0].options.cache, 'no-cache');
    if (fallback) assert.equal(calls[1].url, 'audio/manifest.default.json?v=1');
  }
});

const cli = fileURLToPath(new URL('../tools/audio/migrar-manifesto.mjs', import.meta.url));
function arquivoTemporario(t, text) {
  const dir = mkdtempSync(join(tmpdir(), 'corosolto-manifest-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'manifest.json');
  writeFileSync(path, text);
  return path;
}
const run = args => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });

test('CLI check é somente leitura e migração é idempotente', t => {
  const text = JSON.stringify({ cs: familia, voice: { F: ['audio/voz.mp3'] } });
  const path = arquivoTemporario(t, text);
  assert.equal(run([path, '--check']).status, 1);
  assert.equal(readFileSync(path, 'utf8'), text);
  assert.equal(run([path]).status, 0);
  const migrated = readFileSync(path, 'utf8');
  assert.deepEqual(JSON.parse(migrated), { jogo: familia, voice: { F: ['audio/voz.mp3'] } });
  assert.equal(run([path, '--check']).status, 0);
  assert.equal(run([path]).status, 0);
  assert.equal(readFileSync(path, 'utf8'), migrated);
});

for (const invalid of ['{', 'null', '[]']) {
  test(`CLI falha fechada sem reescrever entrada inválida: ${invalid}`, t => {
    const path = arquivoTemporario(t, invalid);
    assert.equal(run([path]).status, 2);
    assert.equal(readFileSync(path, 'utf8'), invalid);
  });
}

test('CLI rejeita opções desconhecidas, duplicadas e alvo ausente', t => {
  const path = arquivoTemporario(t, '{}');
  for (const args of [[], ['--check'], [path, '--outro'], [path, '--check', '--check']]) {
    assert.equal(run(args).status, 2);
  }
  assert.equal(readFileSync(path, 'utf8'), '{}');
});
