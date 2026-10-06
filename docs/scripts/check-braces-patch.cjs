'use strict';

const assert = require('node:assert/strict');
const braces = require('braces');

assert.equal(require('braces/package.json').version, '3.0.4-csbrasil.0');
assert.deepEqual(braces.expand('{a,b}'), ['a', 'b']);

const nested = '{'.repeat(4000) + 'a,b' + '}'.repeat(4000);
for (const parse of [braces, braces.expand]) {
  assert.throws(
    () => parse(nested),
    error => error instanceof SyntaxError && /Input depth/.test(error.message),
  );
}

console.log('braces: expansão normal e limite de profundidade passaram');
