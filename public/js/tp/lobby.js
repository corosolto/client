/* Treta Pop · 02 lobby, 18 mobile, 26 gire o celular. Carregado por tp/ligar.js só com ?ui=v3.
   Cada controle novo aciona um do hub (main.js): nenhum estado novo, nada simulado. Régua: tools/eval/ui-v3-lobby.mjs. */
import { tr, LANG } from '../i18n.js';
import { VERSION } from '../version.js';
import { tretaLoja, abrirTretaSkin } from '../treta-store.js';
import { montarPlacar } from './ranking.js';
import { wallpaperJavaporcos } from '../javaporcos_apresentacao.js';
import { anunciarJavaporcos } from '../javaporcos_novidade.js';

const $ = (id) => document.getElementById(id);
function no(tag, cls = '', texto = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (texto) e.textContent = texto;
  return e;
}
const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${d}</svg>`;
const ICONE_AMIGOS = svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.6c2.4.2 4.3 1.9 5 5"/>');
const ICONE_AJUSTES = svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 15H3.5a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 4.6V4.5a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.1a2 2 0 1 1 0 4h-.1z"/>');
const ICONE_GIRE = '<svg class="tp-gire__icone" viewBox="0 0 96 96" aria-hidden="true" focusable="false"><rect x="30" y="14" width="36" height="64" rx="7"/><rect class="tp-gire__deitado" x="16" y="30" width="64" height="36" rx="7"/><path class="tp-gire__seta" d="M74 16a22 22 0 0 1 10 18"/><path class="tp-gire__ponta" d="M84 34l3-8-8 2z"/></svg>';

const menu = () => $('main-menu');
const abaDoHub = (aba) => document.querySelector(`.hub-tabs [data-hub-tab="${aba}"]`)?.click();
const filtroLoja = () => (document.querySelector('[data-treta-filter="owned"]')?.getAttribute('aria-pressed') === 'true' ? 'owned' : 'all');
/* mesmo sinal de sessão do resto do tp/: o hub escreve 'account' no login quando há perfil */
const ehGuest = () => ($('hub-account-login')?.dataset.state || 'guest') === 'guest';

/* PASSE fica fora: não há backend de passe (decisão registrada na entrega da frente). */
/* RANKING em 2º (dono, 22/10): é a tela de retorno diário, e atrás de CARREIRA sempre
   esteve o placar — o rótulo antigo prometia uma tela de patente que não existe. */
const ABAS = [
  { id: 'jogar', rotulo: 'JOGAR', ir: () => abaDoHub('jogar') },
  { id: 'ranking', rotulo: 'RANKING', ir: () => abaDoHub('ranking') },
  { id: 'loja', rotulo: 'LOJA', ir: () => { abaDoHub('loja'); if (filtroLoja() === 'owned') document.querySelector('[data-treta-filter="all"]')?.click(); } },
  { id: 'armario', rotulo: 'ARMÁRIO', ir: () => {
    abaDoHub('loja');
    document.querySelector('[data-treta-view="characters"]')?.click();
    document.querySelector('[data-treta-filter="owned"]')?.click();
  } },
  { id: 'cla', rotulo: 'CLÃ', href: '/clans' },
];

function abaAtiva() {
  const t = menu()?.dataset.hubTab;
  if (t === 'jogar') return 'jogar';
  if (t === 'loja') return filtroLoja() === 'owned' ? 'armario' : 'loja';
  if (t === 'ranking') return 'ranking';
  return '';
}

function montarAbas(header) {
  const nav = no('nav', 'tp-lobby-abas');
  nav.setAttribute('aria-label', tr('Seções'));
  const risco = no('i', 'tp-abas__risco');
  risco.setAttribute('aria-hidden', 'true');
  for (const a of ABAS) {
    const b = no(a.href ? 'a' : 'button', 'tp-lobby-aba', tr(a.rotulo));
    b.dataset.tpAba = a.id;
    if (a.href) b.href = a.href; else { b.type = 'button'; b.addEventListener('click', a.ir); }
    nav.appendChild(b);
  }
  nav.appendChild(risco);
  header.querySelector('.hub-logo-link, .hub-logo')?.after(nav);
  const marcar = () => {
    const ativa = abaAtiva();
    let alvo = null;
    for (const b of nav.querySelectorAll('[data-tp-aba]')) {
      if (b.dataset.tpAba === ativa) { b.setAttribute('aria-current', 'page'); alvo = b; } else b.removeAttribute('aria-current');
    }
    risco.style.setProperty('--x', `${alvo ? alvo.offsetLeft : 0}px`);
    risco.style.setProperty('--w', String(alvo ? alvo.offsetWidth : 0));
  };
  new MutationObserver(marcar).observe(menu(), { attributes: true, attributeFilter: ['data-hub-tab'] });
  const filtros = document.querySelector('[data-treta-filter]')?.parentElement;
  if (filtros) new MutationObserver(marcar).observe(filtros, { attributes: true, subtree: true, attributeFilter: ['aria-pressed'] });
  addEventListener('resize', marcar);
  document.fonts?.ready.then(marcar);
  marcar();
}

/* O aviso de instalar (pwa-install.js) cobria o JOGAR no celular: em v3 ele mora no MAIS. */
function instalarApp() {
  $('pwa-install-action')?.click();
  setTimeout(() => {
    const ajuda = $('pwa-install-help');
    if (ajuda && !ajuda.hidden && ajuda.textContent) mostrarAviso(ajuda.textContent);
  }, 50);
}

function mostrarAviso(texto) {
  let caixa = document.querySelector('.tp-lobby-avisos');
  if (!caixa) { caixa = no('div', 'tp-toasts tp-lobby-avisos'); caixa.setAttribute('role', 'status'); document.body.appendChild(caixa); }
  const t = no('div', 'tp-toast', texto);
  caixa.replaceChildren(t);
  requestAnimationFrame(() => t.toggleAttribute('data-visivel', true));
  setTimeout(() => t.removeAttribute('data-visivel'), 6000);
}

function montarMais(header) {
  const wrap = no('div', 'tp-lobby-mais');
  const botao = no('button', 'tp-lobby-hdr tp-lobby-mais__botao');
  botao.type = 'button'; botao.id = 'tp-lobby-mais';
  botao.setAttribute('aria-expanded', 'false'); botao.setAttribute('aria-controls', 'tp-lobby-mais-menu');
  botao.append(no('span', 'tp-lobby-mais__icone', '≡'), no('span', 'tp-lobby-mais__rotulo', tr('MAIS')));
  botao.setAttribute('aria-label', tr('Mais opções'));
  const lista = no('div', 'tp-lobby-mais__menu');
  lista.id = 'tp-lobby-mais-menu'; lista.hidden = true;
  const musica = $('hub-music-toggle');
  const itens = [
    { id: 'ranking', rotulo: 'RANKING', compacto: true, ir: () => abaDoHub('ranking') },
    { id: 'cla', rotulo: 'CLÃ', compacto: true, href: '/clans' },
    { id: 'amigos', rotulo: 'AMIGOS', compacto: true, href: '/comunidade/amigos' },
    { id: 'ajustes', rotulo: 'AJUSTES', compacto: true, ir: () => $('hub-settings')?.click() },
    { id: 'instalar', rotulo: 'INSTALAR O APP', compacto: true, ir: instalarApp },
    { id: 'sobre', rotulo: 'SOBRE O JOGO', ir: () => abaDoHub('sobre') },
    { id: 'feedback', rotulo: 'FEEDBACK', ir: () => abaDoHub('feedback') },
    { id: 'apoie', rotulo: 'APOIE O JOGO', ir: () => abaDoHub('apoie') },
    { id: 'musica', rotulo: '', ir: () => musica?.click() },
    { id: 'privacidade', rotulo: 'PRIVACIDADE', href: '/privacidade', fino: true },
    { id: 'termos', rotulo: 'TERMOS DE USO', href: '/termos', fino: true },
    { id: 'excluir', rotulo: 'EXCLUIR DADOS', href: '/excluir-dados', fino: true },
    { id: 'docs', rotulo: 'DOCS', href: '/docs/', fino: true },
    { id: 'mapa', rotulo: 'MAPA AO VIVO', href: '/mapa', fino: true },
  ];
  const fechar = (foco) => {
    if (lista.hidden) return;
    lista.hidden = true; botao.setAttribute('aria-expanded', 'false');
    if (foco) botao.focus();
  };
  for (const i of itens) {
    const e = no(i.href ? 'a' : 'button', `tp-lobby-mais__item${i.compacto ? ' tp-lobby-so-compacto' : ''}${i.fino ? ' tp-lobby-mais__item--fino' : ''}`, tr(i.rotulo));
    e.dataset.tpMais = i.id;
    if (i.href) e.href = i.href; else e.type = 'button';
    e.addEventListener('click', () => { fechar(false); i.ir?.(); });
    lista.appendChild(e);
  }
  const itemInstalar = lista.querySelector('[data-tp-mais="instalar"]');
  const painelPwa = $('pwa-install');
  const syncInstalar = () => { itemInstalar.hidden = !painelPwa || painelPwa.hidden; };
  if (painelPwa) new MutationObserver(syncInstalar).observe(painelPwa, { attributes: true, attributeFilter: ['hidden'] });
  syncInstalar();
  const itemMusica = lista.querySelector('[data-tp-mais="musica"]');
  const syncMusica = () => {
    if (!musica) { itemMusica.hidden = true; return; }
    itemMusica.innerHTML = musica.innerHTML;
    itemMusica.setAttribute('aria-pressed', musica.getAttribute('aria-pressed') || 'true');
    itemMusica.setAttribute('aria-label', musica.getAttribute('aria-label') || tr('Música do menu'));
    itemMusica.title = itemMusica.getAttribute('aria-label');
  };
  if (musica) new MutationObserver(syncMusica).observe(musica, { attributes: true, childList: true, subtree: true, characterData: true });
  syncMusica();
  botao.addEventListener('click', () => {
    const abrir = lista.hidden;
    lista.hidden = !abrir; botao.setAttribute('aria-expanded', String(abrir));
    if (abrir) [...lista.children].find((x) => x.checkVisibility?.())?.focus();
  });
  document.addEventListener('pointerdown', (e) => { if (!wrap.contains(e.target)) fechar(false); }, true);
  /* captura: com o menu aberto, o ESC dele vence os atalhos de ESC do hub */
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lista.hidden) { e.preventDefault(); e.stopImmediatePropagation(); fechar(true); } }, true);
  wrap.append(botao, lista);
  header.appendChild(wrap);
}

function montarCabecalho() {
  const header = document.querySelector('#hub-ui .hub-header');
  if (!header) return;
  const logo = header.querySelector('.hub-logo-link');
  logo?.addEventListener('click', (event) => {
    event.preventDefault();
    abaDoHub('jogar');
    $('hub-sp')?.click();
  });
  montarAbas(header);
  const amigos = no('a', 'tp-lobby-hdr');
  amigos.id = 'tp-lobby-amigos'; amigos.href = '/comunidade/amigos';
  amigos.innerHTML = ICONE_AMIGOS;
  amigos.append(no('span', 'tp-lobby-hdr__rotulo', tr('AMIGOS')));
  amigos.setAttribute('aria-label', tr('AMIGOS'));
  header.appendChild(amigos);
  const ajustes = $('hub-settings');
  if (ajustes) {
    const rotuloAjustes = no('span', 'tp-lobby-hdr__rotulo', tr('AJUSTES'));
    ajustes.innerHTML = ICONE_AJUSTES;
    ajustes.append(rotuloAjustes);
    ajustes.setAttribute('aria-label', tr('AJUSTES'));
  }
  montarMais(header);
}

/* Quests da TRETA: espelha #treta-quests (treta-store.js). Sem a loja no ar, estado vazio ou de erro. */
function estadoQuests() {
  if ($('treta-retry') && !$('treta-retry').hidden) return 'erro';
  if ($('treta-grid')?.getAttribute('aria-busy') === 'true') return 'carregando';
  if (!document.querySelector('#treta-quests [data-quest]') || $('treta-solo')?.disabled) return 'vazio';
  return 'lista';
}

function linhaQuest(card) {
  const id = card.dataset.quest;
  const nome = card.querySelector('h4')?.textContent || '';
  const recompensa = card.querySelector('strong')?.textContent || '';
  const progresso = card.querySelector('small')?.textContent || '';
  const feita = /CONCLU/.test(progresso) || /CONCLU/.test(card.querySelector('button')?.textContent || '');
  const fracao = progresso.match(/(\d+)\s*\/\s*(\d+)/);
  const item = no('div', 'tp-lobby-quest');
  item.dataset.tpQuest = id;
  const topo = no('div', 'tp-lobby-quest__topo');
  topo.append(no('span', 'tp-lobby-quest__nome', tr(nome)), no('span', 'tp-num tp-lobby-quest__premio', recompensa));
  item.appendChild(topo);
  /* barra só onde há fração real: quest repetível mostra a contagem, não um progresso inventado */
  let p = null, texto = '';
  if (feita) { p = 1; texto = tr('CONCLUÍDA'); }
  else if (fracao) { p = Math.min(1, Number(fracao[1]) / Math.max(1, Number(fracao[2]))); texto = `${fracao[1]} / ${fracao[2]}`; }
  else if (id === 'email') { p = 0; texto = '0 / 1'; }
  else { const n = progresso.match(/^(\d+)/); texto = n ? `${n[1]} ${tr('PARTIDAS')}` : ''; }
  if (p !== null) {
    const barra = no('div', 'tp-barra tp-lobby-quest__barra');
    barra.style.setProperty('--p', String(p));
    barra.dataset.p = String(p);
    barra.appendChild(no('i'));
    item.appendChild(barra);
  }
  if (texto) item.appendChild(no('span', 'tp-num tp-lobby-quest__progresso', texto));
  return item;
}

function desenharQuests(painel) {
  const lista = painel.querySelector('.tp-lobby-quests__lista');
  const aviso = painel.querySelector('.tp-lobby-quests__aviso');
  const estado = estadoQuests();
  painel.dataset.estado = estado;
  lista.replaceChildren();
  aviso.replaceChildren();
  const acao = (rotulo, ir) => {
    const b = no('button', 'tp-lobby-link', tr(rotulo));
    b.type = 'button';
    b.addEventListener('click', ir);
    aviso.appendChild(b);
  };
  if (estado === 'lista') {
    for (const card of document.querySelectorAll('#treta-quests [data-quest]')) lista.appendChild(linhaQuest(card));
    if (($('hub-account-login')?.dataset.state || 'guest') === 'guest') acao('ENTRE PARA GANHAR T$ ▸', () => $('hub-account-login')?.click());
  } else if (estado === 'erro') {
    aviso.append(no('p', 'tp-lobby-vazio', tr('Não deu pra consultar as quests agora.')));
    acao('TENTAR DE NOVO', () => $('treta-retry')?.click());
  } else {
    aviso.append(no('p', 'tp-lobby-vazio', tr(estado === 'carregando' ? 'Consultando as quests…' : 'Nenhuma quest ativa agora.')));
  }
}

function montarEsquerda(play) {
  const esq = no('aside', 'tp-lobby-esq');
  esq.setAttribute('aria-label', tr('Quests e novidades'));
  const invasao = no('button', 'tp-lobby-painel tp-lobby-invasao');
  invasao.type='button';invasao.id='tp-lobby-invasao';
  const arte=no('img');arte.src=wallpaperJavaporcos(0);arte.alt='';arte.loading='lazy';arte.decoding='async';
  invasao.append(arte,no('span','tp-chip tp-chip--novo',tr('INVASÃO')),no('strong','tp-disp',tr('CAÇA AO JAVAPORCO')),no('span','',tr('Defenda a cidade · 4 a 8 defensores')),no('span','tp-lobby-link',tr('DEFENDER A CIDADE ▸')));
  invasao.addEventListener('click',()=>{$('hub-sp')?.click();window.__tpModos?.irMapa('invasao_javaporcos');});
  esq.appendChild(invasao);
  const quests = no('section', 'tp-lobby-painel tp-lobby-quests');
  quests.id = 'tp-lobby-quests';
  const cab = no('div', 'tp-lobby-painel__cab');
  const h2 = no('h2', 'tp-disp tp-lobby-painel__titulo');
  h2.appendChild(no('span', 'tp-ital', tr('QUESTS DA TRETA')));
  cab.appendChild(h2);
  const ver = no('button', 'tp-lobby-link tp-lobby-quests__todas', tr('VER TODAS AS QUESTS ▸'));
  ver.type = 'button';
  ver.addEventListener('click', () => { abaDoHub('loja'); document.querySelector('[data-treta-view="quests"]')?.click(); });
  quests.append(cab, no('div', 'tp-lobby-quests__lista'), no('div', 'tp-lobby-quests__aviso'), ver);
  const novidades = no('section', 'tp-lobby-painel tp-lobby-novidades');
  novidades.id = 'tp-lobby-novidades';
  const capa = no('div', 'tp-lobby-novidades__capa');
  const img = no('img');
  img.src = '/img/loading-22.webp'; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
  const titulo = no('span', 'tp-disp tp-lobby-novidades__titulo');
  titulo.appendChild(no('span', 'tp-ital', tr('O QUE MUDOU NA ARENA')));
  capa.append(img, no('span', 'tp-chip tp-chip--novo', tr('NOVIDADES')), titulo);
  const rodape = no('div', 'tp-lobby-novidades__rodape');
  const link = no('a', 'tp-lobby-link', tr('VER NOVIDADES ▸'));
  link.href = LANG === 'en' ? '/whats-new' : '/changelog';
  rodape.append(link, no('span', 'tp-num tp-lobby-novidades__versao', `v${VERSION}`));
  novidades.append(capa, rodape);
  esq.append(quests);
  montarSkins(esq);
  esq.appendChild(novidades);
  play.appendChild(esq);
  const redesenhar = () => desenharQuests(quests);
  document.addEventListener('cs-treta-state', redesenhar);
  const login = $('hub-account-login');
  if (login) new MutationObserver(redesenhar).observe(login, { attributes: true, attributeFilter: ['data-state'] });
  redesenhar();
}

/* Novidades de skins: UM pack por vez, girando sozinho. A régua de rolagem lateral cortava os
   cards no meio (reclamação do dono, 22/10); o clique segue abrindo o detalhe da loja. */
const NOVIDADES_SKINS = ['pack-dourado', 'pack-prateado', 'pack-selva-camo', 'ouro-ak', 'luvas-tropicalente', 'pack-maga-47'];
const SKINS_GIRO_MS = 5000;
/* quem pediu menos movimento não leva carrossel girando: os pontos passam a ser a única navegação */
const semMovimento = () => document.documentElement.dataset.motion === 'reduzido'
  || matchMedia('(prefers-reduced-motion: reduce)').matches;

function mostrarSkin(painel, estado) {
  const cartoes = [...painel.querySelectorAll('.tp-lobby-skins__cartao')];
  const pontos = [...painel.querySelectorAll('.tp-lobby-skins__ponto')];
  if (!cartoes.length) { estado.i = 0; return; }
  estado.i = ((estado.i % cartoes.length) + cartoes.length) % cartoes.length;
  cartoes.forEach((c, k) => {
    const ativo = k === estado.i;
    c.toggleAttribute('data-ativo', ativo);
    c.setAttribute('aria-hidden', String(!ativo));
    c.inert = !ativo;
  });
  pontos.forEach((p, k) => p.setAttribute('aria-pressed', String(k === estado.i)));
}

function desenharSkins(painel, estado) {
  const janela = painel.querySelector('.tp-lobby-skins__janela');
  const pontos = painel.querySelector('.tp-lobby-skins__pontos');
  if (!janela) return;
  const d = tretaLoja();
  const itens = new Map(d.itens.map((s) => [s.id, s]));
  const packs = NOVIDADES_SKINS.map((id) => itens.get(id)).filter((s) => s && s.poster);
  const cartoes = packs.map((s) => {
    const cartao = no('button', 'tp-lobby-skins__cartao');
    cartao.type = 'button';
    cartao.dataset.skin = s.id;
    cartao.setAttribute('aria-label', `${s.name}${d.saldo != null && s.price != null ? ` · T$ ${s.price}` : ''}`);
    const arte = no('img', 'tp-lobby-skins__poster');
    arte.src = s.poster; arte.alt = ''; arte.loading = 'lazy'; arte.decoding = 'async';
    /* nome e preço por cima do pôster: num card só, a altura toda vira arte e a coluna
       continua acima do rodapé */
    const legenda = no('span', 'tp-lobby-skins__legenda');
    legenda.append(no('span', 'tp-lobby-skins__nome', s.name),
      no('span', 'tp-num tp-lobby-skins__preco', s.owned ? tr('NO SEU ARMÁRIO') : s.price != null ? `T$ ${s.price}` : ''));
    cartao.append(arte, legenda);
    cartao.addEventListener('click', () => { abaDoHub('loja'); abrirTretaSkin(s.id); });
    return cartao;
  });
  /* o ponto leva o nome do próprio pack: rótulo que já vem da loja, sem string nova pra traduzir */
  const bolinhas = packs.map((s, k) => {
    const p = no('button', 'tp-lobby-skins__ponto');
    p.type = 'button';
    p.setAttribute('aria-label', s.name);
    p.addEventListener('click', () => { estado.i = k; mostrarSkin(painel, estado); });
    return p;
  });
  janela.replaceChildren(...cartoes);
  pontos.replaceChildren(...bolinhas);
  painel.hidden = !cartoes.length;
  mostrarSkin(painel, estado);
}

function montarSkins(esq) {
  const painel = no('section', 'tp-lobby-painel tp-lobby-skins');
  painel.id = 'tp-lobby-skins';
  const cab = no('div', 'tp-lobby-painel__cab');
  const h2 = no('h2', 'tp-disp tp-lobby-painel__titulo');
  h2.appendChild(no('span', 'tp-ital', tr('NOVIDADES DE SKINS')));
  const ver = no('button', 'tp-lobby-link', tr('VER LOJA ▸'));
  ver.type = 'button';
  ver.addEventListener('click', () => abaDoHub('loja'));
  cab.append(h2, ver);
  painel.append(cab, no('div', 'tp-lobby-skins__janela'), no('div', 'tp-lobby-skins__pontos'));
  esq.appendChild(painel);
  const estado = { i: 0 };
  const redesenhar = () => desenharSkins(painel, estado);
  document.addEventListener('cs-treta-state', redesenhar);
  redesenhar();
  /* o giro para no mouse e no teclado: ninguém perde o card que estava lendo ou pra clicar */
  setInterval(() => {
    if (semMovimento() || !painel.checkVisibility?.() || painel.matches(':hover, :focus-within')) return;
    estado.i += 1;
    mostrarSkin(painel, estado);
  }, SKINS_GIRO_MS);
}

/* Convite: o mesmo do JOGAR COM AMIGOS (#mp-amigos), que cria a sala só por código e abre o #mp-modal.
   Sem servidor, o aviso diz o que houve — clique nenhum pode morrer em silêncio (relato do dono 15/10). */
async function convidar() {
  if (menu()?.dataset.hubNet !== 'mp') $('hub-mp')?.click();
  const estado = $('mp-estado');
  const t0 = Date.now();
  while (estado?.dataset.s === 'sondando' && Date.now() - t0 < 12000) await new Promise((r) => setTimeout(r, 200));
  if (estado?.dataset.s === 'erro') { mostrarAviso(tr('O multiplayer não respondeu agora. Tente de novo em um minuto.')); return; }
  $('mp-amigos')?.click();
}

function montarDireita(play) {
  const dir = no('aside', 'tp-lobby-dir');
  dir.setAttribute('aria-label', tr('Amigos online'));
  const painel = no('section', 'tp-lobby-painel tp-lobby-amigos');
  painel.id = 'tp-lobby-online-amigos';
  const cab = no('div', 'tp-lobby-painel__cab');
  const h2 = no('h2', 'tp-disp tp-lobby-painel__titulo');
  h2.appendChild(no('span', 'tp-ital', tr('AMIGOS ONLINE')));
  const chamar = no('button', 'tp-lobby-link tp-lobby-link--ambar', tr('CONVIDAR'));
  chamar.type = 'button';
  chamar.addEventListener('click', convidar);
  cab.append(h2, chamar);
  const lista = no('div', 'tp-lobby-amigos__lista');
  const desenhar = (live) => {
    lista.replaceChildren();
    for (const p of Array.isArray(live) ? live : []) {
      const item = no('a', 'tp-lobby-amigo');
      item.href = `/u/${encodeURIComponent(p.id)}`;
      item.append(no('span', 'tp-lobby-amigo__nome', p.nick), no('span', 'tp-lobby-amigo__partida',
        `${p.mode === 'ctf' ? tr('CAPTURA') : tr('ABATE')} · ${p.map} · ${String(p.node || '').toUpperCase()}-${p.code}`));
      lista.append(item);
    }
    if (!lista.children.length) lista.append(no('p', 'tp-lobby-vazio', tr('Nenhum amigo em partida agora.')));
  };
  painel.append(cab, lista);
  const ver = no('a', 'tp-lobby-link', tr('VER AMIGOS ▸'));
  ver.href = '/comunidade/amigos';
  painel.append(ver);
  dir.appendChild(painel);
  play.appendChild(dir);
  desenhar($('community')?.socialLive);
  document.addEventListener('cs-social-live', (e) => desenhar(e.detail?.live));
  /* Deslogado não há lista de amigos nem convite que leve a algo: o bloco inteiro sai (dono, 22/10). */
  const sessao = () => { painel.hidden = ehGuest(); };
  const login = $('hub-account-login');
  if (login) new MutationObserver(sessao).observe(login, { attributes: true, attributeFilter: ['data-state'] });
  sessao();
}

function montarRede() {
  const rede = no('div', 'tp-lobby-rede');
  rede.id = 'tp-lobby-rede';
  rede.setAttribute('role', 'group');
  rede.setAttribute('aria-label', tr('Tipo de partida'));
  const REDES = [
    ['sp', 'VS BOTS', () => $('hub-sp')?.click()],
    ['mp', 'MULTIPLAYER', () => { $('hub-mp')?.click(); $('hub-mp-public')?.click(); }],
    ['privada', 'PRIVADA', () => { $('hub-mp')?.click(); $('hub-mp-private')?.click(); }],
  ];
  for (const [id, rotulo, ir] of REDES) {
    const b = no('button', 'tp-lobby-rede__opcao', tr(rotulo));
    b.type = 'button'; b.dataset.tpRede = id;
    b.addEventListener('click', ir);
    rede.appendChild(b);
  }
  const marcar = () => {
    const m = menu();
    const atual = m.dataset.hubNet !== 'mp' ? 'sp' : m.dataset.hubMpTab === 'private' ? 'privada' : 'mp';
    for (const b of rede.children) b.setAttribute('aria-pressed', String(b.dataset.tpRede === atual));
  };
  new MutationObserver(marcar).observe(menu(), { attributes: true, attributeFilter: ['data-hub-net', 'data-hub-mp-tab'] });
  marcar();
  return rede;
}

function montarParty() {
  const party = no('button', 'tp-lobby-party');
  party.type = 'button'; party.id = 'tp-lobby-party';
  const eu = no('span', 'tp-lobby-party__eu');
  const brasao = no('img');
  brasao.alt = '';
  eu.appendChild(brasao);
  party.append(eu, no('span', 'tp-lobby-party__vaga', '+'), no('span', 'tp-lobby-party__rotulo', tr('CONVIDAR PRA PARTY')));
  party.addEventListener('click', convidar);
  const crest = $('hub-character-crest');
  const sync = () => { if (crest?.src && brasao.src !== crest.src) brasao.src = crest.src; };
  if (crest) new MutationObserver(sync).observe(crest, { attributes: true, attributeFilter: ['src'] });
  sync();
  return party;
}

function montarCartao() {
  const card = no('button', 'tp-lobby-partida');
  card.type = 'button'; card.id = 'tp-lobby-partida';
  const foto = no('img', 'tp-lobby-partida__foto');
  foto.alt = '';
  const texto = no('span', 'tp-lobby-partida__texto');
  const nome = no('span', 'tp-disp tp-lobby-partida__nome');
  const nomeIt = no('span', 'tp-ital');
  nome.appendChild(nomeIt);
  const meta = no('span', 'tp-lobby-partida__meta');
  texto.append(no('span', 'tp-rotulo tp-lobby-partida__rotulo', tr('VS BOTS')), nome, meta);
  card.append(foto, texto, no('span', 'tp-lobby-link tp-lobby-link--ambar tp-lobby-partida__trocar', tr('TROCAR ▸')));
  card.addEventListener('click', () => $('hub-map-change')?.click());
  const sync = () => {
    const thumb = $('map-thumb')?.getAttribute('src');
    if (thumb && foto.getAttribute('src') !== thumb) foto.src = thumb;
    nomeIt.textContent = ($('map-name')?.textContent || '').trim();
    meta.textContent = ($('map-meta')?.textContent || '').trim();
  };
  for (const id of ['map-name', 'map-meta']) if ($(id)) new MutationObserver(sync).observe($(id), { childList: true, characterData: true, subtree: true });
  if ($('map-thumb')) new MutationObserver(sync).observe($('map-thumb'), { attributes: true, attributeFilter: ['src'] });
  sync();
  /* fechar o modal de mapa devolve o foco a #hub-map-change, que some em v3 */
  const modal = $('hub-map-modal');
  if (modal) new MutationObserver(() => { if (modal.hidden && document.activeElement === $('hub-map-change')) card.focus(); })
    .observe(modal, { attributes: true, attributeFilter: ['hidden'] });
  return card;
}

function montarPartida() {
  const pane = document.querySelector('#menu-setup .pane-match');
  if (!pane) return;
  pane.prepend(montarRede(), montarParty(), montarCartao());
  const jogar = $('btn-jogar');
  if (!jogar) return;
  const kbd = no('kbd', '', 'ENTER');
  kbd.setAttribute('aria-hidden', 'true');
  jogar.replaceChildren(no('span', 'tp-ital', tr('JOGAR')), kbd);
  jogar.classList.add('tp-btn', 'tp-btn--primario');
}

/* JOGAR inicia direto: o #hub-quick ("Pronto pra treta?") sai em v3. Nick e conta
   são opcionais; a partida anônima usa o mesmo perfil local e convida a criar conta ao terminar. */
function ligarJogarDireto() {
  document.addEventListener('click', (e) => {
    if (!e.target.closest?.('#btn-jogar')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    $('hub-quick-confirm')?.click();
  }, true);
  const quick = $('hub-quick');
  if (quick) new MutationObserver(() => { if (!quick.hidden) $('hub-quick-close')?.click(); })
    .observe(quick, { attributes: true, attributeFilter: ['hidden'] });
  let ultimo = 0;
  addEventListener('keydown', (e) => {
    /* o Enter que tira o splash chega aqui já com defaultPrevented (dismissSplash, main.js) e não vira partida */
    if (e.key !== 'Enter' || e.repeat || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const m = menu();
    if (!m || m.classList.contains('hidden') || m.dataset.hubTab !== 'jogar' || m.dataset.hubNet !== 'sp') return;
    if ($('menu-setup')?.dataset.step === 'profile') return;
    if (document.querySelector('.hub-modal:not([hidden]), dialog[open], .hub-sel-list:not([hidden]), #tp-lobby-mais-menu:not([hidden])')) return;
    const foco = document.activeElement;
    if (foco && foco !== document.body && foco.closest('button, a, input, textarea, select, [contenteditable="true"]')) return;
    if (Date.now() - ultimo < 1500) return;
    ultimo = Date.now();
    e.preventDefault();
    $('btn-jogar')?.click();
  }, true);
}


/* Tela 26: o #rotate-prompt de sempre ganha a arte e o texto do pacote; a CSS decide quando ele aparece. */
function montarGire() {
  const gire = $('rotate-prompt');
  if (!gire || gire.dataset.tp) return;
  gire.dataset.tp = '1';
  gire.removeAttribute('aria-hidden');
  gire.setAttribute('role', 'dialog');
  gire.setAttribute('aria-labelledby', 'tp-gire-titulo');
  const logo = no('img', 'tp-gire__logo');
  logo.src = '/logo.png'; logo.alt = 'CORO SOLTO: Treta Suprema';
  const titulo = no('h2', 'tp-disp tp-gire__titulo');
  titulo.id = 'tp-gire-titulo';
  titulo.appendChild(no('span', 'tp-ital', tr('GIRE O CELULAR')));
  const texto = no('p', 'tp-gire__texto', tr('A treta é na horizontal. Gire pra entrar direto no lobby; o progresso continua de onde parou.'));
  const instalar = no('button', 'tp-gire__instalar', tr('INSTALAR O APP (TELA CHEIA)'));
  instalar.type = 'button'; instalar.id = 'tp-gire-instalar';
  const nota = no('p', 'tp-gire__nota', tr('Entrando na mesma conta, o progresso é o mesmo do PC.'));
  const painel = $('pwa-install'), ajuda = $('pwa-install-help');
  const sync = () => { instalar.hidden = !painel || painel.hidden; };
  if (painel) new MutationObserver(sync).observe(painel, { attributes: true, attributeFilter: ['hidden'] });
  sync();
  instalar.addEventListener('click', () => {
    $('pwa-install-action')?.click();
    setTimeout(() => { if (ajuda && !ajuda.hidden && ajuda.textContent) nota.textContent = ajuda.textContent; }, 50);
  });
  const icone = no('div', 'tp-gire__icone-wrap');
  icone.innerHTML = ICONE_GIRE;
  const corpo = no('div', 'tp-gire__corpo');
  corpo.append(icone, titulo, texto, instalar, nota);
  gire.replaceChildren(logo, corpo);
}

function montar() {
  const play = $('hub-play');
  if (!play || document.querySelector('.tp-lobby-esq')) return;
  montarCabecalho();
  montarEsquerda(play);
  montarDireita(play);
  montarPlacar();
  montarPartida();
  const invasao=$('tp-lobby-invasao'),esquerda=document.querySelector('.tp-lobby-esq');
  const adaptarInvasao=()=>{
    const compacto=innerHeight<=500 || innerWidth<=600 || menu()?.dataset.hubNet==='mp';
    const destino=compacto?document.querySelector('.tp-lobby-partida')?.parentElement:esquerda;
    if(destino && invasao.parentElement!==destino) destino.prepend(invasao);
    invasao.classList.toggle('tp-lobby-invasao--compacto',compacto);
  };
  addEventListener('resize',adaptarInvasao);
  new MutationObserver(adaptarInvasao).observe(menu(),{attributes:true,attributeFilter:['data-hub-net']});
  adaptarInvasao();
  ligarJogarDireto();
  montarGire();
}

/* O que a conta tem equipado aparece NO PERSONAGEM (main.js/armaDoPreview): o painel de
   cards "EQUIPADO" que morava aqui foi recusado pelo dono em 20/10. */

export function ligar() {
  const raiz = document.documentElement;
  const pronto = () => raiz.dataset.homeUi === 'hub' && $('hub-ui') && !$('hub-ui').hidden;
  const abrir = () => {
    montar();
    if (!new URLSearchParams(location.search).has('auto')) anunciarJavaporcos({
      jogar: () => $('tp-lobby-invasao')?.click(), multiplayer: () => $('hub-mp')?.click(),
    });
  };
  if (pronto()) { abrir(); return; }
  const espera = new MutationObserver(() => { if (pronto()) { espera.disconnect(); abrir(); } });
  espera.observe(raiz, { attributes: true, attributeFilter: ['data-home-ui'] });
  if ($('hub-ui')) espera.observe($('hub-ui'), { attributes: true, attributeFilter: ['hidden'] });
}
