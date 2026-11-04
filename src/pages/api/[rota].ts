// Rede de segurança e caminho do preview para as rotas que mudaram de casa. Ver docs/APIS.md.
import type { APIRoute } from 'astro';
import { proxyApiRequest } from '../../lib/api-proxy.mjs';
import { sendXConversion } from '../../lib/x-conversions';

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

const X_EVENT_IDS: Record<'match_start' | 'match_end', string> = {
  match_start: 'tw-rh4bd-rii9f',
  match_end: 'tw-rh4bd-rii9g',
};

const handler: APIRoute = async (context) => {
  const { params, url, request } = context;
  let clientAddress = '';
  try { clientAddress = context.clientAddress; } catch { /* Vercel adapter: geo headers remain authoritative. */ }
  const rota = String(params.rota || '').replace(/\/+$/, '');
  const funnelBody = rota === 'funnel' && request.method === 'POST'
    ? await request.clone().json().catch(() => null) as { step?: unknown; sessionId?: unknown } | null
    : null;
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
  const step = funnelBody?.step;
  if (resposta.ok && (step === 'match_start' || step === 'match_end')) {
    const clientIp = clientAddress || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    await sendXConversion({
      eventId: X_EVENT_IDS[step],
      conversionId: typeof funnelBody?.sessionId === 'string' ? funnelBody.sessionId : undefined,
      identifiers: {
        ipAddress: clientIp === 'unknown' ? undefined : clientIp,
        userAgent: request.headers.get('user-agent') ?? undefined,
      },
    });
  }
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
