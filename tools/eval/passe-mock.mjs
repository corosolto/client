/* Mock do /api/passe (operations/passe-sessao-da-treta-spec.md §5.1) para dev local e réguas,
   até o backend do passe publicar. Mesmo contrato e mesmas regras que o servidor promete:
   nível pelo XP acumulado, resgate idempotente por nível, conta obrigatória, janela de resgate,
   bônus que não somam (vale o maior) e personagem destravado só pelo inventário de resgate.
   Rejeita qualquer campo no POST além de {action, level}: o client nunca informa XP.

   Uso:
     import { criarPasseMock } from './passe-mock.mjs'      (réguas: page.route ou fetch falso)
     PASSE_MOCK=conta node tools/eval/serve.mjs 9431        (dev: /api/passe servido daqui)
     PASSE_MOCK=visitante node tools/eval/serve.mjs 9431 */

export const TEMPORADA = 'sessao-da-treta-s1';
const PERSONAGENS = [
  ['capitao-caveira', 'teletreco-sinal-fraco'], ['bebe-reborn', 'chupa-cabra'], ['teletreco-antenao', 'assombracao-lanhouse'],
  ['dracula', 'boneca-da-cristaleira'], ['satanista-talkshow', 'clovis-fora-do-ar'], ['teletreco-chiadinho', 'bicho-do-bueiro'],
  ['coronel-arrego', 'sorridente-onibus'], ['bebezao-de-feira', 'boneco-falante-87'], ['padre-parapsicologo', 'muro-de-caco'],
  ['teletreco-fora-do-ar', 'coelho-pascoa-shopping'], ['pm-arrego', 'nanica'], ['roqueiro-mistico-70', 'profeta-auditorio'],
  ['bicheiro-barracao', 'prata'], ['dom-pedro-i', 'tiradentes'], ['corisco', 'vlad'],
];
const MOEDAS = [50, 50, 75, 75, 100, 100, 100, 125, 125, 150, 150, 175, 175, 200, 250];
const BOOSTS = [10, 10, 10, 15, 15, 15, 15, 20, 20, 20, 20, 25, 25, 25, 25];
/* XP acumulado até o nível n: o nível k pede 1000 + 150·(k-1). */
export const xpAcumulado = (n) => 1000 * n + 75 * n * (n - 1);

export const NIVEIS = Object.freeze(PERSONAGENS.map(([a, b], i) => {
  const n = i + 1, arma = `arma-${String(n).padStart(2, '0')}`;
  return Object.freeze({
    n, xp: xpAcumulado(n),
    rewards: Object.freeze([
      { kind: 'character', id: a, amount: 1 }, { kind: 'character', id: b, amount: 1 },
      { kind: 'weapon_skin', id: arma, amount: 1 }, { kind: 'coins', id: 'tdollars', amount: MOEDAS[i] },
      { kind: 'xp_boost', id: `boost-${BOOSTS[i]}`, amount: BOOSTS[i] },
    ]),
  });
}));

const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
const MISSOES_DIA = [['login', 1, 50, 10], ['play_3', 3, 150, 0], ['win_1', 1, 100, 0], ['mp_1', 1, 150, 0]];
const MISSOES_SEMANA = [['days_5', 5, 600, 50], ['win_10', 10, 500, 0], ['mp_10', 10, 500, 0]];
const missoes = (lista, progresso) => lista.map(([id, goal, xp, coins]) => {
  const p = Math.min(goal, progresso[id] ?? 0);
  return { id, progress: p, goal, done: p >= goal, xp, coins };
});

export function criarPasseMock({
  autenticado = true, xp = 2350, claimed = [1], agora = () => Date.now(),
  inicio = Date.parse('2026-11-05T03:00:00Z'), fim = Date.parse('2027-01-10T03:00:00Z'),
  progresso = { login: 1, play_3: 2, win_1: 1, mp_1: 0, days_5: 3, win_10: 4, mp_10: 2 }, convites = 1,
} = {}) {
  const resgates = new Map();   // nível -> {em, rewards}; a chave season:level do servidor
  const creditos = [];          // ledger falso: uma linha por recompensa entregue, com o event_key do resgate
  const chamadas = [];
  const eventos = [];           // funil do painel recebido (modal_view, open)
  const entregar = (n, em) => {
    const nivel = NIVEIS[n - 1];
    resgates.set(n, { em, rewards: nivel.rewards });
    for (const r of nivel.rewards) creditos.push({ event_key: `passe:${TEMPORADA}:${n}`, ...r });
  };
  for (const n of claimed) entregar(n, inicio);
  const fimResgate = fim + 7 * 86400000;
  const nivelAtual = () => NIVEIS.filter((l) => l.xp <= xp).length;
  const status = () => {
    const level = autenticado ? nivelAtual() : 0;
    const agoraMs = agora();
    const aberto = agoraMs >= inicio && agoraMs < fimResgate;
    const feitos = [...resgates.keys()].sort((a, b) => a - b);
    const boosts = [...resgates.entries()].map(([n, r]) => ({ pct: BOOSTS[n - 1], until: r.em + 86400000 })).filter((b) => b.until > agoraMs);
    const melhor = boosts.sort((a, b) => b.pct - a.pct || b.until - a.until)[0];
    const destravado = (kind) => feitos.flatMap((n) => NIVEIS[n - 1].rewards.filter((r) => r.kind === kind).map((r) => r.id));
    return {
      season: TEMPORADA, name: 'Sessão da Treta', starts_at: iso(inicio), ends_at: iso(fim), claim_until: iso(fimResgate),
      authenticated: autenticado,
      xp: autenticado ? xp : 0, level, nextLevelXp: level < NIVEIS.length ? NIVEIS[level].xp : null,
      claimed: autenticado ? feitos : [],
      claimable: autenticado && aberto ? NIVEIS.filter((l) => l.n <= level && !resgates.has(l.n)).map((l) => l.n) : [],
      boost: autenticado && melhor ? { pct: melhor.pct, until: iso(melhor.until) } : null,
      unlocked: { characters: autenticado ? destravado('character') : [], weapon_skins: autenticado ? destravado('weapon_skin') : [] },
      daily: missoes(MISSOES_DIA, autenticado ? progresso : {}),
      weekly: missoes(MISSOES_SEMANA, autenticado ? progresso : {}),
      invites: { count: autenticado ? convites : 0, cap: 10, xp: 800 },
      levels: NIVEIS,
    };
  };
  const erro = (status, error) => ({ status, body: { error } });
  function claim(corpo) {
    if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) return erro(400, 'bad_json');
    /* funil do painel: {action:'analytics', event}, anônimo, sem nada além disso */
    if (corpo.action === 'analytics') {
      const sobra = Object.keys(corpo).filter((k) => k !== 'action' && k !== 'event');
      if (sobra.length) return erro(400, `campo_recusado:${sobra.join(',')}`);
      if (!['modal_view', 'open'].includes(corpo.event)) return erro(400, 'event_invalid');
      eventos.push(corpo.event);
      return { status: 200, body: { ok: true, stored: true } };
    }
    const extras = Object.keys(corpo).filter((k) => k !== 'action' && k !== 'level');
    if (extras.length) return erro(400, `campo_recusado:${extras.join(',')}`);
    if (corpo.action !== 'claim') return erro(400, 'action_invalid');
    if (!autenticado) return erro(401, 'account_required');
    const n = corpo.level;
    if (!Number.isSafeInteger(n) || n < 1 || n > NIVEIS.length) return erro(400, 'level_invalid');
    if (resgates.has(n)) return { status: 200, body: { ok: true, already_claimed: true, season: TEMPORADA, level: n, rewards: resgates.get(n).rewards, status: status() } };
    if (agora() < inicio || agora() >= fimResgate) return erro(409, 'season_closed');
    if (n > nivelAtual()) return erro(409, 'level_locked');
    entregar(n, agora());
    return { status: 200, body: { ok: true, season: TEMPORADA, level: n, rewards: resgates.get(n).rewards, status: status() } };
  }
  /* method + corpo cru -> {status, body}. Serve tanto o page.route do Playwright quanto o serve.mjs. */
  function handle(method, texto = '') {
    let corpo = null;
    if (method === 'POST') { try { corpo = JSON.parse(texto || 'null'); } catch { corpo = undefined; } }
    chamadas.push({ method, corpo });
    if (method === 'GET') return { status: 200, body: status() };
    if (method === 'POST') return corpo === undefined ? erro(400, 'bad_json') : claim(corpo);
    return erro(405, 'method_not_allowed');
  }
  return {
    status, claim, handle, chamadas, creditos, eventos,
    definir(campos) { if ('autenticado' in campos) autenticado = campos.autenticado; if ('xp' in campos) xp = campos.xp; },
  };
}
