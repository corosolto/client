// Rede de segurança e caminho do preview para as rotas que mudaram de casa. Ver docs/APIS.md.
import type { APIRoute } from 'astro';
import { proxyApiRequest } from '../../lib/api-proxy.mjs';

export const prerender = false;

const BACKEND = import.meta.env.PUBLIC_API_BASE || 'https://csbrasil-backend-hupd3weo5q-rj.a.run.app';

const MIGRADAS = new Set([
  'acquisition', 'avatar', 'feedback', 'funnel', 'health', 'heartbeat', 'jserror',
  'leaderboard', 'map-plays', 'match', 'mp-ticket', 'online', 'perf', 'pick', 'presence', 'register',
  'submit-match', 'telemetry', 'train-frames',
]);

const handler: APIRoute = async ({ params, url, request, clientAddress }) => {
  const rota = String(params.rota || '').replace(/\/+$/, '');
  if (!MIGRADAS.has(rota)) {
    return new Response(JSON.stringify({ error: 'not_found', path: url.pathname }), {
      status: 404, headers: { 'content-type': 'application/json' },
    });
  }
  return proxyApiRequest(
    request,
    `${BACKEND.replace(/\/$/, '')}/api/${rota}${url.search}`,
    clientAddress,
  );
};

export const GET = handler;
export const POST = handler;
