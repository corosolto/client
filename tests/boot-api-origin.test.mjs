import assert from 'node:assert/strict';
import { test } from 'node:test';
import http from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { startBootOrigin, snapshotPublicJs, assertSnapshotLive } from '../tools/eval/boot-network-origin.mjs';

test('boot preserves candidate assets, explicit public API and security boundaries', async t => {
  const directory = mkdtempSync(path.join(tmpdir(), 'boot-api-origin-'));
  mkdirSync(path.join(directory, 'js'));
  const version = "export const VERSION = 'fixture';\n";
  writeFileSync(path.join(directory, 'js/version.js'), version);
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const snapshot = snapshotPublicJs(directory);
  const servers = [];
  for (const name of ['candidate', 'public-api']) {
    const requests = [];
    const server = http.createServer(async (req, res) => {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      requests.push({ path: req.url, method: req.method, headers: req.headers, body: Buffer.concat(chunks).toString() });
      res.setHeader('content-type', 'application/json');
      if (req.method === 'POST') { res.writeHead(403); res.end('{"error":"origin_invalid"}'); }
      else res.end(JSON.stringify({ name, path: req.url }));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    servers.push({ name, requests, url: `http://127.0.0.1:${server.address().port}` });
  }
  const [candidate, api] = servers;
  const open = async options => {
    const origin = await startBootOrigin({ BASE: candidate.url, snapshot, ...options });
    t.after(() => origin.close());
    return origin;
  };
  const plain = await open({ BASE: candidate.url + '/?candidate=1' });
  assert.equal((await (await fetch(plain.url + '/api/online')).json()).name, 'candidate');
  const split = await open({ API_BASE: api.url });
  for (const endpoint of ['/', '/posters/fixture.jpg']) {
    const response = await fetch(split.url + endpoint);
    assert.equal((await response.json()).name, 'candidate');
  }
  assert.equal((await (await fetch(split.url + '/api/online')).json()).name, 'public-api');
  const body = '{"action":"invite-health","version":"fixture"}';
  await fetch(plain.url + '/api/treta', { method: 'POST', headers: { 'content-type': 'application/json' }, body });
  assert.equal(candidate.requests.find(r => r.method === 'POST').headers.origin, candidate.url);
  const response = await fetch(split.url + '/api/treta', { method: 'POST', headers: {
    'content-type': 'application/json', cookie: 'fixture=only', authorization: 'Bearer fixture-only',
  }, body });
  assert.equal(response.status, 403);
  assert.equal(await response.text(), '{"error":"origin_invalid"}');
  const record = split.byId.get(response.headers.get('x-boot-response-id'));
  assert.equal(record.upstreamOrigin, api.url);
  assert.equal(record.decodedBytes, 26);
  assert.equal(record.sha256, '6c5c56d337baf954314707d2be459b9cee4711c9d2d10912e2f19233bd180505');
  const heartbeat = api.requests.find(r => r.method === 'POST');
  assert.equal(heartbeat.headers.origin, api.url);
  assert.equal(heartbeat.body, body);
  for (const requests of [api.requests, candidate.requests]) for (const request of requests) {
    assert.equal(request.headers.cookie, undefined);
    assert.equal(request.headers.authorization, undefined);
  }
  const count = candidate.requests.length + api.requests.length;
  for (const endpoint of ['/api/admin', '/api/treta?extra=1']) assert.equal((await fetch(split.url + endpoint)).status, 403);
  assert.equal((await fetch(split.url + '/api/social', { method: 'POST' })).status, 405);
  assert.equal(await (await fetch(split.url + '/js/version.js')).text(), version);
  assert.equal((await fetch(split.url + '/js/missing.js')).status, 404);
  assert.equal(candidate.requests.length + api.requests.length, count);
  for (const invalid of ['ftp://127.0.0.1', api.url + '/api', api.url + '?x=1', api.url + '#x', api.url.replace('://', '://fixture@')]) {
    await assert.rejects(async () => {
      const unexpected = await startBootOrigin({ BASE: candidate.url, API_BASE: invalid, snapshot });
      await unexpected.close();
    });
  }
  writeFileSync(path.join(directory, 'js/version.js'), version + '\n');
  assert.throws(() => assertSnapshotLive(snapshot), /snapshot public\/js mudou/);
});
