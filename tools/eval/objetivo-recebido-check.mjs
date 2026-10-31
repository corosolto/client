import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { instrumentarObjetivo, objetivoConsumido, capturarObjetivoAtual } from './objetivo-recebido.mjs';

const source = fs.readFileSync(new URL('../../public/js/netgame.js', import.meta.url), 'utf8');
for (const omitir of [false, true]) {
  const incoming = { wave: 3, clock: 42, dominio: .5, kills: 9 };
  let applied = { ...incoming }, calls = 0;
  const objective = { applyNetState(net) { calls++; applied = { ...net }; }, netState: () => applied };
  const net = { snap: { tick: 7, state: 'live', ents: [], objective: incoming }, startPing() {} };
  const context = vm.createContext({ performance, setInterval() {}, clearInterval() {} });
  const code = instrumentarObjetivo(source, omitir).replace(/^import .*;\s*$/gm, '').replace('export function makeNetcode', 'function makeNetcode');
  vm.runInContext(`${code}\nglobalThis.make = makeNetcode;`, context);
  const adapter = context.make({ state: 'live', objective }, net);
  adapter._netMap.set(1, {}); adapter._netTick = 7;
  adapter.applySnapshot();
  assert.equal(calls, omitir ? 0 : 1);
  assert.equal(objetivoConsumido(context.__objetivoRecebido, net.snap), !omitir,
    'OBJ3 confundiu estado local pré-existente com consumo de snapshot');
  if (!omitir) {
    const consumo = context.__objetivoRecebido;
    const stale = vm.runInNewContext(`(${capturarObjetivoAtual.toString()})()`, {
      window: { __game: { _mp: { net: { snap: { ...net.snap, tick: 8 } } } } },
      __objetivoRecebido: consumo,
    });
    assert.equal(stale.snap.tick, 8);
    assert.equal(objetivoConsumido(stale.consumo, stale.snap), false);
  }
  assert.equal(objetivoConsumido({ tick: 1, recebido: {}, aplicado: {} }, { tick: 1, objective: {} }), false);
}
console.log('OBJ3 verde: consumo real, tick atual e omissão detectados');
