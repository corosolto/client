#!/usr/bin/env node
// ============================================================================
// SMOKE DO SITE — portão de contrato das rotas.
//
// POR QUE ISTO EXISTE
// O CI tem quatro portões excelentes para o JOGO e um `astro build` para o site.
// Build verde não prova nada sobre o site: `/ranking` pode dar 500 por causa de
// uma coluna renomeada, `/sitemap.xml` pode sair vazio, `/u/*` pode entrar em
// loop de redirect — e o build fica verde nos três casos. Este arnês fecha esse
// buraco: bate em cada rota e checa CONTRATO, não aparência.
//
// O caminho testado é o de DEGRADAÇÃO: sem Supabase configurado, que é o estado
// do CI. É justamente o caminho que ninguém exercita à mão, e onde um 500 passa
// meses sem ser notado — a página só quebra pra quem clona o repo ou pra um
// deploy com env faltando.
//
// SOBRE O SERVIDOR
// Mais da metade do contrato é SSR (`/ranking`, `/sitemap.xml`, `/api/*`, o 404),
// então `npm run preview` — que é `python3 -m http.server -d dist/client` — não
// serve: ele só tem os 7 HTML pré-renderizados. Por isso este script sobe o
// `astro dev` sozinho e o derruba no fim. Se você já tem um alvo no ar (um
// preview da Vercel, por exemplo), passe SITE_URL e ele usa o seu.
//
// DIFERENÇA CONHECIDA: dev não minifica e não passa pelos headers do
// `vercel.json` (CSP, HSTS, cache). Este arnês checa contrato de rota — status,
// corpo, JSON-LD válido —, nada que dependa de header de CDN. Se um dia precisar
// checar CSP, aponte SITE_URL pro preview da Vercel.
//
// USO
//   node tools/eval/site-smoke.mjs                  # sobe o astro dev sozinho
//   SITE_URL=https://... node tools/eval/site-smoke.mjs
//   node tools/eval/site-smoke.mjs --json
//   node tools/eval/site-smoke.mjs --mutante=jsonld # prova que o portão morde
//
// Sai 1 se qualquer checagem falhar, então serve de gate no CI sem parser.
// ============================================================================
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// O CONTRATO DEPENDE DE UMA FLAG. `RANKING_ON` (src/lib/site.ts) muda o que
// duas rotas devem responder, e a issue #45 escreveu o contrato assumindo ela
// ligada. Hardcodar um dos dois estados deixaria o portão errado metade do
// tempo — e errado do pior jeito: vermelho por engano quando alguém religar o
// ranking, o que treina a equipe a ignorar o portão. Então lemos a flag.
// Leitura por regex, não import: o arquivo é .ts e este arnês roda em node puro.
const RANKING_ON = /export const RANKING_ON\s*=\s*true/.test(
  readFileSync(new URL('../../src/lib/site.ts', import.meta.url), 'utf8'),
);

const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const MUTANTE = (args.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || null;
const PORTA = 4325;
const EXTERNO = process.env.SITE_URL || null;
const BASE = EXTERNO || `http://localhost:${PORTA}`;

// ---------------------------------------------------------------------------
// O CONTRATO. Uma linha por rota. `checa` recebe { status, corpo, headers }.
// ---------------------------------------------------------------------------
// 8 páginas indexáveis hoje; /ranking entra na conta só com o ranking ligado —
// desligado ele é noindex (ranking.astro), e noindex no sitemap é contradição.
const XML_LOC_MIN = RANKING_ON ? 9 : 8;

const CONTRATO = [
  { rota: '/', esperado: '200 + <title> com "CORO SOLTO"',
    checa: ({ status, corpo }) => {
      if (status !== 200) return `status ${status}`;
      const t = corpo.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (!t) return 'sem <title>';
      if (!t[1].includes('CORO SOLTO')) return `<title> = ${JSON.stringify(t[1].trim().slice(0, 60))}`;
      return null;
    } },

  // O contrato da issue #45 pedia o texto "não configurado". Hoje RANKING_ON
  // (src/lib/site.ts) é false, então a página responde com o aviso de
  // "desligado durante o alpha" — outro texto, MESMA propriedade: degrada com
  // recado em vez de estourar. Aceita os dois; o que não passa é 500.
  { rota: '/ranking', esperado: '200 + aviso de degradação (nunca 500)',
    checa: ({ status, corpo }) => {
      if (status >= 500) return `status ${status} — é exatamente o que este portão existe pra pegar`;
      if (status !== 200) return `status ${status}`;
      const avisos = ['não configurado', 'desligado', 'Ainda ninguém na arena'];
      if (!avisos.some((a) => corpo.includes(a)))
        return `200 mas sem nenhum aviso de degradação (${avisos.map((a) => JSON.stringify(a)).join(' | ')})`;
      return null;
    } },

  /* `/mapa` (singular, o mapa AO VIVO) entrou em 12/08. Ele não estava nesta lista, e a
     página passou um dia devolvendo 200 com 0 bytes sem nenhum portão reclamar — o dono
     achou jogando. `/mapas` (plural, a listagem) estava e continua.

     E o corpo é cobrado por TAMANHO, não só por status: era exatamente 200 com casca
     vazia, então `status === 200` teria passado verde no defeito que motivou a inclusão.
     Vale dizer o limite desta cláusula aqui: este arnês mede o `astro dev` local, onde
     `public/js` existe e o defeito não pode acontecer. Quem mede o artefato publicado é
     `npm run eval:ssr`. Esta linha pega a próxima página que quebrar por outro motivo;
     ela não teria pego aquela. */
  ...['/como-jogar', '/mapas', '/mapa', '/armas', '/personagens', '/sobre', '/changelog'].map((rota) => ({
    rota, esperado: '200 + corpo não vazio',
    checa: ({ status, corpo }) => {
      if (status !== 200) return `status ${status}`;
      if ((corpo || '').length < 500) return `200 com corpo de ${(corpo || '').length} bytes — casca vazia`;
      return null;
    },
  })),

  { rota: '/sitemap.xml', esperado: `200 + XML válido + >= ${XML_LOC_MIN} <loc>`,
    checa: ({ status, corpo }) => {
      if (status !== 200) return `status ${status}`;
      if (!/^\s*<\?xml/.test(corpo)) return 'não começa com declaração XML';
      const locs = corpo.match(/<loc>/g) || [];
      if (locs.length < XML_LOC_MIN) return `${locs.length} <loc>, mínimo ${XML_LOC_MIN}`;
      // XML mal formado é o modo de falha silenciosa aqui: um & solto derruba o
      // parse de quem consome e o status continua 200.
      const abertas = (corpo.match(/<url>/g) || []).length;
      const fechadas = (corpo.match(/<\/url>/g) || []).length;
      if (abertas !== fechadas) return `<url> desbalanceado: ${abertas} abre, ${fechadas} fecha`;
      const amp = corpo.match(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-f]+;)/i);
      if (amp) return `& não escapado perto de ${JSON.stringify(corpo.slice(Math.max(0, amp.index - 30), amp.index + 30))}`;
      return null;
    } },

  ...['/robots.txt', '/llms.txt'].map((rota) => ({
    rota, esperado: '200',
    checa: ({ status }) => (status === 200 ? null : `status ${status}`),
  })),

  /* MIGRADA (PR #462): /api/leaderboard mora no corosolto/backend; o que o CLIENTE
     serve aqui é a rede de segurança de src/pages/api/[rota].ts — 307 para o backend,
     preservando método e corpo, para quem ainda tem o JS antigo em cache (docs/APIS.md).
     O contrato de resposta ({disabled:true} / 503 not_configured) viajou com a rota e é
     medido lá. `redirect: 'manual'` de propósito: seguir o 307 faria este portão medir
     a REDE do CI (DNS do backend) em vez do contrato do cliente. */
  { rota: '/api/leaderboard', redirect: 'manual',
    esperado: '307 -> backend/api/leaderboard (rede de segurança da rota migrada)',
    checa: ({ status, headers }) => {
      if (status !== 307) return `status ${status} (esperado 307 da rede de segurança)`;
      const loc = headers.get('location') || '';
      if (!/^https?:\/\/[^/]+\/api\/leaderboard(?:$|\?)/.test(loc)) return `Location = ${JSON.stringify(loc)}`;
      if ((headers.get('cache-control') || '') !== 'no-store') return `cache-control = ${JSON.stringify(headers.get('cache-control'))} — 307 cacheado prende o cliente na rota antiga`;
      return null;
    } },

  { rota: '/naoexiste', esperado: '404',
    checa: ({ status }) => (status === 404 ? null : `status ${status}`),
  },
];

// Páginas que precisam ter todo bloco JSON-LD parseável. JSON-LD quebrado é
// invisível: some do resultado rico e ninguém percebe por meses.
const PAGINAS_JSONLD = ['/', '/ranking', '/como-jogar', '/mapas', '/armas', '/personagens', '/sobre', '/changelog'];

// ---------------------------------------------------------------------------
const RE_JSONLD = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

async function pegar(rota, redirect = 'follow') {
  const r = await fetch(BASE + rota, { redirect });
  return { status: r.status, corpo: await r.text(), headers: r.headers };
}

function checaJsonLd(rota, corpo) {
  let m, n = 0;
  const erros = [];
  RE_JSONLD.lastIndex = 0;
  while ((m = RE_JSONLD.exec(corpo))) {
    n++;
    let bruto = m[1].trim();
    // --mutante: corrompe o primeiro bloco pra provar que o portão morde
    if (MUTANTE === 'jsonld' && rota === '/' && n === 1) bruto = bruto.replace(/}\s*$/, '');
    try {
      const j = JSON.parse(bruto);
      if (j == null || (typeof j !== 'object')) erros.push(`bloco ${n}: parseou mas não é objeto`);
    } catch (e) {
      erros.push(`bloco ${n}: ${String(e.message).slice(0, 90)}`);
    }
  }
  return { n, erros };
}

// ---------------------------------------------------------------------------
// servidor
// ---------------------------------------------------------------------------
let subiuAqui = false;
async function noAr(ms = 90_000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    try { const r = await fetch(BASE + '/robots.txt'); if (r.status) return true; } catch { /* ainda não */ }
    await new Promise((r) => setTimeout(r, 700));
  }
  return false;
}
async function sobeServidor() {
  if (EXTERNO) return true;
  // `astro dev` daemoniza e o processo lançador sai — não dá pra segurar o pid.
  // Quem derruba é `astro dev stop`, no finally.
  spawn('npx', ['astro', 'dev', '--port', String(PORTA)], { stdio: 'ignore', detached: false })
    .on('error', () => {});
  subiuAqui = true;
  return noAr();
}
function derrubaServidor() {
  if (!subiuAqui) return;
  spawnSync('npx', ['astro', 'dev', 'stop'], { stdio: 'ignore' });
}

// ---------------------------------------------------------------------------
const resultados = [];
try {
  if (!(await sobeServidor())) {
    console.error(`✗ SMOKE0  o site não subiu em ${BASE} (90 s de espera)`);
    process.exit(1);
  }

  for (const c of CONTRATO) {
    let falha = null;
    try {
      const res = await pegar(c.rota, c.redirect);
      falha = c.checa(res);
      if (!falha && PAGINAS_JSONLD.includes(c.rota) && /text\/html/i.test(res.headers.get('content-type') || '')) {
        const { n, erros } = checaJsonLd(c.rota, res.corpo);
        if (erros.length) falha = `JSON-LD inválido (${n} bloco(s)): ${erros.join(' · ')}`;
        else c.jsonld = n;
      }
    } catch (e) {
      falha = `erro de rede: ${String(e.message).slice(0, 80)}`;
    }
    resultados.push({ rota: c.rota, esperado: c.esperado, jsonld: c.jsonld ?? null, ok: !falha, motivo: falha });
  }
} finally {
  derrubaServidor();
}

const falhas = resultados.filter((r) => !r.ok);

if (JSON_OUT) {
  console.log(JSON.stringify({ base: BASE, mutante: MUTANTE, total: resultados.length, falhas: falhas.length, resultados }, null, 2));
} else {
  console.log('\n=============== SMOKE DO SITE — CORO SOLTO ===============');
  console.log(`alvo: ${BASE}${EXTERNO ? ' (externo, via SITE_URL)' : ' (astro dev, subido por este script)'}`);
  console.log(`RANKING_ON: ${RANKING_ON} (src/lib/site.ts) — muda o contrato do sitemap (/api/leaderboard migrou pro backend, PR #462)`);
  if (MUTANTE) console.log(`MUTANTE ATIVO: ${MUTANTE} — este run DEVE falhar`);
  console.log('');
  for (const r of resultados) {
    const marca = r.ok ? '✓ PASSA ' : '✗ FALHA ';
    const ld = r.jsonld ? `  [${r.jsonld} JSON-LD ok]` : '';
    console.log(`${marca} ${r.rota.padEnd(18)} ${r.esperado}${ld}`);
    if (!r.ok) console.log(`${' '.repeat(9)}└─ ${r.motivo}`);
  }
  console.log('\n----------------------------------------------------------');
  console.log(`${resultados.length - falhas.length}/${resultados.length} rotas cumprem o contrato` +
    (falhas.length ? `  ← ${falhas.map((r) => r.rota).join(', ')} VERMELHAS` : '  ← tudo verde'));
  console.log('----------------------------------------------------------\n');
}

process.exit(falhas.length ? 1 : 0);
