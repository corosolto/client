// Executa mede() real com transporte controlado; não substitui a medição no navegador.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const guardUrl = new URL('./boot-orcamento-check.mjs', import.meta.url).href;
const edits = {
  'sem-status': ['r.falhou || r.fim === null || r.status === null || r.status >= 400', 'r.falhou || r.fim === null', 'prop HTTP404'],
  'sem-falha': ['r.falhou || r.fim === null || r.status === null || r.status >= 400', 'r.fim === null || r.status === null || r.status >= 400', 'prop abortado após HTTP200'],
  'corpo-incompleto': ['r.falhou || r.fim === null || r.status === null || r.status >= 400', 'r.falhou || r.status === null || r.status >= 400', 'prop HTTP200 incompleto'],
  'sem-entrega': ['      if (mutou && !refPoolAnsioso) mutacaoAplicada = true;', '', 'candidato sem rota não aplica'],
  'ordem-cortada': ["...naJanela.filter((r) => r.papel === 'props')", "...ate.filter((r) => r.papel === 'props')", 'prop tardio preserva ordem'],
  'redirect-sobrescrito': ['if (r && e.redirectResponse) {', 'if (false && r && e.redirectResponse) {', 'redirect crítico HTTP404'],
  'redirect-status-antigo': ['r.fim = null; r.bytes = 0; r.status = null; r.falhou = false;', 'r.fim = null; r.bytes = 0; r.falhou = false;', 'redirect sem resposta final'],
  'redirect-sem-papel': ['if (r.papel === null) { r.papel = papelDe(r.url); r.origem = r.url; }', '', 'redirect entra em prop crítico'],
  'cartaz-url-final': ["r.origem.split('?')[0]", "r.url.split('?')[0]", 'cartazes distintos na mesma CDN'],
};
if (process.argv.includes('--mutantes')) {
  const run = args => spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...args], { encoding: 'utf8', timeout: 30000, maxBuffer: 2000000 });
  const baseline = run([]); assert(baseline.status === 0 && !baseline.signal && !baseline.error, 'baseline válido');
  for (const [name, [,, clause]] of Object.entries(edits)) {
    const result = run(['--mutante=' + name]), output = result.stdout + result.stderr;
    assert(result.status === 1 && !result.signal && !result.error && output.includes('Mutação aplicada: ' + name)
      && output.includes(`✗ ${clause}: AssertionError:`) && !/TypeError:|ReferenceError:|SyntaxError:/.test(output), 'mutante com prova semântica: ' + name);
    console.log(`✓ integridade: ${name} aplicado e detectado`);
  }
  process.exit(0);
}
let source = readFileSync(new URL(guardUrl), 'utf8');
const mutation = process.argv.find(arg => arg.startsWith('--mutante='))?.slice(10);
if (mutation) {
  assert(Object.hasOwn(edits, mutation), 'mutante conhecido'); const [before, after] = edits[mutation];
  assert.equal(source.split(before).length, 2, 'mutação única'); source = source.replace(before, after);
  if (mutation === 'sem-entrega') {
    const anchor = '    await context.route(`**/${rel}*`, async (rota) => {';
    assert.equal(source.split(anchor).length, 2, 'âncora única da entrega');
    source = source.replace(anchor, '    if (mutou && !refPoolAnsioso) mutacaoAplicada = true;\n' + anchor);
  }
  console.log('Mutação aplicada: ' + mutation);
}
const helperBegin = source.indexOf('const ANSIOSO = '), helperEnd = source.indexOf('\nconst PUBLIC_ROOT=', helperBegin);
const begin = source.indexOf('async function mede('), end = source.indexOf('\nlet saida=', begin);
assert(helperBegin >= 0 && helperEnd > helperBegin && begin > helperEnd && end > begin, 'fronteiras reais');
let failures = 0;
for (const [name, options] of [
  ['assets válidos', {}],
  ['prop HTTP404', { category: 'props', status: 404, invalid: true }],
  ['prop abortado', { category: 'props', failed: true, invalid: true }],
  ['prop abortado após HTTP200', { category: 'props', failed: true, headers: true, invalid: true }],
  ['prop HTTP200 incompleto', { category: 'props', pending: true, invalid: true }],
  ['fauna HTTP503', { category: 'ambient', status: 503, invalid: true }],
  ['referência cartaz HTTP404', { category: 'posters', status: 404, invalid: true, reference: true }],
  ['redirect crítico HTTP404', { category: 'props', redirect: true, status: 404, invalid: true }],
  ['redirect válido preserva prop', { category: 'props', redirect: true, propRecorded: true }],
  ['prop tardio preserva ordem', { lateProp: true }],
  ['redirect tardio preserva registro', { category: 'props', redirectLate: true, propRecorded: true }],
  ['redirect sem resposta final', { category: 'props', redirect: true, missingFinalHeaders: true, invalid: true }],
  ['redirect entra em prop crítico', { category: 'props', redirect: true, genericOrigin: true, status: 404, invalid: true }],
  ['cartazes distintos na mesma CDN', { category: 'posters', redirect: true, posterTwin: true }],
  ['candidato sem rota não aplica', { mutant: 'cartaz-ansioso', deliver: false, applied: false }],
  ['referência entregue não prova candidato', { mutant: 'cartaz-ansioso', reference: true, applied: false }],
  ['candidato cartaz entregue aplica', { mutant: 'cartaz-ansioso', applied: true }],
  ['candidato fauna entregue aplica', { mutant: 'fauna-cedo', applied: true }],
  ['fulfill falhado não aplica', { mutant: 'cartaz-ansioso', fulfillFailure: true }],
]) {
  let clock = 100000, settledOnce = false; const handlers = new Map(), routes = [];
  const emit = (event, value) => { for (const callback of handlers.get(event) || []) callback(value); };
  const cdp = { send: async () => {}, on: (event, callback) => handlers.set(event, [...(handlers.get(event) || []), callback]) };
  const context = { addInitScript: async () => {}, route: async (pattern, callback) => routes.push({ pattern, callback }),
    newCDPSession: async () => cdp, close: async () => {} };
  const page = { on() {}, evaluate: async () => {},
    waitForTimeout: async () => {
      if (settledOnce) { clock += 180001; return; }
      settledOnce = true;
      if (options.lateProp) {
        clock = 101800; emit('Network.loadingFinished', { requestId: 'late', encodedDataLength: 1000 });
      } else if (options.redirectLate) {
        clock = 101500; emit('Network.requestWillBeSent', { requestId: '0', request: { url: 'https://fixture.local/cdn/hash.bin' }, redirectResponse: { status: 302 } });
        clock = 101800; emit('Network.responseReceived', { requestId: '0', response: { status: 200 } });
        emit('Network.loadingFinished', { requestId: '0', encodedDataLength: 1000 });
      } else clock += 180001;
    },
    waitForFunction: async () => ({ jsonValue: async () => 1200 }),
    goto: async () => {
      if (options.deliver !== false) for (const route of routes) await route.callback({ fetch: async () => ({}), fulfill: async () => {
        if (options.fulfillFailure) throw new Error('entrega falhou');
      } });
      for (const [i, category] of ['props', 'posters', 'ambient'].entries()) {
        const requestId = String(i), path = category === 'posters' ? '/posters/test.webp' : `/models/${category}/test.glb`;
        clock = 100100 + i * 200; emit('Network.requestWillBeSent', { requestId, request: { url: 'https://fixture.local' + (category === options.category && options.genericOrigin ? '/download' : path) } });
        if (category === options.category && options.redirect) {
          emit('Network.responseReceived', { requestId, response: { status: 302 } });
          clock += 20; emit('Network.requestWillBeSent', { requestId, request: { url: 'https://fixture.local' + (options.genericOrigin ? path : '/cdn/hash.bin') }, redirectResponse: { status: 302 } });
        }
        clock += 100;
        if (category === options.category && options.failed) {
          if (options.headers) emit('Network.responseReceived', { requestId, response: { status: 200 } });
          emit('Network.loadingFailed', { requestId, errorText: 'net::ERR_ABORTED', canceled: true });
        }
        else {
          if (!(category === options.category && options.missingFinalHeaders)) emit('Network.responseReceived', { requestId, response: { status: category === options.category ? options.redirectLate ? 302 : options.status || 200 : 200 } });
          if (!(category === options.category && (options.pending || options.redirectLate))) emit('Network.loadingFinished', { requestId, encodedDataLength: 1000 });
        }
        if (i === 0 && options.lateProp) {
          clock = 100250; emit('Network.requestWillBeSent', { requestId: 'late', request: { url: 'https://fixture.local/models/props/late.glb' } });
          emit('Network.responseReceived', { requestId: 'late', response: { status: 200 } });
        }
        if (category === 'posters' && options.posterTwin) {
          const requestId = 'poster-twin';
          emit('Network.requestWillBeSent', { requestId, request: { url: 'https://fixture.local/posters/second.webp' } });
          emit('Network.requestWillBeSent', { requestId, request: { url: 'https://fixture.local/cdn/hash.bin' }, redirectResponse: { status: 302 } });
          emit('Network.responseReceived', { requestId, response: { status: 200 } });
          emit('Network.loadingFinished', { requestId, encodedDataLength: 1000 });
        }
      }
    } };
  context.newPage = async () => page;
  const globals = { browser: { newContext: async () => context }, BASE: 'https://fixture.local',
    JS_LOCAIS: ['js/main.js', 'js/textures.js'], MUTANTE: options.mutant || '', mutacaoAplicada: false,
    readFileSync, guardUrl, URL, Date: { now: () => clock }, setTimeout, console };
  const sandbox = vm.createContext(globals);
  vm.runInContext(source.slice(helperBegin, helperEnd) + '\n' + source.slice(begin, end).replaceAll('import.meta.url', 'guardUrl'), sandbox);
  try {
    const measurement = vm.runInContext(`mede({refPoolAnsioso:${!!options.reference}})`, sandbox);
    if (options.fulfillFailure) { await assert.rejects(measurement, /entrega falhou/); assert.equal(sandbox.mutacaoAplicada, false); }
    else if (options.invalid) await assert.rejects(measurement, /asset de boot inválido/);
    else {
      let result;
      try { result = await measurement; }
      catch (error) {
        if (options.redirectLate && error.name === 'Error' && /^asset de boot inválido:/.test(error.message)) assert.fail('redirect válido mantém registro durante espera');
        throw error;
      }
      if (Object.hasOwn(options, 'applied')) assert.equal(sandbox.mutacaoAplicada, options.applied);
      if (options.propRecorded) assert(result.ultimoProp > 0, 'prop mantém classificação após redirect');
      if (options.lateProp) assert(result.ultimoProp > result.primeiraFauna, 'ordem considera prop válido concluído após corte');
      if (options.posterTwin) assert.equal(result.cartazes, 2, 'contagem usa identidade dos cartazes de origem');
    }
    console.log('✓ ' + name);
  } catch (error) { failures++; console.error(`✗ ${name}: ${error.name}: ${error.message.split('\n')[0]}`); }
}
if (failures) process.exitCode = 1;
