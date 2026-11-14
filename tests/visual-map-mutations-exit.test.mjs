import assert from 'node:assert/strict';
import test from 'node:test';
import { classificarFalhaMutante } from '../tools/eval/visual-map-mutations.mjs';

test('visual-map wrapper preserves measured blind verdicts', () => {
  assert.equal(classificarFalhaMutante({ status: 3 }), 3);
});

test('visual-map wrapper separates semantic failures from infrastructure failures', () => {
  assert.equal(classificarFalhaMutante({ status: 0 }), 1);
  assert.equal(classificarFalhaMutante({ status: 1 }), 1);
  assert.equal(classificarFalhaMutante({ status: 2 }), 78);
  assert.equal(classificarFalhaMutante({ status: 78 }), 78);
  assert.equal(classificarFalhaMutante({ status: null, signal: 'SIGTERM' }), 78);
  assert.equal(classificarFalhaMutante({ status: null, error: new Error('spawn failed') }), 78);
});
