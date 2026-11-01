/* Treta Pop · 16 servidores. Carregado por tp/ligar.js só com ?ui=v3. */
import { tr } from '../i18n.js';
import { NOS, sondarNos } from '../net.js';
import { VERSION } from '../version.js';
import { mapPreviewPoster } from '../escadao_preview.js';
import { previewRevision } from '../amazonia_map_preview.js';

const BANDEIRA = { br: 'br' };
const RETENTATIVA_S = 15;
const posterDoMapa = (id) => mapPreviewPoster(id, `${VERSION}${previewRevision(id)}`);
const qualidade = (ms) => (ms == null ? 'ruim' : ms <= 60 ? 'bom' : ms <= 120 ? 'medio' : 'ruim');
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

let painel, raiz, regioes, lista, vivo, aviso;
let nos = [], salas = [], noAtual = null, salasErro = false, medindo = true;
const filtro = { modo: 'todos', aberta: false, vaga: false };
let relogio = null, faltam = 0;

function montar() {
  painel = document.getElementById('mp-panel');
  if (!painel || painel.querySelector('.tp-srv')) return false;
  /* fora do #hub-mp-host as regras do hub (dois ids) deixam de valer e a tela cobre o lobby */
  const menu = document.getElementById('main-menu');
  if (painel.parentElement?.id === 'hub-mp-host' && menu) menu.appendChild(painel);

  raiz = el('div', 'tp-srv');
  const topo = el('header', 'tp-srv__topo');
  const voltar = el('button', 'tp-srv__voltar', tr('◀ VOLTAR'));
  voltar.type = 'button';
  voltar.onclick = sairParaLobby;
  const titulo = el('h1', 'tp-disp tp-srv__titulo');
  titulo.append(el('span', 'tp-ital', tr('MULTIPLAYER')));
  const linhaVivo = el('span', 'tp-srv__vivo');
  linhaVivo.append(el('i'));
  vivo = el('span'); vivo.dataset.vivo = '';
  linhaVivo.append(vivo);
  const estado = document.getElementById('mp-estado');
  const acoes = el('div', 'tp-srv__acoes');
  const amigos = document.getElementById('mp-amigos');
  const quick = document.getElementById('mp-quick');
  if (amigos) { amigos.className = 'tp-btn tp-srv__criar'; amigos.textContent = tr('CRIAR SALA PRIVADA'); acoes.append(amigos); }
  if (quick) {
    quick.className = 'tp-btn tp-btn--primario tp-srv__rapido';
    quick.replaceChildren(el('span', 'tp-ital', tr('JOGO RÁPIDO')), el('kbd', '', 'ENTER'));
    acoes.append(quick);
  }
  topo.append(voltar, titulo, linhaVivo);
  if (estado) topo.append(estado);
  topo.append(acoes);

  const corpo = el('div', 'tp-srv__corpo');
  const lado = el('aside', 'tp-srv__lado');
  lado.setAttribute('aria-label', tr('Região'));
  regioes = el('div', 'tp-srv__regioes');
  regioes.setAttribute('role', 'radiogroup');
  regioes.setAttribute('aria-label', tr('Região'));
  lado.append(el('span', 'tp-rotulo', tr('Região · escolhida pelo menor ping')), regioes);
  const criar = painel.querySelector('.mp-criar');
  if (criar) { criar.classList.add('tp-srv__mais'); lado.append(criar); }
  aviso = el('div', 'tp-srv__aviso');
  aviso.setAttribute('role', 'status');
  aviso.hidden = true;
  lado.append(aviso);

  const sec = el('section', 'tp-painel tp-srv__salas');
  sec.setAttribute('aria-label', tr('SALAS ABERTAS'));
  const barra = el('div', 'tp-srv__barra');
  const h2 = el('h2', 'tp-disp tp-srv__h2');
  h2.append(el('span', 'tp-ital', tr('SALAS ABERTAS')));
  barra.append(h2);
  for (const [modo, rot] of [['todos', 'TODOS OS MODOS'], ['rounds', 'MATA-MATA'], ['ctf', 'CAPTURA']]) {
    const b = el('button', 'tp-srv__chip', tr(rot));
    b.type = 'button'; b.dataset.filtroModo = modo;
    b.onclick = () => { filtro.modo = modo; desenharSalas(); };
    barra.append(b);
  }
  for (const [chave, rot] of [['vaga', 'COM VAGA'], ['aberta', 'SEM SENHA']]) {
    const b = el('button', 'tp-srv__chip', tr(rot));
    b.type = 'button'; b.dataset.filtro = chave;
    b.onclick = () => { filtro[chave] = !filtro[chave]; desenharSalas(); };
    barra.append(b);
  }
  const form = document.getElementById('mp-convite-form');
  if (form) {
    form.classList.add('tp-srv__codigo');
    const input = document.getElementById('mp-convite-in');
    if (input) { input.placeholder = tr('Código da sala'); input.setAttribute('aria-label', tr('Código da sala')); }
    barra.append(form);
  }
  const erro = document.getElementById('mp-erro');
  const cab = el('div', 'tp-srv__cab');
  for (const rot of ['MAPA', 'SALA', 'SITUAÇÃO', 'JOGADORES', 'PING', 'ENTRAR NO LADO']) cab.append(el('span', 'tp-rotulo', tr(rot)));
  lista = el('div', 'tp-srv__lista');
  lista.setAttribute('aria-live', 'polite');
  const rodape = el('div', 'tp-srv__rodape');
  rodape.append(el('span', '', tr('Atualiza sozinho a cada 5 s')));
  const atualizar = document.getElementById('mp-atualizar');
  if (atualizar) { atualizar.className = 'tp-srv__mini'; rodape.append(atualizar); }
  sec.append(barra);
  if (erro) sec.append(erro);
  sec.append(cab, lista, rodape);
  corpo.append(lado, sec);
  raiz.append(topo, corpo);
  painel.prepend(raiz);
  painel.classList.add('tp-srv-painel');
  return true;
}

function sairParaLobby() {
  document.getElementById('hub-sp')?.click();
}

function desenharNos() {
  regioes.replaceChildren();
  if (medindo && !nos.length) { regioes.append(el('p', 'tp-srv__vazio', tr('medindo o ping dos servidores…'))); }
  const legado = [...document.querySelectorAll('#mp-nos .mp-no')];
  nos.forEach((n, i) => {
    const b = el('button', 'tp-srv__regiao');
    b.type = 'button'; b.dataset.no = n.id;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(!!noAtual && noAtual.id === n.id));
    b.dataset.online = n.online ? '1' : '0';
    const q = qualidade(n.ping);
    const flag = BANDEIRA[n.id];
    if (flag) { const img = el('img', 'tp-srv__flag'); img.src = `/img/flags/${flag}.webp`; img.width = 30; img.height = 20; img.alt = ''; b.append(img); } else b.append(el('span', 'tp-srv__flag'));
    const info = el('span', 'tp-srv__info');
    info.append(el('b', '', tr(n.nome)), el('span', 'tp-srv__sub', n.online
      ? `${n.jogadores | 0} ${tr('jogando')} · ${n.salas | 0} ${tr((n.salas | 0) === 1 ? 'sala' : 'salas')}`
      : tr('fora do ar agora')));
    b.append(info);
    const sinal = el('span', 'tp-srv__sinal');
    sinal.dataset.q = n.online ? q : 'fora';
    if (n.online) {
      const barras = el('span', 'tp-srv__barras');
      const acesas = q === 'bom' ? 3 : q === 'medio' ? 2 : 1;
      for (let k = 1; k <= 3; k++) { const x = el('i'); if (k <= acesas) x.dataset.on = ''; barras.append(x); }
      sinal.append(barras, el('span', 'tp-num tp-srv__ms', `${n.ping} ms`));
    } else sinal.append(el('span', 'tp-num tp-srv__ms', '—'));
    b.append(sinal);
    b.onclick = () => legado[i]?.click();
    regioes.append(b);
  });
  let jogando = 0, abertas = 0;
  for (const n of nos) if (n.online) { jogando += n.jogadores | 0; abertas += n.salas | 0; }
  vivo.textContent = medindo ? tr('medindo o ping dos servidores…') : `${jogando} ${tr('jogando agora em')} ${abertas} ${tr(abertas === 1 ? 'sala' : 'salas')}`;
  desenharAviso();
}

function desenharAviso() {
  const fora = nos.filter((n) => !n.online);
  const todos = !medindo && nos.length > 0 && fora.length === nos.length;
  raiz.dataset.fora = todos ? 'todos' : fora.length ? 'parte' : '';
  // SV18: com todos fora, o JOGO RÁPIDO não promete partida (sai do lima e desliga);
  // o único caminho lima da tela passa a ser o TREINAR CONTRA BOTS do aviso.
  const quick = raiz.querySelector('#mp-quick');
  if (quick) { quick.classList.toggle('tp-btn--primario', !todos); quick.disabled = todos; }
  aviso.hidden = medindo || !fora.length;
  if (aviso.hidden) { pararRelogio(); return; }
  aviso.replaceChildren();
  aviso.append(el('b', '', todos ? tr('Servidores fora do ar') : `${fora.map((n) => tr(n.nome)).join(', ')} ${tr('fora do ar')}`));
  const p = el('p');
  p.append(`${tr('Tentando de novo em')} `, el('span', 'tp-num tp-srv__conta', `${faltam || RETENTATIVA_S} s`), `. ${tr(todos ? 'Enquanto isso, dá pra treinar contra bots.' : 'Se os outros caírem também, dá pra treinar contra bots.')}`);
  aviso.append(p);
  const acoes = el('div', 'tp-srv__aviso-acoes');
  const tentar = el('button', 'tp-srv__mini', tr('TENTAR AGORA'));
  tentar.type = 'button'; tentar.onclick = () => retentar();
  const bots = el('button', 'tp-srv__bots', `${tr('TREINAR CONTRA BOTS')} ▸`);
  bots.type = 'button'; bots.onclick = sairParaLobby;
  acoes.append(tentar, bots);
  aviso.append(acoes);
  if (!relogio) armarRelogio();
}

function armarRelogio() {
  faltam = RETENTATIVA_S;
  relogio = setInterval(() => {
    if (painel.classList.contains('hidden')) return;
    faltam -= 1;
    const c = aviso.querySelector('.tp-srv__conta');
    if (c) c.textContent = `${Math.max(0, faltam)} s`;
    if (faltam <= 0) retentar();
  }, 1000);
}
function pararRelogio() { clearInterval(relogio); relogio = null; faltam = 0; }

/* Sonda só os nós caídos; quando um volta, a tela inteira refaz pelo caminho do legado. */
async function retentar() {
  pararRelogio();
  const caidos = NOS.filter((no) => nos.some((n) => n.id === no.id && !n.online));
  const voltou = caidos.length ? (await sondarNos(caidos)).some((n) => n.online) : true;
  if (voltou) document.dispatchEvent(new CustomEvent('cs-treta-multiplayer'));
  else armarRelogio();
}

function situacao(r) {
  const livres = (r.livre?.E || 0) + (r.livre?.B || 0);
  if (r.cooperative && r.waitingForPlayers) return {texto:`${tr('Aguardando defensores')} · ${r.players | 0}/4`,tom:'ganho',livres};
  const sit = (r.players | 0) === 0 ? ['Esperando gente', 'ganho'] : livres ? ['Com vaga', ''] : ['Lotada', 'apagada'];
  return { texto: tr(sit[0]) + (r.spectators ? ` · ${r.spectators} ${tr('assistindo')}` : ''), tom: sit[1], livres };
}

function passa(r) {
  if (filtro.modo === 'ctf' && !r.ctf) return false;
  if (filtro.modo === 'rounds' && r.ctf) return false;
  if (filtro.aberta && r.private) return false;
  if (filtro.vaga && !situacao(r).livres) return false;
  return true;
}

function desenharSalas() {
  for (const b of raiz.querySelectorAll('[data-filtro-modo]')) b.setAttribute('aria-pressed', String(b.dataset.filtroModo === filtro.modo));
  for (const b of raiz.querySelectorAll('[data-filtro]')) b.setAttribute('aria-pressed', String(filtro[b.dataset.filtro]));
  lista.replaceChildren();
  if (raiz.dataset.fora === 'todos') { lista.append(el('p', 'tp-srv__vazio', tr('Nenhum servidor no ar agora. A lista volta quando um responder.'))); return; }
  if (salasErro) { lista.append(el('p', 'tp-srv__vazio', tr('Esse servidor não mandou a lista de salas. Tente outra região.'))); return; }
  if (!salas.length) { lista.append(el('p', 'tp-srv__vazio', tr(medindo ? 'Procurando salas…' : 'Nenhuma sala aberta. Crie a sua ou entre no jogo rápido.'))); return; }
  const legado = [...document.querySelectorAll('#mp-salas .mp-sala')];
  const ping = noAtual?.online ? noAtual.ping : null;
  let mostradas = 0;
  salas.forEach((r, i) => {
    if (!passa(r)) return;
    mostradas++;
    const linha = el('div', 'tp-srv__sala');
    const { texto, tom, livres } = situacao(r);
    if (!livres) linha.dataset.cheia = '';
    const img = el('img', 'tp-srv__mapa');
    img.alt = ''; img.width = 92; img.height = 56; img.loading = 'lazy'; img.decoding = 'async';
    img.src = posterDoMapa(r.map);
    const nome = el('span', 'tp-srv__nome');
    const b = el('b');
    if (r.oficial) b.append(el('span', 'tp-srv__tag', tr('OFICIAL')));
    if (r.private && r.senha !== false) b.append(el('span', 'tp-srv__tag', tr('SENHA')));
    b.append(tr(r.name || r.convite || ''));
    const sub = el('small', '', '');
    sub.append(el('span', '', `${tr(r.mode === 'horde' ? 'Javaporcos · 4–8' : r.ctf ? 'Captura' : 'Mata-mata')} · ${r.mapNome || r.map}`));
    if (r.convite) {
      const conv = el('button', 'tp-num tp-srv__conv', r.convite);
      conv.type = 'button'; conv.title = tr('Copiar o link de convite desta sala');
      conv.onclick = () => {
        const chip = legado[i]?.querySelector('.mp-convite-chip');
        chip?.click();
        /* o legado confirma na própria etiqueta; aqui só repete quando a cópia deu certo */
        setTimeout(() => { if (chip?.textContent === 'COPIADO!') { conv.textContent = tr('LINK COPIADO'); setTimeout(() => { conv.textContent = r.convite; }, 1600); } }, 150);
      };
      sub.append(' · ', conv);
    }
    nome.append(b, sub);
    const sit = el('span', 'tp-srv__sit', texto);
    if (tom) sit.dataset.tom = tom;
    const lot = el('span', 'tp-num tp-srv__lot', `${r.players | 0}/${r.max | 0}`);
    const pg = el('span', 'tp-num tp-srv__ping', ping == null ? '—' : String(ping));
    pg.dataset.q = qualidade(ping);
    const entrar = el('span', 'tp-srv__entrar');
    if (livres) {
      for (const lado of r.cooperative ? ['E'] : ['E', 'B']) {
        const vagas = r.livre?.[lado] || 0;
        const bt = el('button', 'tp-srv__lado-btn');
        bt.type = 'button'; bt.dataset.lado = lado; bt.disabled = !vagas;
        const rotulo = r.cooperative ? 'DEFENSORES' : lado === 'E' ? 'TIME E' : 'TIME B';
        bt.append(el('span', '', tr(rotulo)), el('b', 'tp-num', String(vagas)));
        bt.setAttribute('aria-label', `${tr('Entrar no time')} ${tr(rotulo)}`);
        bt.onclick = () => legado[i]?.querySelector(`.mp-entrar[data-lado="${lado}"]`)?.click();
        entrar.append(bt);
      }
    }
    const ver = el('button', livres ? 'tp-srv__ver' : 'tp-srv__ver tp-srv__ver--so', livres ? '' : tr('ASSISTIR'));
    ver.type = 'button';
    if (livres) {
      ver.setAttribute('aria-label', tr('ASSISTIR'));
      ver.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
    }
    ver.onclick = () => legado[i]?.querySelector('.mp-assistir')?.click();
    entrar.append(ver);
    linha.append(img, nome, sit, lot, pg, entrar);
    lista.append(linha);
  });
  if (!mostradas) lista.append(el('p', 'tp-srv__vazio', tr('Nenhuma sala passa nesse filtro.')));
}

function aoNos(e) {
  medindo = !!e.detail?.medindo;
  nos = e.detail?.nos || [];
  noAtual = e.detail?.atual || null;
  desenharNos();
  if (medindo) { salas = []; salasErro = false; desenharSalas(); }
}
function aoSalas(e) {
  salasErro = !!e.detail?.erro;
  salas = e.detail?.salas || [];
  if (e.detail?.no) noAtual = e.detail.no;
  desenharSalas();
}

function teclado(e) {
  if (e.key !== 'Enter' || painel.classList.contains('hidden') || !raiz.isConnected) return;
  const a = document.activeElement;
  if (a && a !== document.body && a !== painel && !raiz.contains(a)) return;
  if (a && raiz.contains(a) && a.matches('button, input, select, textarea, summary, a')) return;
  if (!document.getElementById('mp-modal')?.classList.contains('hidden')) return;
  e.preventDefault();
  document.getElementById('mp-quick')?.click();
}

/* A barra do hub fica à vista: a tela começa onde ela termina. */
function acompanharTopo() {
  const cab = document.querySelector('.hub-header');
  if (!cab) return;
  const medir = () => raiz.style.setProperty('--tp-srv-topo', `${Math.round(cab.getBoundingClientRect().bottom)}px`);
  medir();
  new ResizeObserver(medir).observe(cab);
  addEventListener('resize', medir);
}

export function ligar() {
  if (!montar()) return;
  document.addEventListener('tp-mp-nos', aoNos);
  document.addEventListener('tp-mp-salas', aoSalas);
  document.addEventListener('keydown', teclado);
  acompanharTopo();
  const ultimo = window.__tpMp || {};
  if (ultimo['tp-mp-nos']) aoNos({ detail: ultimo['tp-mp-nos'] }); else desenharNos();
  if (ultimo['tp-mp-salas']) aoSalas({ detail: ultimo['tp-mp-salas'] }); else desenharSalas();
}
