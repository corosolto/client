#!/usr/bin/env node
/* Deixa o manifest de áudio CONSUMÍVEL: todo mapa tem ambiência que existe.
 *
 * Contrato medido (lei 2 — procedência, não opinião). `audio-pack-v8`, a release
 * pública que o `AUDIO_PACK_URL` default aponta, tem 218.660.617 bytes, 445
 * entradas e NENHUMA pasta `ambiente/`; o `manifest.json` de dentro dela (16.426
 * bytes) não tem a chave `mapSoundscapes`. Medido em 04/10/2026 lendo o diretório
 * central do zip por HTTP Range e descomprimindo só aquela entrada — o pacote não
 * foi baixado inteiro.
 *
 * O que o jogo faz com isso (`game.js`, `this.sfx.pack?.mapSoundscapes?.[this._mapId]
 * || this.world.sound`): sem override do mapa, `world.sound` cai nos 17 caminhos
 * `audio/ambiente/*` que `soundscape.js` nomeia, e cada um vira um 404 com warn
 * (`soundscape.js:59`). É o mapa mudo, e é por isso que `assert:assets` reprova um
 * manifest assim em vez de deixar passar.
 *
 * O único conserto que não redistribui asset nenhum é o hum SINTETIZADO pelo jogo,
 * instalado nos mapas que o pacote não cobre. Ele não exige credencial, não copia
 * WAV privado e não muda o que já está curado.
 *
 * Por que o pack privado NÃO passa por aqui: `fetch-audio.sh` só chama este script
 * no ramo público. Pack privado sem `mapSoundscapes` é pack quebrado, e a resposta
 * certa é o build reprovar no `assert:assets` — não trocar ambiência real por hum
 * calado. Override PARCIAL também reprova, pelo mesmo motivo.
 */
import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { carregarMapIds } from './map-ids.mjs';

const MAP_IDS = carregarMapIds();

const arg = (nome) => (process.argv.find((item) => item.startsWith(`--${nome}=`))?.split('=')[1]) || '';
const publico = arg('raiz') || 'public';
const caminho = join(publico, 'audio', 'manifest.json');

if (!existsSync(caminho)) {
  console.error(`AUDIO: manifest ausente em ${caminho}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(caminho, 'utf8'));
const atuais = Object.keys(manifest.mapSoundscapes || {});
if (atuais.length && MAP_IDS.some((id) => !manifest.mapSoundscapes[id])) {
  console.error(`AUDIO: mapSoundscapes parcial (${atuais.length}/${MAP_IDS.length}) —`
    + ' um pacote com SOME dos mapas cobertos não pode virar hum no resto:'
    + ' ou o empacotador esqueceu um mapa, ou o pack é de outra linha do jogo.');
  process.exit(1);
}

if (!atuais.length) {
  manifest.mapSoundscapes = Object.fromEntries(MAP_IDS.map((id) => [id, {
    synth: { kind: 'indoor-hum', vol: 0.012 },
  }]));
  writeFileSync(caminho, JSON.stringify(manifest, null, 1) + '\n');
  console.log(`AUDIO: fallback sintético instalado em ${MAP_IDS.length}/${MAP_IDS.length} mapas`);
} else {
  console.log(`AUDIO: pack já cobre ${atuais.length}/${MAP_IDS.length} mapas; nada alterado`);
}
