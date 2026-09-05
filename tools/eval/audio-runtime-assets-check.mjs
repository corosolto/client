import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { carregarMapIds } from '../audio/map-ids.mjs';

const MAP_IDS = carregarMapIds();

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
  const manifest = {
    fixtureCapacity: Array.from({ length: 250 }, () => asset),
  };
  mkdirSync(audio, { recursive: true });
  writeFileSync(join(audio, 'manifest.json'), JSON.stringify(manifest));
  const prepare = spawnSync(process.execPath, [
    join(raiz, 'tools', 'audio', 'prepare-public-preview.mjs'), `--raiz=${publico}`,
  ], { encoding: 'utf8' });
  if (prepare.status !== 0) {
    console.error(prepare.stderr.trim() || prepare.stdout.trim());
    process.exit(1);
  }
  if (mutante === 'mapa-sem-override') {
    const preparado = JSON.parse(readFileSync(join(audio, 'manifest.json'), 'utf8'));
    delete preparado.mapSoundscapes[MAP_IDS[0]];
    writeFileSync(join(audio, 'manifest.json'), JSON.stringify(preparado));
  }
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
