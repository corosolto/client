import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

globalThis.location = { search: '' };
const { MAP_IDS } = await import('../../public/js/maps.js');

const raiz = fileURLToPath(new URL('../..', import.meta.url));
const mutante = process.argv.find((arg) => arg.startsWith('--mutante='))?.split('=')[1] || '';
if (mutante && mutante !== 'mapa-sem-override') {
  console.error(`mutante desconhecido: ${mutante}`);
  process.exit(2);
}

const tmp = mkdtempSync(join(tmpdir(), 'csbr-audio-runtime-assets-'));
const publico = join(tmp, 'public');
const audio = join(publico, 'audio');
const asset = 'audio/a/ambient.wav';

try {
  mkdirSync(join(publico, 'audio', 'a'), { recursive: true });
  writeFileSync(join(publico, asset), 'fixture ambiente privado\n');
  const mapSoundscapes = Object.fromEntries(MAP_IDS.map((id) => [id, {
    loops: [{ src: asset, global: true, pos: [0, 0, 0], radius: 100, vol: 0.1 }],
  }]));
  if (mutante === 'mapa-sem-override') delete mapSoundscapes[MAP_IDS[0]];
  const manifest = {
    mapSoundscapes,
    fixtureCapacity: Array.from({ length: 250 }, () => asset),
  };
  mkdirSync(audio, { recursive: true });
  writeFileSync(join(audio, 'manifest.json'), JSON.stringify(manifest));
  const ledger = join(tmp, 'ledger.json');
  writeFileSync(ledger, JSON.stringify({
    prefixoDerivado: 'audio/piloto/', raizesRuntime: [], fontes: {}, derivados: [], piloto: [],
  }));

  const run = spawnSync(process.execPath, [
    join(raiz, 'tools', 'eval', 'assets-check.mjs'),
    `--raiz=${publico}`, `--ledger=${ledger}`, '--so=runtime-audio',
  ], { encoding: 'utf8' });
  if (run.status !== 0) {
    console.error(run.stderr.trim() || run.stdout.trim());
    process.exitCode = 1;
  } else {
    console.log(`APROVADO — ${MAP_IDS.length} mapas cobertos por mapSoundscapes e todos os assets existem`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
