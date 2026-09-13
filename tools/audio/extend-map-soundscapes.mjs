import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// O pack privado antecede mapas novos. Reutiliza camas semanticamente próximas,
// sem inventar caminhos de áudio nem substituir configurações curadas posteriores.
export function extendMapSoundscapes(manifest) {
  const maps=manifest.mapSoundscapes;
  if(!maps) return false;
  let changed=false;
  if(!Object.hasOwn(maps,'escadao')&&maps.quebrada) {
    maps.escadao=structuredClone(maps.quebrada);changed=true;
  }
  if(!Object.hasOwn(maps,'mansao')) {
    const donor=maps.parque_treta||maps.corrego||maps.quebrada;
    if(donor){maps.mansao=structuredClone(donor);changed=true;}
  }
  return changed;
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const file=process.argv[2] || 'public/audio/manifest.json';
  const manifest=JSON.parse(readFileSync(file,'utf8'));
  const hadEscadao=Object.hasOwn(manifest.mapSoundscapes||{},'escadao');
  const hadMansao=Object.hasOwn(manifest.mapSoundscapes||{},'mansao');
  if(extendMapSoundscapes(manifest)) {
    writeFileSync(file,JSON.stringify(manifest,null,1)+'\n');
    if(!hadEscadao)console.log('AUDIO: Escadão usa a ambiência de favela existente no pack.');
    if(!hadMansao)console.log('AUDIO: Mansão usa água, vento e vegetação existentes no pack.');
  }
}
