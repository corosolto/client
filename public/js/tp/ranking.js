/* Treta Pop · card do placar no lobby (tela 02), faixa do topo e porta para a aba RANKING do hub.
   Tudo vem de UMA chamada /api/social?action=ranking: sem sessão `own` é nulo e a tela convida a entrar. */
import { tr, LANG } from '../i18n.js';
import { apiUrl } from '../apibase.js';

const ROTA = '/api/social?action=ranking&scope=global&period=all&mode=all&game_type=all&team=all';
const TOPO = 3;
const TOPO_FAIXA = 10;
const $ = (id) => document.getElementById(id);
const local = () => (LANG === 'en' ? 'en-US' : 'pt-BR');
const num = (n) => Number(n).toLocaleString(local());
const ehGuest = () => ($('hub-account-login')?.dataset.state || 'guest') === 'guest';

function no(tag, cls = '', texto = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (texto) e.textContent = texto;
  return e;
}

const iniciais = (nick) => String(nick || '?').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || '?';

/* Mesmo rosto do tp/social: sem `avatar_url` o lugar não fica vazio nem ganha foto de outro — vão as iniciais. */
function rosto(nick, url) {
  const r = no('span', 'tp-rosto tp-rosto--mini');
  if (url) {
    const i = no('img');
    i.src = url; i.alt = ''; i.loading = 'lazy'; i.decoding = 'async'; i.referrerPolicy = 'no-referrer';
    r.appendChild(i);
  } else r.appendChild(no('span', 'tp-disp', iniciais(nick)));
  return r;
}

async function buscar() {
  const r = await fetch(apiUrl(ROTA), { credentials: 'same-origin', signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`ranking_${r.status}`);
  const d = await r.json();
  if (d?.disabled || !Array.isArray(d?.players)) throw new Error('ranking_indisponivel');
  return d;
}

function linha(p, ir) {
  const b = no('button', 'tp-lobby-rank__linha');
  b.type = 'button';
  b.append(no('span', 'tp-num tp-lobby-rank__lugar', `${p.position}`),
    no('span', 'tp-lobby-rank__nick', p.nick || '—'),
    no('span', 'tp-num tp-lobby-rank__pontos', num(p.points)));
  b.addEventListener('click', ir);
  return b;
}

function desenhar(painel, estado, dados, ir, recarregar) {
  const corpo = painel.querySelector('.tp-lobby-rank__corpo');
  painel.dataset.estado = estado;
  corpo.replaceChildren();
  if (estado === 'lista') {
    /* a sua posição e o convite moram na faixa do topo: repetir aqui só roubava altura da coluna */
    const lista = no('div', 'tp-lobby-rank__lista');
    for (const p of dados.players.slice(0, TOPO)) lista.appendChild(linha(p, ir));
    if (!lista.children.length) lista.appendChild(no('p', 'tp-lobby-vazio', tr('Ainda ninguém pontuou no placar.')));
    corpo.appendChild(lista);
    return;
  }
  corpo.appendChild(no('p', 'tp-lobby-vazio', tr(estado === 'erro' ? 'Não deu pra consultar o placar agora.' : 'Consultando o placar…')));
  if (estado === 'erro') {
    const b = no('button', 'tp-lobby-link', tr('TENTAR DE NOVO'));
    b.type = 'button';
    b.addEventListener('click', recarregar);
    corpo.appendChild(b);
  }
}

/* FAIXA DO TOPO (tela 02): o placar passa sob as abas, a única faixa livre do lobby — o rodapé
   já é da RESENHA, das redes e do JOGAR. Nunca na partida: ela mora dentro do #hub-play. */
function itemFaixa(p) {
  const e = no(p.url ? 'a' : 'span', 'tp-faixa__item');
  if (p.url) e.href = p.url;
  e.append(no('span', 'tp-num tp-faixa__pos', `#${num(p.position)}`), rosto(p.nick, p.avatar_url),
    no('span', 'tp-faixa__nick', p.nick || '—'),
    no('span', 'tp-num tp-faixa__pts', `${num(p.points)} ${tr('pontos')}`));
  return e;
}

/* Quem está logo acima é o alvo de hoje; só aparece se vier na mesma página do placar (o payload
   traz 25 posições), e a diferença é subtração do que veio — nada é estimado. */
function alvoFaixa(own, jogadores) {
  const pos = Number(own.position);
  if (pos === 1) return no('span', 'tp-faixa__alvo', tr('VOCÊ LIDERA O PLACAR'));
  const v = jogadores.find((p) => Number(p.position) === pos - 1);
  if (!v) return null;
  const falta = Number(v.points) - Number(own.points || 0);
  const e = no(v.url ? 'a' : 'span', 'tp-faixa__alvo');
  if (v.url) e.href = v.url;
  e.append(no('span', '', falta > 0 ? `${num(falta)} ${tr('pontos pra alcançar')}` : tr('empatado com')),
    no('b', 'tp-faixa__alvo-nick', v.nick || '—'));
  return e;
}

function meuFaixa(own, jogadores) {
  const caixa = no('div', 'tp-faixa__eu');
  if (own && Number.isFinite(Number(own.position))) {
    const e = no(own.url ? 'a' : 'span', 'tp-faixa__eu-link');
    if (own.url) e.href = own.url;
    e.append(no('span', 'tp-rotulo tp-faixa__eu-rotulo', tr('SEU RANKING')),
      no('span', 'tp-num tp-faixa__eu-pos', `#${num(own.position)}`));
    caixa.appendChild(e);
    const alvo = alvoFaixa(own, jogadores);
    if (alvo) caixa.appendChild(alvo);
    return caixa;
  }
  if (ehGuest()) {
    const b = no('button', 'tp-lobby-link tp-lobby-link--ambar', tr('ENTRE PRA APARECER NO PLACAR ▸'));
    b.type = 'button';
    b.addEventListener('click', () => $('hub-account-login')?.click());
    caixa.appendChild(b);
  } else caixa.appendChild(no('span', 'tp-faixa__eu-vazio', tr('Você ainda não pontuou no placar.')));
  return caixa;
}

function desenharFaixa(faixa, dados) {
  const jogadores = Array.isArray(dados?.players) ? dados.players.slice(0, TOPO_FAIXA) : [];
  const janela = faixa.querySelector('.tp-faixa__janela');
  const trilho = faixa.querySelector('.tp-faixa__trilho');
  faixa.querySelector('.tp-faixa__eu')?.remove();
  trilho.replaceChildren();
  faixa.hidden = !jogadores.length;
  if (!jogadores.length) return;
  faixa.prepend(meuFaixa(dados.own, dados.players));
  const fila = no('ul', 'tp-faixa__fila');
  const criar = () => jogadores.map((p) => { const li = no('li'); li.appendChild(itemFaixa(p)); return li; });
  trilho.appendChild(fila);
  /* fila mais curta que a janela abriria buraco no laço: repete o mesmo topo até cobrir a largura */
  do { for (const li of criar()) fila.appendChild(li); } while (fila.scrollWidth < janela.clientWidth && fila.children.length < 60);
  const copia = fila.cloneNode(true);
  copia.setAttribute('aria-hidden', 'true');
  copia.inert = true;
  trilho.appendChild(copia);
}

function montarFaixa() {
  const play = $('hub-play');
  if (!play) return null;
  const faixa = no('section', 'tp-faixa');
  faixa.id = 'tp-lobby-faixa';
  faixa.hidden = true;
  faixa.setAttribute('aria-label', tr('Placar da rua ao vivo'));
  const janela = no('div', 'tp-faixa__janela');
  janela.appendChild(no('div', 'tp-faixa__trilho'));
  /* foco num link que está passando rola a janela e desmonta o laço: no modo animado ela volta ao zero */
  janela.addEventListener('scroll', () => { if (getComputedStyle(janela).overflowX === 'hidden') janela.scrollLeft = 0; });
  faixa.appendChild(janela);
  play.appendChild(faixa);
  return faixa;
}

export function montarRanking(dir, ir) {
  const painel = no('section', 'tp-lobby-painel tp-lobby-rank');
  painel.id = 'tp-lobby-ranking';
  const cab = no('div', 'tp-lobby-painel__cab');
  const h2 = no('h2', 'tp-disp tp-lobby-painel__titulo');
  h2.appendChild(no('span', 'tp-ital', tr('PLACAR DA RUA')));
  const ver = no('button', 'tp-lobby-link', tr('VER RANKING ▸'));
  ver.type = 'button';
  ver.addEventListener('click', ir);
  cab.append(h2, ver);
  painel.append(cab, no('div', 'tp-lobby-rank__corpo'));
  dir.appendChild(painel);
  const faixa = montarFaixa();

  let pedido = 0;
  const carregar = async () => {
    const meu = ++pedido;
    desenhar(painel, 'carregando', null, ir, carregar);
    try {
      const d = await buscar();
      if (meu !== pedido) return;
      desenhar(painel, 'lista', d, ir, carregar);
      if (faixa) desenharFaixa(faixa, d);
    } catch {
      if (meu !== pedido) return;
      desenhar(painel, 'erro', null, ir, carregar);
      if (faixa) desenharFaixa(faixa, null);
    }
  };
  const login = $('hub-account-login');
  if (login) new MutationObserver(carregar).observe(login, { attributes: true, attributeFilter: ['data-state'] });
  carregar();
  return painel;
}
