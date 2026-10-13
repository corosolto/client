// Rede de segurança e caminho do preview para as rotas que mudaram de casa. Ver docs/APIS.md.
import type { APIRoute } from 'astro';
import { proxyApiRequest } from '../../lib/api-proxy.mjs';

export const prerender = false;

const BACKEND = import.meta.env.PUBLIC_API_BASE || 'https://csbrasil-backend-hupd3weo5q-rj.a.run.app';
// Prova ao backend que a geo/IP vieram deste proxy (api/_lib/borda.mjs no backend).
const SEGREDO = import.meta.env.API_PROXY_SECRET || '';

const MIGRADAS = new Set([
  'social','social-auth','social-avatar','acquisition', 'avatar', 'feedback', 'funnel', 'health', 'heartbeat', 'jserror',
  'leaderboard', 'map-plays', 'match', 'mp-ticket', 'online', 'perf', 'pick', 'presence', 'register',
  'submit-match', 'telemetry', 'train-frames',
]);

/* social/social-auth/social-avatar dependem do rollout do backend#70; enquanto ele não
   chega, o 404 upstream é indisponibilidade (503), não rota do site quebrada. */
const EM_ROLLOUT = ['social', 'social-auth', 'social-avatar'];

const handler: APIRoute = async ({ params, url, request, clientAddress }) => {
  const rota = String(params.rota || '').replace(/\/+$/, '');
  if (!MIGRADAS.has(rota)) {
    return new Response(JSON.stringify({ error: 'not_found', path: url.pathname }), {
      status: 404, headers: { 'content-type': 'application/json' },
    });
  }
  const resposta = await proxyApiRequest(
    request,
    `${BACKEND.replace(/\/$/, '')}/api/${rota}${url.search}`,
    clientAddress,
    fetch,
    { segredo: SEGREDO, session: ['social','social-auth','social-avatar','register','avatar','mp-ticket'].includes(rota) },
  );
  if (resposta.status === 404 && EM_ROLLOUT.includes(rota)) {
    await resposta.body?.cancel().catch(() => {});
    return new Response(JSON.stringify({ error: 'upstream_unavailable' }), {
      status: 503, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  }
  return resposta;
};

export const GET = handler;
export const POST = handler;
