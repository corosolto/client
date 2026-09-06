/* src/lib/api-proxy.mjs: o proxy da rede de segurança repassa a geo da borda da Vercel
   (x-vercel-ip-*) e continua NÃO repassando cookie/authorization. Sem a geo, city_daily e
   presence.city morrem em silêncio no backend (api/_lib/geo.ts lê esses headers). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proxyApiRequest } from '../../../src/lib/api-proxy.mjs';

test('proxy: repassa x-vercel-ip-* e x-forwarded-for; barra cookie e authorization', async () => {
  let visto = null;
  const fetchFn = async (url, init) => { visto = { url, headers: Object.fromEntries(init.headers.entries()) }; return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }); };
  const req = new Request('https://www.csbrasil.online/api/telemetry', { method: 'POST', body: '{}', headers: {
    'content-type': 'application/json', cookie: 'sessao=segredo', authorization: 'Bearer x',
    'x-vercel-ip-country': 'BR', 'x-vercel-ip-city': 'S%C3%A3o%20Paulo', 'x-vercel-ip-latitude': '-23.55', 'x-vercel-ip-longitude': '-46.63',
  } });
  const r = await proxyApiRequest(req, 'https://backend.invalid/api/telemetry', '203.0.113.9', fetchFn);
  assert.equal(r.status, 200);
  assert.equal(visto.headers['x-vercel-ip-country'], 'BR');
  assert.equal(visto.headers['x-vercel-ip-city'], 'S%C3%A3o%20Paulo');
  assert.equal(visto.headers['x-vercel-ip-latitude'], '-23.55');
  assert.equal(visto.headers['x-forwarded-for'], '203.0.113.9');
  assert.equal(visto.headers.cookie, undefined, 'cookie não pode subir');
  assert.equal(visto.headers.authorization, undefined, 'authorization não pode subir');
});
