#!/usr/bin/env node
/* ============================================================================
   cf-paridade-estatica-check.mjs — TODA REGRA DE vercel.json TEM CONTRAPARTE NO WORKERS
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   `public/_headers` e `public/_redirects` são gerados de `vercel.json` por
   tools/cf/gen-headers-redirects.mjs; o Worker (src/cf/worker.ts) aplica o que o formato
   estático não expressa. Esta régua prova que nada da Vercel ficou para trás:

   CP1 cada regra de `headers` gera um bloco (ou dois, com `{/}?`) e cada chave/valor
       aparece dentro dele; regra aproximada (grupo regex) vem marcada `# aproximado`.
   CP2 cada `redirect` sem `has`/`missing` e com source exato vira linha(s) no
       `_redirects` com o status certo; os com `has`/`missing` ficam na lista do Worker.
   CP3 o motor do Worker (src/lib/regras-vercel.mjs) compila todo `source` e reproduz
       os redirects por query da home (`/?janela=...`) e os headers por rota.
   CP4 `_headers` tem no máximo 100 blocos e nenhuma linha passa de 2000 caracteres.

   Mutantes: `sem-header` remove um bloco do `_headers` gerado; `sem-redirect` remove uma
   linha do `_redirects`. Os dois têm que acender.

   Uso: node tools/eval/cf-paridade-estatica-check.mjs [--mutante=sem-header|sem-redirect]
   ============================================================================ */
import { gerar, lerVercel, fonteParaPadrao } from '../cf/gen-headers-redirects.mjs';
import { compilarHeader, compilarRedirect, headersPara, redirectPara } from '../../src/lib/regras-vercel.mjs';

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const mutante = arg('mutante');
if (mutante && !['sem-header', 'sem-redirect'].includes(mutante)) throw new Error(`mutante desconhecido: ${mutante}`);

const vercel = lerVercel();
const saida = gerar(vercel);
let headers = saida.headers;
let redirects = saida.redirects;
if (mutante === 'sem-header') headers = headers.replace(/\n\/models\/\*\n(?:  [^\n]*\n)+/, '\n');
if (mutante === 'sem-redirect') redirects = redirects.replace(/^\/discord [^\n]*\n/m, '');

const falhas = [];
const blocos = new Map();
let atual = null;
for (const linha of headers.split('\n')) {
  if (!linha || linha.startsWith('#')) continue;
  if (!linha.startsWith(' ')) { atual = linha; blocos.set(atual, []); continue; }
  blocos.get(atual).push(linha.trim());
}

/* CP1 */
for (const regra of vercel.headers) {
  const { padrao, exato } = fonteParaPadrao(regra.source);
  const variantes = padrao.includes('{') ? [padrao.replace(/\{[^}]*\}/, ''), padrao.replace(/\{([^}]*)\}/, '$1')] : [padrao];
  for (const v of variantes) {
    const linhas = blocos.get(v);
    if (!linhas) { falhas.push(`CP1 ${regra.source}: bloco "${v}" ausente no _headers`); continue; }
    for (const { key, value } of regra.headers) {
      if (!linhas.includes(`${key}: ${value}`)) falhas.push(`CP1 ${regra.source}: "${key}" ausente ou com valor diferente`);
    }
  }
  if (!exato && !headers.includes(`# aproximado de ${regra.source}`)) falhas.push(`CP1 ${regra.source}: aproximação sem marca`);
}

/* CP2 */
const linhasRedirect = redirects.split('\n').filter((l) => l && !l.startsWith('#'));
for (const regra of vercel.redirects) {
  const status = regra.statusCode ?? (regra.permanent === false ? 307 : 308);
  if (regra.has || regra.missing) {
    if (!saida.soNoWorker.includes(regra)) falhas.push(`CP2 ${regra.source} (has/missing): fora da lista do Worker`);
    continue;
  }
  const { padrao, exato } = fonteParaPadrao(regra.source);
  if (!exato) { if (!saida.soNoWorker.includes(regra)) falhas.push(`CP2 ${regra.source}: regex fora da lista do Worker`); continue; }
  const variantes = padrao.includes('{') ? [padrao.replace(/\{[^}]*\}/, ''), padrao.replace(/\{([^}]*)\}/, '$1')] : [padrao];
  for (const v of variantes) {
    if (!linhasRedirect.includes(`${v} ${regra.destination} ${status}`)) falhas.push(`CP2 ${regra.source}: linha "${v} ${regra.destination} ${status}" ausente no _redirects`);
  }
}

/* CP3 */
const REDIRECTS = vercel.redirects.map(compilarRedirect);
const HEADERS = vercel.headers.map(compilarHeader);
const casos = [
  ['https://x/?janela=configuracoes', '/configuracoes?janela=configuracoes', 301],
  ['https://x/?janela=configuracoes&perfil=1', null, 0],
  ['https://x/?janela=mapas', '/jogar/mapas?janela=mapas', 301],
  ['https://x/?secao=sobre&guia=armas', '/guia/armas?secao=sobre&guia=armas', 301],
  ['https://x/?secao=comunidade&social=feed', '/comunidade/feed?secao=comunidade&social=feed', 301],
  ['https://x/?secao=comunidade', '/comunidade?secao=comunidade', 301],
  ['https://x/?partida=multiplayer&servidor=privado', '/jogar/multiplayer/privado?partida=multiplayer&servidor=privado', 301],
  ['https://x/jogar/', '/', 301],
  ['https://x/docs/en/status', '/docs/en/estado', 308],
  ['https://x/discord', 'https://discord.gg/XQHAFBcrhv', 307],
  ['https://x/', null, 0],
  ['https://x/mapa', null, 0],
];
for (const [url, destino, status] of casos) {
  const r = redirectPara(REDIRECTS, new URL(url));
  if ((r?.destino ?? null) !== destino || (r?.status ?? 0) !== status) falhas.push(`CP3 ${url}: esperado ${destino} ${status}, veio ${r?.destino ?? null} ${r?.status ?? 0}`);
}
const esperados = [
  ['/api/geo-lang', 'content-security-policy', true], ['/api/geo-lang', 'cache-control', false],
  ['/audio/a/x.mp3', 'cache-control', 'public, max-age=31536000, immutable'],
  ['/audio/x.mp3', 'cache-control', 'public, max-age=86400'],
  ['/private-assets/viewmodels/ak/ak-runtime.glb', 'cache-control', 'public, max-age=31536000, immutable'],
  ['/private-assets/viewmodels/shared/x-runtime.glb', 'cache-control', 'public, max-age=0, must-revalidate'],
  ['/private-assets/viewmodels/ak/ak-runtime.glb', 'content-type', 'model/gltf-binary'],
  ['/u/abc', 'strict-transport-security', 'max-age=63072000; includeSubDomains'],
];
for (const [rota, chave, valor] of esperados) {
  const tem = headersPara(HEADERS, rota);
  const v = tem.get(chave);
  const ok = valor === true ? v !== undefined : valor === false ? v === undefined : v === valor;
  if (!ok) falhas.push(`CP3 ${rota} ${chave}: esperado ${valor}, veio ${v}`);
}

/* CP4 */
if (blocos.size > 100) falhas.push(`CP4 _headers com ${blocos.size} blocos (teto 100)`);
for (const linha of headers.split('\n')) if (linha.length > 2000) falhas.push(`CP4 linha com ${linha.length} caracteres`);

if (falhas.length) {
  for (const f of falhas) console.error('✗', f);
  console.error(`✗ cf-paridade-estatica: ${falhas.length} falha(s)${mutante ? ` (mutante ${mutante})` : ''}`);
  process.exit(1);
}
console.log(`✓ cf-paridade-estatica: ${vercel.headers.length} regras de header, ${vercel.redirects.length} redirects ` +
  `(${saida.soNoWorker.length} só no Worker, ${saida.aproximadas.length} aproximada(s)); motor do Worker reproduz ${casos.length + esperados.length} casos`);
