import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

/* #1383: a queda do socket no meio do preload zera `mpSessao`; o roster tem que sair da sessão
   que o lançamento capturou, não do global. */
const main = fs.readFileSync(new URL('../public/js/main.js', import.meta.url), 'utf8');
const ini = main.indexOf('function rosterDoServidor(');
const fim = main.indexOf('\n}\n', ini);
assert.ok(ini > 0 && fim > ini, 'rosterDoServidor não encontrado no main.js');

test('roster usa a sessão capturada mesmo depois da queda', () => {
  const ctx = vm.createContext({ mpSessao: null, CHARACTERS: [{ id: 'a' }, { id: 'b' }] });
  vm.runInContext(main.slice(ini, fim + 2), ctx);
  const sessao = { net: { yourEnt: 1, meta: { roster: [
    { id: 1, team: 'E', char: 'a' }, { id: 2, team: 'E', char: 'b' }, { id: 3, team: 'B', char: 'a' },
  ] } } };
  const chamada = main.match(/\?\s*rosterDoServidor\(([^)]*)\)/)[1];
  assert.equal(chamada.split(',')[0].trim(), 'sessao', '_startGame passa a sessão capturada');
  const r = vm.runInContext('rosterDoServidor', ctx)(sessao, 'E', 'a');
  assert.deepEqual(r.allyDefs.map((d) => d.id), ['b']);
  assert.deepEqual(r.enemyDefs.map((d) => d.id), ['a']);
});
