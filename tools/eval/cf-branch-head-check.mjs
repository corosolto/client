#!/usr/bin/env node
import assert from 'node:assert/strict';
import { assertBranchHead } from '../cf/assert-branch-head.mjs';

const esperado = 'a'.repeat(40);
const novo = 'b'.repeat(40);
const base = {
  branch: 'main',
  sha: esperado,
  repository: 'corosolto/client',
  token: 'sentinela',
  apiUrl: 'https://api.example.test',
};
let request = null;
const atual = await assertBranchHead({
  ...base,
  fetchImpl: async (url, init) => {
    request = { url, init };
    return new Response(JSON.stringify({ object: { sha: esperado } }), { status: 200 });
  },
});
assert.equal(atual, esperado);
assert.equal(request.url, 'https://api.example.test/repos/corosolto/client/git/ref/heads/main');
assert.equal(request.init.headers.authorization, 'Bearer sentinela');

await assert.rejects(
  assertBranchHead({ ...base, fetchImpl: async () => new Response(JSON.stringify({ object: { sha: novo } }), { status: 200 }) }),
  /deploy obsoleto bloqueado/,
);
await assert.rejects(
  assertBranchHead({ ...base, fetchImpl: async () => new Response('indisponível', { status: 503 }) }),
  /HTTP 503/,
);
await assert.rejects(
  assertBranchHead({ ...base, token: '' }),
  /GITHUB_TOKEN ausente/,
);
console.log('PASS CF-BRANCH-HEAD: candidato obsoleto nunca chega à promoção');
