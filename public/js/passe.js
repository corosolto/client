/* Passe "Sessão da Treta" (operations/passe-sessao-da-treta-spec.md §5 e §6).
   O SERVIDOR decide tudo: XP, nível, missões, resgate e o que está destravado. Este módulo só
   lê o status (GET /api/passe), pede o resgate de UM nível (POST {action:'claim', level}) e
   responde se um personagem do passe está travado. O client nunca manda XP, progresso nem
   recompensa, e nada salvo no navegador destrava personagem.
   Sem DOM e sem import: a régua (tools/eval/passe-check.mjs) carrega este arquivo no Node. */

export const PASSE_TEMPORADA = 'sessao-da-treta-s1';
export const PASSE_NIVEIS = 15;
/* Troque a versão para anunciar de novo (temporada nova ou mudança grande do passe). */
export const PASSE_ANUNCIO_VERSAO = `${PASSE_TEMPORADA}/1`;
export const PASSE_ANUNCIO_CHAVE = 'cs-passe-anuncio';
export const PASSE_EVENTO = 'cs-passe-state';

const TIPOS = new Set(['character', 'weapon_skin', 'coins', 'xp_boost']);
const inteiro = (v, min = 0) => (Number.isSafeInteger(v) && v >= min ? v : null);
const texto = (v) => (typeof v === 'string' && v.length <= 80 ? v : '');
const data = (v) => (typeof v === 'string' && Number.isFinite(Date.parse(v)) ? v : null);
const ids = (v) => (Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === 'string' && /^[a-z0-9-]{1,64}$/.test(x)))] : []);
const niveis = (v) => (Array.isArray(v) ? [...new Set(v.filter((n) => inteiro(n, 1) && n <= PASSE_NIVEIS))].sort((a, b) => a - b) : []);

function missoes(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.map((q) => {
    const goal = inteiro(q?.goal, 1);
    if (!texto(q?.id) || !goal) return null;
    const progress = Math.min(goal, inteiro(q.progress) ?? 0);
    return Object.freeze({ id: q.id, progress, goal, done: q.done === true, xp: inteiro(q.xp) ?? 0, coins: inteiro(q.coins) ?? 0 });
  }).filter(Boolean);
}

/* Resposta do servidor -> estado imutável. Campo inválido vira vazio, nunca valor inventado. */
export function normalizarStatus(s) {
  if (!s || typeof s !== 'object' || s.season !== PASSE_TEMPORADA) return null;
  const starts = data(s.starts_at), ends = data(s.ends_at);
  if (!starts || !ends) return null;
  const levels = (Array.isArray(s.levels) ? s.levels : []).map((l) => {
    const n = inteiro(l?.n, 1), xp = inteiro(l?.xp, 1);
    if (!n || n > PASSE_NIVEIS || !xp) return null;
    const rewards = (Array.isArray(l.rewards) ? l.rewards : [])
      .filter((r) => TIPOS.has(r?.kind) && texto(r.id) && inteiro(r.amount, 1))
      .map((r) => Object.freeze({ kind: r.kind, id: r.id, amount: r.amount }));
    return Object.freeze({ n, xp, rewards: Object.freeze(rewards) });
  }).filter(Boolean).sort((a, b) => a.n - b.n);
  const auth = s.authenticated === true;
  const boostAte = data(s.boost?.until);
  const boost = inteiro(s.boost?.pct, 1) && boostAte ? Object.freeze({ pct: s.boost.pct, until: boostAte }) : null;
  return Object.freeze({
    season: s.season, starts_at: starts, ends_at: ends, claim_until: data(s.claim_until) || ends,
    authenticated: auth,
    xp: auth ? inteiro(s.xp) ?? 0 : 0,
    level: auth ? Math.min(PASSE_NIVEIS, inteiro(s.level) ?? 0) : 0,
    nextLevelXp: auth ? inteiro(s.nextLevelXp, 1) : (levels[0]?.xp ?? null),
    claimed: Object.freeze(auth ? niveis(s.claimed) : []),
    claimable: Object.freeze(auth ? niveis(s.claimable) : []),
    boost: auth ? boost : null,
    unlocked: Object.freeze({
      characters: Object.freeze(auth ? ids(s.unlocked?.characters) : []),
      weapon_skins: Object.freeze(auth ? ids(s.unlocked?.weapon_skins) : []),
    }),
    daily: Object.freeze(missoes(s.daily)),
    weekly: Object.freeze(missoes(s.weekly)),
    invites: Object.freeze({ count: inteiro(s.invites?.count) ?? 0, cap: inteiro(s.invites?.cap) ?? 0, xp: inteiro(s.invites?.xp) ?? 0 }),
    levels: Object.freeze(levels),
  });
}

/* Mesmo contrato do socialApi (account-entry.js): same-origin, cookie de sessão, {error} no corpo. */
async function pedir(body) {
  const r = await fetch('/api/passe', {
    credentials: 'same-origin', headers: { 'content-type': 'application/json' },
    ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(12000),
  });
  let out;
  try { out = await r.json(); } catch { throw new Error('passe_unavailable'); }
  if (!r.ok) throw new Error(out?.error || 'passe_unavailable');
  return out;
}

let estado = null, falhou = false, epoca = 0, carregando = null;
const avisar = () => {
  try { document.dispatchEvent(new CustomEvent(PASSE_EVENTO, { detail: estado })); } catch { /* Node: sem document */ }
};
export const passeEstado = () => estado;
export const passeFalhou = () => falhou;

export function carregarPasse() {
  if (carregando) return carregando;
  const minha = epoca;
  const pedido = (async () => {
    try {
      const out = normalizarStatus(await pedir());
      if (minha !== epoca) return estado;
      estado = out; falhou = !out;
    } catch {
      if (minha !== epoca) return estado;
      estado = null; falhou = true;
    }
    avisar();
    return estado;
  })().finally(() => { if (carregando === pedido) carregando = null; });
  carregando = pedido;
  return pedido;
}

/* Funil do painel (spec §6): dois eventos anônimos, agregados por dia no servidor. Mesma régua da
   loja Treta: sem consentimento de medição (window.__csPrivacy) não sai nada. */
const EVENTOS = new Set(['modal_view', 'open']);
export function registrarEventoPasse(event) {
  if (!EVENTOS.has(event) || !globalThis.__csPrivacy?.allowed()) return;
  void pedir({ action: 'analytics', event }).catch(() => {});
}

/* Conta trocou (login, logout): esquece o status da conta anterior antes de perguntar de novo. */
export function trocarContaPasse() {
  epoca++; carregando = null; estado = null; falhou = false;
  avisar();
  return carregarPasse();
}

let resgatando = null;
/* Resgate de UM nível. Sem conta não sai pedido: quem chama leva o jogador para o login. */
export async function resgatarNivel(level) {
  if (!estado?.authenticated) throw new Error('account_required');
  if (!inteiro(level, 1) || level > PASSE_NIVEIS) throw new Error('level_locked');
  if (resgatando) return resgatando;
  const minha = epoca;
  resgatando = (async () => {
    const out = await pedir({ action: 'claim', level });
    const novo = normalizarStatus(out?.status);
    if (novo && minha === epoca) { estado = novo; avisar(); }
    return out;
  })().finally(() => { resgatando = null; });
  return resgatando;
}

/* Personagem do passe (`passe:{season, level}` em characters.js) só joga quando o inventário do
   servidor diz que está destravado. Sem status, sem conta ou fora da lista: travado. */
export function personagemTravado(def) {
  if (!def?.passe) return false;
  return !estado?.authenticated || !estado.unlocked.characters.includes(def.id);
}
export const nivelDoPersonagem = (def) => inteiro(def?.passe?.level, 1);

/* Anúncio: uma vez por versão do passe, só com a temporada no ar segundo o servidor. */
export function passeAnuncioDevido({ status = estado, agora = Date.now(), embutido = false, dialogoAberto = false, visto = lerAnuncio() } = {}) {
  if (!status) return false;
  if (embutido || dialogoAberto) return false;
  if (visto === PASSE_ANUNCIO_VERSAO) return false;
  return agora >= Date.parse(status.starts_at) && agora < Date.parse(status.ends_at);
}
export function lerAnuncio() {
  try { return localStorage.getItem(PASSE_ANUNCIO_CHAVE); } catch { return null; }
}
export function marcarAnuncio() {
  try { localStorage.setItem(PASSE_ANUNCIO_CHAVE, PASSE_ANUNCIO_VERSAO); } catch { /* sem storage: vale só esta visita */ }
}

/* Barra do nível atual: XP dentro do degrau entre o nível alcançado e o próximo. */
export function progressoNivel(s = estado) {
  if (!s) return { de: 0, ate: 0, p: 0 };
  const atual = s.level ? s.levels.find((l) => l.n === s.level)?.xp ?? 0 : 0;
  const prox = s.nextLevelXp;
  if (!prox) return { de: s.xp, ate: s.xp, p: 1 };
  const ate = prox - atual, de = Math.max(0, Math.min(ate, s.xp - atual));
  return { de, ate, p: ate > 0 ? de / ate : 0 };
}
