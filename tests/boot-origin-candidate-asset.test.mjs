import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { startBootOrigin } from '../tools/eval/boot-network-origin.mjs';

// Produção ainda sem a mídia nova do candidato: o proxy serve o arquivo de public/ e só ele.
test('mídia nova do candidato vem de public/ quando a produção responde 404', async (t) => {
  const upstream = http.createServer((req, res) => { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('nope'); });
  await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${upstream.address().port}/`;
  const origin = await startBootOrigin({ BASE: base, API_BASE: base, publicRoot: new URL('../public/', import.meta.url) });
  t.after(async () => { await origin.close(); upstream.close(); });

  const arte = '/img/mode-announcements/flavio-embarque-card.webp';
  const ok = await fetch(origin.url + arte);
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('x-boot-origin'), 'local-candidate-asset');
  assert.equal(ok.headers.get('content-type'), 'image/webp');
  assert.deepEqual(Buffer.from(await ok.arrayBuffer()), readFileSync(new URL('../public' + arte, import.meta.url)));
  assert.equal(origin.requests.at(-1).kind, 'local-candidate-asset');

  const ausente = await fetch(origin.url + '/img/mode-announcements/nao-existe.webp');
  assert.equal(ausente.status, 404, 'arquivo que não existe em public/ continua 404');
  const html = await fetch(origin.url + '/sobre');
  assert.equal(html.status, 404, 'só mídia de /img/ cai no candidato local');
});
