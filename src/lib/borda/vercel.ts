// Borda Vercel (default). O middleware do Astro é no-op aqui: `middleware.js` (proxy da Vercel)
// já conta o tráfego de todas as requisições, inclusive estáticas.
import { ipAddress, waitUntil } from '@vercel/functions';
import { isIP } from 'node:net';
import type { Borda } from './contrato';
import { geoDaBorda } from './geo';

export const borda = {
  nome: 'vercel',
  ipDoCliente(request) {
    const ip = ipAddress(request) || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '';
    return isIP(ip) ? ip : null;
  },
  geoDoCliente(request) {
    return geoDaBorda(request, 'vercel');
  },
  agendar(_locals, promessa) {
    waitUntil(promessa);
  },
} satisfies Borda;
