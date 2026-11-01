import assert from 'node:assert/strict';

export function instrumentarObjetivo(source, omitir = false) {
  const call = 'if (snap.objective) game.objective?.applyNetState?.(snap.objective);';
  assert.equal(source.split(call).length, 2, 'chamada real de applyNetState mudou');
  let result = source.replace(call, `if (snap.objective) {
      game.objective?.applyNetState?.(snap.objective);
      if (game.objective?.applyNetState) globalThis.__objetivoRecebido = {
        tick: snap.tick, recebido: snap.objective, aplicado: game.objective.netState?.(),
        snapshot: { tick: snap.tick, objective: snap.objective }
      };
    }`);
  if (omitir) {
    assert.equal(result.split('const snap = net.snap;').length, 2, 'entrada do snapshot mudou');
    result = result.replace('const snap = net.snap;', 'const snap = { ...net.snap, objective: null };');
  }
  return result;
}

export function objetivoConsumido(evidence, snap) {
  const received = snap?.objective, applied = evidence?.aplicado;
  return !!received && typeof received === 'object' && Object.keys(received).length > 0
    && !!applied && evidence.tick === snap.tick
    && JSON.stringify(evidence.recebido) === JSON.stringify(received)
    && ['wave', 'clock', 'dominio', 'kills'].every(key => applied[key] === received[key]);
}

export function capturarObjetivoAtual() {
  const net = window.__game._mp.net;
  return {
    protocolo: net.ws?.protocol || '', snapshotHz: net.stats?.hz | 0,
    payloadPresente: !!net.snap?.objective,
    snap: net.snap ? { tick: net.snap.tick, objective: net.snap.objective } : null,
    consumo: globalThis.__objetivoRecebido || null,
  };
}
