import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { aceitaMutante } from './boot-overlay.mjs';

// Executa o veredito real com medições controladas. Não substitui o browser.
const source = readFileSync(new URL('./boot-orcamento-check.mjs', import.meta.url), 'utf8');
const anchor = 'let saida=1;';
assert.equal(source.split(anchor).length - 1, 1, 'veredito real único');
assert.equal(source.split('process.exit(saida);').length - 1, 1, 'saída real única');
const start = source.indexOf(anchor), end = source.indexOf('process.exit(saida);', start) + 'process.exit(saida);'.length;
assert.ok(start > 0 && end > start && source.slice(end).trim() === '', 'veredito real completo');
assert.ok(source.includes('const TETO_BYTES = 8_200_000;') && source.includes('const TETO_REQS = 340;'), 'tetos atuais preservados');
const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
const verdict = new AsyncFunction('mede', 'BASE', 'MUTANTE', 'TETO_BYTES', 'TETO_REQS', 'browser', 'process', 'console', 'aceitaMutante', 'assertSnapshotLive', 'SNAPSHOT', source.slice(start, end));
const healthy = { causa: 'assets', portao: 100, bytes: 1, reqs: 1, cartazes: 1, ultimoProp: 10, primeiraFauna: 20, erros: [] };
let cases = 0;
for (const mutant of ['', 'cartaz-ansioso', 'fauna-cedo']) {
  const scenarios = [
    { name: 'healthy', expected: mutant ? 1 : 0 },
    { name: 'candidate-failsafe', nominal: { causa: 'failsafe' }, expected: 1, stopsNominal: true },
    { name: 'reference-failsafe', reference: { causa: 'failsafe' }, expected: 1, stopsNominal: true },
    { name: 'pageerror', measurementError: 'nominal', expected: 3 },
    { name: 'reference-measurement-error', measurementError: 'reference', expected: 3 },
    { name: 'snapshot-error', snapshotError: true, expected: 3 },
  ];
  if (mutant) scenarios.push(
    { name: 'unrelated-budget', candidate: { bytes: 9000000 }, expected: 1 },
    { name: 'target', candidate: mutant === 'cartaz-ansioso' ? { cartazes: 2 } : { primeiraFauna: 5 }, expected: 0 },
    { name: 'wrong-target', candidate: mutant === 'cartaz-ansioso' ? { primeiraFauna: 5 } : { cartazes: 2 }, expected: 1 },
    { name: 'nominal-budget', nominal: { bytes: 9000000 }, expected: 1, stopsNominal: true },
    { name: 'nominal-posters', nominal: { cartazes: 2 }, expected: 1, stopsNominal: true },
    { name: 'nominal-fauna', nominal: { primeiraFauna: 5 }, expected: 1, stopsNominal: true },
    { name: 'mutant-candidate-failsafe', candidate: { causa: 'failsafe' }, expected: 1 },
    { name: 'mutant-measurement-error', measurementError: 'mutant', expected: 3 },
    { name: 'target-with-budget', candidate: mutant === 'cartaz-ansioso' ? { cartazes: 2, bytes: 9000000 } : { primeiraFauna: 5, bytes: 9000000 }, expected: 0 },
  );
  for (const scenario of scenarios) {
    const label = `${mutant || 'normal'}/${scenario.name}`;
    const calls = [], errors = [], snapshotArgs = [];
    let exit = -1, exits = 0, closed = 0, injected = false;
    const nominal = { ...healthy, ...scenario.nominal };
    const reference = { ...healthy, cartazes: 2, ...scenario.reference };
    const candidate = { ...healthy, ...scenario.candidate };
    const snapshot = Object.freeze({ fixture: label });
    await verdict(async options => {
      let phase;
      if (options === undefined) phase = 'nominal';
      else if (options && options.refPoolAnsioso === true && Object.keys(options).length === 1) phase = 'reference';
      else if (options && options.mutante === mutant && mutant && Object.keys(options).length === 1) phase = 'mutant';
      else throw new Error('fixture unexpected measurement options');
      calls.push(phase);
      if (scenario.measurementError === phase) { injected = true; throw new Error('fixture measurement rejected'); }
      return phase === 'nominal' ? nominal : phase === 'reference' ? reference : candidate;
    }, 'fixture', mutant, 8200000, 340,
      { close: async () => { closed++; } },
      { exit: code => { exit = code; exits++; } },
      { log() {}, error: message => errors.push(message) },
      aceitaMutante,
      value => { snapshotArgs.push(value); if (scenario.snapshotError) throw new Error('fixture snapshot rejected'); },
      snapshot);
    const expectedCalls = scenario.measurementError === 'nominal' ? ['nominal']
      : scenario.measurementError === 'reference' || scenario.stopsNominal || !mutant ? ['nominal', 'reference']
      : ['nominal', 'reference', 'mutant'];
    assert.deepEqual(calls, expectedCalls, `${label}: nominal e referência precedem o mutante`);
    assert.equal(exit, scenario.expected, label);
    assert.equal(exits, 1, `${label}: saída única`);
    assert.equal(closed, 1, `${label}: browser fechado`);
    assert.equal(snapshotArgs.length, 1, `${label}: snapshot final verificado`);
    assert.equal(snapshotArgs[0], snapshot, `${label}: identidade do snapshot preservada`);
    if (scenario.stopsNominal) assert.deepEqual(errors, ['RED nominal; mutante não aplicado'], label);
    if (scenario.measurementError) {
      assert.equal(injected, true, `${label}: erro de medição realmente injetado`);
      assert.ok(errors.includes('INFRA3 sem veredito: fixture measurement rejected'), label);
    }
    if (scenario.snapshotError) assert.ok(errors.includes('INFRA3 snapshot final: fixture snapshot rejected'), label);
    cases++;
  }
}
assert.equal(cases, 36);
console.log('✓ 36 vereditos reais: nominal antes do mutante; alvo causal e cofalha de orçamento seguem a política real; medição/snapshot são INFRA3');
