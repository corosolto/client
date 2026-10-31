import { ehMapaJavaporcos } from '../maps.js';
/* Treta Pop · 03 modo e mapa, 19 mobile. Carregado por tp/ligar.js só com ?ui=v3. */
import { tr } from '../i18n.js';

const CHAVE_FAV = 'tp-modos-favoritos';
/* Selo NOVO: mapa que entrou no jogo (mapcat.js MAP_DATA) há no máximo 30 dias. */
const NOVO_DIAS = 30;
const $ = (id) => document.getElementById(id);
const api = () => window.__tpModos;
const normal = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

const MODOS = [
  { id: 'rounds', nome: 'MATA-MATA', sub: 'Rounds, elimine o time inteiro', arte: 'trapfunk', botao: 'hub-mode-rounds' },
  { id: 'ctf', nome: 'CAPTURA', sub: 'Roube a bandeira e leve pra base', arte: 'reggae', botao: 'hub-mode-ctf' },
  { id: 'mp', nome: 'MULTIPLAYER', sub: 'Salas públicas', arte: 'metaleiro', selo: 'BETA' },
  { id: 'privada', nome: 'SALA PRIVADA', sub: 'Chame a turma pelo link', arte: 'pagodeiro' },
];
const ARMAS = [['all', 'TODAS'], ['pistols', 'PISTOLAS'], ['knife', 'FACA'], ['awp', 'SÓ AWP']];
const BOTS = [['easy', 'DE BOA'], ['normal', 'NORMAL'], ['hard', 'TRETA'], ['insane', 'INSANO']];
const PASSOS = {
  aliados: { sel: 'ms-ally-bots', min: 0, max: 7, rotulo: 'SEU TIME', menos: 'Menos bots no seu time', mais: 'Mais bots no seu time' },
  inimigos: { sel: 'ms-enemy-bots', min: 1, max: 8, rotulo: 'INIMIGOS', menos: 'Menos inimigos', mais: 'Mais inimigos' },
  rounds: { sel: 'ms-rounds', min: 1, max: 15, rotulo: 'ROUNDS', menos: 'Menos rounds', mais: 'Mais rounds' },
};

let favs = new Set();
try { favs = new Set(JSON.parse(localStorage.getItem(CHAVE_FAV) || '[]')); } catch { /* sem storage: favoritos só nesta visita */ }
let filtro = 'todos', busca = '', tela = null;

const recente = (data) => {
  const [d, m, a] = String(data || '').split('/').map(Number);
  return !!a && (Date.now() - Date.UTC(a, m - 1, d)) / 864e5 <= NOVO_DIAS;
};
const oficial = (m) => !m.cats.includes('COMUNIDADE');
function visiveis() {
  return api().mapas().filter((m) => {
    if (busca && !normal(m.nome).includes(busca)) return false;
    if (filtro === 'favoritos') return favs.has(m.id);
    if (filtro === 'novos') return recente(m.data);
    if (filtro === 'oficiais') return oficial(m);
    if (filtro === 'comunidade') return !oficial(m);
    return true;
  });
}

/* Os controles do menu de sempre fazem a troca: estes botões só os acionam. */
function aplicarSelect(id, v) {
  const sel = $(id);
  if (!sel) return;
  sel.value = String(v); sel.onchange?.();
}
function fechar() { $('hub-map-close')?.click(); }

function montar(card) {
  const raiz = el('div', 'tp-modos');
  const topo = el('div', 'tp-modos__topo');
  const voltar = $('hub-map-close');
  voltar.classList.add('tp-modos__voltar');
  voltar.replaceChildren(el('span', 'tp-modos__seta', '◀'), el('span', 'tp-modos__voltar-txt', tr('LOBBY')), el('span', 'tp-num tp-modos__tecla', 'ESC'));
  voltar.setAttribute('aria-label', tr('Voltar ao lobby'));
  const titulo = el('h2', 'tp-disp tp-modos__titulo');
  const frase = tr('ESCOLHA A TRETA'), corte = frase.lastIndexOf(' ') + 1;
  const ital = el('span', 'tp-ital', frase.slice(0, corte));
  ital.appendChild(el('em', '', frase.slice(corte)));
  titulo.appendChild(ital);
  topo.append(voltar, titulo);

  const modos = el('div', 'tp-modos__modos');
  modos.setAttribute('role', 'group'); modos.setAttribute('aria-label', tr('Modo de jogo'));
  for (const m of MODOS) {
    const b = el('button', 'tp-modos__modo'); b.type = 'button'; b.dataset.modo = m.id;
    const img = el('img'); img.src = `/img/chars-hero/${m.arte}.webp`; img.alt = ''; img.decoding = 'async';
    const txt = el('span', 'tp-modos__modo-txt');
    const nome = el('span', 'tp-disp'); nome.appendChild(el('span', 'tp-ital', tr(m.nome)));
    txt.append(nome, el('span', 'tp-modos__sub', tr(m.sub)));
    b.append(img);
    if (m.selo) b.append(el('span', 'tp-chip tp-modos__selo-modo', m.selo));
    b.append(txt);
    b.onclick = () => {
      if (m.botao) { document.getElementById(m.botao)?.click(); pintar(); return; }
      fechar();
      $('hub-mp')?.click();
      if (m.id === 'privada') $('hub-mp-private')?.click();
    };
    modos.appendChild(b);
  }

  const corpo = el('div', 'tp-modos__corpo');
  const acervo = el('section', 'tp-modos__acervo'); acervo.setAttribute('aria-label', tr('Mapas'));
  const filtros = el('div', 'tp-modos__filtros');
  for (const [id, rot] of [['todos', 'TODOS'], ['favoritos', '★ FAVORITOS'], ['novos', 'NOVOS'], ['oficiais', 'OFICIAIS'], ['comunidade', 'COMUNIDADE']]) {
    const b = el('button', 'tp-modos__filtro'); b.type = 'button'; b.dataset.filtro = id; b.dataset.rotulo = rot;
    b.onclick = () => { filtro = id; grade(); };
    filtros.appendChild(b);
  }
  const lb = el('label', 'tp-modos__buscar');
  lb.insertAdjacentHTML('afterbegin', '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-4-4"></path></svg>');
  const inp = el('input', 'tp-modos__busca'); inp.type = 'search'; inp.placeholder = tr('Buscar mapa'); inp.setAttribute('aria-label', tr('Buscar mapa'));
  inp.oninput = () => { busca = normal(inp.value.trim()); grade(); };
  lb.appendChild(inp); filtros.appendChild(lb);
  const lista = el('div', 'tp-modos__grade');
  acervo.append(filtros, lista);

  const painel = el('aside', 'tp-modos__painel tp-painel'); painel.setAttribute('aria-label', tr('Configurar partida'));
  const ficha = el('div', 'tp-modos__ficha');
  ficha.append(el('span', 'tp-rotulo tp-modos__olho'), el('h3', 'tp-disp tp-modos__nome'), el('p', 'tp-modos__desc'));
  const cfg = el('div', 'tp-modos__cfg');
  const regras = el('div', 'tp-modos__regras');
  cfg.appendChild(regras);
  for (const [k, p] of Object.entries(PASSOS)) {
    const linha = el('div', 'tp-modos__passo'); linha.dataset.passo = k;
    const menos = el('button', 'tp-modos__menos', '−'); menos.type = 'button'; menos.setAttribute('aria-label', tr(p.menos));
    const mais = el('button', 'tp-modos__mais', '+'); mais.type = 'button'; mais.setAttribute('aria-label', tr(p.mais));
    const valor = el('output', 'tp-num tp-modos__valor');
    const passo = (d) => { const v = api().estado()[k] + d; if (v >= p.min && v <= p.max) aplicarSelect(p.sel, v); pintar(); };
    menos.onclick = () => passo(-1); mais.onclick = () => passo(1);
    const ctl = el('span', 'tp-modos__ctl'); ctl.append(menos, valor, mais);
    linha.append(el('span', 'tp-modos__rot', tr(p.rotulo)), ctl);
    cfg.appendChild(linha);
  }
  for (const [k, ops, sel, rot] of [['armas', ARMAS, 'ms-wpn-mode', 'ARMAS'], ['bots', BOTS, 'diff-select', 'BOTS']]) {
    const bloco = el('div', 'tp-modos__bloco');
    const seg = el('div', 'tp-modos__seg'); seg.dataset.seg = k; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', tr(rot));
    for (const [v, t] of ops) {
      const b = el('button', '', tr(t)); b.type = 'button'; b.dataset.v = v;
      b.onclick = () => { aplicarSelect(sel, v); pintar(); };
      seg.appendChild(b);
    }
    bloco.append(el('span', 'tp-modos__rot', tr(rot)), seg);
    cfg.appendChild(bloco);
  }
  /* No celular (tela 19) ROUNDS, ARMAS e BOTS viram três fichas que giram para o valor seguinte. */
  const giro = el('div', 'tp-modos__giro');
  for (const k of ['rounds', 'armas', 'bots']) {
    const b = el('button', 'tp-modos__gira'); b.type = 'button'; b.dataset.gira = k;
    b.onclick = () => {
      const e = api().estado();
      if (k === 'rounds') aplicarSelect('ms-rounds', [1, 3, 5, 7, 9, 11, 13, 15].find((n) => n > e.rounds) ?? 1);
      else {
        const ops = k === 'armas' ? ARMAS : BOTS, atual = k === 'armas' ? e.armas : e.dificuldade;
        const i = ops.findIndex(([v]) => v === atual);
        aplicarSelect(k === 'armas' ? 'ms-wpn-mode' : 'diff-select', ops[(i + 1) % ops.length][0]);
      }
      pintar();
    };
    giro.appendChild(b);
  }
  cfg.appendChild(giro);
  const escalacao = el('button', 'tp-modos__escalacao'); escalacao.type = 'button';
  escalacao.onclick = () => $('hub-change-character')?.click();
  cfg.appendChild(escalacao);
  const jogar = el('button', 'tp-btn tp-btn--primario tp-modos__jogar'); jogar.type = 'button';
  jogar.appendChild(el('span', 'tp-ital', tr('JOGAR')));
  jogar.onclick = () => {
    const temNick = !!($('nick-input')?.value || '').trim();
    fechar();
    if (temNick) document.getElementById('hub-quick-confirm')?.click();
    else $('btn-jogar')?.click();
  };
  painel.append(ficha, cfg, jogar);
  corpo.append(acervo, painel);
  raiz.append(topo, modos, corpo);

  /* A grade de hoje segue viva (openHubMap redesenha nela); só sai do diálogo e da armadilha de foco. */
  const guarda = el('div', 'tp-modos__legado'); guarda.hidden = true;
  guarda.append(...[$('hub-map-filters'), $('hub-map-grid')].filter(Boolean));
  document.body.appendChild(guarda);
  card.prepend(raiz);
  return { raiz, lista, filtros, ficha, painel, escalacao, giro, modos, regras };
}

function cartaoMapa(m, atual) {
  const c = el('div', 'tp-modos__mapa'); c.dataset.id = m.id;
  const b = el('button', 'tp-modos__mapa-btn'); b.type = 'button';
  b.setAttribute('aria-pressed', String(m.id === atual));
  const img = el('img'); img.src = m.poster; img.alt = ''; img.decoding = 'async';
  b.append(img, el('span', 'tp-modos__sombra'), el('span', 'tp-disp tp-modos__mapa-nome', m.nome));
  if (recente(m.data)) { const s = el('span', 'tp-chip tp-chip--novo tp-modos__selo', tr('NOVO')); s.dataset.selo = 'novo'; b.appendChild(s); }
  else if (m.parado) { const s = el('span', 'tp-chip tp-modos__selo', tr('EM OBRAS')); s.dataset.selo = 'obras'; b.appendChild(s); }
  b.onclick = () => { const id = m.id; api().irMapa(id); pintar(); };
  const f = el('button', 'tp-modos__fav', '★'); f.type = 'button';
  const fav = favs.has(m.id);
  f.setAttribute('aria-pressed', String(fav));
  f.setAttribute('aria-label', `${tr(fav ? 'Tirar dos favoritos' : 'Marcar como favorito')}: ${m.nome}`);
  f.onclick = () => {
    if (favs.has(m.id)) favs.delete(m.id); else favs.add(m.id);
    try { localStorage.setItem(CHAVE_FAV, JSON.stringify([...favs])); } catch { /* storage bloqueado */ }
    grade();
  };
  c.append(b, f);
  return c;
}

function sortear() {
  const vis = visiveis(), atual = api().estado().mapa;
  const pool = vis.filter((m) => m.id !== atual);
  const alvo = pool[Math.floor(Math.random() * pool.length)];
  if (alvo) { api().irMapa(alvo.id); pintar(); }
}

function grade() {
  if (!tela) return;
  const atual = api().estado().mapa, todos = api().mapas();
  for (const b of tela.filtros.querySelectorAll('.tp-modos__filtro')) {
    b.setAttribute('aria-pressed', String(b.dataset.filtro === filtro));
    b.textContent = b.dataset.filtro === 'todos' ? `${tr('TODOS')} · ${todos.length}` : tr(b.dataset.rotulo);
  }
  const vis = visiveis();
  const filhos = vis.map((m) => cartaoMapa(m, atual));
  if (!vis.length) filhos.push(el('p', 'tp-modos__vazio', tr(filtro === 'favoritos' && !busca ? 'Marque a estrela de um mapa para ele aparecer aqui.' : 'Nenhum mapa com esse filtro.')));
  const sorte = el('button', 'tp-modos__aleatorio', `? ${tr('MAPA ALEATÓRIO')}`); sorte.type = 'button';
  sorte.disabled = vis.filter((m) => m.id !== atual).length === 0;
  sorte.onclick = sortear;
  filhos.push(sorte);
  tela.lista.replaceChildren(...filhos);
}

function pintar() {
  if (!tela || !api()) return;
  const est = api().estado();
  const horda = ehMapaJavaporcos(est.mapa);
  api().opcoesJavaporcos?.(tela.regras, pintar);
  tela.regras.hidden = !horda;
  const mapa = api().mapas().find((m) => m.id === est.mapa);
  for (const b of tela.modos.querySelectorAll('.tp-modos__modo')) {
    if (b.dataset.modo === 'rounds' || b.dataset.modo === 'ctf') b.setAttribute('aria-pressed', String(b.dataset.modo === est.modo));
    if (b.dataset.modo === 'mp') {
      const count = $('hub-online-n'), box = count?.closest('.hub-online');
      const n = box && !box.hidden ? Number(count.dataset.online) || 0 : 0;
      b.querySelector('.tp-modos__sub').textContent = n ? `${tr('Salas públicas')} · ${n} ${tr('online')}` : tr('Salas públicas');
    }
  }
  for (const c of tela.lista.querySelectorAll('.tp-modos__mapa')) c.querySelector('.tp-modos__mapa-btn').setAttribute('aria-pressed', String(c.dataset.id === est.mapa));
  const modo = tr(horda ? 'INVASÃO · DISPUTA TERRITORIAL' : est.modo === 'ctf' ? 'CAPTURA' : 'MATA-MATA');
  tela.ficha.querySelector('.tp-modos__olho').textContent = mapa ? `${modo} · ${mapa.cats.map(tr).join(' · ')}` : modo;
  tela.ficha.querySelector('.tp-modos__nome').textContent = mapa?.nome || '';
  tela.ficha.querySelector('.tp-modos__desc').textContent = mapa?.desc || '';
  const valores = {
    aliados: est.aliados ? `${tr('você')} + ${est.aliados}` : tr('só você'),
    inimigos: `${est.inimigos} ${est.inimigos === 1 ? 'bot' : 'bots'}`,
    rounds: String(est.rounds),
  };
  for (const [k, p] of Object.entries(PASSOS)) {
    const linha = tela.painel.querySelector(`[data-passo="${k}"]`);
    linha.hidden = horda;
    linha.querySelector('.tp-modos__valor').textContent = valores[k];
    linha.querySelector('.tp-modos__menos').disabled = est[k] <= p.min;
    linha.querySelector('.tp-modos__mais').disabled = est[k] >= p.max;
  }
  for (const [k, atual] of [['armas', est.armas], ['bots', est.dificuldade]])
    for (const b of tela.painel.querySelectorAll(`[data-seg="${k}"] button`)) b.setAttribute('aria-pressed', String(b.dataset.v === atual));
  const rotulo = (ops, v) => tr((ops.find(([x]) => x === v) || ops[0])[1]);
  tela.giro.querySelector('[data-gira="rounds"]').textContent = `${est.rounds} ${tr('ROUNDS')}`;
  tela.giro.querySelector('[data-gira="rounds"]').hidden = horda;
  tela.giro.querySelector('[data-gira="armas"]').textContent = rotulo(ARMAS, est.armas);
  tela.giro.querySelector('[data-gira="bots"]').textContent = rotulo(BOTS, est.dificuldade);
  const n = est.escalados.length;
  const rostos = el('span', 'tp-modos__rostos');
  for (const id of est.escalados.slice(0, 3)) { const i = el('img'); i.src = `/img/chars/avatars/${id}.webp`; i.alt = ''; rostos.appendChild(i); }
  const texto = n ? `${tr('Escalação')}: ${n} ${tr(n === 1 ? 'travado, resto sorteado' : 'travados, resto sorteado')}` : tr('Escalação automática, todos sorteados');
  tela.escalacao.replaceChildren(...(n ? [rostos] : []), el('span', 'tp-modos__esc-txt', texto), el('span', 'tp-modos__editar', `${tr('EDITAR')} ▸`));
}

export function ligar() {
  const modal = $('hub-map-modal'), card = modal?.querySelector('.hub-modal-card');
  if (!modal || !card) return;
  const abrir = () => {
    if (modal.hidden || !api()) return;
    if (!tela) tela = montar(card);
    grade(); pintar();
  };
  new MutationObserver(abrir).observe(modal, { attributes: true, attributeFilter: ['hidden'] });
  const roster = $('hub-roster-modal');
  if (roster) new MutationObserver(() => { if (roster.hidden) pintar(); }).observe(roster, { attributes: true, attributeFilter: ['hidden'] });
  abrir();
}
