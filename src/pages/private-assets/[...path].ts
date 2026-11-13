import type { APIRoute } from 'astro';

export const prerender = false;
const ORIGEM = 'https://www.corosolto.com.br/private-assets/';

export const GET: APIRoute = async ({ params, url }) => {
  if (!import.meta.env.DEV) return new Response('not_found', { status: 404 });
  const caminho = Array.isArray(params.path) ? params.path.filter(Boolean).join('/') : String(params.path || '');
  if (!caminho || caminho.includes('..')) return new Response('bad_path', { status: 400 });
  const resposta = await fetch(`${ORIGEM}${caminho}${url.search}`, { method: 'GET' });
  if (!resposta.ok) return new Response('upstream_unavailable', { status: 502 });
  return new Response(resposta.body, { status: resposta.status, headers: {
    'content-type': resposta.headers.get('content-type') || 'application/octet-stream',
    'cache-control': resposta.headers.get('cache-control') || 'public, max-age=31536000, immutable',
  } });
};
