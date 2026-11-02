// Rede de segurança e caminho do preview para as rotas que mudaram de casa. Ver docs/APIS.md.
import type { APIRoute } from 'astro';
import { proxyApiRequest } from '../../lib/api-proxy.mjs';

export const prerender = false;

const BACKEND = import.meta.env.PUBLIC_API_BASE || 'https://csbrasil-backend-hupd3weo5q-rj.a.run.app';
// Prova ao backend que a geo/IP vieram deste proxy (api/_lib/borda.mjs no backend).
const SEGREDO = import.meta.env.API_PROXY_SECRET || '';

const MIGRADAS = new Set([
  'treta',
  'social','social-auth','social-avatar','gameplay-upload','acquisition', 'avatar', 'clans', 'count', 'feedback', 'funnel', 'health', 'heartbeat', 'jserror',
  'leaderboard', 'live-map', 'map-plays', 'match', 'mp-ticket', 'online', 'perf', 'pick', 'presence', 'register',
  'submit-match', 'telemetry', 'train-frames', 'unique',
]);

// Social e avatar usam 404 para perfis ausentes ou privados; preservar esse status.
// clans (backend#72) ainda depende do rollout: 404 upstream vira 503.
const EM_ROLLOUT = ['social-auth','treta','clans'];

const handler: APIRoute = async (context) => {
  const { params, url, request } = context;
  let clientAddress = '';
  try { clientAddress = context.clientAddress; } catch { /* Vercel adapter: geo headers remain authoritative. */ }
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
    { segredo: SEGREDO, session: ['treta','social','social-auth','social-avatar','gameplay-upload','register','avatar','mp-ticket','clans','unique'].includes(rota), userAgent: rota === 'unique' },
  );
  if (resposta.status === 404 && (EM_ROLLOUT.includes(rota) || rota === 'gameplay-upload')) {
    await resposta.body?.cancel().catch(() => {});
    return new Response(JSON.stringify({ error: 'upstream_unavailable' }), {
      status: 503, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  }
  return resposta;
};

export const GET = handler;
export const POST = handler;
