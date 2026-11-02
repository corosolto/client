/* VO1–VO4 — build servida fora dos nossos domínios marca a versão com o host (canal de terceiro,
 * ex. espelho congelado da Stateloop em client-psi-ten-78.vercel.app). Mutantes: --mutante=sem-marca|main-cru|sem-corosolto|perf-sem-helper|match-cru */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (process.argv.includes('--mutantes')) {
  const run = args => spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...args], { encoding: 'utf8', timeout: 30000, maxBuffer: 2000000 });
  const baseline = run([]); assert(baseline.status === 0 && !baseline.signal && !baseline.error, 'baseline válido');
  for (const [name, clauses] of [
    ['sem-marca', ['VO2 espelho não marcado']],
    ['main-cru', ['VO4 /api/perf versão', 'VO4 /api/match versão']],
    ['sem-corosolto', ['VO1 host próprio "www.corosolto.com.br"']],
    ['perf-sem-helper', ['VO4 /api/perf versão']],
    ['match-cru', ['VO4 /api/match versão']],
  ]) {
    const result = run(['--mutante=' + name]), output = result.stdout + result.stderr;
    assert(result.status === 1 && !result.signal && !result.error && output.includes('Mutação aplicada: ' + name)
      && clauses.every(c => output.includes('✗ ' + c)) && !/TypeError:|ReferenceError:|SyntaxError:/.test(output), 'mutante sem prova semântica: ' + name + '\n' + output);
    console.log('✓ versão: ' + name + ' aplicado e detectado');
  }
  process.exit(0);
}

const mut = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
let apibase = readFileSync(new URL('../../public/js/apibase.js', import.meta.url), 'utf8');
let main = readFileSync(new URL('../../public/js/main.js', import.meta.url), 'utf8');
const troca = (source, before, after, count = 1) => {
  assert.equal(source.split(before).length - 1, count, 'âncora de mutação aplicada na quantidade exata');
  return source.replaceAll(before, after);
};
const trocaNoCorpo = (begin, end, before, after) => {
  assert.equal(main.split(begin).length, 2); assert.equal(main.split(end).length, 2);
  const a = main.indexOf(begin), b = main.indexOf(end, a); assert(b > a);
  return main.slice(0, a) + troca(main.slice(a, b), before, after) + main.slice(b);
};
assert(['', 'sem-marca', 'sem-corosolto', 'main-cru', 'perf-sem-helper', 'match-cru'].includes(mut), 'mutante conhecido');
if (mut === 'sem-marca') apibase = troca(apibase, "if (!h || HOST_PROPRIO.test(h)) return versao;", 'return versao;');
if (mut === 'sem-corosolto') apibase = troca(apibase, '|(^|\\.)corosolto\\.com\\.br$', '');
if (mut === 'main-cru') main = troca(main, 'version: versaoComOrigem(VERSION)', 'version: VERSION', 2);
if (mut === 'perf-sem-helper') main = trocaNoCorpo('function _perfFinish(bootMs, frames) {', '\n// MATCH EVENT (016)', '..._clientSessionContext(), ...telemetryGameContext,', '...telemetryGameContext,');
if (mut === 'match-cru') {
  main = trocaNoCorpo('function sendMatchEvent(result) {', 'function sendTrainingFrames', 'version: versaoComOrigem(VERSION)', 'version: VERSION');
}
if (mut) console.log('Mutação aplicada: ' + mut);

const dir = mkdtempSync(join(tmpdir(), 'vo-'));
writeFileSync(join(dir, 'apibase.mjs'), apibase);
const { versaoComOrigem } = await import(pathToFileURL(join(dir, 'apibase.mjs')).href);

const falhas = [];
const cobra = (ok, msg) => { if (!ok) falhas.push(msg); };
const V = '2.1.0-alpha.17';
for (const h of ['www.corosolto.com.br', 'corosolto.com.br', 'www.csbrasil.online', 'csbrasil.online', 'csbrasil.vercel.app', 'csbrasil-git-x-rubenmarcus-projects.vercel.app', 'localhost', '127.0.0.1', '']) {
  cobra(versaoComOrigem(V, h) === V, `VO1 host próprio "${h}" ganhou marca: ${versaoComOrigem(V, h)}`);
}
cobra(versaoComOrigem(V, 'client-psi-ten-78.vercel.app') === `${V}@client-psi-ten-78`, `VO2 espelho não marcado: ${versaoComOrigem(V, 'client-psi-ten-78.vercel.app')}`);
cobra(versaoComOrigem(V, 'csbrasil.online.evil.example') !== V, 'VO2 sufixo falso passou como próprio');
cobra(versaoComOrigem(V, 'corosolto.com.br.evil.example') !== V && versaoComOrigem(V, 'falsocorosolto.com.br') !== V, 'VO2 sufixo falso de corosolto passou como próprio');
cobra(versaoComOrigem(V, 'um-host-muito-comprido-de-algum-portal.example.com').length <= 40, 'VO3 versão marcada passa de 40 (backend corta)');
// Os callers reais montam o payload; o transporte fica restrito à VM local.
const extrai = (ini, fim, rotulo) => {
  if (main.split(ini).length !== 2 || main.split(fim).length !== 2 || main.indexOf(fim, main.indexOf(ini)) < 0) {
    falhas.push(`VO4 âncora de ${rotulo} não é única em main`);
    return '';
  }
  return main.slice(main.indexOf(ini), main.indexOf(fim, main.indexOf(ini)));
};
const corposVo4 = [
  extrai('function _clientSessionContext() {', '\n// FUNIL (017)', '_clientSessionContext'),
  extrai('function _perfFinish(bootMs, frames) {', '\n// MATCH EVENT (016)', '_perfFinish'),
  extrai('function sendMatchEvent(result) {', 'function sendTrainingFrames', 'sendMatchEvent'),
].join('\n')
  // O sendMatchEvent pós-r844 marca o modo pelo modoTelemetria real (módulo, fora das
  // regiões acima): a régua leva a função real, não um stub.
  + '\n' + extrai('function modoTelemetria(g) {', '\nlet telemetrySent = true;', 'modoTelemetria')
  + '\nlet _matchEventSent = false;\n';
if (!falhas.some((f) => f.startsWith('VO4 âncora'))) {
  for (const { host, esperada } of [
    { host: 'www.corosolto.com.br', esperada: V },
    { host: 'client-psi-ten-78.vercel.app', esperada: `${V}@client-psi-ten-78` },
  ]) {
    const enviados = [];
    const rendererVo4 = { getPixelRatio: () => 2, getContext: () => ({ getExtension: () => null, getParameter: () => null }) };
    const sandbox = {
      versaoComOrigem: version => versaoComOrigem(version, host), VERSION: V, _perfLoadMs: 1,
      navigator: { userAgent: 'vo-check', platform: 'MacIntel', maxTouchPoints: 0, hardwareConcurrency: 8, connection: { effectiveType: '4g' } },
      location: { hostname: host }, screen: { width: 1280, height: 720 },
      innerWidth: 1280, innerHeight: 720, devicePixelRatio: 2, TOUCH: false,
      getAnonId: () => 'anon-vo', getSessionId: () => 'sess-vo',
      sinaisDeBuild: () => ({ sinalVo: 'vo' }), telemetryGameContext: { ctxVo: 'vo' },
      renderer: rendererVo4, settings: { quality: 'alta' },
      window: { __csWebgl: { softwareEstado: 'nao', tier: 1 }, __csbOps: { resumoBeacon: () => ({}) }, __escada: null },
      analyticsAllowed: () => true, testMode: false,
      game: { player: { kills: 3, deaths: 1, headshots: 2 }, _wperf: { rifle: 2 }, playerTeam: 'E', playerFaction: 'f', mk: { best: 4 }, roundsWon: { E: 2, B: 1 }, time: 91, bots: [1, 2, 3] },
      _matchEventId: 'ev-vo', currentMap: 'dust', matchMode: 'ctf', currentChar: 'c', currentFaction: 'f', registeredNick: 'vo',
      sendJsonKeepalive: (rota, payload) => enviados.push([rota, payload]),
    };
    sandbox.globalThis = sandbox;
    runInNewContext(corposVo4, sandbox);
    sandbox._perfFinish(10, 240);
    sandbox.sendMatchEvent('win');
    const perfs = enviados.filter(([r]) => r === '/api/perf'), matches = enviados.filter(([r]) => r === '/api/match');
    cobra(perfs.length === 1 && matches.length === 1, `VO4 cada rota envia exatamente um payload (host ${host})`);
    const perf = perfs[0]?.[1], match = matches[0]?.[1];
    cobra(perf?.version === esperada, `VO4 /api/perf versão "${perf?.version}" ≠ "${esperada}" (host ${host})`);
    cobra(match?.version === esperada, `VO4 /api/match versão "${match?.version}" ≠ "${esperada}" (host ${host})`);
  }
}

if (falhas.length) {
  console.error(`versão com origem: ${falhas.length} FALHA(S)`);
  for (const f of falhas) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('versão com origem: VO1–VO4 verde');
