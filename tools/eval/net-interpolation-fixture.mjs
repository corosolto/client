/* Fixtures pequenos e sem Three.js para os cenários determinísticos do buffer de rede. */
export function injectedClock(startMs = 1000) {
  let nowMs = startMs;
  return {
    now: () => nowMs,
    set(value) { nowMs = value; },
    advance(deltaMs) { nowMs += deltaMs; return nowMs; },
  };
}

export function interpolationEntity() {
  return { pos: { x: 0, y: 0, z: 0 }, yaw: 0, _netPitch: 0, mantleF: -1 };
}

export function interpolationSample(x, yaw = 0, pitch = 0, mantleF = -1) {
  return { x, y: 0, z: 0, yaw, pitch, mantleF };
}

// O relógio local é em milissegundos; o `t` do snapshot de produção permanece em segundos.
export function interpolationSnapshot(tSeconds, tick, x = 0) {
  return { t: tSeconds, tick, ents: [{ id: 6, ...interpolationSample(x) }] };
}
