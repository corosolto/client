/* ============================================================================
   ranking.mjs — A FLAG DO RANKING E O QUE O SITE ENTREGA CONTAM A MESMA HISTÓRIA?
   ----------------------------------------------------------------------------
   `RANKING_ON` (src/lib/site.ts) decide o contrato de `/ranking` e de
   `/api/leaderboard` (site-smoke.mjs lê a mesma flag). Em produção a flag da
   árvore pode não ser a do deploy: esta sonda cruza os três lados — flag local,
   corpo do leaderboard, status da página — e o explain.mjs decide se o desacordo
   é "deploy atrasado" ou "ranking caiu".
   ============================================================================ */
import { sonda } from '../lib/http.mjs';
import { rankingLigado, RAIZ_PADRAO } from '../lib/repo.mjs';

export async function sondaRanking(base, { backend = null, raiz = RAIZ_PADRAO, timeoutMs = 10_000 } = {}) {
  const r = { sonda: 'ranking', flagLocal: null, leaderboard: null, pagina: null };
  try { r.flagLocal = rankingLigado(raiz); } catch (e) { r.flagErro = e.message; }
  const lb = await sonda(`${backend || base}/api/leaderboard`, { timeoutMs });
  let corpo = null; try { corpo = JSON.parse(lb.texto()); } catch { /* não é JSON */ }
  r.leaderboard = { status: lb.status, ms: lb.ms, erro: lb.erro, desligado: corpo?.disabled === true, temLista: Array.isArray(corpo?.players || corpo?.leaderboard || corpo) };
  const pg = await sonda(`${base}/ranking`, { timeoutMs, maxBytes: 65_536 });
  const html = pg.texto();
  r.pagina = { status: pg.status, ms: pg.ms, erro: pg.erro, bytes: pg.bytes.length, noindex: /name=["']robots["'][^>]*noindex/i.test(html) };
  return r;
}
