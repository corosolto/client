// Borda Cloudflare Workers (`ADAPTER=cloudflare`). O IP real chega em `cf-connecting-ip`;
// `waitUntil` vive em `locals.cfContext` (@astrojs/cloudflare 14; `locals.runtime` saiu no Astro 6).
import { isIP } from 'node:net';
import type { Borda } from './contrato';

export const borda = {
  nome: 'cloudflare',
  ipDoCliente(request) {
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '';
    return isIP(ip) ? ip : null;
  },
  agendar(locals, promessa) {
    const ctx = 'cfContext' in locals ? locals.cfContext : null;
    if (ctx && typeof ctx === 'object' && 'waitUntil' in ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(promessa);
    else void promessa.catch(() => {});
  },
} satisfies Borda;
