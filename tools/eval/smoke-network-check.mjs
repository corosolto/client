import assert from 'node:assert/strict';
import test from 'node:test';
import { nosso } from './smoke-network.mjs';

const host = 'www.csbrasil.online';

await test('erro HTTP do próprio host reprova', () => {
  assert.equal(nosso({ kind: 'response', status: 404, url: `https://${host}/img/missing.webp` }, { host }), true);
});

await test('caminho ou query com nome de terceiro não esconde erro do próprio host', () => {
  for (const [status, url] of [
    [404, `https://${host}/img/facebook-missing.webp`],
    [500, `https://${host}/img/missing.webp?origem=twitter.com`],
  ]) {
    assert.equal(nosso({ kind: 'response', status, url }, { host }), true, `${status}: ${url}`);
  }
});

await test('erro HTTP cross-origin é ruído do backend, não do deploy do site', () => {
  assert.equal(nosso({ kind: 'response', status: 503, url: 'https://backend.example.run.app/api/online' }, { host }), false);
});

await test('503 same-origin do proxy /api/* é ruído do backend, não do deploy do site', () => {
  assert.equal(nosso({ kind: 'response', status: 503, url: `https://${host}/api/treta` }, { host }), false);
});


await test('ERR_ABORTED sem resposta bem-sucedida continua visível', () => {
  assert.equal(nosso({ kind: 'requestfailed', url: `https://${host}/img/critical.webp`, error: 'net::ERR_ABORTED' }, { host }), true);
});

await test('ERR_ABORTED depois de resposta bem-sucedida não duplica falha', () => {
  const url = `https://${host}/img/critical.webp`;
  assert.equal(nosso({ kind: 'requestfailed', url, error: 'net::ERR_ABORTED' }, { host, respostasOk: new Set([url]) }), false);
});

await test('erro de terceiro não reprova o deploy', () => {
  assert.equal(nosso({ kind: 'console', text: `Refused to load https://static.ads-twitter.com/uwt.js` }, { host }), false);
  assert.equal(nosso({ kind: 'response', status: 500, url: 'https://www.facebook.com/tr' }, { host }), false);
});

await test('ruído do servidor local só é filtrado no ensaio local', () => {
  const evento = { kind: 'console', text: `Failed to load http://${host}/@vite/client` };
  assert.equal(nosso(evento, { host, ensaioLocal: true }), false);
  assert.equal(nosso(evento, { host, ensaioLocal: false }), true);
});
