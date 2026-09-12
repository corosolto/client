/* Para onde vai cada chamada /api. As de banco foram para o backend privado; três ficaram.
   O recorte e o motivo de cada uma: docs/APIS.md. */

/* Migradas. O portão `eval:apis` cobra que esta lista não divirja da rede de segurança 307. */
const NO_BACKEND = new Set([
  'acquisition', 'avatar', 'feedback', 'funnel', 'health', 'heartbeat', 'jserror',
  'leaderboard', 'map-plays', 'match', 'mp-ticket', 'online', 'perf', 'pick', 'presence', 'register',
  'submit-match', 'telemetry', 'train-frames',
]);

// Ficam no site: og, badge (imagens DO SITE) e geo-lang (lê o header da borda da Vercel).

const BASE = (() => {
  try {
    const forcado = new URLSearchParams(location.search).get('api');
    if (forcado) return forcado === '1' ? 'http://localhost:8080' : forcado.replace(/\/$/, '');
    if (location.hostname?.endsWith('.vercel.app')) return '';
  } catch { /* sem location (harness) */ }
  return 'https://csbrasil-backend-hupd3weo5q-rj.a.run.app';
})();

export function apiUrl(caminho) {
  const nome = String(caminho).replace(/^\/api\//, '').split(/[/?]/)[0];
  return NO_BACKEND.has(nome) ? `${BASE}${caminho}` : caminho;
}

export const ROTAS_NO_BACKEND = NO_BACKEND;

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
