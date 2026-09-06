/* ============================================================================
   apis-migradas-check.mjs — AS ROTAS QUE SAÍRAM DO CLIENTE SAÍRAM DE VERDADE
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   As rotas /api que tocam o banco mudaram de casa (backend privado, onde o
   `service_role` do Supabase passa a viver). Essa mudança deixou DUAS listas do
   mesmo conjunto dentro deste repositório:
     · `public/js/apibase.js`      — para onde o JOGO manda cada chamada;
     · `src/pages/api/[rota].ts`   — o que a rede de segurança 307 aceita.
   Listas gêmeas divergem em silêncio. Divergir aqui tem duas caras, as duas
   ruins: rota no cliente e não no redirect faz o cliente antigo receber 404 em
   vez de ser reencaminhado; rota no redirect e não no cliente é uma migração
   que ninguém terminou.

   E cobra o principal: que os arquivos REALMENTE sumiram. Uma rota migrada que
   continua existindo aqui volta a ser servida pela Vercel — com o
   `service_role` junto, que é exatamente o que a migração foi tirar.

   Mutantes: `--mutante=lista-divergente`, `--mutante=rota-ressuscitada`,
   `--mutante=supabase-de-volta`, `--mutante=destinos-divergentes`,
   `--mutante=preview-direto`, `--mutante=proxy-vaza-cookie`.

   Uso: node tools/eval/apis-migradas-check.mjs [--mutante=...]
   ============================================================================ */
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const mut = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (mut && ![
  'lista-divergente', 'rota-ressuscitada', 'supabase-de-volta', 'destinos-divergentes',
  'preview-direto', 'proxy-vaza-cookie',
].includes(mut)) {
  throw new Error(`mutante desconhecido: ${mut}`);
}

let jogo = readFileSync('public/js/apibase.js', 'utf8');
let redirect = readFileSync('src/pages/api/[rota].ts', 'utf8');
let proxy = existsSync('src/lib/api-proxy.mjs') ? readFileSync('src/lib/api-proxy.mjs', 'utf8') : '';
if (mut === 'lista-divergente') jogo = jogo.replace("'telemetry',", '');
if (mut === 'destinos-divergentes') jogo = jogo.replace(/return 'https:\/\/[^']+';/, "return 'https://backend-errado.invalid';");
if (mut === 'preview-direto') jogo = jogo.replace("if (location.hostname?.endsWith('.vercel.app')) return '';", '');
if (mut === 'proxy-vaza-cookie') proxy = proxy.replace(
  'const upstreamHeaders = new Headers();',
  'const upstreamHeaders = new Headers(request.headers);',
);

/* As TRÊS que ficam, e o motivo de cada uma. Esta lista é a documentação executável do
   recorte: acrescentar rota aqui é uma decisão, não um esquecimento. */
const FICAM = {
  'geo-lang.ts': 'lê o país no header da borda da Vercel; fora de lá não há o que ler',
  og: 'cartão social DO SITE; servi-lo de outro domínio faria o compartilhamento depender de uma VM',
  badge: 'crachá DO SITE, mesma razão do og',
};

const lista = (texto, marcador) => {
  const bloco = texto.slice(texto.indexOf(marcador));
  const fim = bloco.indexOf(']');
  return [...bloco.slice(0, fim).matchAll(/'([a-z-]+)'/g)].map((m) => m[1]).sort();
};

const doJogo = lista(jogo, 'const NO_BACKEND = new Set([');
const doRedirect = lista(redirect, 'const MIGRADAS = new Set([');

const falhas = [];
const destinoJogo = jogo.match(/return '(https:\/\/[^']+)'/)?.[1];
const destinoRedirect = redirect.match(/PUBLIC_API_BASE \|\| '(https:\/\/[^']+)'/)?.[1];
if (!destinoJogo || destinoJogo !== destinoRedirect)
  falhas.push(`destinos divergem — jogo: ${destinoJogo || 'ausente'} · redirect: ${destinoRedirect || 'ausente'}`);
if (doJogo.length === 0) falhas.push('a lista do jogo (apibase.js) veio vazia — o parser ou o arquivo mudou');
if (doJogo.join(',') !== doRedirect.join(',')) {
  const soJogo = doJogo.filter((r) => !doRedirect.includes(r));
  const soRedirect = doRedirect.filter((r) => !doJogo.includes(r));
  falhas.push(`listas divergem — só no jogo: [${soJogo}] · só no redirect: [${soRedirect}]`);
}

const importaFonte = async (fonte) => import(`data:text/javascript;base64,${Buffer.from(fonte).toString('base64')}#${Date.now()}-${Math.random()}`);
const locationOriginal = globalThis.location;
try {
  globalThis.location = { search: '', hostname: 'coro-solto-git-fix.vercel.app' };
  const apiPreview = await importaFonte(jogo);
  if (apiPreview.apiUrl('/api/telemetry') !== '/api/telemetry')
    falhas.push('preview da Vercel chama Cloud Run direto — a origem dinâmica fica bloqueada pelo CORS');
} finally {
  if (locationOriginal === undefined) delete globalThis.location;
  else globalThis.location = locationOriginal;
}

if (!proxy) {
  falhas.push('src/lib/api-proxy.mjs ausente — o preview não tem proxy same-origin para as rotas migradas');
} else {
  const { proxyApiRequest } = await importaFonte(proxy);
  let chamada;
  const request = new Request('https://preview.vercel.app/api/telemetry?amostra=1', {
    method: 'POST',
    headers: {
      authorization: 'Bearer nao-repassar', cookie: 'sessao=nao-repassar',
      'content-type': 'application/json', 'x-cliente': 'nao-repassar',
    },
    body: '{"ok":true}',
  });
  const response = await proxyApiRequest(
    request,
    'https://backend.example/api/telemetry?amostra=1',
    '203.0.113.8',
    async (url, init) => {
      chamada = { url, init, body: await new Response(init.body).text() };
      return new Response('{"stored":true}', {
        status: 202,
        headers: { 'content-type': 'application/json', 'set-cookie': 'backend=nao-vazar' },
      });
    },
  );
  const headers = chamada?.init?.headers;
  if (!chamada || chamada.url !== 'https://backend.example/api/telemetry?amostra=1'
      || chamada.init.method !== 'POST' || chamada.body !== '{"ok":true}')
    falhas.push('proxy não preserva destino, método e corpo da chamada');
  if (headers?.get('content-type') !== 'application/json' || headers?.get('x-forwarded-for') !== '203.0.113.8')
    falhas.push('proxy não preserva content-type ou IP confiável fornecido pelo SSR');
  if (headers?.has('authorization') || headers?.has('cookie') || headers?.has('x-cliente'))
    falhas.push('proxy repassa credencial/header arbitrário do navegador para o backend');
  if (response.status !== 202 || await response.text() !== '{"stored":true}')
    falhas.push('proxy não preserva status e corpo da resposta do backend');
  if (response.headers.has('set-cookie'))
    falhas.push('proxy devolve set-cookie do backend ao navegador');
}

/* Sumiram mesmo? */
for (const r of doJogo) {
  const caminho = `src/pages/api/${r}.ts`;
  const existe = mut === 'rota-ressuscitada' && r === 'telemetry' ? true : existsSync(caminho);
  if (existe) falhas.push(`${caminho} ainda existe — a rota migrada voltaria a ser servida pela Vercel, com o service_role junto`);
}

/* O que sobrou é só o recorte declarado, e só o `badge` pode tocar o banco. */
const sobrou = readdirSync('src/pages/api').filter((f) => f !== '[rota].ts');
for (const f of sobrou) {
  if (!(f in FICAM)) falhas.push(`src/pages/api/${f} não está no recorte declarado — decida se ele fica (e diga por quê) ou se migra`);
}
for (const f of sobrou) {
  const alvo = `src/pages/api/${f}`;
  const arquivos = f.endsWith('.ts') ? [alvo] : readdirSync(alvo).map((x) => `${alvo}/${x}`);
  for (const a of arquivos) {
    let src = readFileSync(a, 'utf8');
    if (mut === 'supabase-de-volta' && a.includes('geo-lang')) src += "\nimport { supabaseAdmin } from '../../lib/supabase';\n";
    if (/lib\/supabase/.test(src) && !a.includes('badge')) {
      falhas.push(`${a} importa o supabase — só o badge tem essa exceção declarada`);
    }
  }
}

if (falhas.length) {
  console.error('✗ API1 as rotas migradas e o recorte que ficou não fecham:');
  for (const f of falhas) console.error(`    ${f}`);
  process.exit(1);
}
console.log(`✓ API1 ${doJogo.length} rotas migradas e fora do cliente; ficam ${Object.keys(FICAM).length} (${Object.keys(FICAM).join(', ')})`);
