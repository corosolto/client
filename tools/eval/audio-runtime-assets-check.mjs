/* AUDIO-RUNTIME-ASSETS — o `assert:assets` que roda no build tem TRÊS estados
 * válidos, e esta régua prova os três chamando o script de verdade.
 *
 * Por que três (issue #696): `audio-pack-v8` — a release pública que o
 * `AUDIO_PACK_URL` default aponta — não tem pasta `ambiente/` nem a chave
 * `mapSoundscapes` no manifest (medido em 04/10/2026 sobre o diretório central do
 * zip). O `assert:assets` reprovava com "17 de 17 caminhos que `soundscape.js`
 * nomeia não estão no manifest OU no disco", e o conserto era um arquivo que
 * NINGUÉM chamava fora do workflow de preview. Um portão que só é verde depois
 * de um passo que só um workflow conhece é portão quebrado.
 *
 *   A1  manifest cru, sem overrides e sem `ambiente/`  -> VERMELHO (o mapa
 *       cairia no `world.sound` e cada som daria 404). É o estado que a #696
 *       reportou, e o mesmo que a build da Vercel veria.
 *   A2  depois do `ensure-map-soundscapes`              -> VERDE
 *   A3  um mapa sem override (`--mutante=mapa-sem-override`) -> VERMELHO de novo,
 *       nomeando o mapa. Override parcial não pode virar silêncio no resto.
 *
 * As três passam pelo `assets-check.mjs` com `--raiz`/`--ledger`/`--so`, então a
 * régua não reconta o contrato: ela pergunta ao chamador real.
 */
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
const gate = () => spawnSync(process.execPath, [
  join(raiz, 'tools', 'eval', 'assets-check.mjs'),
  `--raiz=${publico}`, `--ledger=${join(tmp, 'ledger.json')}`, '--so=runtime-audio',
], { encoding: 'utf8' });
const falhou = (r) => r.status !== 0;
const texto = (r) => r.stderr + r.stdout;

try {
  mkdirSync(join(publico, 'audio', 'a'), { recursive: true });
  mkdirSync(audio, { recursive: true });
  writeFileSync(join(publico, asset), 'fixture ambiente privado\n');
  writeFileSync(join(audio, 'manifest.json'), JSON.stringify({
    fixtureCapacity: Array.from({ length: 250 }, () => asset),
  }));
  writeFileSync(join(tmp, 'ledger.json'), JSON.stringify({
    prefixoDerivado: 'audio/piloto/', raizesRuntime: [], fontes: {}, derivados: [], piloto: [],
  }));

  const cru = gate();
  if (!falhou(cru)) {
    console.error('A1 manifest sem overrides e sem `ambiente/` passou: todo mapa cairia no'
      + ' `world.sound` e cada som seria um 404 silencioso.');
    process.exit(1);
  }
  if (!/soundscape\.js/.test(texto(cru))) {
    console.error(`A1 reprovou por outro motivo que não é a ambiência:\n${texto(cru).trim()}`);
    process.exit(1);
  }
  console.log(`A1 VERMELHO — pack sem ambiência reprovado: ${(texto(cru).match(/(\d+) caminhos que/) || [, '?'])[1]} arquivos de ambiente ausentes`);

  const prepare = spawnSync(process.execPath, [
    join(raiz, 'tools', 'audio', 'ensure-map-soundscapes.mjs'), `--raiz=${publico}`,
  ], { encoding: 'utf8' });
  if (prepare.status !== 0) {
    console.error(prepare.stderr.trim() || prepare.stdout.trim());
    process.exit(1);
  }
  if (falhou(gate())) {
    console.error(`A2 VERDE esperado depois do preparo:\n${texto(gate()).trim()}`);
    process.exit(1);
  }
  console.log(`A2 VERDE — ${MAP_IDS.length} mapas com ambiência que existe`);

  if (mutante) {
    const preparado = JSON.parse(readFileSync(join(audio, 'manifest.json'), 'utf8'));
    const perdido = MAP_IDS[0];
    delete preparado.mapSoundscapes[perdido];
    writeFileSync(join(audio, 'manifest.json'), JSON.stringify(preparado));
    const parcial = gate();
    if (!falhou(parcial)) {
      console.error(`A3 um mapa sem override (${perdido}) passou: o resto dos mapas ficaria mudo.`);
      process.exit(1);
    }
    if (!texto(parcial).includes(perdido)) {
      console.error(`A3 reprovou sem nomear o mapa perdido (${perdido}):\n${texto(parcial).trim()}`);
      process.exit(1);
    }
    console.log(`A3 VERMELHO — override parcial reprovado nomeando ${perdido}`);
  }

  console.log('AUDIO-RUNTIME-ASSETS: os três estados do contrato de ambiência conferidos no assert:assets real');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
