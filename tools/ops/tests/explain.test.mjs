/* Regras sintoma → causa, uma a uma, com resultados sintéticos das sondas. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { explicar } from '../lib/explain.mjs';
import { veredito, codigoDeSaida, renderMarkdown } from '../lib/report.mjs';
import { classificaChamadas } from '../probes/api.mjs';
import { classificaErro, percentil, totalDoContentRange, pareceHtml } from '../lib/http.mjs';
import { extraiImportMap, extraiVersaoHtml, extraiScriptsModulo, extraiVersionJs } from '../probes/boot.mjs';

const ids = (a) => a.map((x) => x.id);

test('alvo bloqueado por proxy é inconclusivo, não vermelho; sem rede é crítico', () => {
  const proxy = explicar({ boot: { sonda: 'boot', alvo: 'https://x', html: { status: 0, erro: 'proxy', ms: 12 } } });
  assert.equal(proxy[0].id, 'alvo-inalcancavel');
  assert.equal(proxy[0].severidade, 'inconclusivo');
  const v = veredito(proxy, {});
  assert.equal(v.inconclusivo, true);
  assert.equal(codigoDeSaida(v), 3);
  const caido = explicar({ boot: { sonda: 'boot', alvo: 'https://x', html: { status: 0, erro: 'timeout', ms: 10000 } } });
  assert.equal(caido[0].severidade, 'critico');
  assert.equal(codigoDeSaida(veredito(caido, {})), 1);
});

test('health: cada campo tem a sua regra e severidade', () => {
  const base = { sonda: 'api', health: { url: 'u', status: 200, ms: 1, corpo: { ok: true, database: true, telemetrySchema: true, fresh: true, stale: [], never: [], operationalFresh: true } }, rotas: [] };
  assert.deepEqual(ids(explicar({ api: base })), []);
  const banco = structuredClone(base); banco.health.corpo.database = false;
  assert.equal(explicar({ api: banco })[0].id, 'banco-fora');
  const schema = structuredClone(base); schema.health.corpo.telemetrySchema = false;
  assert.equal(explicar({ api: schema })[0].severidade, 'alto');
  const nunca = structuredClone(base); nunca.health.corpo.never = ['perf']; nunca.health.corpo.fresh = false;
  const a = explicar({ api: nunca });
  assert.ok(ids(a).includes('pipeline-nunca-gravou'));
  assert.ok(!ids(a).includes('pipelines-parados'), 'never tem precedência sobre stale');
  const parado = structuredClone(base); parado.health.corpo.fresh = false; parado.health.corpo.stale = ['match'];
  parado.rotas = [{ rota: 'online', chamadas: [{ status: 200, corpo: '{"online":7}' }], padrao: 'ok', total: 1, ok: 1, cincoXx: 0, semResposta: 0 }];
  const p = explicar({ api: parado })[0];
  assert.equal(p.id, 'pipelines-parados');
  assert.match(p.causa, /7 online/);
});

test('rota: constante vira alto, intermitente vira médio com a sequência de status na evidência', () => {
  const chamadas = (st) => st.map((s) => ({ status: s, ms: 50 }));
  assert.equal(classificaChamadas(chamadas([503, 200, 503, 200])).padrao, 'intermitente');
  assert.equal(classificaChamadas(chamadas([503, 503])).padrao, 'sempre-falha');
  assert.equal(classificaChamadas(chamadas([0, 0])).padrao, 'sempre-falha');
  assert.equal(classificaChamadas([{ status: 0, erro: 'dns' }, { status: 0, erro: 'proxy' }]).padrao, 'inalcancavel');
  assert.equal(classificaChamadas([{ status: 0, erro: 'dns' }, { status: 503, ms: 1 }]).padrao, 'sempre-falha');
  assert.equal(classificaChamadas(chamadas([404, 404])).padrao, 'sempre-4xx');
  assert.equal(classificaChamadas(chamadas([200, 200])).padrao, 'ok');
  const api = { sonda: 'api', health: { status: 200, corpo: { ok: true, database: true, telemetrySchema: true, fresh: true, operationalFresh: true } }, rotas: [{ rota: 'online', ...classificaChamadas(chamadas([503, 200, 503, 200])), chamadas: chamadas([503, 200, 503, 200]) }] };
  const a = explicar({ api })[0];
  assert.equal(a.id, 'rota-intermitente:online');
  assert.equal(a.severidade, 'medio');
  assert.match(a.evidencia, /503,200,503,200/);
  assert.match(a.causa, /cold start/);
});

test('boot: HTML com import map mas sem main.js é crítico', () => {
  const a = explicar({ boot: { sonda: 'boot', alvo: 'https://x', html: { status: 200, ms: 10, csp: true }, importMap: { three: 'x' }, scriptsModulo: [], mainJs: null } });
  assert.equal(a[0].id, 'html-sem-main-js');
  assert.equal(a[0].severidade, 'critico');
});

test('assets: 404 no edge é alto na mesma versão e só aviso quando a árvore está à frente', () => {
  const assets = { sonda: 'assets', total: 2, itens: [{ caminho: 'models/weapons/ak.glb', grupo: 'armas' }], faltando: ['models/weapons/ak.glb'], semResposta: [], outrosErros: [], conteudoErrado: [], tamanhoDiverge: [], p95ms: 10, cacheHits: 2 };
  const mesma = explicar({ contexto: { versaoLocal: '1.0.0' }, boot: { sonda: 'boot', alvo: 'u', html: { status: 200, ms: 1, csp: true }, importMap: { a: 1 }, mainJs: { status: 200 }, versaoHtml: '1.0.0', versaoJs: '1.0.0', opsJs: { noHtml: true } }, assets });
  assert.equal(mesma.find((a) => a.id === 'asset-404').severidade, 'alto');
  const atras = explicar({ contexto: { versaoLocal: '1.0.1' }, boot: { sonda: 'boot', alvo: 'u', html: { status: 200, ms: 1, csp: true }, importMap: { a: 1 }, mainJs: { status: 200 }, versaoHtml: '1.0.0', versaoJs: '1.0.0', opsJs: { noHtml: true } }, assets });
  const a = atras.find((x) => x.id === 'asset-404');
  assert.equal(a.severidade, 'aviso');
  assert.match(a.titulo, /produção atrás da árvore/);
  assert.ok(ids(atras).includes('producao-atras-da-arvore'));
});

test('partida sintética: crash é crítico e cita mapa, modo e stack', () => {
  const pt = { sonda: 'partidas', fatal: null, timeout: false, partidas: [], comErro: [{ mapa: 'quebrada', modo: 'ctf', erros: [{ update: 3, mensagem: 'TypeError: x', stack: 'game.js:10' }] }], semLive: [], semBots: [] };
  const a = explicar({ partidas: pt })[0];
  assert.equal(a.id, 'partida-crash:quebrada:ctf');
  assert.equal(a.severidade, 'critico');
  assert.match(a.evidencia, /TypeError: x · game.js:10/);
  const fatal = explicar({ partidas: { sonda: 'partidas', fatal: 'harness: x' } })[0];
  assert.equal(fatal.id, 'partida-nao-medida');
});

test('veredito: verde não é pronto — cada requisito que falta vira motivo nomeado', () => {
  const sondasCompletas = {
    contexto: { versaoLocal: '1.0.0' },
    boot: { sonda: 'boot', versaoHtml: '1.0.0', html: { status: 200 } }, api: { sonda: 'api', health: { corpo: { fresh: true } } }, assets: { sonda: 'assets' },
    bootLocal: {}, assetsLocal: {}, partidas: {}, navegador: { mainReady: true },
  };
  const pronto = veredito([], sondasCompletas);
  assert.equal(pronto.tecnicamenteVerde, true);
  assert.equal(pronto.prontoParaLancamento, true);
  const semNavegador = veredito([], { ...sondasCompletas, navegador: null });
  assert.equal(semNavegador.tecnicamenteVerde, true);
  assert.equal(semNavegador.prontoParaLancamento, false);
  assert.match(semNavegador.motivos.join(';'), /navegador/);
  const atras = veredito([], { ...sondasCompletas, boot: { sonda: 'boot', versaoHtml: '0.9.0', html: { status: 200 } } });
  assert.match(atras.motivos.join(';'), /0\.9\.0.*1\.0\.0/);
  const semTrafego = veredito([], { ...sondasCompletas, api: { sonda: 'api', health: { corpo: { fresh: false, stale: ['match'] } } } });
  assert.equal(semTrafego.prontoParaLancamento, false);
  assert.equal(veredito([], { ...sondasCompletas, api: { sonda: 'api', health: { corpo: { fresh: false, stale: ['match'] } } } }, { aceitarSemTrafego: true }).prontoParaLancamento, true);
  const medio = veredito([{ id: 'x', severidade: 'medio' }], sondasCompletas);
  assert.equal(medio.tecnicamenteVerde, true);
  assert.equal(medio.prontoParaLancamento, false);
  const alto = veredito([{ id: 'x', severidade: 'alto' }], sondasCompletas);
  assert.equal(alto.tecnicamenteVerde, false);
});

test('relatório: cabeçalho com os dois vereditos, achados com os quatro campos, limitações', () => {
  const achados = explicar({ boot: { sonda: 'boot', alvo: 'https://x', html: { status: 200, ms: 3000, csp: true, bytes: 10 }, importMap: { './js/main.js': 'a' }, versaoHtml: '1', versaoJs: '2', mainJs: { status: 200 }, coerencia: { exit: 0, problemas: [] } } });
  const md = renderMarkdown({ alvo: 'https://x', quando: '2026-09-06T00:00:00Z', achados, veredito: veredito(achados, {}), sondas: {}, limitacoes: ['sem navegador'], comandos: ['GET /'], duracaoMs: 1234 });
  assert.match(md, /\*\*Tecnicamente verde:\*\* NÃO/);
  assert.match(md, /\*\*Pronto para lançamento:\*\* NÃO/);
  assert.match(md, /\[ALTO\] HTML é 1, version.js é 2/);
  assert.match(md, /Causa provável:.*\n.*Evidência:.*\n.*Impacto:.*\n.*Próximo passo:/);
  assert.match(md, /## Limitações desta execução\n- sem navegador/);
  assert.match(md, /## Comandos executados/);
  assert.ok(ids(achados).includes('html-lento'));
});

test('parsers: import map, versão do stylesheet, scripts de módulo, VERSION', () => {
  const html = `<link rel="stylesheet" href="/style.css?v=2.0.0-alpha.221"><script type="importmap">{"imports":{"three":"./vendor/three.module.js?v=1","./js/main.js":"./js/main.js?v=1-abc"}}</script><script type="module" src="/js/ops.js?v=1-abc"></script><script type="module" src="/js/main.js?v=1-abc" onload="x"></script>`;
  assert.deepEqual(Object.keys(extraiImportMap(html)), ['three', './js/main.js']);
  assert.equal(extraiVersaoHtml(html), '2.0.0-alpha.221');
  assert.deepEqual(extraiScriptsModulo(html), ['/js/ops.js?v=1-abc', '/js/main.js?v=1-abc']);
  assert.equal(extraiImportMap('<html></html>'), null);
  assert.equal(extraiVersionJs("// x\nexport const VERSION = '2.0.0-alpha.221';"), '2.0.0-alpha.221');
});

test('http: classificação de erro, percentil, content-range e detecção de HTML', () => {
  assert.equal(classificaErro(Object.assign(new Error('The operation was aborted'), { name: 'TimeoutError' })), 'timeout');
  assert.equal(classificaErro({ cause: { code: 'ENOTFOUND' } }), 'dns');
  assert.equal(classificaErro({ cause: { code: 'ECONNREFUSED' } }), 'conexao');
  assert.equal(classificaErro(new Error('CONNECT tunnel failed, response 403')), 'proxy');
  assert.equal(percentil([5, 1, 3], 50), 3);
  assert.equal(percentil([], 50), null);
  assert.equal(totalDoContentRange({ 'content-range': 'bytes 0-15/275892' }), 275892);
  assert.equal(totalDoContentRange({}), null);
  assert.equal(pareceHtml(new TextEncoder().encode('  <!DOCTYPE html>')), true);
  assert.equal(pareceHtml(new TextEncoder().encode('glTF....')), false);
});

/* ---------- UMA linha por regra: a tabela é o contrato de lib/explain.mjs ----------
   A guarda de cegueira abaixo lê o fonte e reprova regra sem caso aqui (lei 3) e caso de
   id que não existe (typo). Cada entrada: a menor sonda sintética que acende o id. */
const bootOk = () => ({ sonda: 'boot', alvo: 'https://x', html: { status: 200, ms: 100, csp: true, bytes: 10 }, importMap: { './js/main.js': 'a', './js/version.js': 'v' }, versaoHtml: '1', versaoJs: '1', mainJs: { status: 200, ehHtml: false }, coerencia: { exit: 0, problemas: [] }, opsJs: { noHtml: true } });
const apiOk = () => ({ sonda: 'api', health: { status: 200, url: 'u', ms: 1, corpo: { ok: true, database: true, telemetrySchema: true, fresh: true, stale: [], never: [], operationalFresh: true } }, rotas: [], redeSeguranca: { status: 404 } });
const rota = (extra) => ({ rota: 'online', total: 5, ok: 5, cincoXx: 0, semResposta: 0, p50: 100, p95: 120, padrao: 'ok', chamadas: [{ status: 200, ms: 100 }], ...extra });
const rkOk = () => ({ sonda: 'ranking', flagLocal: false, leaderboard: { status: 200, desligado: true, temLista: false }, pagina: { status: 200, bytes: 100 } });
const asOk = (extra) => ({ sonda: 'assets', total: 2, itens: [{ caminho: 'models/weapons/ak.glb', grupo: 'armas' }, { caminho: 'vendor/three.module.js', grupo: 'vendor' }], faltando: [], semResposta: [], outrosErros: [], conteudoErrado: [], tamanhoDiverge: [], p95ms: 100, cacheHits: 0, ...extra });
const blOk = () => ({ sonda: 'boot-local', versaoPackage: '1', versaoJs: '1', indexAstro: { temImportMap: true, temMainJs: true, temOpsJs: true, temColetorDeErros: true }, manifesto: { temOps: true }, coerencia: { exit: 0, problemas: [] } });
const alOk = (extra) => ({ sonda: 'assets-local', total: 1, itens: [{ caminho: 'models/weapons/ak.glb', grupo: 'armas' }, { caminho: 'models/props/x.glb', grupo: 'props' }], faltando: [], conteudoErrado: [], ...extra });
const ptOk = (extra) => ({ sonda: 'partidas', fatal: null, timeout: false, partidas: [], comErro: [], semLive: [], semBots: [], ...extra });
const navOk = (extra) => ({ sonda: 'navegador', indisponivel: false, headless: true, mainReady: true, btnJogar: true, webgl2: true, pageErrors: [], consoleErros: [], requestsFalhas: [], ops: null, partida: null, ...extra });
const partida = (extra) => ({ mapa: 'quebrada', modo: 'rounds', bots: 4, updates: 600, estadoFinal: 'live', tempoJogo: 10, erros: [], ...extra });

const CASOS = [
  ['alvo-inalcancavel', 'critico', { boot: { ...bootOk(), html: { status: 0, erro: 'conexao', ms: 5 } } }],
  ['alvo-inalcancavel', 'inconclusivo', { boot: { ...bootOk(), html: { status: 0, erro: 'proxy', ms: 5 } } }],
  ['html-nao-200', 'critico', { boot: { ...bootOk(), html: { status: 500, ms: 5 } } }],
  ['html-sem-importmap', 'critico', { boot: { ...bootOk(), importMap: null } }],
  ['html-sem-main-js', 'critico', { boot: { ...bootOk(), importMap: {}, mainJs: null } }],
  ['main-js-indisponivel', 'critico', { boot: { ...bootOk(), mainJs: { status: 404 } } }],
  ['main-js-e-html', 'critico', { boot: { ...bootOk(), mainJs: { status: 200, ehHtml: true } } }],
  ['versao-divergente', 'alto', { boot: { ...bootOk(), versaoJs: '2' } }],
  ['grafo-incoerente', 'critico', { boot: { ...bootOk(), coerencia: { exit: 1, problemas: ['HTTP 404 em /js/x.js'] } } }],
  ['coerencia-nao-medida', 'inconclusivo', { boot: { ...bootOk(), coerencia: { exit: 1, problemas: [], saida: 'fetch failed' } } }],
  ['coerencia-nao-medida', 'inconclusivo', { boot: { ...bootOk(), coerencia: { exit: null, problemas: [], saida: '' } } }],
  ['sem-csp', 'aviso', { boot: { ...bootOk(), html: { status: 200, ms: 5, csp: false } } }],
  ['html-lento', 'aviso', { boot: { ...bootOk(), html: { status: 200, ms: 2600, csp: true } } }],
  ['ops-runtime-ausente', 'info', { boot: { ...bootOk(), opsJs: { noHtml: false } } }],
  ['producao-atras-da-arvore', 'info', { contexto: { versaoLocal: '2' }, boot: bootOk() }],
  ['health-indisponivel', 'critico', { api: { ...apiOk(), health: { status: 503 } } }],
  ['health-indisponivel', 'inconclusivo', { api: { ...apiOk(), health: { status: 0, erro: 'dns' } } }],
  ['health-nao-ok', 'critico', { api: { ...apiOk(), health: { status: 200, corpo: { ok: false } } } }],
  ['banco-fora', 'critico', { api: { ...apiOk(), health: { status: 200, corpo: { ok: true, database: false } } } }],
  ['schema-telemetria', 'alto', { api: { ...apiOk(), health: { status: 200, corpo: { ok: true, telemetrySchema: false } } } }],
  ['mp-sem-heartbeat', 'alto', { api: { ...apiOk(), health: { status: 200, corpo: { ok: true, operationalFresh: false, operationalStale: ['eu'] } } } }],
  ['pipeline-nunca-gravou', 'alto', { api: { ...apiOk(), health: { status: 200, corpo: { ok: true, never: ['perf'] } } } }],
  ['pipelines-parados', 'aviso', { api: { ...apiOk(), health: { status: 200, corpo: { ok: true, fresh: false, stale: ['match'] } } } }],
  ['health-site-vs-backend', 'medio', { api: { ...apiOk(), healthBackend: { status: 200, corpo: { ok: true, database: false, telemetrySchema: true } } } }],
  ['rota-fora:online', 'alto', { api: { ...apiOk(), rotas: [rota({ padrao: 'sempre-falha', ok: 0, cincoXx: 5, chamadas: [{ status: 503 }] })] } }],
  ['rota-fora:leaderboard', 'medio', { api: { ...apiOk(), rotas: [rota({ rota: 'leaderboard', padrao: 'sempre-falha', ok: 0, cincoXx: 5, chamadas: [{ status: 503 }] })] } }],
  ['rota-4xx:map-plays', 'alto', { api: { ...apiOk(), rotas: [rota({ rota: 'map-plays', padrao: 'sempre-4xx', ok: 0, quatroXx: 5, chamadas: [{ status: 404 }] })] } }],
  ['rota-intermitente:online', 'medio', { api: { ...apiOk(), rotas: [rota({ padrao: 'intermitente', ok: 4, cincoXx: 1, chamadas: [{ status: 503 }, { status: 200 }] })] } }],
  ['latencia-api:online', 'aviso', { api: { ...apiOk(), rotas: [rota({ p95: 2500, chamadas: [{ status: 200, ms: 2500 }] })] } }],
  ['rede-seguranca-rota-desconhecida', 'medio', { api: { ...apiOk(), redeSeguranca: { status: 200, corpo: 'html' } } }],
  ['rede-seguranca-rota-desconhecida', 'aviso', { api: { ...apiOk(), redeSeguranca: { status: 500 } } }],
  ['ranking-flag-nao-lida', 'alto', { ranking: { ...rkOk(), flagLocal: null, flagErro: 'src/lib/site.ts sem RANKING_ON' } }],
  ['ranking-ligado-sem-flag', 'medio', { ranking: { ...rkOk(), leaderboard: { status: 200, desligado: false, temLista: true } } }],
  ['ranking-desligado-com-flag', 'alto', { ranking: { ...rkOk(), flagLocal: true } }],
  ['pagina-ranking-quebrada', 'alto', { ranking: { ...rkOk(), pagina: { status: 500, ms: 1 } } }],
  ['pagina-ranking-vazia', 'alto', { ranking: { ...rkOk(), pagina: { status: 200, bytes: 0 } } }],
  ['assets-inalcancaveis', 'inconclusivo', { assets: asOk({ semResposta: ['a (timeout)', 'b (timeout)'] }) }],
  ['asset-404', 'alto', { assets: asOk({ faltando: ['models/weapons/ak.glb'] }) }],
  ['asset-404', 'critico', { assets: asOk({ faltando: ['vendor/three.module.js'] }) }],
  ['asset-404', 'aviso', { contexto: { versaoLocal: '2' }, boot: bootOk(), assets: asOk({ faltando: ['models/weapons/ak.glb'] }) }],
  ['asset-conteudo-errado', 'alto', { assets: asOk({ conteudoErrado: ['models/weapons/ak.glb'] }) }],
  ['asset-tamanho-diverge', 'medio', { assets: asOk({ tamanhoDiverge: ['models/weapons/ak.glb (edge 1 ≠ disco 2)'] }) }],
  ['asset-erro-http', 'medio', { assets: asOk({ outrosErros: ['models/weapons/ak.glb (503)'] }) }],
  ['asset-sem-resposta', 'medio', { assets: asOk({ semResposta: ['models/weapons/ak.glb (timeout)'] }) }],
  ['assets-lentos', 'aviso', { assets: asOk({ p95ms: 3500 }) }],
  ['versao-local-desincronizada', 'alto', { bootLocal: { ...blOk(), versaoJs: '2' } }],
  ['index-astro-sem-boot', 'critico', { bootLocal: { ...blOk(), indexAstro: { temImportMap: false, temMainJs: true, temOpsJs: true, temColetorDeErros: true } } }],
  ['index-astro-sem-coletor', 'alto', { bootLocal: { ...blOk(), indexAstro: { temImportMap: true, temMainJs: true, temOpsJs: true, temColetorDeErros: false } } }],
  ['ops-runtime-nao-ligado', 'info', { bootLocal: { ...blOk(), indexAstro: { temImportMap: true, temMainJs: true, temOpsJs: false, temColetorDeErros: true } } }],
  ['grafo-local-incoerente', 'critico', { bootLocal: { ...blOk(), coerencia: { exit: 1, problemas: ['main.js não exporta foo'] } } }],
  ['coerencia-local-nao-medida', 'inconclusivo', { bootLocal: { ...blOk(), coerencia: { exit: 1, problemas: [], saida: 'boom' } } }],
  ['asset-local-faltando', 'critico', { assetsLocal: alOk({ faltando: ['models/weapons/ak.glb'] }) }],
  ['asset-local-faltando', 'alto', { assetsLocal: alOk({ faltando: ['models/props/x.glb'] }) }],
  ['asset-local-corrompido', 'alto', { assetsLocal: alOk({ conteudoErrado: ['models/weapons/ak.glb'] }) }],
  ['partida-nao-medida', 'alto', { partidas: ptOk({ fatal: 'harness: x' }) }],
  ['partida-travou', 'alto', { partidas: ptOk({ timeout: true }) }],
  ['partida-crash:quebrada:rounds', 'critico', { partidas: ptOk({ comErro: [partida({ erros: [{ update: 3, mensagem: 'TypeError', stack: 'game.js:1' }] })] }) }],
  ['partida-nao-comeca:quebrada:rounds', 'alto', { partidas: ptOk({ semLive: [partida({ estadoFinal: 'countdown' })] }) }],
  ['partida-sem-bots:quebrada:rounds', 'medio', { partidas: ptOk({ semBots: [partida({ bots: 0 })] }) }],
  ['navegador-indisponivel', 'aviso', { navegador: { sonda: 'navegador', indisponivel: true, motivo: 'sem Playwright' } }],
  ['boot-navegador-morto', 'critico', { navegador: navOk({ mainReady: false, mainLoaded: true, pageErrors: ['TDZ'] }) }],
  ['excecao-no-navegador', 'alto', { navegador: navOk({ pageErrors: ['ReferenceError'] }) }],
  ['btn-jogar-inerte', 'critico', { navegador: navOk({ btnJogar: false }) }],
  ['sem-webgl2', 'aviso', { navegador: navOk({ webgl2: false, webgl1: true }) }],
  ['sem-webgl2', 'alto', { navegador: navOk({ webgl2: false, webgl1: true, headless: false }) }],
  ['recursos-falhando-no-boot', 'critico', { navegador: navOk({ requestsFalhas: ['/js/game.js 404'] }) }],
  ['recursos-falhando-no-boot', 'medio', { navegador: navOk({ requestsFalhas: ['/img/x.png 404'] }) }],
  ['console-error-no-boot', 'medio', { navegador: navOk({ consoleErros: ['textura'] }) }],
  ['ops-falhas-de-carga', 'medio', { navegador: navOk({ ops: { recursos: { falhas: [{ caminho: '/models/x.glb', status: 404 }] } } }) }],
  ['ops-contexto-perdido', 'alto', { navegador: navOk({ ops: { webgl: { perdidos: 1, restaurados: 0 } } }) }],
  ['fps-baixo', 'medio', { navegador: navOk({ headless: false, ops: { fps: { amostras: 10, p50: 20, p5: 10, travadas: 3 } } }) }],
  ['partida-navegador-nao-comeca', 'critico', { navegador: navOk({ partida: { chegouLive: false, ms: null, erro: 'timeout' } }) }],
];

test('tabela: cada regra de explain.mjs acende com o id e a severidade esperados, com os quatro campos', () => {
  for (const [id, sev, sondas] of CASOS) {
    const a = explicar(sondas).find((x) => x.id === id);
    assert.ok(a, `'${id}' não acendeu; achados: ${ids(explicar(sondas)).join(', ') || 'nenhum'}`);
    assert.equal(a.severidade, sev, `'${id}' saiu ${a.severidade}, esperado ${sev}`);
    assert.ok(a.causa && a.evidencia && a.impacto && a.proximo, `'${id}' sem causa/evidência/impacto/próximo passo`);
  }
});

test('cegueira: toda regra do fonte tem caso na tabela, e todo caso aponta para regra que existe', () => {
  const src = readFileSync(new URL('../lib/explain.mjs', import.meta.url), 'utf8');
  const naFonte = new Set([...src.matchAll(/id: ['`]([a-z0-9-]+)/g)].map((m) => m[1]));
  assert.ok(naFonte.size > 40, `só ${naFonte.size} ids lidos do fonte — a regex da guarda quebrou`);
  const cobertos = new Set(CASOS.map(([id]) => id.split(':')[0]));
  assert.deepEqual([...naFonte].filter((id) => !cobertos.has(id)), [], 'regra sem caso na tabela (lei 3: régua sem mutação não existe)');
  assert.deepEqual([...cobertos].filter((id) => !naFonte.has(id)), [], 'caso de id que não existe no fonte');
});
