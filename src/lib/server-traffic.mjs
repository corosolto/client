import { createHmac } from 'node:crypto';

const SITE_HOST = 'www.corosolto.com.br';
const NON_PAGE = /^\/(?:api|_astro|_vercel|vendor|js|img|audio|fonts|assets)(?:\/|$)/;
const FILE_PATH = /\.[a-z0-9]{2,8}$/i;
const PAGES = new Set([
  '/', '/sobre', '/about', '/como-jogar', '/how-to-play', '/mapas', '/maps',
  '/personagens', '/characters', '/armas', '/weapons', '/mapa', '/clans',
  '/apoie', '/termos', '/privacidade', '/regras-de-uso', '/excluir-dados',
  '/whats-new', '/changelog',
]);

function landing(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (PAGES.has(path)) return path;
  if (path.startsWith('/u/')) return '/u/:perfil';
  if (path.startsWith('/sala/')) return '/sala/:convite';
  if (path.startsWith('/mapas/')) return '/mapas/:mapa';
  if (path.startsWith('/faccoes/')) return '/faccoes/:faccao';
  if (path.startsWith('/clans/')) return '/clans/:cla';
  if (path.startsWith('/docs/')) return '/docs/:pagina';
  return '/outra-rota';
}

function host(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) ? url.hostname.toLowerCase().slice(0, 120) : null;
  } catch { return null; }
}

function kind(agent) {
  const ua = (agent || '').toLowerCase();
  if (/oai-searchbot|claude-searchbot|perplexitybot|bingbot|googlebot|applebot/.test(ua)) return 'search-bot';
  if (/gptbot|claudebot|ccbot|google-extended|applebot-extended/.test(ua)) return 'ai-training';
  if (/bot|crawler|spider|ahrefs|semrush/.test(ua)) return 'other-bot';
  if (/curl|python-requests|wget|httpclient|axios|node-fetch|^$/.test(ua)) return 'automation';
  return 'browser';
}

export function trafficEntry(request) {
  if (request.method !== 'GET') return null;
  const url = new URL(request.url);
  if (url.hostname !== SITE_HOST || !request.headers.get('accept')?.includes('text/html')) return null;
  if (NON_PAGE.test(url.pathname) || FILE_PATH.test(url.pathname)) return null;
  const utm = url.searchParams.get('utm_source')?.trim().toLowerCase() || '';
  const agentKind = kind(request.headers.get('user-agent'));
  return {
    landing: agentKind === 'browser' ? landing(url.pathname) : '/automacao',
    referrer: agentKind === 'browser' ? host(request.headers.get('referer')) : null,
    utmSource: agentKind === 'browser' && /^[a-z0-9_.-]{1,60}$/.test(utm) ? utm : null,
    kind: agentKind,
  };
}
export function uniqueRegister(ip, agent, secret, day) {
  if (!ip || !agent || !secret || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const digest = createHmac('sha256', secret).update(`server-unique\0${day}\0${ip}\0${agent}`).digest();
  const hash = digest.readBigUInt64BE(0);
  const bucket = Number(hash >> 54n);
  let remaining = hash << 10n;
  let rank = 1;
  while ((remaining & (1n << 63n)) === 0n && rank < 55) {
    rank++;
    remaining <<= 1n;
  }
  return { day, bucket, rank };
}
