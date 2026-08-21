// GET /api/geo-lang - idioma default por país, lido pelo i18n do jogo no boot.
// A home é estática (Stateloop não publica SSR), então o header de país vira endpoint.
import type { APIRoute } from 'astro';
import { langFromCountry } from '../../lib/geo';

export const prerender = false;

export const GET: APIRoute = ({ request }) => {
  const country = request.headers.get('x-vercel-ip-country')
    || request.headers.get('cf-ipcountry');
  return new Response(JSON.stringify({ lang: langFromCountry(country) }), {
    status: 200,
    // no-store: a resposta varia por visitante; CDN nenhuma pode cachear isto.
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
};
