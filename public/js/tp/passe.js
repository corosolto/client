/* Tela do passe "Sessão da Treta" (spec operations/passe-sessao-da-treta-spec.md §6), aberta pela
   aba PASSE do lobby, pelo anúncio e pela celebração de nível (tp/passe-festa.js). Só exibe o que
   GET /api/passe devolve (passe.js); os pedidos que saem daqui são resgates, um nível por POST
   (RESGATAR TUDO é a mesma fila, em sequência). Régua: tools/eval/passe-browser.mjs. */
import { tr, frase, LANG } from '../i18n.js';
import { CHARACTERS } from '../characters.js';
import { TRETA_COIN_ART, TRETA_PASSE_WEAPON_SKINS } from '../treta-catalog.js';
import { abrirLoginPrompt } from '../login-prompt.js';
import { passeEstado, passeFalhou, carregarPasse, resgatarNivel, resgatarTodos, resgatandoTodos, progressoNivel, registrarEventoPasse, PASSE_EVENTO } from '../passe.js';

function no(tag, cls = '', texto = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (texto) e.textContent = texto;
  return e;
}
export const numero = (n) => new Intl.NumberFormat(LANG === 'en' ? 'en-US' : 'pt-BR').format(n);
const dia = (iso) => new Intl.DateTimeFormat(LANG === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(iso));
const hora = (iso) => new Intl.DateTimeFormat(LANG === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(iso));
const ICONE_ARMA = '<svg viewBox="0 0 64 32" aria-hidden="true" focusable="false"><path d="M2 12h34l4-4h14v6h8v4H44l-6 4v8h-8l2-8H14l-4 6H4l3-8H2z"/></svg>';
export const ICONE_BOOST = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>';
const ICONE_CADEADO = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const ICONE_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12.5 9.5 18 20 6"/></svg>';
const ICONE_GIRAR = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/></svg>';

/* Nome do pack para personagem que ainda não está no roster: "teletreco-sinal-fraco" -> "Teletreco Sinal Fraco". */
const nomeDoId = (id) => id.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
const iniciais = (nome) => nome.split(' ').slice(0, 2).map((p) => p[0]).join('');
export const defPersonagem = (id) => CHARACTERS.find((c) => c.id === id) || null;
export const nomePersonagem = (id) => defPersonagem(id)?.name || nomeDoId(id);
export const skinDoPasse = (id) => TRETA_PASSE_WEAPON_SKINS.find((s) => s.id === id) || null;
const nomeSkin = (id) => skinDoPasse(id)?.name || (id.match(/(\d+)$/) ? frase('passeSkinArma', id.match(/(\d+)$/)[1]) : tr('SKIN DE ARMA'));

/* Retrato do roster quando o personagem já está em characters.js (o faction-pipeline publica o
   retrato junto); antes disso, ou se o retrato falhar, iniciais. Nada de pedir imagem que não existe. */
export function retratoPersonagem(id, cls = 'tp-passe-premio__retrato') {
  const def = defPersonagem(id), nome = nomePersonagem(id);
  const arte = no('span', cls);
  const semFoto = () => no('span', 'tp-disp tp-passe-premio__iniciais', iniciais(nome));
  if (def) {
    const img = no('img');
    img.src = def.preview || `/img/chars/avatars/${def.id}.webp`; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
    img.addEventListener('error', () => img.replaceWith(semFoto()), { once: true });
    arte.appendChild(img);
  } else arte.appendChild(semFoto());
  return arte;
}

/* Personagem e skin de arma abrem a prévia 3D: o conteúdo do cartão mora num <button>. */
function abridor(item, alvo) {
  const b = no('button', 'tp-passe-premio__abrir');
  b.type = 'button'; b.dataset.modelo = alvo.kind;
  b.setAttribute('aria-label', frase('passeVerModelo', alvo.nome));
  b.addEventListener('click', () => abrirModelo(alvo, b));
  item.appendChild(b);
  return b;
}

function premioPersonagem(r, nivel) {
  const nome = nomePersonagem(r.id);
  const item = no('li', 'tp-passe-premio tp-passe-premio--personagem');
  item.dataset.premio = 'character'; item.dataset.id = r.id;
  const alvo = { kind: 'character', id: r.id, nivel, nome };
  if (!nivel) { item.append(retratoPersonagem(r.id), no('span', 'tp-passe-premio__nome', nome), no('span', 'tp-passe-premio__tipo', tr('PERSONAGEM'))); return item; }
  abridor(item, alvo).append(retratoPersonagem(r.id), no('span', 'tp-passe-premio__nome', nome), no('span', 'tp-passe-premio__tipo', tr('PERSONAGEM')));
  return item;
}

/* Skin de arma: o pôster da definição (storePoster, 960×540 com a arma no centro), recortado no
   cartão pelo passe.css, com o nome da skin. Sem definição, ou se o pôster falhar, volta ao ícone. */
function premioArma(r, nivel) {
  const skin = skinDoPasse(r.id);
  const n = r.id.match(/(\d+)$/)?.[1];
  const tipo = n ? frase('passeSkinArma', n) : tr('SKIN DE ARMA');
  const item = no('li', 'tp-passe-premio tp-passe-premio--arma');
  item.dataset.premio = r.kind; item.dataset.id = r.id;
  const dentro = skin && nivel ? abridor(item, { kind: 'weapon_skin', id: r.id, weapon: skin.weapon, nivel, nome: skin.name, poster: skin.poster }) : item;
  const icone = () => { const i = no('span', 'tp-passe-premio__icone'); i.innerHTML = ICONE_ARMA; return i; };
  if (!skin?.poster) {
    dentro.append(icone(), no('span', 'tp-passe-premio__valor tp-num', tipo));
    return item;
  }
  item.classList.add('tp-passe-premio--poster');
  const arte = no('span', 'tp-passe-premio__poster');
  const img = no('img');
  img.src = skin.poster; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
  img.addEventListener('error', () => { item.classList.remove('tp-passe-premio--poster'); arte.replaceWith(icone()); }, { once: true });
  arte.appendChild(img);
  const legenda = no('span', 'tp-passe-premio__legenda');
  legenda.append(no('span', 'tp-passe-premio__nome', skin.name), no('span', 'tp-passe-premio__tipo', tipo));
  dentro.append(arte, legenda);
  return item;
}

/* nivel: o cartão da trilha (abre a prévia 3D); sem nivel, só a figura (celebração e resumo). */
export function premio(r, nivel = 0) {
  if (r.kind === 'character') return premioPersonagem(r, nivel);
  if (r.kind === 'weapon_skin') return premioArma(r, nivel);
  const item = no('li', `tp-passe-premio tp-passe-premio--${r.kind === 'coins' ? 'moeda' : 'boost'}`);
  item.dataset.premio = r.kind; item.dataset.id = r.id;
  const icone = no('span', 'tp-passe-premio__icone');
  let valor = '';
  if (r.kind === 'coins') {
    const img = no('img'); img.src = TRETA_COIN_ART.poster; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
    icone.appendChild(img);
    valor = `T$ ${numero(r.amount)}`;
  } else {
    icone.innerHTML = ICONE_BOOST;
    valor = frase('passeBoostPremio', r.amount);
  }
  item.append(icone, no('span', 'tp-passe-premio__valor tp-num', valor));
  return item;
}

/* Resumo de um RESGATAR TUDO (resgatarTodos em passe.js): o que entrou na conta, somado. */
export function elementoResumo(out, { fechar = null } = {}) {
  const sec = no('section', 'tp-passe-resumo');
  sec.dataset.niveis = String(out.niveis.length);
  sec.setAttribute('aria-label', tr('Resumo do resgate'));
  const topo = no('div', 'tp-passe-resumo__topo');
  topo.append(no('span', 'tp-rotulo', tr('RESGATE CONCLUÍDO')),
    no('strong', 'tp-disp tp-passe-resumo__titulo', out.niveis.length ? frase('passeResumoNiveis', out.niveis.length) : tr('NENHUM NÍVEL RESGATADO')));
  sec.appendChild(topo);
  const r = out.recompensas;
  if (r && out.niveis.length) {
    const fotos = no('ul', 'tp-passe-resumo__fotos');
    for (const id of r.personagens.slice(0, 8)) { const li = no('li'); li.title = nomePersonagem(id); li.appendChild(retratoPersonagem(id)); fotos.appendChild(li); }
    if (r.personagens.length > 8) fotos.appendChild(no('li', 'tp-passe-resumo__mais tp-num', `+${r.personagens.length - 8}`));
    const itens = no('ul', 'tp-passe-resumo__itens');
    const linha = (k, texto) => { const li = no('li', 'tp-chip tp-passe-resumo__item', texto); li.dataset.resumo = k; itens.appendChild(li); };
    if (r.personagens.length) linha('personagens', frase('passeResumoPersonagens', r.personagens.length));
    if (r.skins.length) linha('skins', frase('passeResumoSkins', r.skins.length));
    if (r.moedas) linha('moedas', `T$ ${numero(r.moedas)}`);
    if (r.boost) linha('boost', frase('passeResumoBoost', r.boost));
    sec.append(fotos, itens);
  }
  if (out.erro) sec.appendChild(no('p', 'tp-passe-resumo__erro', `${tr('A fila parou antes do fim.')} ${mensagemErro(out.erro)}`));
  if (fechar) {
    const ok = no('button', 'tp-btn tp-btn--fantasma tp-passe-resumo__ok', tr('OK'));
    ok.type = 'button'; ok.addEventListener('click', fechar);
    sec.appendChild(ok);
  }
  return sec;
}

let dialog = null, aviso = null, pendente = 0, progressoTudo = null, resumo = null;

function mostrarAviso(texto) {
  if (aviso) aviso.textContent = texto;
}
export const mensagemErro = (codigo) => ({
  level_locked: tr('Esse nível ainda não chegou. Jogue mais um pouco.'),
  season_closed: tr('A temporada fechou para resgates.'),
  rate_limited: tr('Espere um momento antes de tentar novamente.'),
})[codigo] || tr('O passe não respondeu agora. Tente de novo em instantes.');

async function resgatar(n, botao) {
  if (pendente || resgatandoTodos()) return;
  const s = passeEstado();
  if (!s?.authenticated) { entrar(); return; }
  pendente = n;
  botao.disabled = true; botao.textContent = tr('RESGATANDO…');
  try {
    const out = await resgatarNivel(n);
    mostrarAviso(frase('passeResgatado', out?.level || n));
  } catch (e) {
    if (e.message === 'account_required') { pendente = 0; entrar(); return; }
    mostrarAviso(mensagemErro(e.message));
  } finally {
    pendente = 0;
    desenhar();
  }
}

/* RESGATAR TUDO da tela: a fila de passe.js, com progresso no botão e o resumo no fim. */
async function resgatarTudo() {
  if (pendente || resgatandoTodos()) return;
  const s = passeEstado();
  if (!s?.authenticated) { entrar(); return; }
  resumo = null;
  progressoTudo = { feitos: 0, total: s.claimable.length };
  desenhar();
  const out = await resgatarTodos({ aoProgresso: (p) => { progressoTudo = p; atualizarProgressoTudo(); } })
    .catch((e) => ({ niveis: [], recompensas: null, erro: e.message }));
  progressoTudo = null;
  if (out.erro === 'account_required') { entrar(); return; }
  resumo = out;
  mostrarAviso(out.niveis.length ? frase('passeResumoNiveis', out.niveis.length) : mensagemErro(out.erro));
  desenhar();
  dialog?.querySelector('.tp-passe-resumo__ok')?.focus();
}
const rotuloTudo = (p) => (p ? frase('passeResgatandoTudo', Math.min(p.feitos + 1, p.total), p.total) : '');
function atualizarProgressoTudo() {
  const b = dialog?.querySelector('.tp-passe__resgatar-tudo');
  if (!b || !progressoTudo) return;
  b.textContent = rotuloTudo(progressoTudo);
  b.style.setProperty('--p', String(progressoTudo.total ? progressoTudo.feitos / progressoTudo.total : 0));
}

/* Visitante: fecha a tela (não empilha <dialog>) e abre o convite de login. */
function entrar() {
  if (dialog?.open) dialog.close();
  abrirLoginPrompt('passe');
}

export const estadoNivel = (s, n) => (s.claimed.includes(n) ? 'resgatado' : s.claimable.includes(n) ? 'resgatavel' : s.authenticated && s.level >= n ? 'alcancado' : 'travado');
const ROTULO_ESTADO = { resgatado: 'RESGATADO', resgatavel: 'PRONTO PARA RESGATAR', alcancado: 'ALCANÇADO', travado: 'TRAVADO' };

function cartaoNivel(l, s) {
  const estado = estadoNivel(s, l.n);
  const card = no('li', 'tp-passe-nivel');
  card.dataset.nivel = String(l.n);
  card.dataset.estado = estado;
  if (s.authenticated && (s.level === l.n || (!s.level && l.n === 1))) card.dataset.atual = '';
  const cab = no('div', 'tp-passe-nivel__cab');
  cab.append(no('span', 'tp-disp tp-passe-nivel__n', frase('passeNivel', l.n)), no('span', 'tp-num tp-passe-nivel__xp', `${numero(l.xp)} XP`));
  if (estado === 'resgatado') { const ok = no('span', 'tp-passe-nivel__ok'); ok.innerHTML = ICONE_CHECK; ok.setAttribute('aria-hidden', 'true'); cab.appendChild(ok); }
  const lista = no('ul', 'tp-passe-nivel__premios');
  const ordem = { character: 0, weapon_skin: 1, coins: 2, xp_boost: 3 };
  for (const r of [...l.rewards].sort((a, b) => ordem[a.kind] - ordem[b.kind])) lista.appendChild(premio(r, l.n));
  const pe = no('div', 'tp-passe-nivel__pe');
  if (estado === 'resgatado') pe.appendChild(no('span', 'tp-passe-nivel__selo', tr('RESGATADO')));
  else if (estado === 'resgatavel') {
    const ocupado = Boolean(pendente || progressoTudo);
    const b = no('button', 'tp-btn tp-passe-nivel__resgatar', pendente === l.n ? tr('RESGATANDO…') : tr('RESGATAR'));
    b.type = 'button'; b.dataset.resgatar = String(l.n); b.disabled = ocupado;
    b.addEventListener('click', () => resgatar(l.n, b));
    pe.appendChild(b);
  } else {
    const trava = no('span', 'tp-passe-nivel__trava');
    if (estado === 'travado') trava.innerHTML = ICONE_CADEADO;
    trava.append(no('span', '', estado === 'alcancado' ? tr('ALCANÇADO') : s.authenticated ? frase('passeFaltaXp', numero(Math.max(0, l.xp - s.xp))) : tr('ENTRE PARA LIBERAR')));
    pe.appendChild(trava);
  }
  card.setAttribute('aria-label', `${frase('passeNivel', l.n)} · ${tr(ROTULO_ESTADO[estado])}`);
  card.append(cab, lista, pe);
  return card;
}

export const NOMES_MISSAO = {
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
  /* o redesenho troca os nós: o foco volta para o mesmo controle (resgate do nível, prévia 3D) */
  const focado = corpo.contains(document.activeElement) ? document.activeElement : null;
  const chaveFoco = focado && (focado.dataset.resgatar ? `[data-resgatar="${focado.dataset.resgatar}"]`
    : focado.closest('[data-nivel]') && focado.dataset.modelo ? `[data-nivel="${focado.closest('[data-nivel]').dataset.nivel}"] [data-id="${focado.closest('[data-id]')?.dataset.id}"] [data-modelo]` : '');
  dialog.querySelector('.tp-passe__fim').textContent = frase('passeTermina', dia(s.ends_at));
  /* Progresso: nível, barra do degrau atual, bônus ativo e os resgates pendentes. */
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
  const acoes = no('div', 'tp-passe__acoes');
  const primeiro = s.claimable[0];
  const varios = s.claimable.length > 1 || Boolean(progressoTudo);
  if (varios) {
    const tudo = no('button', 'tp-btn tp-btn--primario tp-passe__resgatar-tudo', progressoTudo ? rotuloTudo(progressoTudo) : frase('passeResgatarTudo', s.claimable.length));
    tudo.type = 'button'; tudo.dataset.resgatarTudo = ''; tudo.disabled = Boolean(pendente || progressoTudo);
    if (progressoTudo) { tudo.dataset.progresso = ''; tudo.style.setProperty('--p', String(progressoTudo.total ? progressoTudo.feitos / progressoTudo.total : 0)); }
    tudo.addEventListener('click', resgatarTudo);
    acoes.appendChild(tudo);
  }
  if (primeiro && !progressoTudo) {
    const b = no('button', `tp-btn ${varios ? 'tp-btn--fantasma' : 'tp-btn--primario'} tp-passe__resgatar`, frase('passeResgatarNivel', primeiro));
    b.type = 'button'; b.dataset.resgatar = String(primeiro); b.disabled = Boolean(pendente);
    b.addEventListener('click', () => resgatar(primeiro, b));
    acoes.appendChild(b);
  } else if (!s.authenticated) {
    const b = no('button', 'tp-btn tp-btn--primario tp-passe__entrar', tr('ENTRAR PARA JOGAR'));
    b.type = 'button'; b.dataset.passeEntrar = '';
    b.addEventListener('click', entrar);
    acoes.appendChild(b);
  }
  if (acoes.childElementCount) topo.appendChild(acoes);
  const conta = s.authenticated ? null : no('p', 'tp-passe__conta', tr('Entre na sua conta para ganhar XP nas partidas e nas missões e resgatar as recompensas. O passe é grátis.'));
  const fimResgate = resumo ? elementoResumo(resumo, { fechar: () => { resumo = null; desenhar(); dialog.querySelector('.tp-passe__fechar')?.focus(); } }) : null;
  /* Trilha: os 15 níveis numa grade (5 colunas no desktop), cada um com as 5 recompensas. */
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
  corpo.replaceChildren(...[topo, conta, fimResgate, trilha, missoes].filter(Boolean));
  if (chaveFoco) (corpo.querySelector(chaveFoco) || (focado.dataset.resgatar ? corpo.querySelector('[data-resgatar], .tp-passe__resgatar-tudo') : null))?.focus({ preventScroll: true });
}

/* ---------- prévia 3D da recompensa (camada dentro do <dialog> do passe: não empilha dialog) ---------- */
let modelo = null, tokenModelo = 0, redesenharDepois = false;

function statusModelo(alvo, s) {
  const estado = s ? estadoNivel(s, alvo.nivel) : 'travado';
  const lvl = s?.levels.find((l) => l.n === alvo.nivel);
  if (estado === 'travado' && s?.authenticated && lvl) return { estado, texto: frase('passeFaltaXp', numero(Math.max(0, lvl.xp - s.xp))) };
  return { estado, texto: tr(ROTULO_ESTADO[estado]) };
}

function abrirModelo(alvo, origem) {
  if (!dialog?.open) return;
  fecharModelo({ devolverFoco: false });
  const meu = ++tokenModelo;
  const s = passeEstado();
  const camada = no('div', 'tp-passe-modelo');
  camada.dataset.tipo = alvo.kind; camada.dataset.id = alvo.id;
  const fundo = no('div', 'tp-passe-modelo__fundo');
  fundo.addEventListener('click', () => fecharModelo());
  const painel = no('div', 'tp-passe-modelo__painel');
  painel.setAttribute('role', 'dialog'); painel.setAttribute('aria-modal', 'true'); painel.setAttribute('aria-labelledby', 'tp-passe-modelo-nome');
  const cab = no('header', 'tp-passe-modelo__cab');
  const titulos = no('div', 'tp-passe-modelo__titulos');
  const nome = no('h3', 'tp-disp tp-passe-modelo__nome');
  nome.id = 'tp-passe-modelo-nome';
  nome.appendChild(no('span', 'tp-ital', alvo.nome));
  titulos.append(no('span', 'tp-rotulo', tr(alvo.kind === 'character' ? 'PERSONAGEM' : 'SKIN DE ARMA')), nome);
  const fechar = no('button', 'tp-passe__fechar tp-passe-modelo__fechar', '✕');
  fechar.type = 'button'; fechar.setAttribute('aria-label', tr('Fechar a prévia'));
  fechar.addEventListener('click', () => fecharModelo());
  cab.append(titulos, fechar);
  /* palco: a figura estática fica até o 3D estar pronto, e fica de vez se o 3D não vier */
  const palco = no('div', 'tp-passe-modelo__palco');
  palco.dataset.carregando = '';
  const figura = alvo.kind === 'character' ? retratoPersonagem(alvo.id, 'tp-passe-modelo__figura') : (() => {
    const f = no('span', 'tp-passe-modelo__figura tp-passe-modelo__figura--arma');
    if (alvo.poster) { const img = no('img'); img.src = alvo.poster; img.alt = ''; img.decoding = 'async'; f.appendChild(img); }
    return f;
  })();
  const nota = no('p', 'tp-passe-modelo__nota', tr('Carregando o modelo 3D…'));
  nota.setAttribute('aria-live', 'polite');
  palco.append(figura, nota);
  const info = no('div', 'tp-passe-modelo__info');
  const st = statusModelo(alvo, s);
  const chip = no('span', 'tp-chip tp-passe-modelo__status', st.texto);
  chip.dataset.estado = st.estado;
  info.append(no('span', 'tp-rotulo', tr('LIBERA NO')), no('strong', 'tp-disp tp-passe-modelo__nivel', frase('passeNivel', alvo.nivel)), chip);
  const texto = alvo.kind === 'character' ? defPersonagem(alvo.id)?.blurb : skinDoPasse(alvo.id)?.description;
  if (texto) info.appendChild(no('p', 'tp-passe-modelo__texto', texto));
  const dica = no('p', 'tp-passe-modelo__dica');
  dica.innerHTML = ICONE_GIRAR;
  dica.append(tr('Arraste para girar'));
  info.appendChild(dica);
  if (st.estado === 'resgatavel') {
    const b = no('button', 'tp-btn tp-passe-modelo__resgatar', frase('passeResgatarNivel', alvo.nivel));
    b.type = 'button'; b.dataset.resgatar = String(alvo.nivel);
    b.addEventListener('click', () => { fecharModelo({ devolverFoco: false }); void resgatar(alvo.nivel, b); });
    info.appendChild(b);
  }
  painel.append(cab, palco, info);
  camada.append(fundo, painel);
  for (const n of dialog.children) n.inert = true;
  dialog.appendChild(camada);
  modelo = { camada, palco: null, origem, alvo };
  fechar.focus();
  const semPrevia = (texto) => { if (meu !== tokenModelo) return; delete palco.dataset.carregando; palco.dataset.falhou = ''; nota.textContent = texto; dica.hidden = true; };
  if (alvo.kind === 'character' && !defPersonagem(alvo.id)) { semPrevia(tr('A prévia 3D chega junto com o personagem.')); return; }
  import('./passe-modelo.js').then((m) => m.montarPalco(palco, alvo)).then((p) => {
    if (meu !== tokenModelo || !modelo) { p.dispose(); return; }
    modelo.palco = p;
    delete palco.dataset.carregando; palco.dataset.pronto = '1';
    figura.remove(); nota.textContent = '';
  }).catch(() => semPrevia(tr('Prévia 3D indisponível neste aparelho.')));
}

function fecharModelo({ devolverFoco = true } = {}) {
  if (!modelo) return false;
  const { camada, palco, origem, alvo } = modelo;
  modelo = null; tokenModelo++;
  palco?.dispose();
  camada.remove();
  for (const n of dialog.children) n.inert = false;
  if (redesenharDepois && dialog.open) { redesenharDepois = false; desenhar(); }
  if (devolverFoco) {
    const alvoFoco = origem?.isConnected ? origem : dialog.querySelector(`[data-nivel="${alvo.nivel}"] [data-id="${alvo.id}"] [data-modelo]`);
    alvoFoco?.focus({ preventScroll: true });
  }
  return true;
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
  /* Esc com a prévia 3D aberta fecha só a prévia */
  dialog.addEventListener('cancel', (e) => { if (fecharModelo()) e.preventDefault(); });
  dialog.addEventListener('close', () => { fecharModelo({ devolverFoco: false }); aviso.textContent = ''; resumo = null; });
  document.body.appendChild(dialog);
  document.addEventListener(PASSE_EVENTO, () => { if (!dialog.open) return; if (modelo) redesenharDepois = true; else desenhar(); });
}

export function abrirPasse() {
  if (!dialog) montar();
  if (dialog.open) return dialog;
  /* não empilha: outro <dialog> aberto (anúncio, loja, celebração) fecha antes */
  for (const d of document.querySelectorAll('dialog[open]')) if (d !== dialog) d.close();
  desenhar();
  dialog.showModal();
  dialog.querySelector('.tp-passe__fechar').focus();
  registrarEventoPasse('open');
  void carregarPasse();
  return dialog;
}
export const passeAberto = () => Boolean(dialog?.open);
export function fecharPasse() { if (dialog?.open) dialog.close(); }
