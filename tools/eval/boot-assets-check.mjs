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
const helperBegin = source.indexOf('const ANSIOSO = '), helperEnd = source.indexOf('\nlet mutacaoAplicada =', helperBegin);
const begin = source.indexOf('async function mede('), end = source.indexOf('\nlet saida =', begin);
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
  ['candidato sem rota não aplica', { mutant: 'cartaz-ansioso', deliver: false, applied: false }],
  ['referência entregue não prova candidato', { mutant: 'cartaz-ansioso', reference: true, applied: false }],
  ['candidato cartaz entregue aplica', { mutant: 'cartaz-ansioso', applied: true }],
  ['candidato fauna entregue aplica', { mutant: 'fauna-cedo', applied: true }],
  ['fulfill falhado não aplica', { mutant: 'cartaz-ansioso', fulfillFailure: true }],
]) {
  let clock = 100000; const handlers = new Map(), routes = [];
  const emit = (event, value) => { for (const callback of handlers.get(event) || []) callback(value); };
  const cdp = { send: async () => {}, on: (event, callback) => handlers.set(event, [...(handlers.get(event) || []), callback]) };
  const context = { addInitScript: async () => {}, route: async (pattern, callback) => routes.push({ pattern, callback }),
    newCDPSession: async () => cdp, close: async () => {} };
  const page = { on() {}, evaluate: async () => {},
    waitForTimeout: async () => { clock += 180001; },
    waitForFunction: async () => ({ jsonValue: async () => 1200 }),
    goto: async () => {
      if (options.deliver !== false) for (const route of routes) await route.callback({ fetch: async () => ({}), fulfill: async () => {
        if (options.fulfillFailure) throw new Error('entrega falhou');
      } });
      for (const [i, category] of ['props', 'posters', 'ambient'].entries()) {
        const requestId = String(i), path = category === 'posters' ? '/posters/test.webp' : `/models/${category}/test.glb`;
        clock = 100100 + i * 200; emit('Network.requestWillBeSent', { requestId, request: { url: 'https://fixture.local' + path } });
        clock += 100;
        if (category === options.category && options.failed) {
          if (options.headers) emit('Network.responseReceived', { requestId, response: { status: 200 } });
          emit('Network.loadingFailed', { requestId, errorText: 'net::ERR_ABORTED', canceled: true });
        }
        else {
          emit('Network.responseReceived', { requestId, response: { status: category === options.category ? options.status || 200 : 200 } });
          if (!(category === options.category && options.pending)) emit('Network.loadingFinished', { requestId, encodedDataLength: 1000 });
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
    else { await measurement; if (Object.hasOwn(options, 'applied')) assert.equal(sandbox.mutacaoAplicada, options.applied); }
    console.log('✓ ' + name);
  } catch (error) { failures++; console.error(`✗ ${name}: ${error.name}: ${error.message.split('\n')[0]}`); }
}
if (failures) process.exitCode = 1;
