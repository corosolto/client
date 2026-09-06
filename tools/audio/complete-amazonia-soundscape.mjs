import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv.find(arg => arg.startsWith('--raiz='))?.slice(7) || 'public';
const path = join(root, 'audio', 'manifest.json');
const manifest = JSON.parse(readFileSync(path, 'utf8'));
const maps = manifest.mapSoundscapes;
// Packs legados usam world.sound; packs novos mantêm uma entrada própria se já existir.
if (maps && Object.keys(maps).length && !Object.hasOwn(maps, 'amazonia')) {
  const loops = maps.corrego?.loops, shots = maps.parque_treta?.shots;
  if (!loops?.some(loop => typeof loop.src === 'string') || !shots?.some(shot => shot.srcs?.length)) {
    throw new Error('AMAZONIA-AUDIO: pack sem água/vegetação de origem; não completar com silêncio.');
  }
  maps.amazonia = { loops: structuredClone(loops), shots: structuredClone(shots) };
  writeFileSync(path, JSON.stringify(manifest, null, 1) + '\n');
  console.log('AMAZONIA-AUDIO: água do córrego e vegetação do parque, sem novos arquivos.');
}
