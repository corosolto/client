// Prova a causa da primeira liberação na função real e o READY usado pelo portão.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const mutations = {
  'causa-sobrescrita': ['window.__csSplashCause ||=', 'window.__csSplashCause =', 'primeira liberação por assets permanece assets'],
  'ready-sempre': ["READY:cand.causa==='assets',", 'READY:true,', 'READY recusa failsafe'],
};
if (process.argv.includes('--mutantes')) {
  const run = args => spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...args], {
    encoding: 'utf8', timeout: 30000, maxBuffer: 2000000,
  });
  const baseline = run([]);
  assert(baseline.status === 0 && !baseline.error && !baseline.signal, 'baseline válido');
  for (const [name, [,, clause]] of Object.entries(mutations)) {
    const result = run(['--mutante=' + name]), output = result.stdout + result.stderr;
    assert(result.status === 1 && !result.error && !result.signal
      && output.includes('Mutação aplicada: ' + name)
      && output.includes('✗ ' + clause + ': AssertionError:')
      && !/TypeError:|ReferenceError:|SyntaxError:/.test(output), 'mutante exige prova semântica: ' + name);
    console.log('✓ READY: ' + name + ' aplicado e detectado');
  }
  process.exit(0);
}
let source = readFileSync(new URL('./boot-orcamento-check.mjs', import.meta.url), 'utf8');
const name = process.argv.find(arg => arg.startsWith('--mutante='))?.slice(10);
if (name) {
  assert(Object.hasOwn(mutations, name), 'mutante conhecido');
  const [before, after] = mutations[name];
  assert.equal(source.split(before).length, 2, 'mutação única na fonte real');
  source = source.replace(before, after);
}
const start = source.indexOf('const ANSIOSO = '), end = source.indexOf('\nconst PUBLIC_ROOT=', start);
assert(start >= 0 && end > start, 'fronteira real dos transformadores');
const helper = vm.runInNewContext(source.slice(start, end) + '\n({instrumentaCausaSplash})');
const main = readFileSync(new URL('../../public/js/main.js', import.meta.url), 'utf8');
const instrumented = helper.instrumentaCausaSplash(main);
const begin = instrumented.indexOf('function _splashSetReady() {');
const finish = instrumented.indexOf('\n// failsafe:', begin);
assert(begin >= 0 && finish > begin, 'função real de liberação');
const splash = new vm.Script(instrumented.slice(begin, finish));
const match = source.match(/READY:([^,]+),/);
assert(match, 'expressão READY real');
const ready = new vm.Script('(' + match[1] + ')');
if (name) console.log('Mutação aplicada: ' + name);
let failures = 0;
for (const [label, task] of [
  ...[[false, 'assets'], [true, 'failsafe']].map(([first, expected]) => [
    'primeira liberação por ' + expected + ' permanece ' + expected,
    () => {
      const context = vm.createContext({ window: {}, _splashReady: false, _splashPorFailsafe: first,
        marcoFunil() {}, _bootPhase: { set() {} }, _lstat: { phase: null },
        document: { getElementById: () => null }, tr: value => value });
      splash.runInContext(context);
      vm.runInContext('_splashSetReady(); _splashPorFailsafe = !_splashPorFailsafe; _splashSetReady();', context);
      assert.equal(context.window.__csSplashCause, expected);
    },
  ]),
  ...[['assets', true], ['failsafe', false], [null, false]].map(([cause, expected]) => [
    'READY ' + (expected ? 'aceita ' : 'recusa ') + cause,
    () => assert.equal(ready.runInNewContext({ cand: { causa: cause } }), expected),
  ]),
  ['instrumentação recusa âncora ausente', () => assert.throws(() => helper.instrumentaCausaSplash(''))],
]) {
  try { task(); console.log('✓ ' + label); }
  catch (error) { failures++; console.error('✗ ' + label + ': ' + error.name + ': ' + error.message.split('\n')[0]); }
}
if (failures) process.exitCode = 1;
