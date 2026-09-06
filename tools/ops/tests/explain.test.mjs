/* Regras sintoma → causa, uma a uma, com resultados sintéticos das sondas. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
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
