// Rede de seguranca das rotas /api que mudaram de casa: 307 para o backend, preservando
// metodo e corpo. Existe para o cliente com JS antigo em cache. Ver docs/APIS.md.
import type { APIRoute } from 'astro';

export const prerender = false;

const BACKEND = import.meta.env.PUBLIC_API_BASE || 'https://api.corosolto.com.br';

const MIGRADAS = new Set([
  'acquisition', 'avatar', 'feedback', 'funnel', 'health', 'heartbeat', 'jserror',
  'leaderboard', 'map-plays', 'match', 'online', 'perf', 'pick', 'presence', 'register',
  'submit-match', 'telemetry', 'train-frames',
]);

const handler: APIRoute = ({ params, url }) => {
  const rota = String(params.rota || '').replace(/\/+$/, '');
  if (!MIGRADAS.has(rota)) {
    return new Response(JSON.stringify({ error: 'not_found', path: url.pathname }), {
      status: 404, headers: { 'content-type': 'application/json' },
    });
  }
  return new Response(null, {
    status: 307,
    headers: { location: `${BACKEND}/api/${rota}${url.search}`, 'cache-control': 'no-store' },
  });
};

export const GET = handler;
export const POST = handler;
