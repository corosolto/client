import type { APIRoute } from 'astro';
import { usageSiteToken, wrapUsageScript } from '../../lib/usage-script.mjs';

export const prerender = false;

const UPSTREAM = 'https://static.cloudflareinsights.com/beacon.min.js';
const NO_STORE = { 'cache-control': 'no-store' };

export const GET: APIRoute = async ({ request }) => {
  const token = usageSiteToken(new URL(request.url).hostname);
  if (!token) return new Response(null, { status: 404, headers: NO_STORE });
  try {
    const response = await fetch(UPSTREAM, { headers: { accept: 'application/javascript' } });
    if (!response.ok) return new Response(null, { status: 502, headers: NO_STORE });
    const source = await response.text();
    return new Response(wrapUsageScript(source, token), {
      headers: {
        'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
        'content-type': 'application/javascript; charset=utf-8',
        'cross-origin-resource-policy': 'same-origin',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch {
    return new Response(null, { status: 502, headers: NO_STORE });
  }
};
