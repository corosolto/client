// Rede de segurança e caminho do preview para as rotas que mudaram de casa. Ver docs/APIS.md.
import type { APIRoute } from 'astro';
import { proxyApiRequest } from '../../lib/api-proxy.mjs';
import { backendUrl, envRuntime } from '../../lib/env-runtime';
import { sendXConversion } from '../../lib/x-conversions';
import { X_EVENT_IDS } from '../../lib/x-pixel';

export const prerender = false;

const MIGRADAS = new Set([
  'treta',
  'social','social-auth','social-avatar','gameplay-upload','acquisition', 'avatar', 'clans', 'count', 'feedback', 'funnel', 'health', 'heartbeat', 'jserror',
  'leaderboard', 'live-map', 'map-plays', 'match', 'mp-ticket', 'online', 'perf', 'pick', 'presence', 'register',
  'submit-match', 'telemetry', 'train-frames', 'unique',
]);

// Social e avatar usam 404 para perfis ausentes ou privados; preservar esse status.
// clans (backend#72) ainda depende do rollout: 404 upstream vira 503.
const EM_ROLLOUT = ['social-auth','treta','clans'];

// Cada linha de log é evento pago na Vercel: falha do X sai UMA vez por instância e causa.
const falhasX = new Set<string>();
const avisaFalhaX = (status: number | null, reason: string | undefined) => {
  const causa = `${status ?? '-'} ${reason ?? '-'}`;
  if (falhasX.has(causa)) return;
  falhasX.add(causa);
  console.warn('[x-conversion] delivery failed', { status, reason });
};

const handler: APIRoute = async (context) => {
  const { params, url, request } = context;
  let clientAddress = '';
  try { clientAddress = context.clientAddress; } catch { /* Vercel adapter: geo headers remain authoritative. */ }
  const rota = String(params.rota || '').replace(/\/+$/, '');
  const funnelBody = rota === 'funnel' && request.method === 'POST'
    ? await request.clone().json().catch(() => null) as { step?: unknown; matchEventId?: unknown } | null
    : null;
  if (!MIGRADAS.has(rota)) {
    return new Response(JSON.stringify({ error: 'not_found', path: url.pathname }), {
      status: 404, headers: { 'content-type': 'application/json' },
    });
  }
  const resposta = await proxyApiRequest(
    request,
    `${backendUrl().replace(/\/$/, '')}/api/${rota}${url.search}`,
    clientAddress,
    fetch,
    { segredo: envRuntime('API_PROXY_SECRET') || '', session: ['treta','social','social-auth','social-avatar','gameplay-upload','register','avatar','mp-ticket','clans','unique'].includes(rota), userAgent: rota === 'unique' },
  );
  const step = funnelBody?.step;
  if (resposta.ok && (step === 'match_start' || step === 'match_end')) {
    const clientIp = clientAddress || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const matchEventId = typeof funnelBody?.matchEventId === 'string' ? funnelBody.matchEventId : crypto.randomUUID();
    void sendXConversion({
      eventId: X_EVENT_IDS[step],
      conversionId: matchEventId,
      identifiers: {
        ipAddress: clientIp === 'unknown' ? undefined : clientIp,
        userAgent: request.headers.get('user-agent') ?? undefined,
      },
    }).then((result) => {
      if (!result.ok && result.reason !== 'not_configured') avisaFalhaX(result.status, result.reason);
    }).catch(() => {});
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
