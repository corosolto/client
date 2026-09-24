/* Para onde vai cada chamada /api. As de banco foram para o backend privado; três ficaram.
   O recorte e o motivo de cada uma: docs/APIS.md. */

/* Migradas. O portão `eval:apis` cobra que esta lista não divirja da rede de segurança 307. */
const NO_BACKEND = new Set([
  'acquisition', 'avatar', 'feedback', 'funnel', 'health', 'heartbeat', 'jserror',
  'leaderboard', 'map-plays', 'match', 'mp-ticket', 'online', 'perf', 'pick', 'presence', 'register',
  'submit-match', 'telemetry', 'train-frames',
]);

/* Estas gravam país/cidade e usam o IP no rate limit: o run.app não tem borda que injete geo,
   então elas passam pelo proxy same-origin da Vercel (src/lib/api-proxy.mjs). backend#22. */
const VIA_SITE = new Set(['heartbeat', 'perf', 'presence', 'submit-match', 'telemetry']);

// Ficam no site: og, badge (imagens DO SITE) e geo-lang (lê o header da borda da Vercel).

let forcado = '';
try { forcado = new URLSearchParams(location.search).get('api') || ''; } catch { /* sem location (harness) */ }

const BASE = (() => {
  try {
    if (forcado) return forcado === '1' ? 'http://localhost:8080' : forcado.replace(/\/$/, '');
    if (location.hostname?.endsWith('.vercel.app')) return '';
  } catch { /* sem location (harness) */ }
  return 'https://csbrasil-backend-hupd3weo5q-rj.a.run.app';
})();

export function apiUrl(caminho) {
  const nome = String(caminho).replace(/^\/api\//, '').split(/[/?]/)[0];
  if (!NO_BACKEND.has(nome)) return caminho;
  if (VIA_SITE.has(nome) && !forcado) return caminho;
  return `${BASE}${caminho}`;
}

export const ROTAS_NO_BACKEND = NO_BACKEND;
export const ROTAS_VIA_SITE = VIA_SITE;

/* GET com nova tentativa em 5xx ou falha de rede — o cold start do Cloud Run (medido em
   06/09/2026: /api/online e /api/map-plays 503 na 1ª chamada da página, 200 na seguinte)
   deixava o menu sem contador. 4xx não repete. Espera 400 ms, depois 800 ms. */
export async function fetchComRetry(url, init = {}, { tentativas = 3, esperaMs = 400, fetchFn = (...a) => globalThis.fetch(...a), dorme = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  let ultimo = null;
  for (let i = 0; i < tentativas; i++) {
    try {
      const r = await fetchFn(url, init);
      if (r.status < 500) return r;
      ultimo = r;
    } catch (e) { ultimo = e; }
    if (i < tentativas - 1) await dorme(esperaMs * 2 ** i);
  }
  if (ultimo instanceof Error) throw ultimo;
  return ultimo;
}
