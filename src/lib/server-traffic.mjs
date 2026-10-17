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

const AGENTS = [
  [/oai-searchbot/i, 'ai-search', 'openai/oai-searchbot'],
  [/chatgpt-user/i, 'ai-assistant', 'openai/chatgpt-user'],
  [/gptbot/i, 'ai-training', 'openai/gptbot'],
  [/claude-searchbot/i, 'ai-search', 'anthropic/claude-searchbot'],
  [/claude-user/i, 'ai-assistant', 'anthropic/claude-user'],
  [/claudebot/i, 'ai-training', 'anthropic/claudebot'],
  [/perplexity-user/i, 'ai-assistant', 'perplexity/perplexity-user'],
  [/perplexitybot/i, 'ai-search', 'perplexity/perplexitybot'],
  [/google-cloudvertexbot/i, 'ai-training', 'google/google-cloudvertexbot'],
  [/google-extended/i, 'ai-training', 'google/google-extended'],
  [/googlebot/i, 'search-bot', 'google/googlebot'],
  [/bingbot/i, 'search-bot', 'microsoft/bingbot'],
  [/applebot-extended/i, 'ai-training', 'apple/applebot-extended'],
  [/applebot/i, 'ai-search', 'apple/applebot'],
  [/bytespider/i, 'ai-training', 'bytedance/bytespider'],
  [/ccbot/i, 'ai-training', 'common-crawl/ccbot'],
  [/meta-externalfetcher/i, 'ai-assistant', 'meta/meta-externalfetcher'],
  [/meta-externalagent/i, 'ai-training', 'meta/meta-externalagent'],
  [/facebookbot/i, 'ai-training', 'meta/facebookbot'],
  [/amazonbot/i, 'ai-training', 'amazon/amazonbot'],
  [/duckassistbot/i, 'ai-assistant', 'duckduckgo/duckassistbot'],
  [/mistralai-user/i, 'ai-assistant', 'mistral/mistralai-user'],
  [/facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|whatsapp/i, 'social-preview', 'social/preview'],
];

function classify(agent) {
  const ua = agent || '';
  for (const [pattern, kind, name] of AGENTS) if (pattern.test(ua)) return { kind, agent: name };
  if (/bot|crawler|spider|ahrefs|semrush/i.test(ua)) return { kind: 'other-bot', agent: 'other/unknown-bot' };
  if (/curl|python-requests|wget|httpclient|axios|node-fetch/i.test(ua) || !ua) return { kind: 'automation', agent: 'automation/tool' };
  return { kind: 'browser', agent: '' };
}

export function trafficEntry(request) {
  if (request.method !== 'GET') return null;
  const url = new URL(request.url);
  if (url.hostname !== SITE_HOST || !request.headers.get('accept')?.includes('text/html')) return null;
  if (NON_PAGE.test(url.pathname) || FILE_PATH.test(url.pathname)) return null;
  const utm = url.searchParams.get('utm_source')?.trim().toLowerCase() || '';
  const classification = classify(request.headers.get('user-agent'));
  return {
    landing: landing(url.pathname),
    referrer: classification.kind === 'browser' ? host(request.headers.get('referer')) : null,
    utmSource: classification.kind === 'browser' && /^[a-z0-9_.-]{1,60}$/.test(utm) ? utm : null,
    ...classification,
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
