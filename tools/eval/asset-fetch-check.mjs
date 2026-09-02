import { readFileSync } from 'node:fs';

const mutante = process.argv.find((arg) => arg.startsWith('--mutante='))?.split('=')[1] || '';
let fonte = readFileSync('scripts/fetch-audio.sh', 'utf8');
if (mutante === 'cache-incompleto') fonte = fonte.replace('&& [ "${VERCEL:-}" != "1" ]', '');

const robusto = /\[ -f "\$DEST\/manifest\.json" \] && \[ "\$\{VERCEL:-\}" != "1" \]/.test(fonte);
if (!robusto) {
  console.error('REPROVADO — checkout da Vercel confunde o manifest versionado com pacote de áudio instalado');
  process.exit(1);
}
console.log('APROVADO — Vercel sempre baixa o pacote; cache local continua preservado');
