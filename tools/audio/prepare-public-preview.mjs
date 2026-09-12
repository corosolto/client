#!/usr/bin/env node
/* Prepara SOMENTE o preview público e sem segredos de PRs externos.
 *
 * Esse workflow não pode receber a credencial do Blob: ele executa código do PR.
 * O pack público antigo não tem os arquivos de ambiência, então completa os 13 mapas
 * com o único fallback que não redistribui asset algum: o hum sintetizado pelo jogo.
 * O build Vercel normal não chama este script e continua usando o pack privado real.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { carregarMapIds } from './map-ids.mjs';

const MAP_IDS = carregarMapIds();

const arg = (nome) => (process.argv.find((item) => item.startsWith(`--${nome}=`)) || '').split('=')[1] || '';
const publico = arg('raiz') || 'public';
const caminho = join(publico, 'audio', 'manifest.json');

if (!existsSync(caminho)) {
  console.error(`PREVIEW-AUDIO: manifest ausente em ${caminho}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(caminho, 'utf8'));
const atuais = Object.keys(manifest.mapSoundscapes || {});
if (atuais.length && MAP_IDS.some((id) => !manifest.mapSoundscapes[id])) {
  console.error(`PREVIEW-AUDIO: mapSoundscapes parcial (${atuais.length}/${MAP_IDS.length}); não vou mascarar o pack`);
  process.exit(1);
}

if (!atuais.length) {
  manifest.mapSoundscapes = Object.fromEntries(MAP_IDS.map((id) => [id, {
    synth: { kind: 'indoor-hum', vol: 0.012 },
  }]));
  writeFileSync(caminho, JSON.stringify(manifest, null, 1) + '\n');
  console.log(`PREVIEW-AUDIO: fallback sintético instalado em ${MAP_IDS.length}/${MAP_IDS.length} mapas`);
} else {
  console.log(`PREVIEW-AUDIO: pack já cobre ${atuais.length}/${MAP_IDS.length} mapas; nada alterado`);
}
