/* O pacote de produção oculta nomes de áudio. A legenda deve viajar para a MESMA
   chave hasheada da voz; do contrário `Sfx.characterVoice()` toca o arquivo mas
   devolve `text:null` apenas no deploy.

   Mutação: `--mutante=chave-legenda-antiga` reproduz o rewriter anterior, que
   transformava valores mas nunca chaves de `characterVoiceText`.
*/
import { readFileSync } from 'node:fs';
import { rewriteAudioManifest } from '../../scripts/audio-pack-rewrite.mjs';

const MUTANT = process.argv.includes('--mutante=chave-legenda-antiga');
const source = readFileSync('scripts/build-audio-pack.mjs', 'utf8');
const originalPath = 'audio/characters/camera-roxa/select/select-01.mp3';
const opaquePath = 'audio/a/0123456789abcdef.mp3';
const fixture = {
  characterVoice: { 'camera-roxa': { select: [originalPath] } },
  characterVoiceText: { [originalPath]: 'A transmissão começou.' },
};
const mapPath = (path) => path === originalPath ? opaquePath : path;

const legacyValuesOnly = (value) => {
  if (Array.isArray(value)) return value.map((item) => typeof item === 'string' && item.startsWith('audio/') ? mapPath(item) : item);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, legacyValuesOnly(item)]));
  return value;
};
const packed = MUTANT ? legacyValuesOnly(fixture) : rewriteAudioManifest(fixture, mapPath);
const selected = packed.characterVoice['camera-roxa'].select[0];
const failures = [];
if (selected !== opaquePath) failures.push(`voz não foi ofuscada: ${selected}`);
if (packed.characterVoiceText[selected] !== 'A transmissão começou.')
  failures.push(`legenda não acompanha a voz ofuscada: chave ${selected}`);
if (!/audio-pack-rewrite\.mjs/.test(source) || !/rewriteAudioManifest\(manifesto,\s*hashNome\)/.test(source))
  failures.push('build-audio-pack.mjs ainda não usa o rewriter verificado');

if (failures.length) {
  failures.forEach((failure) => console.error(`✗ ${failure}`));
  process.exit(1);
}
console.log('AUDIO-PACK-CHARACTER-VOICE ✓ voz e legenda usam a mesma chave opaca');
