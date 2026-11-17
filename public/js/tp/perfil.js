/* Treta Pop · 10 carreira e clã, 11 perfil. Carregado por tp/ligar.js só com ?ui=v3. */
import { tr, LANG } from '../i18n.js';
import { careerRank, CAREER_RANKS } from '../career-rank.js';
import { PROFILE_CHARACTERS } from '../profile-character-catalog.js';
import { profileSocialLinks } from '../ranking-player.js';
import { WEAPONS } from '../data/weapons.js';
import { MAPS, resolveMapId } from '../maps.js';
import { heroUrl, retratoFontes } from '../data/retratos.js';
import { origemCompartilhamento } from '../compartilhar.js';
import { TRETA_SKINS } from '../treta-catalog.js';

const local = () => (LANG === 'en' ? 'en-US' : 'pt-BR');
const num = (n) => Number(n).toLocaleString(local());
const conta = (n) => (Number.isFinite(Number(n)) ? num(Number(n)) : '0');
const decimal = (n, casas) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString(local(), { maximumFractionDigits: casas }) : '0');
const MODOS = { ctf: 'Captura', rounds: 'Mata-mata' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ERROS = {
  nick_invalid: 'Use de 2 a 14 letras, números, _ . ou -.', nick_taken: 'Esse nick já está em uso. Escolha outro.',
  links_invalid: 'Use links HTTPS das redes indicadas.', settings_invalid: 'Revise a bio e as opções de privacidade.',
  rate_limited: 'Calma, fiscal da resenha. Tente de novo em um minuto.', session_expired: 'Sua sessão expirou. Entre de novo para continuar.',
  avatar_invalid: 'Use PNG, JPEG ou WebP de até 3 MB.',
};
/* Ações do perfil alheio que ficam à vista; as outras vão para o menu "⋯". */
const A_VISTA = ['ADICIONAR AMIGO', 'ACEITAR AMIZADE', 'RECUSAR', 'MANDAR MENSAGEM', 'CANCELAR PEDIDO'];

function el(tag, cls = '', texto = '') {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (texto !== '') n.textContent = texto;
  return n;
}
function botao(texto, cls, fn) {
  const b = el('button', `tp-btn ${cls}`.trim(), texto);
  b.type = 'button';
  b.onclick = fn;
  return b;
}
function titulo(tag, texto, cls = '') {
  const h = el(tag, `tp-disp ${cls}`.trim());
  h.append(el('span', 'tp-ital', texto));
  return h;
}
function imagem(cls, src) {
  const i = el('img', cls);
  i.src = src; i.alt = ''; i.decoding = 'async'; i.referrerPolicy = 'no-referrer';
  i.onerror = () => i.remove();
  return i;
}
function relativo(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const s = (t - Date.now()) / 1000, f = new Intl.RelativeTimeFormat(local(), { numeric: 'auto' });
  for (const [u, k] of [['day', 86400], ['hour', 3600], ['minute', 60]]) if (Math.abs(s) >= k) return f.format(Math.round(s / k), u);
  return f.format(0, 'minute');
}
const idMapa = (id) => { const r = resolveMapId(id); return MAPS[r] ? r : null; };
const nomeMapa = (id) => MAPS[idMapa(id)]?.name || String(id || '');
/* Partida solo é dado do aparelho do jogador: só o campo source decide o rótulo. */
const SOLO = 'client_solo_unverified';
const origem = (h) => (h.source === SOLO ? tr('Solo')
  : h.game_type === 'multiplayer' ? 'Multiplayer' : /^single_?player$/.test(h.game_type || '') ? tr('Solo') : '');
const modo = (h) => [MODOS[h.mode] ? tr(MODOS[h.mode]) : String(h.mode || '').toUpperCase(), origem(h)].filter(Boolean).join(' · ');
const marcas = (r) => (r.symbol === 'star' ? '★' : '▲').repeat(r.marks);
/* Skin vem do backend (097: last_skin, ao lado de last_character, mesma partida e mesmo share_character).
   Ela só vale quando é do mesmo personagem base; sem ela (ou payload antigo) fica o retrato do base. */
const SKINS = new Map(TRETA_SKINS.map((s) => [s.id, s]));
function personagemDe(p) {
  const base = Object.hasOwn(PROFILE_CHARACTERS, p?.last_character || '') ? PROFILE_CHARACTERS[p.last_character] : null;
  const skin = typeof p?.last_skin === 'string' ? SKINS.get(p.last_skin) : null;
  if (skin && (!base || skin.character === base.id)) {
    const src = `/img/skins/${skin.id}.webp`;
    return { id: skin.character, nome: skin.name, skin: skin.id, arte: src, hero: src, avatar: src, reserva: base?.portrait || null };
  }
  if (!base) return null;
  return { id: base.id, nome: base.nome, skin: null, arte: base.portrait, hero: heroUrl(base.id), avatar: retratoFontes(base.id)[0] || '', reserva: base.portrait };
}
const retrato = (p) => personagemDe(p)?.arte || null;
/* O backend manda SEGUNDOS; hora decimal ("6,7 h") não é leitura de jogador. */
function tempo(seg) {
  const s = Math.max(0, Math.floor(Number(seg) || 0)), h = Math.floor(s / 3600), min = Math.floor((s % 3600) / 60);
  if (!h) return `${num(min)} min`;
  return min ? `${num(h)} h ${String(min).padStart(2, '0')} min` : `${num(h)} h`;
}
/* top_weapons vem do nó (abates confirmados), top 3 e sem ordem garantida: ordem e corte ficam aqui. */
function armasDe(p) {
  return (Array.isArray(p.top_weapons) ? p.top_weapons : [])
    .filter((w) => typeof w?.weapon === 'string' && Number.isSafeInteger(w.kills) && w.kills > 0)
    .sort((a, b) => b.kills - a.kills).slice(0, 3);
}
const nomeArma = (id) => WEAPONS[id]?.name || String(id).toUpperCase();

/* Medalhas: a chave é a do servidor (player_achievement) e a regra derivada segue os totais do perfil.
   Abate e tempo das partidas SOLO (bloco `solo`) entram só aqui; o ranking tem regra própria e nunca lê esta soma.
   solo.rounds é rodada JOGADA, não vencida: não vale para "Primeira vitória". Data só quando o servidor manda. */
const MEDALHAS = [
  { key: 'first_kill', nome: 'Primeiro abate', desc: 'O primeiro adversário no chão. Daqui pra frente é ladeira abaixo.', criterio: 'Fazer 1 abate', meta: 1, de: 'kills', icone: 'mira', un: ['abate', 'abates'] },
  { key: 'ten_kills', nome: 'Dez abates na conta', desc: 'Dez na conta: já dá pra contar vantagem no grupo.', criterio: 'Somar 10 abates', meta: 10, de: 'kills', icone: 'alvo', un: ['abate', 'abates'] },
  { key: 'first_win', nome: 'Primeira vitória', desc: 'Levou a primeira rodada. O placar lembra.', criterio: 'Vencer 1 rodada', meta: 1, de: 'wins', icone: 'taca', un: ['vitória', 'vitórias'] },
  { key: 'one_hour', nome: 'Uma hora de arena ativa', desc: 'Sessenta minutos de treta de verdade: menu, espectador e AFK não contam.', criterio: 'Jogar 1 hora de partida ativa', meta: 3600, de: 'seg', icone: 'relogio' },
];
function totaisMedalha(p) {
  const n = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0), s = p.solo && typeof p.solo === 'object' ? p.solo : {};
  return { kills: n(p.kills) + n(s.kills), wins: Math.max(n(p.round_wins), n(p.legacy_wins ?? p.wins)), seg: n(p.verified_play_seconds) + n(s.solo_play_seconds) };
}
function medalhas(p) {
  const t = totaisMedalha(p), salvas = new Map((Array.isArray(p.achievements) ? p.achievements : []).filter((a) => typeof a?.key === 'string').map((a) => [a.key, a]));
  return MEDALHAS.map((m) => {
    const valor = t[m.de], s = salvas.get(m.key), ok = !!s || valor >= m.meta;
    return { ...m, valor, ok, at: s?.at || null, doServidor: !!s, p: ok ? 1 : Math.min(1, valor / m.meta) };
  });
}
const valorMedalha = (m, v) => (m.de === 'seg' ? tempo(v) : `${conta(v)} ${tr(m.un[Number(v) === 1 ? 0 : 1])}`);

const SVG = 'http://www.w3.org/2000/svg';
const ICONES = {
  mira: [['circle', { cx: 12, cy: 12, r: 6.5 }], ['path', { d: 'M12 1.5v6M12 16.5v6M1.5 12h6M16.5 12h6' }]],
  alvo: [['circle', { cx: 12, cy: 12, r: 9 }], ['circle', { cx: 12, cy: 12, r: 5 }], ['circle', { cx: 12, cy: 12, r: 1.6, fill: 'currentColor' }]],
  taca: [['path', { d: 'M7 3.5h10v5a5 5 0 0 1-10 0z' }], ['path', { d: 'M7 5.5H3.5V7A3.5 3.5 0 0 0 7 10.5M17 5.5h3.5V7a3.5 3.5 0 0 1-3.5 3.5M12 13.5v4M8 21h8M9.5 17.5h5V21h-5z' }]],
  relogio: [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: 'M12 6.5V12l3.5 3' }]],
};
function icone(nome) {
  const s = document.createElementNS(SVG, 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
  for (const [tag, at] of ICONES[nome]) {
    const n = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(at)) n.setAttribute(k, String(v));
    s.append(n);
  }
  return s;
}
/* Selo da medalha: conquistada brilha; bloqueada fica apagada com o anel de progresso (--p). */
function seloMedalha(m, cls = '') {
  const b = el('span', `tp-medalha ${cls}`.trim());
  b.dataset.estado = m.ok ? 'ganha' : 'travada';
  b.style.setProperty('--p', String(m.p));
  b.append(icone(m.icone));
  return b;
}
const dataCurta = (iso) => { const t = Date.parse(iso); return Number.isFinite(t) ? new Date(t).toLocaleDateString(local()) : ''; };

/* Modal do perfil: um <dialog> por vez (fecha qualquer outro antes), foco no ✕, Esc e clique fora fecham,
   o foco volta para quem abriu e o nó sai do DOM ao fechar. */
function modal(id, rotulo, texto, corpo, origem = null) {
  const volta = origem || document.activeElement;
  for (const d of document.querySelectorAll('dialog[open]')) d.close();
  const d = el('dialog', 'tp-pmodal');
  d.id = id; d.setAttribute('aria-labelledby', `${id}-titulo`);
  const caixa = el('div', 'tp-pmodal__caixa'), cab = el('header', 'tp-pmodal__cab'), titulos = el('div', 'tp-pmodal__titulos');
  const h = titulo('h2', texto, 'tp-pmodal__titulo');
  h.id = `${id}-titulo`;
  titulos.append(el('span', 'tp-rotulo', rotulo), h);
  const x = el('button', 'tp-pmodal__fechar', '✕');
  x.type = 'button'; x.setAttribute('aria-label', tr('Fechar')); x.onclick = () => d.close();
  cab.append(titulos, x);
  caixa.append(cab, ...corpo);
  d.append(caixa);
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  d.addEventListener('close', () => { d.remove(); if (volta?.isConnected) volta.focus?.(); }, { once: true });
  document.body.append(d);
  d.showModal();
  x.focus();
  return d;
}
function abrirMedalhas(p, foco = '', origem = null) {
  const lista = medalhas(p), ganhas = lista.filter((m) => m.ok).length;
  const g = el('ul', 'tp-pmodal__medalhas');
  for (const m of lista) {
    const li = el('li', 'tp-pmodal__medalha'), txt = el('div', 'tp-pmodal__medalha-texto');
    li.dataset.estado = m.ok ? 'ganha' : 'travada'; li.dataset.chave = m.key;
    const barra = el('div', 'tp-barra tp-pmodal__barra');
    barra.append(el('i'));
    barra.style.setProperty('--p', String(m.p));
    barra.setAttribute('role', 'progressbar'); barra.setAttribute('aria-label', tr(m.nome));
    barra.setAttribute('aria-valuemin', '0'); barra.setAttribute('aria-valuemax', String(m.meta)); barra.setAttribute('aria-valuenow', String(Math.min(m.valor, m.meta)));
    const pe = el('div', 'tp-pmodal__pe');
    pe.append(el('span', 'tp-num', m.ok ? valorMedalha(m, m.valor) : `${valorMedalha(m, m.valor)} / ${valorMedalha(m, m.meta)}`),
      el('span', 'tp-pmodal__estado', m.ok ? (m.at ? `${tr('Conquistada em')} ${dataCurta(m.at)}` : tr(m.doServidor ? 'Conquistada' : 'Conquistada pelos totais do perfil'))
        : `${tr('Falta')} ${valorMedalha(m, m.meta - m.valor)}`));
    txt.append(titulo('h3', tr(m.nome), 'tp-pmodal__medalha-nome'), el('p', 'tp-pmodal__desc', tr(m.desc)),
      el('span', 'tp-pmodal__criterio', `${tr('Critério')}: ${tr(m.criterio)}`), barra, pe);
    li.append(seloMedalha(m, 'tp-medalha--grande'), txt);
    g.append(li);
  }
  const d = modal('tp-perfil-medalhas', tr('CONQUISTAS DA CARREIRA'), tr('Medalhas'), [
    el('p', 'tp-pmodal__resumo', `${ganhas} / ${lista.length} ${tr('conquistadas')}`), g,
    el('p', 'tp-pmodal__nota', tr('Abates e tempo das partidas solo contam para as medalhas. No ranking geral o solo vale 0,5×.'))], origem);
  if (foco) d.querySelector(`[data-chave="${foco}"]`)?.scrollIntoView({ block: 'nearest' });
  return d;
}

/* Patente: CAREER_RANKS (career-rank.js) sobre os pontos de carreira; nível = 1 + pontos/100 (074). */
function emblema(r, cls = '') {
  const s = el('span', `tp-emblema ${cls}`.trim(), marcas(r));
  s.dataset.tier = r.tier;
  s.setAttribute('aria-hidden', 'true');
  return s;
}
const nivelDe = (p) => (Number.isFinite(Number(p.level)) ? Number(p.level) : null);
function abrirPatentes(p, origem = null) {
  const pts = Math.max(0, Number(p.points) || 0), atual = careerRank(p.points), prox = atual && CAREER_RANKS[CAREER_RANKS.indexOf(atual) + 1];
  const topo = el('div', 'tp-pmodal__patente');
  const quem = el('div', 'tp-pmodal__patente-texto');
  quem.append(titulo('h3', tr(atual.label), 'tp-pmodal__patente-nome'),
    el('span', 'tp-num', [nivelDe(p) !== null ? `${tr('Nível')} ${nivelDe(p)}` : '', `${num(pts)} ${tr('pontos')}`].filter(Boolean).join(' · ')));
  topo.append(emblema(atual, 'tp-emblema--grande'), quem);
  const rumo = el('div', 'tp-pmodal__rumo');
  if (prox) {
    const linha = el('div', 'tp-pmodal__pe');
    const rot = el('span', '', `${tr('Próxima patente')}: `);
    rot.append(el('b', '', `${marcas(prox)} ${tr(prox.label)}`));
    linha.append(rot, el('span', 'tp-num', `${num(pts)} / ${num(prox.minPoints)}`));
    const barra = el('div', 'tp-barra tp-pmodal__barra');
    barra.append(el('i'));
    barra.style.setProperty('--p', String(Math.min(1, pts / prox.minPoints)));
    barra.setAttribute('role', 'progressbar'); barra.setAttribute('aria-label', tr('Próxima patente'));
    barra.setAttribute('aria-valuemin', '0'); barra.setAttribute('aria-valuemax', String(prox.minPoints)); barra.setAttribute('aria-valuenow', String(pts));
    rumo.append(linha, barra, el('span', 'tp-pmodal__estado', `${tr('Faltam')} ${num(prox.minPoints - pts)} ${tr('pontos')}`));
  } else rumo.append(el('b', '', tr('Patente máxima')));
  const escada = el('ol', 'tp-pmodal__escada');
  for (const r of CAREER_RANKS) {
    const li = el('li', 'tp-pmodal__degrau'), estado = r === atual ? 'atual' : r.minPoints <= pts ? 'feita' : 'proxima';
    li.dataset.estado = estado;
    if (estado === 'atual') li.setAttribute('aria-current', 'step');
    const txt = el('span', 'tp-pmodal__degrau-texto');
    txt.append(el('b', '', tr(r.label)), el('span', 'tp-num', `${tr('Nível')} ${r.minPoints / 100 + 1} · ${num(r.minPoints)} ${tr('pontos')}`));
    li.append(emblema(r), txt, el('span', 'tp-pmodal__degrau-tag', estado === 'atual' ? tr('VOCÊ ESTÁ AQUI') : estado === 'feita' ? '✓' : ''));
    escada.append(li);
  }
  return modal('tp-perfil-patentes', tr('PATENTES DE CARREIRA'), tr('Escada de patentes'), [topo, rumo, escada,
    el('p', 'tp-pmodal__nota', tr('Cada 100 pontos sobem um nível. Abate multiplayer confirmado soma 2 pontos; abate solo soma 0,5 no ranking geral.'))], origem);
}
/* Selo de patente + nível no topo do perfil: um botão só, que abre a escada inteira. */
function patente(p) {
  const r = careerRank(p.points), nivel = nivelDe(p) !== null ? el('span', 'tp-perfil__nivel', `${tr('Nível')} ${p.level}`) : null;
  if (!r) return nivel;
  const b = el('button', 'tp-patente-botao');
  b.type = 'button'; b.title = tr('Ver escada de patentes'); b.setAttribute('aria-haspopup', 'dialog');
  const s = el('span', 'tp-patente', `${marcas(r)} ${tr(r.label).toUpperCase()}`);
  s.dataset.tier = r.tier;
  b.dataset.tier = r.tier;
  const seta = el('span', 'tp-patente-botao__seta', '›');
  seta.setAttribute('aria-hidden', 'true');
  b.append(s, ...(nivel ? [nivel] : []), seta);
  b.onclick = () => abrirPatentes(p, b);
  return b;
}
function inicial(p, cls) {
  const i = el('span', `${cls} tp-perfil__inicial tp-disp`, String(p.nick || '?').slice(0, 1));
  i.setAttribute('aria-hidden', 'true');
  return i;
}
/* Sem foto enviada, o rosto do último personagem (data/retratos.js) ou da skin; personagem sem rosto cai na inicial. */
function avatar(p, cls) {
  const c = p.avatar_url ? null : personagemDe(p), src = p.avatar_url || c?.avatar || '';
  if (!src) return inicial(p, cls);
  const img = imagem(cls, src);
  if (c?.skin) img.dataset.recorte = 'skin';
  img.onerror = () => img.replaceWith(inicial(p, cls));
  return img;
}
function trk(rotulo, valor, texto = false) {
  const d = el('div', 'tp-perfil__trk');
  d.append(el('span', 'tp-rotulo', tr(rotulo)), el('span', texto ? 'tp-perfil__trk-texto' : 'tp-num tp-perfil__trk-num', valor));
  return d;
}
function presenca(pr) {
  if (!pr) return null;
  const on = !!(pr.game || pr.online);
  const s = el('span', 'tp-perfil__presenca', tr(pr.game ? 'jogando agora' : pr.online ? 'no lobby' : 'offline'));
  s.dataset.on = String(on);
  return s;
}
function identidade(d, cla) {
  const { p } = d;
  const linha = el('span', 'tp-perfil__linha tp-perfil__linha--topo');
  if (d.own && cla?.clan?.tag) linha.append(el('span', 'tp-perfil__tag tp-num', `[${cla.clan.tag}]`));
  if (p.handle) linha.append(el('span', 'tp-perfil__handle', `@${p.handle}`));
  const pr = presenca(p.presence);
  if (pr) linha.append(pr);
  const meta = el('span', 'tp-perfil__linha'), pat = patente(p);
  if (pat) meta.append(pat);
  return [linha, titulo('h2', p.nick, 'tp-perfil__nick'), meta];
}
function cabecalho(texto, nota) {
  const cab = el('div', 'tp-perfil__cab');
  cab.append(titulo('h3', tr(texto)));
  if (nota) cab.append(el('span', 'tp-perfil__nota', tr(nota)));
  return cab;
}
/* Miniatura do mapa com o resultado (V/D) como selo por cima; sem miniatura (mapa sem prévia ou erro) fica só o selo grande. */
function marcaResultado(h) {
  const m = el('span', 'tp-perfil__marca tp-disp');
  m.dataset.resultado = h.result || '';
  const mid = idMapa(h.map);
  if (mid) {
    const i = imagem('tp-perfil__marca-mapa', `/img/map-previews/${mid}.jpg`);
    i.onerror = () => { i.remove(); delete m.dataset.mapa; };
    m.dataset.mapa = '';
    m.append(i);
  }
  m.append(el('span', 'tp-perfil__marca-letra', h.result === 'win' ? tr('Vitória').charAt(0) : h.result === 'loss' ? tr('Derrota').charAt(0) : '·'));
  return m;
}
/* Solo vem do aparelho do jogador. Com a conta elegível (solo.counts_for_ranking, 7+ dias) ele conta 0,5× no ranking geral
   (094/095) e a linha ganha o selo; sem elegibilidade (ou payload antigo) fica só o rótulo "Solo" do modo. Nada de tom de alerta. */
const soloVale = (p) => p?.solo?.counts_for_ranking === true;
function selaOrigem(linha, h, vale) {
  if (h.source !== SOLO) return null;
  linha.dataset.origem = 'solo';
  if (!vale) return null;
  const s = el('span', 'tp-selo-solo', tr('0,5× no ranking'));
  s.title = tr('Solo · conta 0,5× no ranking geral');
  return s;
}
function aviso() {
  const a = el('p', 'tp-perfil__aviso');
  a.setAttribute('role', 'status'); a.setAttribute('aria-live', 'polite');
  return a;
}
/* Sem conta o perfil continua na tela: o convite é esta faixa fina, e o painel inteiro da conta só abre no clique. */
function convite() {
  const f = el('aside', 'tp-perfil__convite');
  f.setAttribute('aria-label', tr('Entrar ou criar conta'));
  const t = el('div', 'tp-perfil__convite-texto');
  t.append(el('b', '', tr('Você está sem conta')), el('span', '', tr('Este perfil fica só neste navegador. Com conta ele ganha link próprio, amigos e ranking.')));
  f.append(t, botao(tr('ENTRAR OU CRIAR CONTA'), '', () => document.dispatchEvent(new CustomEvent('cs-conta-abrir'))));
  return f;
}
/* Visitante que ainda não tem rodada confirmada: o servidor não devolve perfil, então aqui fica o vazio — sem número inventado. */
function vistaSemPerfil() {
  const s = el('section', 'tp-painel tp-perfil__bloco tp-perfil__sem');
  s.setAttribute('aria-label', tr('Seu perfil'));
  s.append(cabecalho('Seu perfil', 'ainda sem rodada confirmada'),
    el('p', 'tp-perfil__vazio', tr('Abates, ranking e histórico aparecem aqui quando o servidor confirmar sua primeira rodada.')),
    botao(tr('JOGAR AGORA'), 'tp-btn--primario tp-perfil__sem-jogar', () => document.querySelector('.hub-tabs [data-hub-tab="jogar"]')?.click()));
  return s;
}

export function ligar() {
  const raiz = document.getElementById('community'), content = document.getElementById('social-content');
  if (!raiz || !content) return;
  let vista = 'perfil', avisoGuardado = '', cla = null, claDe = '', saidaAtual = null, obsNota = null, desenho = { no: null, sig: '' };

  const acoesLegado = () => [...(content.querySelector(':scope > .social-card .social-actions')?.children || [])];
  const clicaLegado = (texto) => acoesLegado().find((b) => b.tagName === 'BUTTON' && b.textContent.trim() === texto);
  const reabrir = () => document.dispatchEvent(new CustomEvent('cs-community-open', { detail: { tab: 'profile' } }));
  async function api(path, corpo) {
    const r = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo), signal: AbortSignal.timeout(12000) });
    let d;
    try { d = await r.json(); } catch { throw new Error('social_unavailable'); }
    if (!r.ok) throw new Error(d?.error || 'social_unavailable');
    return d;
  }
  function convidado() {
    try {
      const uid = localStorage.getItem('cs_anon'), token = localStorage.getItem('awpbr_token');
      return uid && token ? { uid, token } : {};
    } catch { return {}; }
  }

  function abas() {
    const nav = el('div', 'tp-abas tp-perfil__abas');
    nav.setAttribute('role', 'tablist'); nav.setAttribute('aria-label', tr('Seu perfil e sua carreira'));
    for (const [id, rotulo] of [['perfil', 'Perfil'], ['carreira', 'Carreira e clã']]) {
      const b = el('button', 'tp-aba', tr(rotulo));
      b.type = 'button'; b.dataset.vista = id;
      b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(vista === id));
      b.onclick = () => { if (vista !== id) { vista = id; montar(true); } };
      nav.append(b);
    }
    const risco = el('i', 'tp-abas__risco');
    nav.append(risco);
    requestAnimationFrame(() => {
      const on = nav.querySelector('[aria-selected="true"]');
      if (on) { risco.style.setProperty('--x', `${on.offsetLeft}px`); risco.style.setProperty('--w', String(on.offsetWidth)); }
    });
    return nav;
  }

  function cartao(d, saida) {
    const { p } = d;
    const s = el('section', 'tp-perfil__cartao');
    s.setAttribute('aria-label', tr('Cartão público'));
    const arte = retrato(p);
    if (arte) s.append(imagem('tp-perfil__arte', arte));
    const id = el('div', 'tp-perfil__id'), quem = el('div', 'tp-perfil__quem');
    quem.append(...identidade(d, cla));
    id.append(avatar(p, 'tp-perfil__avatar'), quem);
    const bio = el('p', 'tp-perfil__bio', p.bio || tr('A bio ainda está no aquecimento.'));
    const redes = el('div', 'tp-perfil__redes');
    for (const r of profileSocialLinks(p)) {
      const a = el('a', 'tp-perfil__rede', r.label);
      a.href = r.url; a.target = '_blank'; a.rel = 'noopener noreferrer nofollow';
      redes.append(a);
    }
    const acoes = el('div', 'tp-perfil__acoes');
    const menu = el('details', 'tp-perfil__mais'), lista = el('div', 'tp-perfil__mais-lista');
    const sum = el('summary', 'tp-btn tp-perfil__mais-botao', '⋯');
    sum.setAttribute('aria-label', tr('Mais ações'));
    menu.append(sum, lista);
    for (const n of acoesLegado()) {
      const texto = n.textContent.trim();
      if (n.tagName !== 'BUTTON') { acoes.append(el('span', 'tp-perfil__selo', tr(texto))); continue; }
      const primario = !d.own && n.classList.contains('social-primary');
      const b = botao(tr(texto), primario ? 'tp-btn--primario' : '', () => clicaLegado(texto)?.click());
      if (d.own ? texto === 'COMPARTILHAR PERFIL' : A_VISTA.includes(texto)) acoes.append(b);
      else lista.append(b);
    }
    if (d.own) acoes.append(botao(tr('ENVIAR FEEDBACK'), '', () => document.querySelector('.hub-tabs [data-hub-tab="feedback"]')?.click()));
    if (lista.children.length) acoes.append(menu);
    s.append(id, bio, redes, acoes, saida);
    return s;
  }

  function vitrine(p, own) {
    const s = el('section', 'tp-painel tp-perfil__bloco');
    s.setAttribute('aria-label', tr('Vitrine'));
    const g = el('div', 'tp-perfil__vitrine');
    const destaque = (cls, rotulo, src, reserva) => {
      const t = el('div', `tp-perfil__destaque ${cls}`);
      if (src) {
        const i = imagem('', src);
        if (reserva) i.onerror = () => { i.onerror = () => i.remove(); i.src = reserva; };
        t.append(i);
      }
      t.append(typeof rotulo === 'string' ? el('span', 'tp-perfil__destaque-rotulo tp-disp', rotulo) : rotulo);
      return t;
    };
    /* Personagem: faixa no rodapé (rótulo pequeno em cima, nome embaixo) sobre um degradê, sem cobrir o rosto. */
    const c = personagemDe(p), faixa = c && el('span', 'tp-perfil__destaque-rotulo tp-perfil__destaque-faixa');
    if (c) faixa.append(el('span', 'tp-rotulo tp-perfil__destaque-mini', tr('Último personagem')), el('span', 'tp-disp tp-perfil__destaque-nome', c.nome));
    g.append(c ? destaque('tp-perfil__destaque--personagem', faixa, c.hero || c.arte, c.hero && c.reserva)
      : destaque('tp-perfil__destaque--vazio', tr(own ? 'Personagem aparece depois da primeira rodada confirmada' : 'Último personagem não compartilhado')));
    /* Medalhas à vista: os quatro selos (conquistada brilha, bloqueada mostra o progresso) e o clique abre a lista inteira. */
    const m = medalhas(p), ganhas = m.filter((x) => x.ok).length, med = el('button', 'tp-perfil__destaque tp-perfil__destaque--medalha');
    med.type = 'button'; med.setAttribute('aria-haspopup', 'dialog');
    const fila = el('span', 'tp-perfil__medalhas-fila');
    for (const x of m) fila.append(seloMedalha(x));
    med.append(fila, el('span', 'tp-perfil__destaque-rotulo tp-disp', ganhas ? `${tr('Medalhas')} · ${ganhas}/${m.length}` : tr('A primeira medalha vem do primeiro abate')));
    med.onclick = () => abrirMedalhas(p, '', med);
    g.append(med);
    const fav = p.activity_visible === true ? p.favorites?.[0] : null, mid = fav && idMapa(fav.map);
    g.append(fav ? destaque('tp-perfil__destaque--mapa', `${tr('Arena favorita')} · ${nomeMapa(fav.map)}`, mid ? `/img/map-previews/${mid}.jpg` : null)
      : destaque('tp-perfil__destaque--vazio', tr('Arena favorita aparece com as rodadas confirmadas')));
    s.append(cabecalho('Vitrine', 'destaques do histórico'), g);
    return s;
  }

  function numeros(d) {
    const { p } = d;
    const s = el('section', 'tp-painel tp-perfil__bloco');
    s.setAttribute('aria-label', tr('Números'));
    const cab = cabecalho('Números');
    if (d.own) {
      const v = el('button', 'tp-perfil__link', `${tr('VER CARREIRA')} ▸`);
      v.type = 'button'; v.onclick = () => { vista = 'carreira'; montar(true); };
      cab.append(v);
    }
    const g = el('div', 'tp-perfil__trks');
    const seg = Number(p.verified_play_seconds), legado = Number(p.legacy_play_seconds) || 0;
    g.append(trk('Abates', conta(p.kills)), trk('Vitórias', conta(p.round_wins ?? p.wins)), trk('K/D', decimal(p.kd, 2)),
      trk('Partidas', conta(p.matches)), trk('Ranking', p.position ? `#${num(p.position)}` : tr('Privado')),
      trk('Horas jogadas', Number.isFinite(seg) && seg > 0 ? tempo(seg) : tr('ainda sem partida confirmada'), true));
    /* O tempo antigo NÃO entra no número de cima: ele é de outra medição e misturar inventa hora que ninguém jogou. */
    s.append(cab, g, el('span', 'tp-perfil__nota', legado > 0
      ? `${tr('Horas confirmadas pelo servidor. Antes da atualização:')} ${tempo(legado)}, ${tr('contadas à parte.')}`
      : tr('Horas confirmadas pelo servidor: menu, espectador e AFK não contam.')));
    return s;
  }

  function armas(p) {
    const s = el('section', 'tp-painel tp-perfil__bloco tp-perfil__armas-bloco');
    s.setAttribute('aria-label', tr('Armas preferidas'));
    s.append(cabecalho('Armas preferidas', 'abates confirmados pelo servidor'));
    /* Sem o campo na resposta não há lista para desenhar: o bloco fica pronto e escondido até o backend mandar top_weapons. */
    if (!Array.isArray(p.top_weapons)) { s.hidden = true; s.dataset.esperando = 'top_weapons'; return s; }
    const lista = armasDe(p);
    if (!lista.length) {
      s.append(el('p', 'tp-perfil__vazio', tr('Ainda sem arma registrada: elas entram a partir das partidas multiplayer confirmadas pelo servidor.')));
      return s;
    }
    const g = el('ol', 'tp-perfil__armas'), topo = lista[0].kills;
    for (const w of lista) {
      const li = el('li', 'tp-perfil__arma');
      if (WEAPONS[w.weapon]) li.append(imagem('tp-perfil__arma-img', `/img/weapons/${w.weapon}.webp`));
      const texto = el('span', 'tp-perfil__arma-texto');
      texto.append(el('b', '', nomeArma(w.weapon)), el('span', 'tp-num tp-perfil__arma-num', `${conta(w.kills)} ${tr(w.kills === 1 ? 'abate' : 'abates')}`));
      const barra = el('div', 'tp-barra tp-perfil__arma-barra');
      barra.append(el('i'));
      barra.style.setProperty('--p', String(w.kills / topo));
      texto.append(barra);
      li.append(texto);
      g.append(li);
    }
    s.append(g);
    return s;
  }

  function atividade(d) {
    const { p } = d, visivel = p.activity_visible === true;
    const s = el('section', 'tp-painel tp-perfil__bloco');
    s.setAttribute('aria-label', tr('Atividade recente'));
    const g = el('div', 'tp-perfil__atividade');
    for (const h of (visivel && Array.isArray(p.history) ? p.history : []).slice(0, 3)) {
      const it = el('div', 'tp-perfil__evento'), t = el('span', 'tp-perfil__evento-texto');
      const sub = el('small', '', [modo(h), relativo(h.started_at)].filter(Boolean).join(' · ')), selo = selaOrigem(it, h, soloVale(p));
      if (selo) sub.append(selo);
      t.append(el('b', '', `${nomeMapa(h.map)} · ${conta(h.kills)}/${conta(h.deaths)}`), sub);
      it.append(marcaResultado(h), t);
      g.append(it);
    }
    if (!g.children.length) g.append(el('p', 'tp-perfil__vazio', tr(visivel
      ? 'Ainda sem partida registrada.' : 'Este jogador não compartilha as rodadas com você.')));
    s.append(cabecalho('Atividade', 'multiplayer confirmado e solo a 0,5× no ranking'), g);
    return s;
  }

  function editar(d, saida, cartaoEl) {
    const { p } = d, c = d.conta;
    const s = el('aside', 'tp-painel tp-perfil__editar');
    s.setAttribute('aria-label', tr('Editar perfil'));
    s.append(cabecalho('Editar perfil', 'prévia ao lado, ao vivo'));
    if (!c?.settings) { s.append(el('p', 'tp-perfil__vazio', tr('Seus dados de perfil não carregaram. Tente de novo em instantes.'))); return s; }
    const dizer = (t) => { saida.textContent = t; };
    const campo = (rotulo, input, ...extra) => {
      const f = el('label', 'tp-perfil__campo');
      f.append(el('span', 'tp-perfil__rotulo-campo', tr(rotulo)), input, ...extra);
      return f;
    };
    const nick = el('input', 'tp-perfil__input');
    Object.assign(nick, { id: 'tp-pf-nick', value: p.nick, maxLength: 14, pattern: '[A-Za-z0-9_.\\-]{2,14}', required: true, autocomplete: 'nickname' });
    nick.oninput = () => { const h = cartaoEl.querySelector('.tp-perfil__nick .tp-ital'); if (h) h.textContent = nick.value || p.nick; };

    const arquivo = el('input');
    Object.assign(arquivo, { type: 'file', accept: 'image/png,image/jpeg,image/webp', hidden: true, id: 'tp-pf-foto' });
    const mais = el('button', 'tp-perfil__foto-mais', '+');
    mais.type = 'button'; mais.setAttribute('aria-label', tr('Enviar foto')); mais.onclick = () => arquivo.click();
    arquivo.onchange = async () => {
      const f = arquivo.files[0];
      try {
        if (!f || !['image/png', 'image/jpeg', 'image/webp'].includes(f.type) || f.size > 3000000) throw new Error('avatar_invalid');
        dizer(tr('Só um instante…'));
        const image = await new Promise((ok, falha) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = falha; r.readAsDataURL(f); });
        await api('/api/avatar', { image });
        avisoGuardado = tr('Foto atualizada.');
        reabrir();
      } catch (e) { dizer(tr(ERROS[e.message] || 'Não deu certo agora. Tente de novo.')); }
    };
    const foto = el('div', 'tp-perfil__campo'), fila = el('div', 'tp-perfil__foto');
    fila.append(avatar(p, 'tp-perfil__foto-atual'), mais, arquivo);
    foto.append(el('span', 'tp-perfil__rotulo-campo', tr('FOTO · PNG, JPEG OU WEBP ATÉ 3 MB')), fila);

    const bio = el('textarea', 'tp-perfil__input tp-perfil__textarea');
    Object.assign(bio, { id: 'tp-pf-bio', maxLength: 280, rows: 3, value: c.bio ?? p.bio ?? '' });
    const contador = el('span', 'tp-num tp-perfil__contador');
    const contar = () => {
      contador.textContent = `${bio.value.length} / 280`;
      const b = cartaoEl.querySelector('.tp-perfil__bio');
      if (b) b.textContent = bio.value || tr('A bio ainda está no aquecimento.');
    };
    bio.oninput = contar;
    contar();

    const quem = el('select', 'tp-perfil__input');
    quem.id = 'tp-pf-quem';
    for (const [v, t] of [['public', 'Todo mundo, com link próprio'], ['friends', 'Só amigos'], ['private', 'Só você']]) {
      const o = el('option', '', tr(t)); o.value = v; quem.append(o);
    }
    quem.value = c.settings.profile || 'public';
    const atividade = el('select', 'tp-perfil__input');
    atividade.id = 'tp-pf-atividade';
    for (const [v, t] of [['public', 'Todo mundo'], ['friends', 'Só amigos'], ['private', 'Só você']]) {
      const o = el('option', '', tr(t)); o.value = v; atividade.append(o);
    }
    atividade.value = c.settings.activity || 'friends';
    const mostra = el('input');
    Object.assign(mostra, { type: 'checkbox', id: 'tp-pf-personagem', checked: c.settings.share_character === true });
    const mostraCampo = el('label', 'tp-perfil__check');
    mostraCampo.append(mostra, el('span', '', tr('Mostrar meu último personagem no perfil público')));

    let links = (c.socials || []).map((x) => x.url).filter(Boolean);
    const redes = el('div', 'tp-perfil__chips');
    const nova = el('input', 'tp-perfil__input tp-perfil__nova-rede');
    Object.assign(nova, { type: 'url', placeholder: 'https://', hidden: true });
    nova.setAttribute('aria-label', tr('Link da rede'));
    const desenhaRedes = () => {
      redes.replaceChildren();
      for (const url of links) {
        const rotulo = profileSocialLinks({ socials: [{ url }] })[0]?.label || url;
        const x = el('button', 'tp-perfil__chip', `${rotulo} ✕`);
        x.type = 'button'; x.setAttribute('aria-label', `${tr('Remover')} ${rotulo}`);
        x.onclick = () => { links = links.filter((u) => u !== url); desenhaRedes(); };
        redes.append(x);
      }
      if (links.length < 5) {
        const add = el('button', 'tp-perfil__chip tp-perfil__chip--nova', `+ ${tr('REDE')}`);
        add.type = 'button'; add.onclick = () => { nova.hidden = false; nova.focus(); };
        redes.append(add);
      }
    };
    nova.onkeydown = (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const url = nova.value.trim();
      if (!profileSocialLinks({ socials: [{ url }] }).length) { dizer(tr(ERROS.links_invalid)); return; }
      links = [...new Set([...links, url])].slice(0, 5);
      nova.value = ''; nova.hidden = true;
      desenhaRedes();
    };
    desenhaRedes();
    const redesCampo = el('div', 'tp-perfil__campo');
    redesCampo.append(el('span', 'tp-perfil__rotulo-campo', tr('REDES SOCIAIS')), redes, nova);

    const fora = el('p', 'tp-perfil__nota tp-perfil__fora');
    const priv = el('button', 'tp-perfil__link', tr('PRIVACIDADE'));
    priv.type = 'button';
    priv.onclick = () => content.querySelector('.social-profile-tabs button[data-aba="privacidade"]')?.click();
    fora.append(`${tr('Presença, atividade, bloqueios e contas ligadas ficam em')} `, priv, '.');

    const salvar = botao(tr('Salvar perfil'), 'tp-btn--primario tp-perfil__salvar', async () => {
      if (!nick.reportValidity()) return;
      salvar.disabled = true;
      dizer(tr('Só um instante…'));
      try {
        if (nick.value.trim() !== p.nick) await api('/api/social', { action: 'nick', nick: nick.value.trim() });
        await api('/api/social', { action: 'settings', shareCharacter: mostra.checked, bio: bio.value, profile: quem.value,
          presence: c.settings.presence, activity: atividade.value, links: links.map((url) => ({ url })) });
        avisoGuardado = tr('Perfil salvo.');
        reabrir();
      } catch (e) { dizer(tr(ERROS[e.message] || 'Não deu certo agora. Tente de novo.')); }
      finally { salvar.disabled = false; }
    });
    s.append(campo('NICK', nick, el('span', 'tp-perfil__nota', tr('Aparece no killfeed e no placar. Seu ID público e seus links não mudam.'))),
      foto, campo('BIO', bio, contador), campo('QUEM VÊ SEU PERFIL', quem), campo('QUEM VÊ SUAS RODADAS', atividade), mostraCampo, redesCampo, fora, salvar);
    return s;
  }

  /* O aviso do cartão espelha o status do legado (.social-inline-status), que o community.js recria a cada render:
     um observador só, religado ao nó novo a cada render assentado e desligado ao desmontar. */
  function religaNota() {
    obsNota?.disconnect(); obsNota = null;
    const saida = saidaAtual?.isConnected ? saidaAtual : null, nota = content.querySelector(':scope > .social-card .social-inline-status');
    if (!saida) { avisoGuardado = ''; return; }
    if (avisoGuardado || nota?.textContent) saida.textContent = avisoGuardado || tr(nota.textContent);
    avisoGuardado = '';
    if (!nota) return;
    obsNota = new MutationObserver(() => { saida.textContent = tr(nota.textContent); });
    obsNota.observe(nota, { childList: true, characterData: true, subtree: true });
  }

  function vistaPerfil(d) {
    const saida = aviso();
    saidaAtual = saida;
    const grade = el('div', 'tp-perfil__grade'), principal = el('div', 'tp-perfil__principal'), dupla = el('div', 'tp-perfil__dupla');
    const c = cartao(d, saida);
    dupla.append(vitrine(d.p, d.own), numeros(d));
    principal.append(c, dupla, armas(d.p), atividade(d));
    grade.append(principal);
    if (d.own) { grade.dataset.dono = ''; grade.append(editar(d, saida, c)); }
    return grade;
  }

  function vistaCarreira(d) {
    const { p } = d;
    const eu = el('section', 'tp-carreira__eu');
    eu.setAttribute('aria-label', tr('Sua carreira'));
    const hero = el('div', 'tp-carreira__hero'), arte = retrato(p);
    if (arte) hero.append(imagem('tp-perfil__arte', arte));
    const quem = el('div', 'tp-carreira__quem');
    quem.append(...identidade(d, cla));
    hero.append(quem);

    const prox = el('div', 'tp-painel tp-carreira__prox'), topo = el('div', 'tp-carreira__prox-topo');
    const rank = careerRank(p.points), seguinte = rank && CAREER_RANKS[CAREER_RANKS.indexOf(rank) + 1], pts = Number(p.points) || 0;
    if (seguinte) {
      const rot = el('span', '', `${tr('Próxima patente')}: `);
      rot.append(el('b', '', `${marcas(seguinte)} ${tr(seguinte.label)}`));
      topo.append(rot, el('span', 'tp-num', `${num(pts)} / ${num(seguinte.minPoints)}`));
    } else topo.append(el('span', '', tr('Patente máxima')), el('span', 'tp-num', num(pts)));
    const barra = el('div', 'tp-barra tp-carreira__barra');
    barra.append(el('i'));
    barra.style.setProperty('--p', String(seguinte ? Math.min(1, pts / seguinte.minPoints) : 1));
    barra.setAttribute('role', 'progressbar'); barra.setAttribute('aria-label', tr('Próxima patente'));
    barra.setAttribute('aria-valuemin', '0'); barra.setAttribute('aria-valuemax', String(seguinte?.minPoints || pts)); barra.setAttribute('aria-valuenow', String(pts));
    prox.append(topo, barra, el('span', 'tp-perfil__nota', tr('Abate multiplayer confirmado soma 2 pontos; abate solo soma 0,5 no ranking geral.')));

    const trks = el('div', 'tp-carreira__trks');
    const fav = p.favorites?.[0], arma = armasDe(p)[0];
    trks.append(trk('Abates', conta(p.kills)), trk('Vitórias', conta(p.round_wins ?? p.wins)), trk('K/D', decimal(p.kd, 2)),
      trk('Partidas', conta(p.matches)), trk('Arena favorita', fav ? nomeMapa(fav.map) : tr('sem rodada confirmada'), true),
      trk('Arma', arma ? nomeArma(arma.weapon) : tr('sem abate no multiplayer'), true));
    eu.append(hero, prox, trks);
    if (clicaLegado('COMPARTILHAR PERFIL')) eu.append(botao(tr('Compartilhar meu card'), 'tp-carreira__compartilhar', () => clicaLegado('COMPARTILHAR PERFIL')?.click()));

    const partidas = el('section', 'tp-painel tp-carreira__partidas');
    partidas.setAttribute('aria-label', tr('Últimas partidas'));
    partidas.append(cabecalho('Últimas partidas', 'multiplayer confirmado e solo a 0,5× no ranking'));
    for (const h of (p.history || []).slice(0, 5)) {
      const m = el('div', 'tp-carreira__m'), t = el('span', 'tp-perfil__evento-texto');
      const sub = el('small', '', [modo(h), h.complete === false ? tr('encerrada antes do placar') : ''].filter(Boolean).join(' · ')), selo = selaOrigem(m, h, soloVale(p));
      if (selo) sub.append(selo);
      t.append(el('b', '', nomeMapa(h.map)), sub);
      m.append(marcaResultado(h), t, el('span', 'tp-num tp-carreira__kd', `${conta(h.kills)} / ${conta(h.deaths)}`), el('span', 'tp-carreira__quando', relativo(h.started_at)));
      partidas.append(m);
    }
    if (!p.history?.length) partidas.append(el('p', 'tp-perfil__vazio', tr('Ainda sem partida registrada.')));
    const med = el('div', 'tp-perfil__medalhas');
    for (const x of medalhas(p)) {
      const b = el('button', 'tp-perfil__medalha');
      b.type = 'button'; b.dataset.estado = x.ok ? 'ganha' : 'travada'; b.setAttribute('aria-haspopup', 'dialog');
      b.append(seloMedalha(x), el('span', 'tp-perfil__medalha-nome', tr(x.nome)));
      b.onclick = () => abrirMedalhas(p, x.key, b);
      med.append(b);
    }
    partidas.append(el('span', 'tp-rotulo tp-carreira__med-rotulo', tr('Medalhas')), med);
    if (!medalhas(p).some((x) => x.ok)) partidas.append(el('span', 'tp-perfil__nota', tr('A primeira medalha vem do primeiro abate.')));

    const sec = el('section', 'tp-painel tp-carreira__cla');
    sec.setAttribute('aria-label', tr('Clã'));
    desenhaCla(sec, p);
    const g = el('div', 'tp-carreira');
    g.append(eu, partidas, sec);
    return g;
  }

  function acaoCla(texto, href) {
    const a = el('a', 'tp-btn tp-btn--primario tp-carreira__cla-acao', tr(texto));
    a.href = href; a.target = '_blank'; a.rel = 'noopener';
    return a;
  }
  function desenhaCla(sec, p) {
    sec.replaceChildren();
    if (!cla) { sec.append(el('p', 'tp-perfil__vazio', tr('Carregando clã…'))); return; }
    if (cla.erro) { sec.append(titulo('h3', tr('Clã')), el('p', 'tp-perfil__vazio', tr('Os clãs não responderam agora.')), acaoCla('Abrir página de clãs', '/clans')); return; }
    const c = cla.clan, cab = el('div', 'tp-carreira__cla-cab');
    if (!c) {
      cab.append(el('span', 'tp-carreira__brasao tp-disp', '?'), titulo('h3', tr('Sem clã ainda')));
      sec.append(cab, el('p', 'tp-perfil__nota', tr('Junte os amigos e leve a tag do seu clã para o placar.')), acaoCla('Criar ou entrar num clã', '/clans'));
      return;
    }
    const nome = el('span', 'tp-carreira__cla-nome');
    nome.append(titulo('h3', c.name), el('span', 'tp-perfil__nota', `${num(c.member_count)} ${tr(c.member_count === 1 ? 'membro' : 'membros')}`));
    cab.append(el('span', 'tp-carreira__brasao tp-disp', c.tag), nome);
    sec.append(cab);
    if (c.description) sec.append(el('p', 'tp-perfil__nota', c.description));
    const lista = el('ul', 'tp-carreira__membros');
    for (const m of cla.members || []) {
      const li = el('li', 'tp-carreira__membro'), eu = m.player_id === (cla.playerId || p.id);
      li.append(el('span', 'tp-perfil__inicial tp-carreira__membro-ini tp-disp', String(m.nick || '?').slice(0, 1)));
      const rotulo = eu ? `${m.nick} (${tr('você')})` : m.nick;
      const url = typeof m.url === 'string' && m.url ? m.url : UUID.test(m.player_id || '') ? `/u/${m.player_id}` : null;
      if (m.hidden || !url) li.append(el('span', 'tp-carreira__membro-nick', rotulo));
      else {
        const a = el('a', 'tp-carreira__membro-nick', rotulo);
        a.href = url;
        li.append(a);
      }
      if (m.is_leader) li.append(el('span', 'tp-carreira__lider', tr('LÍDER')));
      lista.append(li);
    }
    const saida = aviso(), lider = !!c.leader_id && c.leader_id === cla.playerId;
    const acao = botao(tr(lider ? 'Copiar convite do clã' : 'Copiar link do clã'), 'tp-btn--primario tp-carreira__cla-acao', async () => {
      acao.disabled = true;
      try {
        let link = `${origemCompartilhamento()}/clans/${encodeURIComponent(c.id)}`;
        if (lider) { const r = await api('/api/clans', { ...convidado(), action: 'invite' }); link += `#invite=${r.invite}`; }
        await navigator.clipboard.writeText(link);
        saida.textContent = tr(lider ? 'Convite copiado. Gerar outro revoga o anterior.' : 'Link do clã copiado.');
      } catch { saida.textContent = tr('Não deu certo agora. Tente de novo.'); }
      finally { acao.disabled = false; }
    });
    const pagina = el('a', 'tp-perfil__link', `${tr('Página do clã')} ↗`);
    pagina.href = `/clans/${encodeURIComponent(c.id)}`; pagina.target = '_blank'; pagina.rel = 'noopener';
    sec.append(lista, acao, saida, pagina, el('span', 'tp-perfil__nota tp-carreira__proxima', tr('Ranking de clãs e desafios: próxima etapa')));
  }

  async function carregaCla(d) {
    if (claDe === d.p.id) return;
    claDe = d.p.id; cla = null;
    try { cla = await api('/api/clans', { ...convidado(), action: 'me' }); }
    catch (e) { cla = e.message === 'invalid_identity' ? { clan: null } : { erro: true }; }
    if (claDe !== d.p.id) return;
    const sec = content.querySelector('.tp-carreira__cla');
    if (sec) desenhaCla(sec, d.p);
    if (cla?.clan?.tag) for (const linha of content.querySelectorAll('.tp-perfil .tp-perfil__linha--topo'))
      if (!linha.querySelector('.tp-perfil__tag')) linha.prepend(el('span', 'tp-perfil__tag tp-num', `[${cla.clan.tag}]`));
  }

  /* Assinatura do que a tela desenha: render do community.js com os mesmos dados (reabrir a aba, voltar da partida,
     boot repetido) não remonta nada. Visualizações e "visto por último" não aparecem aqui, então ficam de fora. */
  function assinatura(d) {
    const fora = (k, v) => (k === 'views' || k === 'last_active_at' ? undefined : v);
    return JSON.stringify([vista, LANG, d.own, d.visitante, d.p, d.conta, acoesLegado().map((n) => `${n.tagName}:${n.textContent.trim()}`)], fora);
  }
  /* Remontagem com dados novos: a imagem já carregada (mesma classe e mesmo src) muda de pai em vez de baixar de novo. */
  function reaproveitaImagens(novo, velho) {
    const prontas = new Map();
    for (const i of velho.querySelectorAll('img')) if (i.complete && i.naturalWidth) prontas.set(`${i.className}|${i.getAttribute('src')}`, i);
    for (const i of novo.querySelectorAll('img')) {
      const k = `${i.className}|${i.getAttribute('src')}`, o = prontas.get(k);
      if (o) { prontas.delete(k); i.replaceWith(o); }
    }
  }
  function desmonta(velho) {
    velho?.remove();
    delete content.dataset.tpPerfil;
    obsNota?.disconnect(); obsNota = null; saidaAtual = null;
    for (const m of document.querySelectorAll('dialog.tp-pmodal[open]')) m.close();
  }

  /* Monta por cima do perfil que o community.js acabou de desenhar; o legado fica escondido e segue dono das ações.
     Enquanto o community.js carrega (aria-busy) o último desenho fica na tela: ele preserva o nó quando o alvo é o mesmo. */
  function montar(trocouVista = false) {
    const d = raiz.tpPerfilDados, velho = content.querySelector(':scope > .tp-perfil');
    if (raiz.dataset.view !== 'profile' || d?.aba) { desmonta(velho); return; }
    if (content.getAttribute('aria-busy') !== 'false') return;
    /* Sem perfil (visitante sem rodada confirmada) a tela ainda é nossa: desenha o vazio em vez de devolver o legado. */
    const vale = d?.p ? [...content.querySelectorAll(':scope > .social-card > h2')].some((h) => h.firstChild?.textContent === d.p.nick) : d?.visitante === true;
    if (!vale) { desmonta(velho); return; }
    if (!d.own) vista = 'perfil';
    /* Conta ainda carregando (boot): com desenho na tela, espera a resposta definitiva em vez de pintar a versão de visitante. */
    if (velho && d.provisorio && !trocouVista) return;
    const sig = assinatura(d);
    if (velho && !trocouVista && desenho.no === velho && desenho.sig === sig) { religaNota(); return; }
    saidaAtual = null;
    const v = el('div', 'tp-perfil');
    v.dataset.vista = vista; v.dataset.alvo = raiz.tpPerfilAlvo ?? '';
    desenho = { no: v, sig };
    if (d.own) v.append(abas());
    if (d.visitante) v.append(convite());
    v.append(!d.p ? vistaSemPerfil() : vista === 'carreira' ? vistaCarreira(d) : vistaPerfil(d));
    if (velho) { v.dataset.troca = ''; reaproveitaImagens(v, velho); velho.replaceWith(v); } else content.prepend(v);
    content.dataset.tpPerfil = vista;
    religaNota();
    if (d.own) void carregaCla(d);
  }

  document.addEventListener('cs-community-open', (e) => { if (['perfil', 'carreira'].includes(e.detail?.tpVista)) vista = e.detail.tpVista; });
  new MutationObserver(() => montar()).observe(content, { attributes: true, attributeFilter: ['aria-busy'] });
  montar();
}
