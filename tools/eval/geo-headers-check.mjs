import assert from 'node:assert/strict';
import { geoFrom } from '../../src/lib/geo.ts';

const requisicao = (headers = {}) => new Request('https://www.corosolto.com.br/api/presence', { headers });

assert.deepEqual(
  geoFrom(
    requisicao({
      'cf-ipcountry': 'BR',
      'cf-ipcity': 'S%C3%A3o%20Paulo',
      'cf-iplatitude': '-23.5505',
      'cf-iplongitude': '-46.6333',
    }),
  ),
  { city: 'São Paulo', country: 'BR', lat: -23.5505, lon: -46.6333 },
  'headers Cloudflare não chegaram à geografia persistida',
);

assert.deepEqual(
  geoFrom(
    requisicao({
      'cf-ipcountry': 'BR',
      'cf-ipcity': 'Curitiba',
      'x-vercel-ip-country': 'US',
      'x-vercel-ip-city': 'Miami',
    }),
  ),
  { city: 'Curitiba', country: 'BR', lat: null, lon: null },
  'a borda Cloudflare não teve precedência no domínio que ela atende',
);

assert.deepEqual(
  geoFrom(requisicao({ 'x-vercel-ip-country': 'PT', 'x-vercel-ip-city': 'Lisbon' })),
  { city: 'Lisbon', country: 'PT', lat: null, lon: null },
  'o fallback Vercel deixou de funcionar',
);

assert.deepEqual(
  geoFrom(requisicao({ 'cf-ipcountry': 'XX', 'x-vercel-ip-country': 'PT', 'x-vercel-ip-city': 'Porto' })),
  { city: 'Porto', country: 'PT', lat: null, lon: null },
  'país desconhecido na Cloudflare bloqueou o fallback Vercel',
);

assert.deepEqual(
  geoFrom(requisicao({ 'cf-ipcountry': 'BR', 'x-vercel-ip-city': 'Ashburn' })),
  { city: null, country: 'BR', lat: null, lon: null },
  'cidade do POP da Vercel foi atribuída ao visitante atrás da Cloudflare',
);

assert.deepEqual(
  geoFrom(requisicao({ 'cf-ipcountry': 'BR', 'cf-ipcity': 'S%C3%A3o%' })),
  { city: 'S%C3%A3o%', country: 'BR', lat: null, lon: null },
  'encoding incompleto no header derrubou a coleta',
);

assert.equal(geoFrom(requisicao()), null, 'requisição sem borda inventou localização');

console.log('geo headers: Cloudflare prioritária, Vercel preservada e ausência explícita');
