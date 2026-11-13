// Instalação e publicação usam a mesma normalização do carregador do jogo.
import { readFileSync, writeFileSync } from 'node:fs';
import { normalizarManifestAudio, temFamiliaLegadaAudio } from '../../public/js/audio_manifest.js';

const [target, ...flags] = process.argv.slice(2);
if (!target || target.startsWith('--') || flags.length > 1 || (flags.length && flags[0] !== '--check')) {
  console.error('uso: node tools/audio/migrar-manifesto.mjs <manifest.json> [--check]');
  process.exit(2);
}
try {
  const original = readFileSync(target, 'utf8'), manifest = JSON.parse(original);
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw Error('manifesto deve ser objeto');
  if (temFamiliaLegadaAudio(manifest)) {
    if (flags.length) {
      console.error('Manifesto precisa migrar a família legada para jogo antes de publicar.');
      process.exitCode = 1;
    } else {
      writeFileSync(target, JSON.stringify(normalizarManifestAudio(manifest), null, 2) + '\n');
      console.log('Manifesto migrado para jogo; arquivos de áudio preservados.');
    }
  }
} catch (error) {
  console.error('Manifesto indisponível ou inválido: ' + String(error.message).slice(0, 300));
  process.exitCode = 2;
}
