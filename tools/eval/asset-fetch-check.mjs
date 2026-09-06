import { readFileSync } from 'node:fs';

const mutante = process.argv.find((arg) => arg.startsWith('--mutante='))?.split('=')[1] || '';
let fonte = readFileSync('scripts/fetch-audio.sh', 'utf8');
if (mutante === 'cache-incompleto') fonte = fonte.replace('&& [ "${VERCEL:-}" != "1" ]', '');
if (mutante === 'sem-auth-privada') fonte = fonte.replace(/Authorization: Bearer[^\n]+/, 'Authorization removida');
if (mutante === 'sem-hash') fonte = fonte.replace(/shasum -a 256[^\n]+/, 'hash removido');

const robusto = /\[ -f "\$DEST\/manifest\.json" \] && \[ "\$\{VERCEL:-\}" != "1" \]/.test(fonte);
const hostPrivado = /https:\/\/\*\.private\.blob\.vercel-storage\.com\/\*/.test(fonte);
const exigeToken = /BLOB_READ_WRITE_TOKEN:\?[^}]+/.test(fonte);
const enviaToken = /Authorization: Bearer \$\{BLOB_READ_WRITE_TOKEN\}/.test(fonte);
const confereHash = /AUDIO_PACK_SHA256:\?[^}]+/.test(fonte)
  && /shasum -a 256 -c/.test(fonte);
const falhas = [];
if (!robusto) falhas.push('checkout da Vercel confunde o manifest versionado com pacote instalado');
if (!hostPrivado) falhas.push('fetch não restringe a credencial ao host privado da Vercel Blob');
if (!exigeToken || !enviaToken) falhas.push('Blob privado não exige/envia BLOB_READ_WRITE_TOKEN');
if (!confereHash) falhas.push('pacote privado não exige nem confere AUDIO_PACK_SHA256 antes de extrair');
if (falhas.length) {
  falhas.forEach((falha) => console.error(`REPROVADO — ${falha}`));
  process.exit(1);
}
console.log('APROVADO — Vercel baixa o pack; Blob privado usa auth restrita ao host e SHA-256 verificado');
