/* Classificação pura dos eventos do smoke pós-deploy. O browser fica no script
   principal; estas regras têm testes determinísticos para não esconder regressões. */
export const TERCEIROS = /vercel|vitals|insights|googletagmanager|google-analytics|doubleclick|gstatic|facebook|clarity|sentry|hotjar|adsbygoogle|ads-twitter|twitter\.com/i;
export const RUIDO_REDE = /Failed to load resource|net::ERR_|ERR_BLOCKED_BY_CLIENT|ERR_INTERNET_DISCONNECTED|favicon/i;
export const RUIDO_LOCAL = /\/\.astro\/|@vite|\[vite\]|dev-toolbar|@id\/|vite\/dist|WebSocket connection to 'ws:|blocked by CORS policy/;

export function eventoTexto(evento) {
  if (evento.kind === 'response') return `response ${evento.status}: ${evento.url}`;
  if (evento.kind === 'requestfailed') return `requestfailed: ${evento.url} ${evento.error || ''}`;
  return `${evento.kind || 'evento'}: ${evento.text || ''}`;
}

export function nosso(evento, { host, ensaioLocal = false, respostasOk = new Set() }) {
  const texto = eventoTexto(evento);
  const contexto = `${texto} ${evento.url || ''}`;
  if (TERCEIROS.test(contexto)) return false;
  if (evento.kind === 'requestfailed' && evento.error === 'net::ERR_ABORTED'
      && (respostasOk.has(evento.request) || respostasOk.has(evento.url))) return false;
  if (ensaioLocal && RUIDO_LOCAL.test(contexto)) return false;
  if (RUIDO_REDE.test(contexto)) return contexto.includes(host);
  return true;
}
