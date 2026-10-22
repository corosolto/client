/* Treta Pop · card do placar no lobby (tela 02) e porta para a aba RANKING do hub.
   Todo número vem de /api/social?action=ranking: sem sessão `own` é nulo e o card convida a entrar. */
import { tr, LANG } from '../i18n.js';
import { apiUrl } from '../apibase.js';

const ROTA = '/api/social?action=ranking&scope=global&period=all&mode=all&game_type=all&team=all';
const TOPO = 3;
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

/* Sem `own` o card não inventa posição: convida a entrar (visitante) ou diz que ainda não pontuou. */
function meuLugar(own, ir) {
  const caixa = no('div', 'tp-lobby-rank__eu');
  if (own && Number.isFinite(Number(own.position))) {
    const b = no('button', 'tp-lobby-rank__eu-botao');
    b.type = 'button';
    b.append(no('span', 'tp-rotulo tp-lobby-rank__eu-rotulo', tr('SUA POSIÇÃO')),
      no('span', 'tp-num tp-lobby-rank__eu-pos', `#${num(own.position)}`),
      no('span', 'tp-num tp-lobby-rank__eu-pts', `${num(own.points || 0)} ${tr('pontos')}`));
    b.addEventListener('click', ir);
    caixa.appendChild(b);
    return caixa;
  }
  caixa.appendChild(no('p', 'tp-lobby-vazio', tr(ehGuest() ? 'Entre pra aparecer no placar.' : 'Você ainda não pontuou no placar.')));
  if (ehGuest()) {
    const entrar = no('button', 'tp-lobby-link tp-lobby-link--ambar', tr('ENTRAR ▸'));
    entrar.type = 'button';
    entrar.addEventListener('click', () => $('hub-account-login')?.click());
    caixa.appendChild(entrar);
  }
  return caixa;
}

function desenhar(painel, estado, dados, ir, recarregar) {
  const corpo = painel.querySelector('.tp-lobby-rank__corpo');
  painel.dataset.estado = estado;
  corpo.replaceChildren();
  if (estado === 'lista') {
    corpo.appendChild(meuLugar(dados.own, ir));
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

  let pedido = 0;
  const carregar = async () => {
    const meu = ++pedido;
    desenhar(painel, 'carregando', null, ir, carregar);
    try {
      const d = await buscar();
      if (meu === pedido) desenhar(painel, 'lista', d, ir, carregar);
    } catch {
      if (meu === pedido) desenhar(painel, 'erro', null, ir, carregar);
    }
  };
  const login = $('hub-account-login');
  if (login) new MutationObserver(carregar).observe(login, { attributes: true, attributeFilter: ['data-state'] });
  carregar();
  return painel;
}
