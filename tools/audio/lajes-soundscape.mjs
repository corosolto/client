import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function completeLajesSoundscape(manifest) {
  const overrides = manifest.mapSoundscapes;
  if (!overrides || !Object.keys(overrides).length || Object.hasOwn(overrides, 'lajes')) return manifest;
  const donor = overrides.quebrada;
  const asset = src => typeof src === 'string' && src.startsWith('audio/') && src.length > 6;
  const valid = !donor?.synth && Array.isArray(donor?.loops) && donor.loops.length > 0 &&
    donor.loops.every(loop => asset(loop?.src)) && Array.isArray(donor.shots) && donor.shots.length > 0 &&
    donor.shots.every(shot => Array.isArray(shot?.srcs) && shot.srcs.length > 0 && shot.srcs.every(asset));
  if (!valid) throw new Error('LAJES-AUDIO: Quebrada precisa fornecer loops e one-shots válidos; não foi criado fallback sintético.');
  const result = structuredClone(manifest);
  result.mapSoundscapes.lajes = structuredClone(donor);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const path = process.argv[2];
  if (!path) throw new Error('uso: node tools/audio/lajes-soundscape.mjs <manifest.json>');
  const original = JSON.parse(readFileSync(path, 'utf8'));
  const result = completeLajesSoundscape(original);
  if (result !== original) {
    writeFileSync(path, JSON.stringify(result, null, 1) + '\n');
    console.log('LAJES-AUDIO: ambiência externa de Quebrada reutilizada em Lajes, sem novos arquivos de mídia.');
  }
}
