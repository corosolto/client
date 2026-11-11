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
//   node tools/eval/site-smoke.mjs --mutante=sitemap-index-curto
// Sai 1 se qualquer checagem falhar, então serve de gate no CI sem parser.
// ============================================================================
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';

import { XMLParser, XMLValidator } from 'fast-xml-parser';
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
const BASE = EXTERNO || `http://127.0.0.1:${PORTA}`;

// ---------------------------------------------------------------------------
// O CONTRATO. Uma linha por rota. `checa` recebe { status, corpo, headers }.
// ---------------------------------------------------------------------------
// O smoke local lê o modo do código; um alvo externo pode ter configuração de
// ambiente diferente (por exemplo, produção com ranking ligado). O sitemap
// também pode ser um urlset ou um índice de shards; cada forma tem contrato
// próprio e não deve ser confundida por uma contagem fixa de <loc>.

const CONTRATO = [
  { rota: '/', esperado: '200 + <title> com "CORO SOLTO"',
    checa: ({ status, corpo }) => {
      if (status !== 200) return `status ${status}`;
      const t = corpo.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (!t) return 'sem <title>';
      if (!t[1].includes('CORO SOLTO')) return `<title> = ${JSON.stringify(t[1].trim().slice(0, 60))}`;
      return null;
    } },

  // /ranking é a aba RANKING do hub, numa cópia estática com head próprio (ADR 0008).
  // Antes era um 302 para a comunidade; o recado de degradação vive em ranking-home-status.mjs.
  { rota: '/ranking', esperado: '200 + hub com canonical /ranking (nunca 500)',
    checa: ({ status, corpo }) => {
      if (status >= 500) return `status ${status} — é exatamente o que este portão existe pra pegar`;
      if (status !== 200) return `status ${status}`;
      if (!/<link rel="canonical" href="https:\/\/www\.corosolto\.com\.br\/ranking"/.test(corpo)) return 'sem canonical /ranking';
      if (!corpo.includes('id="hub-ranking"')) return 'não é o hub (sem #hub-ranking)';
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
  { rota: '/sitemap.xml', esperado: '200 + XML válido (urlset ou índice)',
    checa: ({ status, corpo }) => {
      if (status !== 200) return `status ${status}`;
      if (!/^\s*<\?xml[^>]*>\s*<(sitemapindex|urlset)\b[^>]*>/i.test(corpo))
        return 'raiz XML não é <urlset> nem <sitemapindex>';
      const validacao = XMLValidator.validate(corpo);
      if (validacao !== true) return `XML malformado: ${validacao.err.msg}`;
      let arvore;
      try {
        arvore = new XMLParser({
          ignoreDeclaration: true,
          ignoreAttributes: false,
          isArray: (nome) => nome === 'url' || nome === 'sitemap',
        }).parse(corpo);
      } catch (erro) {
        return `XML não pode ser parseado: ${erro.message}`;
      }
      const raizes = Object.keys(arvore).filter((nome) => nome === 'urlset' || nome === 'sitemapindex');
      if (raizes.length !== 1) return 'XML precisa ter uma raiz <urlset> ou <sitemapindex>';
      const raiz = raizes[0];
      const itens = arvore[raiz]?.[raiz === 'sitemapindex' ? 'sitemap' : 'url'];
      if (!Array.isArray(itens) || !itens.length) return `<${raiz}> sem itens`;
      const semLoc = itens.findIndex((item) => typeof item.loc !== 'string' || !item.loc.trim());
      if (semLoc !== -1) return `<${raiz}> item ${semLoc + 1} sem <loc>`;
      if (raiz === 'sitemapindex') {
        // sitemap.ts só usa índice quando total > 5000; nesse caso há pelo menos dois shards.
        if (itens.length < 2) return `${itens.length} <sitemap>, mínimo 2 no índice`;
      } else {
        const minimo = EXTERNO ? 8 : (RANKING_ON ? 9 : 8);
        if (itens.length < minimo) return `${itens.length} <url>, mínimo ${minimo} no urlset`;
      }
      return null;
    } },

  ...['/robots.txt', '/llms.txt'].map((rota) => ({
    rota, esperado: '200',
    checa: ({ status }) => (status === 200 ? null : `status ${status}`),
  })),

  /* A rota migrada passa pelo proxy same-origin para previews dinâmicos não dependerem de
     CORS. No CI, o upstream é o stub local abaixo; nunca a rede ou o backend publicado. */
  { rota: '/api/leaderboard',
    esperado: EXTERNO
      ? '200 + JSON em um dos modos publicados'
      : '200 + JSON do backend via proxy same-origin',
    checa: ({ status, corpo, headers }) => {
      if (status !== 200) return `status ${status}`;
      if (!/application\/json/i.test(headers.get('content-type') || '')) return 'content-type não é JSON';
      let payload;
      try { payload = JSON.parse(corpo); } catch { return 'corpo não é JSON válido'; }
      const modoValido = payload.disabled === true || Array.isArray(payload.players);
      if (EXTERNO ? !modoValido : (RANKING_ON ? !Array.isArray(payload.players) : payload.disabled !== true))
        return `contrato inesperado: ${JSON.stringify(payload).slice(0, 120)}`;
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
  let corpo = await r.text();
  // --mutante: fecha <loc> com a tag errada para provar que o parser morde.
  if (MUTANTE === 'sitemap-malformado' && rota === '/sitemap.xml') {
    corpo = corpo.replace(/<\/loc>/i, '</url>');
  }
  // --mutante: remove um shard para provar o mínimo do sitemapindex.
  if (MUTANTE === 'sitemap-index-curto' && rota === '/sitemap.xml') {
    corpo = corpo.replace(/<sitemap>[\s\S]*?<\/sitemap>/i, '');
  }
  return { status: r.status, corpo, headers: r.headers };
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
let serverProcess = null;
let serverReady = false;
let serverOutput = '';
let upstream = null;
const PORTA_UPSTREAM = 4326;
async function noAr(ms = 90_000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    if (serverProcess?.exitCode !== null || serverProcess?.signalCode) return false;
    if (serverReady) {
      try { const r = await fetch(BASE + '/robots.txt', { signal: AbortSignal.timeout(2_000) }); if (r.status) return true; } catch { /* ainda não */ }
    }
    await new Promise((r) => setTimeout(r, 700));
  }
  return false;
}
async function sobeServidor() {
  if (EXTERNO) return true;
  upstream = createServer((req, res) => {
    if (!req.url?.startsWith('/api/leaderboard')) {
      res.writeHead(404).end();
      return;
    }
    const payload = MUTANTE === 'proxy-sem-corpo'
      ? {}
      : RANKING_ON ? { players: [] } : { disabled: true };
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'public, max-age=300' });
    res.end(JSON.stringify(payload));
  });
  await new Promise((resolve, reject) => {
    upstream.once('error', reject);
    upstream.listen(PORTA_UPSTREAM, '127.0.0.1', resolve);
  });
  // API sem daemon/lock; strictPort + handshake impedem medir outro checkout na mesma porta.
  const startup = `import { dev } from 'astro'; await dev({ server: { host: '127.0.0.1', port: ${PORTA} }, vite: { server: { strictPort: true } } }); console.log('CSBRASIL_SMOKE_READY');`;
  serverProcess = spawn(process.execPath, ['--input-type=module', '-e', startup], {
    stdio: ['ignore', 'pipe', 'pipe'], detached: false,
    env: { ...process.env, PUBLIC_API_BASE: `http://127.0.0.1:${PORTA_UPSTREAM}` },
  });
  const record = chunk => {
    serverOutput = (serverOutput + chunk.toString()).slice(-4_000);
    if (serverOutput.includes('CSBRASIL_SMOKE_READY')) serverReady = true;
  };
  serverProcess.stdout.on('data', record);
  serverProcess.stderr.on('data', record);
  serverProcess.on('error', error => { serverOutput += String(error); });
  subiuAqui = true;
  return noAr();
}
async function derrubaServidor() {
  if (subiuAqui && serverProcess?.exitCode === null && !serverProcess.signalCode) {
    const stopped = new Promise((resolve) => serverProcess.once('exit', resolve));
    serverProcess.kill('SIGTERM');
    const timer = setTimeout(() => serverProcess.kill('SIGKILL'), 2_000);
    await stopped;
    clearTimeout(timer);
  }
  upstream?.close();
}

// ---------------------------------------------------------------------------
const resultados = [];
try {
  if (!(await sobeServidor())) {
    throw new Error(`SMOKE0: o servidor próprio não subiu em ${BASE} (até 90 s de espera). ${serverOutput.slice(-800)}`);
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
  await derrubaServidor();
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
