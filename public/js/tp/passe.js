/* Tela do passe "Sessão da Treta" (spec operations/passe-sessao-da-treta-spec.md §6), aberta pela
   aba PASSE do lobby e pelo anúncio. Só exibe o que GET /api/passe devolve (passe.js); o único
   pedido que sai daqui é o resgate de um nível. Régua: tools/eval/passe-browser.mjs. */
import { tr, frase, LANG } from '../i18n.js';
import { CHARACTERS } from '../characters.js';
import { TRETA_COIN_ART } from '../treta-catalog.js';
import { abrirLoginPrompt } from '../login-prompt.js';
import { passeEstado, passeFalhou, carregarPasse, resgatarNivel, progressoNivel, registrarEventoPasse, PASSE_EVENTO } from '../passe.js';

const $ = (id) => document.getElementById(id);
function no(tag, cls = '', texto = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (texto) e.textContent = texto;
  return e;
}
const numero = (n) => new Intl.NumberFormat(LANG === 'en' ? 'en-US' : 'pt-BR').format(n);
const dia = (iso) => new Intl.DateTimeFormat(LANG === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(iso));
const hora = (iso) => new Intl.DateTimeFormat(LANG === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(iso));
const ICONE_ARMA = '<svg viewBox="0 0 64 32" aria-hidden="true" focusable="false"><path d="M2 12h34l4-4h14v6h8v4H44l-6 4v8h-8l2-8H14l-4 6H4l3-8H2z"/></svg>';
const ICONE_BOOST = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>';
const ICONE_CADEADO = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

/* Nome do pack para personagem que ainda não está no roster: "teletreco-sinal-fraco" -> "Teletreco Sinal Fraco". */
const nomeDoId = (id) => id.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

/* Prévia do personagem: retrato do roster quando o personagem já está em characters.js (o
   faction-pipeline publica o retrato junto); antes disso, iniciais. Nada de pedir imagem que não existe. */
function premioPersonagem(r) {
  const def = CHARACTERS.find((c) => c.id === r.id);
  const nome = def?.name || nomeDoId(r.id);
  const item = no('li', 'tp-passe-premio tp-passe-premio--personagem');
  item.dataset.premio = 'character'; item.dataset.id = r.id;
  const arte = no('span', 'tp-passe-premio__retrato');
  if (def) {
    const img = no('img');
    img.src = def.preview || `/img/chars/avatars/${def.id}.webp`; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
    /* personagem no roster antes do retrato publicado: volta para as iniciais */
    img.addEventListener('error', () => img.replaceWith(no('span', 'tp-disp tp-passe-premio__iniciais', nome.split(' ').slice(0, 2).map((p) => p[0]).join(''))), { once: true });
    arte.appendChild(img);
  } else {
    arte.appendChild(no('span', 'tp-disp tp-passe-premio__iniciais', nome.split(' ').slice(0, 2).map((p) => p[0]).join('')));
  }
  item.append(arte, no('span', 'tp-passe-premio__nome', nome), no('span', 'tp-passe-premio__tipo', tr('PERSONAGEM')));
  return item;
}

function premio(r) {
  if (r.kind === 'character') return premioPersonagem(r);
  const item = no('li', `tp-passe-premio tp-passe-premio--${r.kind === 'weapon_skin' ? 'arma' : r.kind === 'coins' ? 'moeda' : 'boost'}`);
  item.dataset.premio = r.kind; item.dataset.id = r.id;
  const icone = no('span', 'tp-passe-premio__icone');
  let valor = '';
  if (r.kind === 'coins') {
    const img = no('img'); img.src = TRETA_COIN_ART.poster; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
    icone.appendChild(img);
    valor = `T$ ${numero(r.amount)}`;
  } else if (r.kind === 'weapon_skin') {
    icone.innerHTML = ICONE_ARMA;
    const n = r.id.match(/(\d+)$/)?.[1];
    valor = n ? frase('passeSkinArma', n) : tr('SKIN DE ARMA');
  } else {
    icone.innerHTML = ICONE_BOOST;
    valor = frase('passeBoostPremio', r.amount);
  }
  item.append(icone, no('span', 'tp-passe-premio__valor tp-num', valor));
  return item;
}

let dialog = null, aviso = null, pendente = 0;

function mostrarAviso(texto) {
  if (aviso) aviso.textContent = texto;
}

async function resgatar(n, botao) {
  if (pendente) return;
  const s = passeEstado();
  if (!s?.authenticated) { entrar(); return; }
  pendente = n;
  botao.disabled = true; botao.textContent = tr('RESGATANDO…');
  try {
    const out = await resgatarNivel(n);
    mostrarAviso(frase('passeResgatado', out?.level || n));
  } catch (e) {
    if (e.message === 'account_required') { pendente = 0; entrar(); return; }
    mostrarAviso(({
      level_locked: tr('Esse nível ainda não chegou. Jogue mais um pouco.'),
      season_closed: tr('A temporada fechou para resgates.'),
      rate_limited: tr('Espere um momento antes de tentar novamente.'),
    })[e.message] || tr('O passe não respondeu agora. Tente de novo em instantes.'));
  } finally {
    pendente = 0;
    desenhar();
  }
}

/* Visitante: fecha a tela (não empilha <dialog>) e abre o convite de login. */
function entrar() {
  if (dialog?.open) dialog.close();
  abrirLoginPrompt('passe');
}

function cartaoNivel(l, s) {
  const resgatado = s.claimed.includes(l.n), resgatavel = s.claimable.includes(l.n);
  const alcancado = s.authenticated && s.level >= l.n;
  const card = no('li', 'tp-passe-nivel');
  card.dataset.nivel = String(l.n);
  card.dataset.estado = resgatado ? 'resgatado' : resgatavel ? 'resgatavel' : alcancado ? 'alcancado' : 'travado';
  const cab = no('div', 'tp-passe-nivel__cab');
  cab.append(no('span', 'tp-disp tp-passe-nivel__n', frase('passeNivel', l.n)), no('span', 'tp-num tp-passe-nivel__xp', `${numero(l.xp)} XP`));
  const lista = no('ul', 'tp-passe-nivel__premios');
  const ordem = { character: 0, weapon_skin: 1, coins: 2, xp_boost: 3 };
  for (const r of [...l.rewards].sort((a, b) => ordem[a.kind] - ordem[b.kind])) lista.appendChild(premio(r));
  const pe = no('div', 'tp-passe-nivel__pe');
  if (resgatado) pe.appendChild(no('span', 'tp-passe-nivel__selo', tr('RESGATADO')));
  else if (resgatavel) {
    const b = no('button', 'tp-btn tp-passe-nivel__resgatar', pendente === l.n ? tr('RESGATANDO…') : tr('RESGATAR'));
    b.type = 'button'; b.dataset.resgatar = String(l.n); b.disabled = Boolean(pendente);
    b.addEventListener('click', () => resgatar(l.n, b));
    pe.appendChild(b);
  } else {
    const trava = no('span', 'tp-passe-nivel__trava');
    trava.innerHTML = ICONE_CADEADO;
    trava.append(no('span', '', s.authenticated ? frase('passeFaltaXp', numero(Math.max(0, l.xp - s.xp))) : tr('ENTRE PARA LIBERAR')));
    pe.appendChild(trava);
  }
  card.append(cab, lista, pe);
  return card;
}

const NOMES_MISSAO = {
  login: 'Entrar no jogo hoje', play_3: 'Jogar 3 partidas', win_1: 'Vencer 1 partida', mp_1: 'Jogar 1 partida multiplayer',
  days_5: 'Jogar em 5 dias diferentes', win_10: 'Vencer 10 partidas', mp_10: 'Jogar 10 partidas multiplayer',
};

function linhaMissao(q) {
  const item = no('li', 'tp-passe-missao');
  item.dataset.missao = q.id;
  if (q.done) item.dataset.feita = '';
  const topo = no('div', 'tp-passe-missao__topo');
  const premios = [`+${numero(q.xp)} XP`, q.coins ? `+T$ ${numero(q.coins)}` : ''].filter(Boolean).join(' · ');
  topo.append(no('span', 'tp-passe-missao__nome', tr(NOMES_MISSAO[q.id] || q.id)), no('span', 'tp-num tp-passe-missao__premio', premios));
  const barra = no('div', 'tp-barra tp-passe-missao__barra');
  barra.style.setProperty('--p', String(q.done ? 1 : q.progress / q.goal));
  barra.appendChild(no('i'));
  item.append(topo, barra, no('span', 'tp-num tp-passe-missao__progresso', q.done ? tr('CONCLUÍDA') : `${q.progress} / ${q.goal}`));
  return item;
}

function blocoMissoes(titulo, nota, lista) {
  const sec = no('section', 'tp-passe-missoes__grupo');
  const h = no('h3', 'tp-rotulo tp-passe-missoes__titulo', tr(titulo));
  if (nota) h.append(' ', no('small', '', tr(nota)));
  const ul = no('ul', 'tp-passe-missoes__lista');
  for (const q of lista) ul.appendChild(linhaMissao(q));
  sec.append(h, ul);
  return sec;
}

function desenhar() {
  if (!dialog) return;
  const s = passeEstado();
  const corpo = dialog.querySelector('.tp-passe__corpo');
  dialog.dataset.estado = s ? (s.authenticated ? 'conta' : 'visitante') : passeFalhou() ? 'erro' : 'carregando';
  if (!s) {
    const vazio = no('div', 'tp-passe__vazio');
    vazio.append(no('p', '', tr(passeFalhou() ? 'O passe não respondeu agora. Tente de novo em instantes.' : 'Consultando o passe…')));
    if (passeFalhou()) {
      const b = no('button', 'tp-btn tp-btn--fantasma', tr('TENTAR DE NOVO'));
      b.type = 'button'; b.addEventListener('click', () => { void carregarPasse(); desenhar(); });
      vazio.appendChild(b);
    }
    corpo.replaceChildren(vazio);
    return;
  }
  dialog.querySelector('.tp-passe__fim').textContent = frase('passeTermina', dia(s.ends_at));
  /* Progresso: nível, barra do degrau atual, bônus ativo e o primeiro resgate pendente. */
  const topo = no('section', 'tp-passe__progresso');
  const nivel = no('div', 'tp-passe__nivel');
  nivel.append(no('span', 'tp-rotulo', tr('SEU NÍVEL')), no('strong', 'tp-disp tp-passe__nivel-n', String(s.level)));
  const p = progressoNivel(s);
  const meio = no('div', 'tp-passe__xp');
  const barra = no('div', 'tp-barra tp-passe__barra');
  barra.style.setProperty('--p', String(p.p));
  barra.setAttribute('role', 'progressbar');
  barra.setAttribute('aria-valuemin', '0'); barra.setAttribute('aria-valuemax', String(p.ate)); barra.setAttribute('aria-valuenow', String(p.de));
  barra.setAttribute('aria-label', tr('XP do nível'));
  barra.appendChild(no('i'));
  const legenda = no('div', 'tp-passe__xp-legenda');
  legenda.append(no('span', 'tp-num', s.nextLevelXp ? `${numero(s.xp)} / ${numero(s.nextLevelXp)} XP` : `${numero(s.xp)} XP`),
    no('span', '', s.nextLevelXp ? frase('passeFaltaProximo', numero(s.nextLevelXp - s.xp), s.level + 1) : tr('NÍVEL MÁXIMO')));
  meio.append(barra, legenda);
  topo.append(nivel, meio);
  if (s.boost && Date.parse(s.boost.until) > Date.now()) {
    const boost = no('span', 'tp-chip tp-passe__boost');
    boost.dataset.boost = String(s.boost.pct);
    boost.innerHTML = ICONE_BOOST;
    boost.append(frase('passeBoostAtivo', s.boost.pct, hora(s.boost.until)));
    topo.appendChild(boost);
  }
  const primeiro = s.claimable[0];
  if (primeiro) {
    const b = no('button', 'tp-btn tp-btn--primario tp-passe__resgatar', frase('passeResgatarNivel', primeiro));
    b.type = 'button'; b.dataset.resgatar = String(primeiro); b.disabled = Boolean(pendente);
    b.addEventListener('click', () => resgatar(primeiro, b));
    topo.appendChild(b);
  } else if (!s.authenticated) {
    const b = no('button', 'tp-btn tp-btn--primario tp-passe__entrar', tr('ENTRAR PARA JOGAR'));
    b.type = 'button'; b.dataset.passeEntrar = '';
    b.addEventListener('click', entrar);
    topo.appendChild(b);
  }
  const conta = s.authenticated ? null : no('p', 'tp-passe__conta', tr('Entre na sua conta para ganhar XP nas partidas e nas missões e resgatar as recompensas. O passe é grátis.'));
  /* Trilha: os 15 níveis, cada um com as 5 recompensas. */
  const trilha = no('section', 'tp-passe__trilha');
  trilha.setAttribute('aria-label', tr('Níveis do passe'));
  const ol = no('ol', 'tp-passe__niveis');
  for (const l of s.levels) ol.appendChild(cartaoNivel(l, s));
  trilha.appendChild(ol);
  /* Missões diárias e semanais, e os convites. */
  const missoes = no('section', 'tp-passe__missoes');
  missoes.append(blocoMissoes('MISSÕES DIÁRIAS', '· renovam 00:00', s.daily), blocoMissoes('MISSÕES SEMANAIS', '', s.weekly));
  if (s.invites.cap) {
    const conv = no('p', 'tp-passe__convites');
    conv.dataset.convites = String(s.invites.count);
    conv.append(no('span', 'tp-rotulo', tr('CONVITES')), no('span', 'tp-num', `${s.invites.count} / ${s.invites.cap}`),
      no('span', '', frase('passeConvite', numero(s.invites.xp))));
    missoes.appendChild(conv);
  }
  corpo.replaceChildren(...[topo, conta, trilha, missoes].filter(Boolean));
  /* Abre na altura do nível atual: o jogador vê onde está sem rolar a trilha. */
  const alvo = ol.querySelector(`[data-nivel="${Math.max(1, s.claimable[0] || s.level || 1)}"]`);
  if (alvo && !dialog.dataset.rolou) { dialog.dataset.rolou = '1'; requestAnimationFrame(() => { ol.scrollLeft = Math.max(0, alvo.offsetLeft - 16); }); }
}

function montar() {
  dialog = no('dialog', 'tp-passe');
  dialog.id = 'tp-passe';
  dialog.setAttribute('aria-labelledby', 'tp-passe-titulo');
  const cab = no('header', 'tp-passe__cab');
  const titulos = no('div', 'tp-passe__titulos');
  const h2 = no('h2', 'tp-disp tp-passe__titulo');
  h2.id = 'tp-passe-titulo';
  h2.appendChild(no('span', 'tp-ital', tr('SESSÃO DA TRETA')));
  titulos.append(no('span', 'tp-rotulo', tr('PASSE GRÁTIS · TEMPORADA 1 · FORA DO AR')), h2);
  const fim = no('span', 'tp-chip tp-chip--timer tp-passe__fim');
  const fechar = no('button', 'tp-passe__fechar', '✕');
  fechar.type = 'button'; fechar.setAttribute('aria-label', tr('Fechar o passe'));
  fechar.addEventListener('click', () => dialog.close());
  cab.append(titulos, fim, fechar);
  aviso = no('p', 'tp-passe__aviso');
  aviso.setAttribute('role', 'status'); aviso.setAttribute('aria-live', 'polite');
  dialog.append(cab, aviso, no('div', 'tp-passe__corpo'));
  dialog.addEventListener('close', () => { delete dialog.dataset.rolou; aviso.textContent = ''; });
  document.body.appendChild(dialog);
  document.addEventListener(PASSE_EVENTO, () => { if (dialog.open) desenhar(); });
}

export function abrirPasse() {
  if (!dialog) montar();
  if (dialog.open) return dialog;
  /* não empilha: outro <dialog> aberto (anúncio, loja) fecha antes */
  for (const d of document.querySelectorAll('dialog[open]')) if (d !== dialog) d.close();
  desenhar();
  dialog.showModal();
  dialog.querySelector('.tp-passe__fechar').focus();
  registrarEventoPasse('open');
  void carregarPasse();
  return dialog;
}
