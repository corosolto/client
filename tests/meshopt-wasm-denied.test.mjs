import assert from 'node:assert/strict';
import { test } from 'node:test';

const nextTurn = () => new Promise((resolve) => setImmediate(resolve));

test('decoder Meshopt observa a rejeição imediata quando o embedder proíbe WASM', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'WebAssembly');
  const real = globalThis.WebAssembly;
  const denied = new Error('Wasm code generation disallowed by embedder');
  const unhandled = [];
  const onUnhandled = (reason) => unhandled.push(reason);

  const blocked = new Proxy(real, {
    get(target, property, receiver) {
      if (property === 'instantiate') return () => Promise.reject(denied);
      const value = Reflect.get(target, property, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });

  process.on('unhandledRejection', onUnhandled);
  Object.defineProperty(globalThis, 'WebAssembly', {
    configurable: true,
    writable: true,
    value: blocked,
  });

  try {
    const url = new URL('../public/vendor/meshopt_decoder.module.js', import.meta.url);
    url.searchParams.set('wasm-denied', String(Date.now()));
    const { MeshoptDecoder } = await import(url.href);
    await nextTurn();
    assert.deepEqual(unhandled, [], 'a inicialização proibida não pode escapar como rejeição global');
    await assert.rejects(MeshoptDecoder.ready, /disallowed by embedder/,
      'consumidores ainda recebem a falha e acionam seus fallbacks');
  } finally {
    process.off('unhandledRejection', onUnhandled);
    Object.defineProperty(globalThis, 'WebAssembly', descriptor);
  }
});
