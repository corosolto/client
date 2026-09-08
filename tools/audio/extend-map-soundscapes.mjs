import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// O pack privado antecede Escadão e Campinho. Reutiliza a cama de favela existente,
// sem inventar caminhos de áudio nem substituir configurações curadas posteriores.
export function extendMapSoundscapes(manifest) {
  const maps=manifest.mapSoundscapes;
  if(!maps || !maps.quebrada) return false;
  let changed=false;
  for(const id of ['escadao','campomorro']) {
    if(Object.hasOwn(maps,id)) continue;
    maps[id]=structuredClone(maps.quebrada);
    changed=true;
  }
  return changed;
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const file=process.argv[2] || 'public/audio/manifest.json';
  const manifest=JSON.parse(readFileSync(file,'utf8'));
  if(extendMapSoundscapes(manifest)) {
    writeFileSync(file,JSON.stringify(manifest,null,1)+'\n');
    console.log('AUDIO: mapas novos usam a ambiência de favela existente no pack.');
  }
}
