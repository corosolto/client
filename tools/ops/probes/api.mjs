/* ============================================================================
   api.mjs — O BACKEND RESPONDE, E RESPONDE SEMPRE?
   ----------------------------------------------------------------------------
   Duas perguntas que o prod-watch.yml não faz:
     1. o /api/health está `ok`, mas o que CADA campo significa para o jogador?
        (`database:false` derruba ranking, presença e telemetria; `operationalFresh:
        false` é nó de multiplayer sem heartbeat; `fresh:false` pode ser só
        madrugada sem partida) — a classificação mora em lib/explain.mjs;
     2. uma chamada só não vê 5xx INTERMITENTE. Medido em 06/09/2026 no Chrome do
        dono: `/api/online` e `/api/map-plays` devolveram 503 na primeira chamada
        da página e 200 nas seguintes — cara de cold start do Cloud Run. Por isso
        cada rota leve é sondada N vezes, com pausa, e o relatório separa
        "sempre 5xx" (rota quebrada) de "às vezes 5xx" (instância subindo).

   Só GET: nada aqui grava telemetria, ticket ou presença.
   ============================================================================ */
import { sonda, percentil, dorme } from '../lib/http.mjs';

export const ROTAS_LEVES = ['online', 'map-plays', 'leaderboard'];

function json(resp) {
  try { return JSON.parse(resp.texto()); } catch { return null; }
}

export async function sondaHealth(base, { timeoutMs = 10_000 } = {}) {
  const r = await sonda(`${base}/api/health`, { timeoutMs });
  return { url: r.url, status: r.status, ms: r.ms, erro: r.erro, corpo: r.status ? json(r) : null };
}

/* N chamadas seguidas na mesma rota; devolve a distribuição de status e latência. */
export async function sondaRotaRepetida(base, rota, { n = 5, pausaMs = 300, timeoutMs = 10_000 } = {}) {
  const chamadas = [];
  for (let i = 0; i < n; i++) {
    const r = await sonda(`${base}/api/${rota}`, { timeoutMs });
    chamadas.push({ status: r.status, ms: r.ms, erro: r.erro, corpo: r.status === 200 ? r.texto().slice(0, 200) : null });
    if (i < n - 1) await dorme(pausaMs);
  }
  return { rota, chamadas, ...classificaChamadas(chamadas) };
}

export function classificaChamadas(chamadas) {
  const total = chamadas.length;
  const ok = chamadas.filter((c) => c.status >= 200 && c.status < 400).length;
  const cincoXx = chamadas.filter((c) => c.status >= 500).length;
  const quatroXx = chamadas.filter((c) => c.status >= 400 && c.status < 500).length;
  const semResposta = chamadas.filter((c) => c.status === 0).length;
  const latencias = chamadas.filter((c) => c.status > 0).map((c) => c.ms);
  const semRede = chamadas.filter((c) => c.status === 0 && /^(dns|proxy)/.test(c.erro || '')).length;
  let padrao = 'ok';
  if (total > 0 && semRede === total) padrao = 'inalcancavel';
  else if (ok === 0 && total > 0) padrao = cincoXx + semResposta === total ? 'sempre-falha' : 'sempre-4xx';
  else if (cincoXx + semResposta > 0) padrao = 'intermitente';
  return { total, ok, cincoXx, quatroXx, semResposta, p50: percentil(latencias, 50), p95: percentil(latencias, 95), padrao };
}

export async function sondaApi(base, { backend = null, rotas = ROTAS_LEVES, repeticoes = 5, pausaMs = 300, timeoutMs = 10_000 } = {}) {
  const r = { sonda: 'api', alvo: base, backend, health: null, healthBackend: null, rotas: [], redeSeguranca: null };
  r.health = await sondaHealth(base, { timeoutMs });
  if (backend && backend !== base) r.healthBackend = await sondaHealth(backend, { timeoutMs });
  const alvoRotas = backend || base;
  for (const rota of rotas) r.rotas.push(await sondaRotaRepetida(alvoRotas, rota, { n: repeticoes, pausaMs, timeoutMs }));
  const inexistente = await sonda(`${base}/api/ops-diag-rota-inexistente`, { timeoutMs });
  r.redeSeguranca = { status: inexistente.status, ms: inexistente.ms, erro: inexistente.erro, corpo: inexistente.status ? inexistente.texto().slice(0, 120) : null };
  return r;
}
