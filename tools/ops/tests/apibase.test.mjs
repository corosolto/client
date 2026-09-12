/* fetchComRetry (public/js/apibase.js) em node, com fetch stubado: o cold start do Cloud Run
   é 503 na 1ª chamada e 200 na 2ª; a régua cobra que o menu tente de novo, que 4xx não
   repita e que a espera cresça. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fetchComRetry } from '../../../public/js/apibase.js';

const resp = (status) => ({ status, ok: status >= 200 && status < 300 });
function stub(seq) {
  const chamadas = []; const esperas = [];
  const fetchFn = async (url) => { chamadas.push(url); const x = seq.shift(); if (x instanceof Error) throw x; return resp(x); };
  return { chamadas, esperas, fetchFn, dorme: async (ms) => { esperas.push(ms); } };
}

test('retry: 503 depois 200 → duas chamadas, espera de 400 ms, resposta ok', async () => {
  const s = stub([503, 200]);
  const r = await fetchComRetry('/api/online', {}, s);
  assert.equal(r.status, 200); assert.equal(s.chamadas.length, 2); assert.deepEqual(s.esperas, [400]);
});

test('retry: falha de rede depois 200 → tenta de novo', async () => {
  const s = stub([new TypeError('Failed to fetch'), 200]);
  assert.equal((await fetchComRetry('/api/map-plays', {}, s)).status, 200);
  assert.equal(s.chamadas.length, 2);
});

test('retry: 404 não repete; 3× 503 devolve o último com esperas 400 e 800; 3× rede lança', async () => {
  const a = stub([404, 200]);
  assert.equal((await fetchComRetry('/x', {}, a)).status, 404); assert.equal(a.chamadas.length, 1);
  const b = stub([503, 502, 503]);
  assert.equal((await fetchComRetry('/x', {}, b)).status, 503); assert.equal(b.chamadas.length, 3); assert.deepEqual(b.esperas, [400, 800]);
  const c = stub([new Error('a'), new Error('b'), new Error('c')]);
  await assert.rejects(fetchComRetry('/x', {}, c), /c/);
});

test('main.js: os contadores do menu (/api/online e /api/map-plays) passam pelo retry', () => {
  const src = readFileSync(fileURLToPath(new URL('../../../public/js/main.js', import.meta.url)), 'utf8');
  assert.match(src, /fetchComRetry\(apiUrl\('\/api\/online'\)\)/, '/api/online sem retry');
  assert.match(src, /fetchComRetry\(apiUrl\('\/api\/map-plays'\)\)/, '/api/map-plays sem retry');
  assert.match(src, /import \{[^}]*fetchComRetry[^}]*\} from '\.\/apibase\.js'/, 'main.js não importa fetchComRetry');
});
