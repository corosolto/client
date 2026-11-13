import assert from 'node:assert/strict';
import test from 'node:test';
import { carregarModuloComRetry } from '../public/js/module-retry.js';

test('transient module download failure retries once with the recovery URL', async () => {
  const calls = [];
  const result = await carregarModuloComRetry(
    async () => { calls.push('initial'); throw new TypeError('Failed to fetch dynamically imported module'); },
    async () => { calls.push('retry'); return { ready: true }; },
    { dormir: async () => calls.push('wait') },
  );
  assert.deepEqual(calls, ['initial', 'wait', 'retry']);
  assert.equal(result.ready, true);
});

test('module syntax failures are not retried as network failures', async () => {
  let retries = 0;
  await assert.rejects(
    carregarModuloComRetry(
      async () => { throw new SyntaxError('Unexpected token'); },
      async () => { retries++; },
      { dormir: async () => {} },
    ),
    SyntaxError,
  );
  assert.equal(retries, 0);
});
