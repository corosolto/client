/* Passe Sessão da Treta (spec §5/§6): o servidor decide XP, resgate e destravado; o client só lê,
   pede claim de um nível e nunca manda XP. Sem DOM nem import: passe-check.mjs carrega no Node. */

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

let estado = null, falhou = false, epoca = 0, carregando = null, ultimoPedido = 0, conta = null, partida = null;
const avisar = () => {
  try { document.dispatchEvent(new CustomEvent(PASSE_EVENTO, { detail: estado })); } catch { /* Node: sem document */ }
};
export const passeEstado = () => estado;
export const passeFalhou = () => falhou;

/* forcar: o fim de partida precisa de uma liquidação NOVA (o GET liquida o XP da partida); devolver o
   pedido em voo traria o status de antes da partida. O pedido mais novo manda: um antigo que chega
   depois não sobrescreve. Forçado que falha mantém o status que já estava na tela (falha silenciosa). */
export function carregarPasse({ forcar = false } = {}) {
  if (carregando && !forcar) return carregando;
  const minha = epoca, meu = ++ultimoPedido;
  const pedido = (async () => {
    let out = null, erro = false;
    try { out = normalizarStatus(await pedir()); } catch { erro = true; }
    if (minha !== epoca || meu !== ultimoPedido) return estado;
    if (forcar && estado && (erro || !out)) return estado;
    estado = erro ? null : out; falhou = erro || !out;
    avisar();
    notarNovidades();
    return estado;
  })().finally(() => { if (carregando === pedido) carregando = null; });
  carregando = pedido;
  return pedido;
}

/* Novidades do passe (subida de nível e missão concluída) saem do diff entre o último status que
   ESTA conta viu nesta temporada (localStorage, vale entre sessões) e o status novo. O nível só
   conta como visto quando a celebração aparece (marcarNivelVisto); missão feita conta na hora. */
export const PASSE_NOVIDADE = 'cs-passe-novidade';
export const PASSE_MEMORIA_CHAVE = 'cs-passe-memoria';
export const PASSE_NIVEL_BOAS_VINDAS = 10;
const DIA_SP = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
/* Missões diárias renovam 00:00 de Brasília; semanais na segunda. Período diferente: nada estava feito. */
export function periodoPasse(agora = Date.now()) {
  const dia = DIA_SP.format(new Date(agora));
  const d = new Date(`${dia}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return { dia, semana: d.toISOString().slice(0, 10) };
}
const chaveMemoria = (c) => `${PASSE_MEMORIA_CHAVE}:${c}:${PASSE_TEMPORADA}`;
/* id de missão do servidor: login, play_3, win_10 (com sublinhado, ao contrário dos ids de recompensa) */
const missoesFeitas = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && /^[a-z0-9_-]{1,64}$/.test(x)) : []);
export function lerMemoriaPasse(c = conta) {
  if (!c) return null;
  try {
    const m = JSON.parse(localStorage.getItem(chaveMemoria(c)) || 'null');
    if (!m || inteiro(m.level) === null) return null;
    return { level: Math.min(PASSE_NIVEIS, m.level), xp: inteiro(m.xp) ?? 0, dia: texto(m.dia), semana: texto(m.semana), diarias: missoesFeitas(m.diarias), semanais: missoesFeitas(m.semanais) };
  } catch { return null; }
}
function gravarMemoria(c, m) {
  try { localStorage.setItem(chaveMemoria(c), JSON.stringify(m)); } catch { /* sem storage: vale só esta visita */ }
}
/* Puro: memória anterior (null = primeira vez desta conta na temporada) + status -> novidades e a
   memória nova. Primeira vez: o nível conta a partir de 0 (o presente de boas-vindas do nível 10
   aparece) e nenhuma missão vira aviso, porque não se sabe quando ela foi feita. */
export function novidadesPasse(mem, s, agora = Date.now()) {
  if (!s?.authenticated) return null;
  const { dia, semana } = periodoPasse(agora);
  const de = mem ? Math.min(mem.level, s.level) : 0;
  const subiu = s.level > de ? Object.freeze({
    de, para: s.level, boasVindas: de === 0 && s.level >= PASSE_NIVEL_BOAS_VINDAS,
    niveis: Object.freeze(s.levels.filter((l) => l.n > de && l.n <= s.level)),
  }) : null;
  const feitas = mem ? new Set([...(mem.dia === dia ? mem.diarias : []), ...(mem.semana === semana ? mem.semanais : [])]) : null;
  const missoes = feitas ? [...s.daily, ...s.weekly].filter((q) => q.done && !feitas.has(q.id)) : [];
  const memoria = { level: de, xp: s.xp, dia, semana, diarias: s.daily.filter((q) => q.done).map((q) => q.id), semanais: s.weekly.filter((q) => q.done).map((q) => q.id) };
  return { subiu, missoes: Object.freeze(missoes), memoria };
}
function notarNovidades() {
  if (!conta || !estado?.authenticated) return;
  const n = novidadesPasse(lerMemoriaPasse(conta), estado);
  gravarMemoria(conta, n.memoria);
  if (!n.subiu && !n.missoes.length) return;
  try { document.dispatchEvent(new CustomEvent(PASSE_NOVIDADE, { detail: { subiu: n.subiu, missoes: n.missoes, conta } })); } catch { /* Node: sem document */ }
}
/* A celebração apareceu: a partir daqui o diff conta do nível novo. */
export function marcarNivelVisto(level) {
  const m = lerMemoriaPasse(conta);
  if (m && inteiro(level) !== null && level > m.level) gravarMemoria(conta, { ...m, level: Math.min(level, estado?.level ?? level) });
}
export const passeConta = () => conta;

/* Fim de partida: o resultado vai para o servidor e o MP é ingerido pelo nó com atraso, então
   liquida de novo duas vezes (≈4 s e ≈12 s). O marco guarda o XP de antes para a tela de resultado
   mostrar quanto a partida rendeu. Sem conta, só pergunta de novo, como antes. */
export const PASSE_ATRASOS_PARTIDA = Object.freeze([4000, 12000]);
export function acompanharPartidaPasse({ atrasos = PASSE_ATRASOS_PARTIDA } = {}) {
  if (!estado?.authenticated) { setTimeout(() => { void carregarPasse(); }, atrasos[0]); return null; }
  const marco = Object.freeze({ xp: estado.xp, level: estado.level, epoca });
  partida = marco;
  for (const ms of atrasos) setTimeout(() => { if (partida === marco && epoca === marco.epoca) void carregarPasse({ forcar: true }); }, ms);
  return marco;
}
export const passePartida = () => (partida && partida.epoca === epoca ? partida : null);

/* Funil do painel (spec §6): dois eventos anônimos, agregados por dia no servidor. Mesma régua da
   loja Treta: sem consentimento de medição (window.__csPrivacy) não sai nada. */
const EVENTOS = new Set(['modal_view', 'open']);
export function registrarEventoPasse(event) {
  if (!EVENTOS.has(event) || !globalThis.__csPrivacy?.allowed()) return;
  void pedir({ action: 'analytics', event }).catch(() => {});
}

/* Conta trocou (login, logout): esquece o status da conta anterior antes de perguntar de novo.
   id: perfil da conta nova (cs-account-change); sem id não há memória de novidades. */
export function trocarContaPasse(id = null) {
  epoca++; carregando = null; estado = null; falhou = false; partida = null;
  conta = typeof id === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(id) ? id : null;
  avisar();
  return carregarPasse();
}

let resgatando = null, resgatandoChave = '';
/* Resgate de UM nível. Sem conta não sai pedido: quem chama leva o jogador para o login. */
export async function resgatarNivel(level) {
  if (!estado?.authenticated) throw new Error('account_required');
  if (!inteiro(level, 1) || level > PASSE_NIVEIS) throw new Error('level_locked');
  const minha = epoca, chave = `${minha}:${level}`;   // clique duplo vira um pedido; outra conta, nunca
  if (resgatando && resgatandoChave === chave) return resgatando;
  const pedido = (async () => {
    const out = await pedir({ action: 'claim', level });
    const novo = normalizarStatus(out?.status);
    if (novo && minha === epoca) { estado = novo; avisar(); }
    return out;
  })().finally(() => { if (resgatando === pedido) resgatando = null; });
  resgatando = pedido; resgatandoChave = chave;
  return pedido;
}

/* RESGATAR TUDO: um POST por nível, EM SEQUÊNCIA (o servidor limita 30/min por conta). rate_limited
   espera e tenta o mesmo nível de novo; outro erro para a fila e devolve o que já saiu. Um por vez:
   o segundo clique recebe a mesma fila. Recompensas vêm da trilha do status, não do cliente. */
export const PASSE_ESPACO_RESGATE_MS = 150;
export const PASSE_ESPERA_LIMITE_MS = 2500;
const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms));
let resgateTodos = null;
export function resgatarTodos({ aoProgresso = () => {}, espera = dormir } = {}) {
  if (resgateTodos) return resgateTodos;
  if (!estado?.authenticated) return Promise.reject(new Error('account_required'));
  const minha = epoca, fila = [...estado.claimable], trilha = estado.levels;
  const resgatarComLimite = async (n) => {
    for (let tentativa = 0; ; tentativa++) {
      try { return await resgatarNivel(n); }
      catch (e) { if (e.message !== 'rate_limited' || tentativa >= 3) throw e; await espera(PASSE_ESPERA_LIMITE_MS); }
    }
  };
  const pedido = (async () => {
    const niveis = [], premios = [];
    let erro = null;
    for (let i = 0; i < fila.length; i++) {
      if (minha !== epoca) { erro = 'account_changed'; break; }
      aoProgresso({ feitos: i, total: fila.length, nivel: fila[i] });
      try {
        const out = await resgatarComLimite(fila[i]);
        if (!out) break;
      } catch (e) { erro = e.message || 'passe_unavailable'; break; }
      niveis.push(fila[i]);
      premios.push(...(trilha.find((l) => l.n === fila[i])?.rewards || []));
      if (i < fila.length - 1) await espera(PASSE_ESPACO_RESGATE_MS);
    }
    aoProgresso({ feitos: niveis.length, total: fila.length, nivel: null });
    return { niveis, recompensas: resumirRecompensas(premios), erro };
  })().finally(() => { if (resgateTodos === pedido) resgateTodos = null; });
  resgateTodos = pedido;
  return pedido;
}
export const resgatandoTodos = () => Boolean(resgateTodos);

/* Recompensas somadas para o resumo: personagens e skins por id, T$ somado, maior bônus de XP. */
export function resumirRecompensas(lista) {
  const r = { personagens: [], skins: [], moedas: 0, boost: 0 };
  for (const p of lista || []) {
    if (p.kind === 'character' && !r.personagens.includes(p.id)) r.personagens.push(p.id);
    else if (p.kind === 'weapon_skin' && !r.skins.includes(p.id)) r.skins.push(p.id);
    else if (p.kind === 'coins') r.moedas += p.amount;
    else if (p.kind === 'xp_boost') r.boost = Math.max(r.boost, p.amount);
  }
  return r;
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
