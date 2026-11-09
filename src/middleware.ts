// Porta de `middleware.js` (proxy da Vercel) para o Astro, ligada só no Workers: na Vercel o
// proxy já conta o tráfego de toda requisição e este `onRequest` devolve `next()` sem tocar nada.
import { defineMiddleware } from 'astro:middleware';
import { borda } from '#borda';
import { backendUrl } from './lib/env-runtime';
import { trafficEntry, uniqueRegister } from './lib/server-traffic.mjs';

// Env lida POR REQUISIÇÃO: no Workers a ponte do src/cf/worker.ts copia [vars] e
// secrets do binding para process.env; segredo nunca inlinado pelo import.meta.env.

export const onRequest = defineMiddleware((context, next) => {
  const { request } = context;
  const entry = trafficEntry(request);
  const secret = process.env.API_PROXY_SECRET;
  if (entry && secret && secret.length >= 32) {
    // No Workers o IP já é o do visitante (cf-connecting-ip); não há salto de CDN para desfazer.
    const visitorIp = borda.ipDoCliente(request);
    const day = new Date().toISOString().slice(0, 10);
    const unique = entry.kind === 'browser'
      ? uniqueRegister(visitorIp, request.headers.get('user-agent'), secret, day)
      : null;
    borda.agendar(context.locals, fetch(`${backendUrl().replace(/\/$/, '')}/api/server-traffic`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-csb-proxy-auth': secret },
      body: JSON.stringify({ ...entry, unique }),
      signal: AbortSignal.timeout(5000),
    }).then((response) => {
      if (!response.ok) console.error('[server-traffic] ingest status', response.status);
    }).catch((error) => console.error('[server-traffic] ingest unavailable', error?.name || 'error')));
  }
  return next();
});
