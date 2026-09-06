import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// O pack privado antecede Escadão. Reutiliza sua cama de vento/vegetação de favela,
// sem inventar caminhos de áudio nem substituir configurações curadas posteriores.
export function extendMapSoundscapes(manifest) {
  const maps=manifest.mapSoundscapes;
  if(!maps || Object.hasOwn(maps,'escadao') || !maps.quebrada) return false;
  maps.escadao=structuredClone(maps.quebrada);
  return true;
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const file=process.argv[2] || 'public/audio/manifest.json';
  const manifest=JSON.parse(readFileSync(file,'utf8'));
  if(extendMapSoundscapes(manifest)) {
    writeFileSync(file,JSON.stringify(manifest,null,1)+'\n');
    console.log('AUDIO: Escadão usa a ambiência de favela existente no pack.');
  }
}
