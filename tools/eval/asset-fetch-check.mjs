import { readFileSync, mkdirSync, mkdtempSync, writeFileSync, unlinkSync, readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
// Cache cheio não substitui cada nome que o jogo pede: chama o assert real.
const { initTextures } = await import('./harness.mjs');
const nomes = initTextures().decalFiles;
const fixture = mkdtempSync(join(tmpdir(), 'csbr-decal-assets-'));
const publicRoot = join(fixture, 'public'), destino = join(publicRoot, 'img/decals');
const scriptAssets = fileURLToPath(new URL('./assets-check.mjs', import.meta.url));
const rodarDecals = (args = ['--so=decals']) => spawnSync(process.execPath,
  [scriptAssets, `--raiz=${publicRoot}`, ...args], { encoding: 'utf8' });
try {
  if (!nomes?.length) throw new Error('DEC0 lista nominal vazia');
  mkdirSync(destino, { recursive: true });
  for (const nome of nomes) writeFileSync(join(destino, nome), 'fixture de existência nominal');
  const completo = rodarDecals();
  if (completo.status !== 0) falhas.push(`DEC1 --so=decals rejeita lista completa sem áudio: ${completo.stderr}`);
  const ausente = nomes.find((n) => !n.startsWith('or-'));
  if (!ausente) throw new Error('DEC0 acervo sem nome para mutação');
  unlinkSync(join(destino, ausente));
  const removidos = [ausente], preenchidos = [];
  const esperado = Number(readFileSync('scripts/fetch-decals.sh', 'utf8').match(/EXPECTED_DECALS=(\d+)/)?.[1]);
  if (!Number.isSafeInteger(esperado) || esperado < 1) throw new Error('DEC0 sentinela de cache não reconhecida');
  const acervo = readdirSync(destino).filter((n) => n.endsWith('.png') && !n.startsWith('or-'));
  while (acervo.length > esperado) { const n = acervo.pop(); unlinkSync(join(destino, n)); removidos.push(n); }
  while (acervo.length < esperado) { const n = `padding-unused-fixture-${acervo.length}.png`; writeFileSync(join(destino, n), 'fixture'); preenchidos.push(n); acervo.push(n); }
  const contado = acervo.length;
  const parcial = rodarDecals();
  if (parcial.status !== 1 || !parcial.stderr.includes(ausente)) falhas.push(`DEC2 ${contado} PNGs com ${ausente} ausente não reprovam nominalmente`);
  for (const n of removidos) writeFileSync(join(destino, n), 'fixture restaurada');
  for (const n of preenchidos) unlinkSync(join(destino, n));
  if (rodarDecals().status !== 0) falhas.push('DEC3 restaurar o nome solicitado não recuperou o contrato');
  const padrao = rodarDecals([]);
  if (padrao.status !== 1 || !padrao.stderr.includes('áudio:')) falhas.push('DEC4 modo padrão deixou de exigir áudio');
  for (const modos of [['--so=wrong-mode'], ['--so='], ['--so'], ['--so=decals', '--so=audio'], ['--so=decals=sufixo'], ['--so=audio=sufixo'], ['--so=runtime-audio=sufixo']]) {
    if (rodarDecals(modos).status !== 2) falhas.push(`DEC5 ${modos.join(' ')} inválido não falhou fechado`);
  }
} catch (e) { falhas.push(String(e.message)); }
finally { rmSync(fixture, { recursive: true, force: true }); }
if (falhas.length) {
  falhas.forEach((falha) => console.error(`REPROVADO — ${falha}`));
  process.exit(1);
}
console.log('APROVADO — fetch de áudio preserva auth/hash; assert de decalques exige cada nome, mesmo com contagem completa, e mantém áudio no padrão');
