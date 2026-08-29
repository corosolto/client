/* Para onde vai cada chamada /api. As de banco foram para o backend privado; três ficaram.
   O recorte e o motivo de cada uma: docs/APIS.md. */

/* Migradas. O portão `eval:apis` cobra que esta lista não divirja da rede de segurança 307. */
const NO_BACKEND = new Set([
  'acquisition', 'avatar', 'feedback', 'funnel', 'health', 'heartbeat', 'jserror',
  'leaderboard', 'map-plays', 'match', 'online', 'perf', 'pick', 'presence', 'register',
  'submit-match', 'telemetry', 'train-frames',
]);

// Ficam no site: og, badge (imagens DO SITE) e geo-lang (lê o header da borda da Vercel).

const BASE = (() => {
  try {
    const forcado = new URLSearchParams(location.search).get('api');
    if (forcado) return forcado === '1' ? 'http://localhost:8080' : forcado.replace(/\/$/, '');
  } catch { /* sem location (harness) */ }
  return 'https://api.corosolto.com.br';
})();

export function apiUrl(caminho) {
  const nome = String(caminho).replace(/^\/api\//, '').split(/[/?]/)[0];
  return NO_BACKEND.has(nome) ? `${BASE}${caminho}` : caminho;
}

export const ROTAS_NO_BACKEND = NO_BACKEND;
