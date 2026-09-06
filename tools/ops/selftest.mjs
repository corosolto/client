#!/usr/bin/env node
/* ============================================================================
   selftest.mjs — A DIAGNOSE MORDE? (lei 3 da casa: régua sem mutação não existe)
   ----------------------------------------------------------------------------
   Sobe uma "produção" sintética num servidor local — HTML com import map,
   módulos com import/export de verdade, version.js, /api/*, /ranking e assets
   com cabeçalho glTF — a partir de uma árvore-fixture descartável, e injeta
   UMA falha por cenário: export arrancado, módulo 404, versão divergente,
   main.js servido como HTML, banco fora, 503 intermitente, GLB em 404, GLB que
   é HTML, flag de ranking incoerente, CSP ausente, raiz lenta… Para cada um,
   a diagnose tem de produzir o ACHADO com o id e a severidade esperados; para o
   cenário `saudavel`, tem de sair TECNICAMENTE VERDE sem nenhum achado ≥ médio.

   A partida sintética usa a árvore REAL (o Game não cabe em fixture) com um
   mapa só; `OPS_MUTANTE=partida-quebrada` prova que crash no update vira
   achado crítico com mapa e stack.

   Toda mutação tem de falhar se não aplicou (docs/LICOES.md §8): cada cenário
   confere que o sinal existe ANTES de conferir o achado. Se um mutante não
   acende, o processo sai 1 — portão cego é vermelho, nunca verde (MC1).

   Uso: node tools/ops/selftest.mjs [--so=<cenario>] [--verboso]
   ============================================================================ */
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sondaBootRemoto, sondaBootLocal } from './probes/boot.mjs';
import { sondaApi } from './probes/api.mjs';
import { sondaRanking } from './probes/ranking.mjs';
import { sondaAssetsRemoto, sondaAssetsLocal } from './probes/assets.mjs';
import { sondaPartidas } from './probes/match.mjs';
import { sondaNavegador, carregaPlaywright } from './probes/browser.mjs';
import { explicar } from './lib/explain.mjs';
import { veredito } from './lib/report.mjs';
import { RAIZ_PADRAO } from './lib/repo.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SO = (process.argv.find((a) => a.startsWith('--so=')) || '').split('=')[1] || '';
const VERBOSO = process.argv.includes('--verboso');
const V = '9.9.9-teste.1';

/* ---------- fixture: a menor árvore que as sondas locais aceitam ---------- */
function fixture(cenario) {
  const raiz = mkdtempSync(join(tmpdir(), 'csbr-ops-'));
  const w = (rel, corpo) => { const abs = join(raiz, rel); mkdirSync(dirname(abs), { recursive: true }); writeFileSync(abs, corpo); };
  const glb = (n) => Buffer.concat([Buffer.from('glTF'), Buffer.alloc(n - 4, 7)]);
  w('package.json', JSON.stringify({ name: 'fixture', version: V, type: 'module' }));
  w('public/js/version.js', `export const VERSION = '${cenario === 'versao-local-desincronizada' ? '9.9.9-teste.0' : V}';\n`);
  w('public/js/weapons.js', "export const WEAPON_IDS = ['ak', 'awp'];\n");
  w('public/js/apibase.js', "const NO_BACKEND = new Set(['health', 'online', 'map-plays', 'leaderboard']);\nconst BASE = (() => { return 'https://backend.invalido'; })();\n");
  w('public/js/main.js', cenario === 'boot-navegador-morto'
    ? "throw new ReferenceError(\"Cannot access 'testMode' before initialization\");\n"
    : "import { foo } from './dep.js';\nimport { VERSION } from './version.js';\nfoo(VERSION);\nwindow.__CS_MAIN_READY__ = true;\nconst b = document.getElementById('btn-jogar'); if (b) b.onclick = () => {};\n");
  w('public/js/dep.js', cenario === 'grafo-local-incoerente' ? 'export const bar = 1;\n' : 'export function foo() {}\n');
  w('public/js/ops.js', readFileSync(join(RAIZ_PADRAO, 'public/js/ops.js')));
  w('src/lib/site.ts', `export const RANKING_ON = ${cenario === 'ranking-desligado-com-flag' ? 'true' : 'false'};\n`);
  w('src/pages/index.astro', cenario === 'index-astro-sem-boot' ? '<html></html>' : `<link rel="stylesheet" href="/style.css?v=${V}"><script type="importmap"></script><script src="/js/ops.js?v=${V}-x" type="module"></script><script src="/js/main.js?v=${V}-x" type="module"></script>navigator.sendBeacon('/api/jserror')`);
  if (cenario !== 'asset-local-faltando') w('public/models/weapons/awp.glb', glb(300));
  w('public/models/weapons/ak.glb', cenario === 'asset-local-corrompido' ? Buffer.from('version https://git-lfs.github.com/spec/v1\n') : glb(200));
  w('public/models/anims/index.json', '{"a":1}');
  w('public/models/anims/foot-offsets.json', '{}');
  w('public/vendor/three.module.js', 'export const REVISION = "160";\n');
  w('public/style.css', 'body{}');
  mkdirSync(join(raiz, 'scripts'), { recursive: true }); mkdirSync(join(raiz, 'tools/eval'), { recursive: true });
  copyFileSync(join(RAIZ_PADRAO, 'scripts/module-cache.mjs'), join(raiz, 'scripts/module-cache.mjs'));
  copyFileSync(join(RAIZ_PADRAO, 'tools/eval/prod-coherence.mjs'), join(raiz, 'tools/eval/prod-coherence.mjs'));
  return raiz;
}

/* ---------- a "produção" sintética, com a falha do cenário ---------- */
function servidor(cenario, raiz) {
  const chamadas = {};
  const html = `<!doctype html><html><head><link rel="stylesheet" href="/style.css?v=${V}"><script type="importmap">${JSON.stringify({ imports: { './js/main.js': `./js/main.js?v=${V}-x`, './js/dep.js': `./js/dep.js?v=${V}-x`, './js/version.js': `./js/version.js?v=${V}-x`, './js/ops.js': `./js/ops.js?v=${V}-x` } })}</script></head><body><div id="btn-jogar"></div><script type="module" src="/js/ops.js?v=${V}-x"></script><script type="module" src="/js/main.js?v=${V}-x"></script></body></html>`;
  const saude = { ok: true, service: 'fixture', database: true, telemetrySchema: true, fresh: true, stale: [], never: [], operationalFresh: true, operationalStale: [], operationalNever: [] };
  if (cenario === 'banco-fora') saude.database = false;
  if (cenario === 'schema-telemetria') saude.telemetrySchema = false;
  if (cenario === 'mp-sem-heartbeat') { saude.operationalFresh = false; saude.operationalStale = ['eu']; }
  if (cenario === 'pipeline-nunca-gravou') saude.never = ['perf'];
  if (cenario === 'pipelines-parados') { saude.fresh = false; saude.stale = ['match']; }
  const srv = createServer((req, res) => {
    const caminho = req.url.split('?')[0];
    chamadas[caminho] = (chamadas[caminho] || 0) + 1;
    const n = chamadas[caminho];
    const envia = (status, corpo, headers = {}) => { res.writeHead(status, headers); res.end(corpo); };
    const csp = cenario === 'sem-csp' ? {} : { 'content-security-policy': "default-src 'self'" };
    if (caminho === '/') { const f = () => envia(200, cenario === 'html-sem-importmap' ? '<!doctype html><html><body>manutencao</body></html>' : html, { 'content-type': 'text/html', ...csp }); return cenario === 'html-lento' ? setTimeout(f, 2700) : cenario === 'html-nao-200' ? envia(500, 'erro') : f(); }
    if (caminho === '/js/main.js') return cenario === 'main-js-indisponivel' ? envia(404, '') : cenario === 'main-js-e-html' ? envia(200, '<!doctype html><html>404</html>', { 'content-type': 'text/html' }) : envia(200, readFileSync(join(raiz, 'public/js/main.js')), { 'content-type': 'text/javascript', 'access-control-allow-origin': '*' });
    if (caminho === '/js/dep.js') return cenario === 'modulo-404' ? envia(404, '') : envia(200, cenario === 'export-sumido' ? 'export const bar = 1;\n' : readFileSync(join(raiz, 'public/js/dep.js')), { 'content-type': 'text/javascript' });
    if (caminho === '/js/version.js') return envia(200, `export const VERSION = '${cenario === 'versao-divergente' ? '9.9.9-teste.0' : V}';\n`, { 'content-type': 'text/javascript' });
    if (caminho === '/js/ops.js') return envia(200, readFileSync(join(raiz, 'public/js/ops.js')), { 'content-type': 'text/javascript' });
    if (caminho === '/api/health') return cenario === 'health-indisponivel' ? envia(503, 'down') : envia(200, JSON.stringify(saude), { 'content-type': 'application/json' });
    if (caminho === '/api/online') {
      if (cenario === 'rota-intermitente' && n % 2 === 1) return envia(503, 'cold');
      if (cenario === 'rota-fora') return envia(503, 'down');
      const f = () => envia(200, JSON.stringify({ online: cenario === 'pipelines-parados' ? 4 : 1, presence: 1, inGame: 0, nodesAvailable: 3, nodesTotal: 3 }), { 'content-type': 'application/json' });
      return cenario === 'latencia-api' ? setTimeout(f, 2100) : f();
    }
    if (caminho === '/api/map-plays') return envia(200, '{"plays":{}}', { 'content-type': 'application/json' });
    if (caminho === '/api/leaderboard') return envia(200, cenario === 'ranking-ligado-sem-flag' ? JSON.stringify({ players: [{ nick: 'a' }] }) : '{"disabled":true}', { 'content-type': 'application/json' });
    if (caminho.startsWith('/api/')) return envia(cenario === 'rede-seguranca-rota-desconhecida' ? 200 : 404, JSON.stringify({ error: 'not_found', path: caminho }), { 'content-type': 'application/json' });
    if (caminho === '/ranking') return cenario === 'pagina-ranking-quebrada' ? envia(500, 'erro') : cenario === 'pagina-ranking-vazia' ? envia(200, '') : envia(200, '<html><head><meta name="robots" content="noindex"></head><body>ranking</body></html>', { 'content-type': 'text/html' });
    if (caminho === '/models/weapons/ak.glb' && cenario === 'asset-404') return envia(404, '');
    if (caminho === '/models/weapons/ak.glb' && cenario === 'asset-conteudo-errado') return envia(200, '<!doctype html><html>nope</html>', { 'content-type': 'text/html' });
    const abs = join(raiz, 'public', caminho);
    let corpo; try { corpo = readFileSync(abs); } catch { return envia(404, ''); }
    if (caminho === '/models/weapons/ak.glb' && cenario === 'asset-tamanho-diverge') corpo = Buffer.concat([corpo, Buffer.alloc(50, 1)]);
    if (caminho === '/models/weapons/ak.glb' && cenario === 'asset-erro-http') return envia(503, 'edge');
    const range = /bytes=(\d+)-(\d+)/.exec(req.headers.range || '');
    if (range) { const a = Number(range[1]); const b = Math.min(Number(range[2]), corpo.length - 1); return envia(206, corpo.subarray(a, b + 1), { 'content-range': `bytes ${a}-${b}/${corpo.length}`, 'content-type': 'application/octet-stream' }); }
    return envia(200, corpo, { 'content-type': 'application/octet-stream' });
  });
  return new Promise((f) => srv.listen(0, '127.0.0.1', () => f({ base: `http://127.0.0.1:${srv.address().port}`, fechar: () => new Promise((g) => srv.close(g)), chamadas })));
}

/* ---------- cenários: id do achado esperado + severidade ---------- */
const CENARIOS = {
  saudavel: null,
  'export-sumido': ['grafo-incoerente', 'critico'],
  'modulo-404': ['grafo-incoerente', 'critico'],
  'versao-divergente': ['versao-divergente', 'alto'],
  'main-js-indisponivel': ['main-js-indisponivel', 'critico'],
  'main-js-e-html': ['main-js-e-html', 'critico'],
  'html-sem-importmap': ['html-sem-importmap', 'critico'],
  'html-nao-200': ['html-nao-200', 'critico'],
  'html-lento': ['html-lento', 'medio'],
  'sem-csp': ['sem-csp', 'aviso'],
  'health-indisponivel': ['health-indisponivel', 'critico'],
  'banco-fora': ['banco-fora', 'critico'],
  'schema-telemetria': ['schema-telemetria', 'alto'],
  'mp-sem-heartbeat': ['mp-sem-heartbeat', 'alto'],
  'pipeline-nunca-gravou': ['pipeline-nunca-gravou', 'alto'],
  'pipelines-parados': ['pipelines-parados', 'aviso'],
  'rota-intermitente': ['rota-intermitente:online', 'medio'],
  'rota-fora': ['rota-fora:online', 'alto'],
  'latencia-api': ['latencia-api:online', 'medio'],
  'rede-seguranca-rota-desconhecida': ['rede-seguranca-rota-desconhecida', 'medio'],
  'ranking-ligado-sem-flag': ['ranking-ligado-sem-flag', 'medio'],
  'ranking-desligado-com-flag': ['ranking-desligado-com-flag', 'alto'],
  'pagina-ranking-quebrada': ['pagina-ranking-quebrada', 'alto'],
  'pagina-ranking-vazia': ['pagina-ranking-vazia', 'alto'],
  'asset-404': ['asset-404', 'alto'],
  'asset-conteudo-errado': ['asset-conteudo-errado', 'alto'],
  'asset-tamanho-diverge': ['asset-tamanho-diverge', 'medio'],
  'asset-erro-http': ['asset-erro-http', 'medio'],
  'versao-local-desincronizada': ['versao-local-desincronizada', 'alto'],
  'index-astro-sem-boot': ['index-astro-sem-boot', 'critico'],
  'grafo-local-incoerente': ['grafo-local-incoerente', 'critico'],
  'asset-local-faltando': ['asset-local-faltando', 'critico'],
  'asset-local-corrompido': ['asset-local-corrompido', 'alto'],
};

async function rodaCenario(cenario) {
  const raiz = fixture(cenario);
  const s = await servidor(cenario, raiz);
  try {
    const [boot, api, ranking] = await Promise.all([
      sondaBootRemoto(s.base, { raiz, timeoutMs: 8000 }),
      sondaApi(s.base, { backend: s.base, repeticoes: 4, pausaMs: 0, timeoutMs: 8000 }),
      sondaRanking(s.base, { backend: s.base, raiz, timeoutMs: 8000 }),
    ]);
    const assets = boot.html?.status === 200 ? await sondaAssetsRemoto(s.base, { raiz, versao: V, compararTamanho: true, timeoutMs: 8000 }) : null;
    const bootLocal = await sondaBootLocal({ raiz });
    const assetsLocal = sondaAssetsLocal({ raiz });
    const sondas = { contexto: { versaoLocal: V }, boot, api, ranking, assets, bootLocal, assetsLocal };
    return { sondas, achados: explicar(sondas) };
  } finally {
    await s.fechar();
    rmSync(raiz, { recursive: true, force: true });
  }
}

const falhas = [];
const ok = (msg) => console.log(`  ✓ ${msg}`);
const ruim = (msg) => { falhas.push(msg); console.error(`  ✗ ${msg}`); };
const t0 = Date.now();

for (const [cenario, esperado] of Object.entries(CENARIOS)) {
  if (SO && SO !== cenario) continue;
  const { sondas, achados } = await rodaCenario(cenario);
  const graves = achados.filter((a) => ['critico', 'alto', 'medio', 'inconclusivo'].includes(a.severidade));
  if (VERBOSO) console.log(`  · ${cenario}: ${achados.map((a) => `${a.id}[${a.severidade}]`).join(' ') || 'nenhum achado'}`);
  if (!esperado) {
    const v = veredito(achados, sondas);
    if (!v.tecnicamenteVerde || graves.length) ruim(`'saudavel' devia sair tecnicamente verde sem achado ≥ médio; saiu: ${graves.map((a) => `${a.id}[${a.severidade}]`).join(' ') || v.motivos.join('; ')}`);
    else ok(`'saudavel' → tecnicamente verde (${achados.length} achado(s) só info/aviso: ${achados.map((a) => a.id).join(', ') || 'nenhum'})`);
    continue;
  }
  const [id, sev] = esperado;
  const a = achados.find((x) => x.id === id);
  if (!a) ruim(`MUTAÇÃO '${cenario}' não acendeu '${id}' — portão cego. Achados: ${achados.map((x) => x.id).join(', ') || 'nenhum'}`);
  else if (a.severidade !== sev) ruim(`'${cenario}' acendeu '${id}' como ${a.severidade}, esperado ${sev}`);
  else if (!a.causa || !a.evidencia || !a.impacto || !a.proximo) ruim(`'${cenario}' acendeu '${id}' sem causa/evidência/impacto/próximo passo completos`);
  else ok(`'${cenario}' → ${id} [${sev}]`);
}

/* navegador: só quando há Playwright + Chromium; sem eles, PULADO com aviso (ambiente, não repo) */
if (!SO || SO === 'navegador') {
  const pw = await carregaPlaywright();
  if (!pw.chromium) console.log(`  · navegador pulado: ${(pw.tentativas || []).slice(0, 2).join(' · ') || 'sem Playwright'}`);
  else {
    for (const [cenario, esperado] of [['saudavel', null], ['boot-navegador-morto', ['boot-navegador-morto', 'critico']]]) {
      const raiz = fixture(cenario);
      const s = await servidor(cenario, raiz);
      try {
        const nav = await sondaNavegador(s.base, { timeoutMs: 20_000, partida: false });
        if (nav.indisponivel) { console.log(`  · navegador pulado: ${nav.motivo}`); break; }
        const achados = explicar({ navegador: nav });
        if (!esperado) {
          const graves = achados.filter((a) => ['critico', 'alto'].includes(a.severidade));
          if (!nav.mainReady || !nav.btnJogar || nav.ops?.marcos?.main_ready == null || graves.length) ruim(`navegador 'saudavel' devia provar o boot e ler o ops.js: ready=${nav.mainReady} btn=${nav.btnJogar} ops=${JSON.stringify(nav.ops?.marcos)} graves=${graves.map((a) => a.id).join(',')}`);
          else ok(`navegador 'saudavel' → boot provado em ${nav.readyMs} ms, ops.js com marco main_ready=${nav.ops.marcos.main_ready} ms`);
        } else {
          const a = achados.find((x) => x.id === esperado[0]);
          if (!nav.pageErrors.some((e) => /testMode/.test(e))) ruim("MUTAÇÃO 'boot-navegador-morto' não aplicou: sem pageerror de TDZ");
          else if (!a || a.severidade !== esperado[1]) ruim(`MUTAÇÃO 'boot-navegador-morto' não virou ${esperado[0]} [${esperado[1]}]; achados: ${achados.map((x) => x.id).join(', ')}`);
          else ok(`navegador 'boot-navegador-morto' → ${a.id} [${a.severidade}] (${nav.pageErrors[0]})`);
        }
      } finally { await s.fechar(); rmSync(raiz, { recursive: true, force: true }); }
    }
  }
}

/* partida sintética: árvore real, um mapa, e o mutante de crash em memória */
if (!SO || SO === 'partida') {
  const sadia = await sondaPartidas({ raiz: RAIZ_PADRAO, mapas: '1', modos: 'rounds', updates: 300, timeoutMs: 120_000 });
  const achadosSadia = explicar({ partidas: sadia });
  if (sadia.fatal || achadosSadia.some((a) => a.severidade === 'critico' || a.severidade === 'alto')) ruim(`partida sintética sadia acusou: ${sadia.fatal || achadosSadia.map((a) => a.id).join(', ')}`);
  else ok(`partida sintética sadia: ${sadia.partidas.length} partida(s), ${sadia.partidas[0]?.updates} updates, live=${sadia.partidas[0]?.chegouLive}`);
  const quebrada = await sondaPartidas({ raiz: RAIZ_PADRAO, mapas: '1', modos: 'rounds', updates: 60, timeoutMs: 120_000, mutante: 'partida-quebrada' });
  const crash = explicar({ partidas: quebrada }).find((a) => a.id.startsWith('partida-crash:'));
  if (!quebrada.partidas.some((p) => p.erros.length)) ruim("MUTAÇÃO 'partida-quebrada' não aplicou: nenhuma exceção registrada");
  else if (!crash || crash.severidade !== 'critico' || !/partida-quebrada/.test(crash.evidencia)) ruim(`MUTAÇÃO 'partida-quebrada' não virou achado crítico com a evidência do stack`);
  else ok(`'partida-quebrada' → ${crash.id} [critico]`);
}

console.log(`\n  ${falhas.length ? `${falhas.length} falha(s)` : 'todos os mutantes morderam'} em ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(falhas.length ? 1 : 0);
