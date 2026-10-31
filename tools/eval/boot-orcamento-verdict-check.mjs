import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Executa o veredito real com medições controladas. Não substitui o browser.
const source = readFileSync(new URL('./boot-orcamento-check.mjs', import.meta.url), 'utf8');
const start = source.indexOf('let saida = 1;');
assert.ok(start > 0, 'veredito real encontrado');
const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
const verdict = new AsyncFunction('mede', 'BASE', 'MUTANTE', 'TETO_BYTES', 'TETO_REQS', 'browser', 'process', 'console', source.slice(start));
const healthy = { causa: 'assets', portao: 100, bytes: 1, reqs: 1, cartazes: 1, ultimoProp: 10, primeiraFauna: 20, erros: [] };
let cases = 0;
for (const mutant of ['', 'cartaz-ansioso', 'fauna-cedo']) {
  const scenarios = [
    ['healthy', {}, {}, mutant ? 1 : 0],
    ['candidate-failsafe', { causa: 'failsafe' }, {}, 1],
    ['reference-failsafe', {}, { causa: 'failsafe' }, 1],
    ['pageerror', { erros: ['controlled'] }, {}, 1],
  ];
  if (mutant) scenarios.push(
    ['unrelated-budget', { bytes: 9000000 }, {}, 1],
    ['target', mutant === 'cartaz-ansioso' ? { cartazes: 2 } : { primeiraFauna: 5 }, {}, 0],
    ['wrong-target', mutant === 'cartaz-ansioso' ? { primeiraFauna: 5 } : { cartazes: 2 }, {}, 1],
  );
  for (const [name, candidate, reference, expected] of scenarios) {
    let exit = -1;
    const cand = { ...healthy, ...candidate }, ref = { ...healthy, cartazes: 2, ...reference };
    await verdict(async opt => opt ? ref : cand, 'fixture', mutant, 8200000, 340,
      { close: async () => {} }, { exit: code => { exit = code; } }, { log() {}, error() {} });
    assert.equal(exit, expected, `${mutant || 'normal'}/${name}`);
    cases++;
  }
}
assert.equal(cases, 18);
console.log('✓ 18 vereditos reais: só regressão alvo prova mutação; falhas de medição são rejeitadas');
