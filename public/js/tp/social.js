/* Treta Pop · 12 chat no lobby, 15 convidar, 24 e 25 mobile. Carregado por tp/ligar.js só com ?ui=v3. */
import { tr, LANG } from '../i18n.js';
import { loadAccount, socialApi } from '../account-entry.js';
import { linkDeConvite } from '../nos.js';
import { origemPublica, linkCompartilhavel } from '../compartilhar.js';
import { qrSvg } from './qr.js';

const LIMITE = 200;
const RAPIDAS = ['Bora!', '5 min', 'Tô dentro', 'Chora na live!'];
const ERROS = {
  join_room_first: 'Entre na sala antes de chamar.', room_solo: 'Essa sala é solo.', room_full: 'A sala lotou.',
  rate_limited: 'Calma: tente de novo em um minuto.', blocked: 'Esse jogador não pode interagir com você.',
  friends_required: 'Só dá pra conversar com amigos.', session_expired: 'Sua sessão expirou. Entre de novo.',
};
const erroTexto = (e) => tr(ERROS[e?.message] || 'Não deu certo agora. Tente de novo.');

const el = (tag, cls = '', texto = '') => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (texto) n.textContent = texto;
  return n;
};
const botao = (cls, texto) => { const b = el('button', cls, texto); b.type = 'button'; return b; };
const ICONES = {
  zap: '<path d="M4 20l1.4-4A8 8 0 1 1 8 19z"/>',
  discord: '<rect x="3" y="5" width="18" height="14" rx="4"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/>',
  telegram: '<path d="M3 11l18-7-4 16-6-5-3 4v-6z"/>',
  balao: '<path d="M4 5h16v11H9l-5 4z"/>',
};
const icone = (nome) => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = ICONES[nome];
  return s;
};
const comTr = (chave, vars) => Object.entries(vars).reduce((t, [k, v]) => t.replace(`{${k}}`, v), tr(chave));
const rotulaPor = (b, texto) => {
  const antes = b.dataset.rotulo || b.textContent;
  b.dataset.rotulo = antes; b.textContent = texto;
  setTimeout(() => { b.textContent = antes; }, 1600);
};
const escX = (cls) => {
  const b = botao(cls);
  b.append(el('span', 'tp-esc', 'ESC'), '✕');
  return b;
};

function visto(at) {
  const t = Date.parse(at || '');
  if (!Number.isFinite(t)) return tr('offline');
  const min = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (min < 60) return comTr('visto há {n} min', { n: min });
  if (min < 48 * 60) return comTr('visto há {n} h', { n: Math.round(min / 60) });
  return comTr('visto há {n} dias', { n: Math.round(min / 1440) });
}
function presenca(p) {
  if (!p) return { texto: tr('presença privada'), estado: 'off' };
  if (p.game) return { texto: `${tr('Em partida')} · ${p.game.map}`, estado: 'jogo' };
  if (p.online) return { texto: tr('Online'), estado: 'on' };
  return { texto: visto(p.last_active_at), estado: 'off' };
}
const iniciais = (nick) => String(nick || '?').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || '?';
function rosto(nick, url, cls) {
  const r = el('span', `tp-rosto ${cls || ''}`);
  if (url) { const i = el('img'); i.src = url; i.alt = ''; i.referrerPolicy = 'no-referrer'; r.append(i); }
  else r.append(el('span', 'tp-disp', iniciais(nick)));
  return r;
}
const local = () => (LANG === 'en' ? 'en-US' : 'pt-BR');
const hora = (at) => new Date(at).toLocaleTimeString(local(), { hour: '2-digit', minute: '2-digit' });
function dia(at) {
  const d = new Date(at), hoje = new Date(), ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === hoje.toDateString()) return tr('HOJE');
  if (d.toDateString() === ontem.toDateString()) return tr('ONTEM');
  return d.toLocaleDateString(local());
}

/* Estado único da resenha: só o que a API social devolve. Sem conta, sem amigo inventado. */
const S = { auth: undefined, social: null, inbox: null, erro: null, canal: 'amigos', alvo: null, conversa: null, busca: '', rascunho: '', enviando: false, convidados: new Set() };
let carga = null;
function carregar() {
  carga ||= (async () => {
    S.erro = null;
    try {
      S.auth = await loadAccount();
      S.social = S.auth?.profile ? await socialApi('/api/social') : null;
      S.inbox = S.social?.messages_enabled ? await socialApi('/api/social?action=inbox').catch(() => null) : null;
    } catch (e) { S.erro = e; S.auth = S.auth || null; S.social = null; S.inbox = null; }
  })().finally(() => { carga = null; });
  return carga;
}
const amigos = () => (S.social?.friends || []).filter((f) => f.state === 'accepted');
const naoLidas = (id) => (S.inbox?.conversations || []).find((c) => c.target_id === id)?.unread_count | 0;
const ORDEM = { on: 0, jogo: 1, off: 2 };
const avisos = new Set();
document.addEventListener('cs-account-change', () => {
  S.auth = undefined; S.social = null; S.inbox = null; S.alvo = null; S.conversa = null; S.convidados.clear();
  for (const f of avisos) f();
});

export function ligar() {
  ligarResenha();
  ligarConvidar();
}

function ligarResenha() {
  const menu = document.getElementById('main-menu');
  if (!menu || document.getElementById('tp-resenha')) return;

  const abre = botao('tp-resenha-botao');
  abre.id = 'tp-resenha-botao';
  abre.setAttribute('aria-controls', 'tp-resenha'); abre.setAttribute('aria-expanded', 'false'); abre.setAttribute('aria-keyshortcuts', 'Y');
  const nome = el('span', 'tp-disp'); nome.append(el('span', 'tp-ital', tr('Resenha')));
  const novas = el('span', 'tp-resenha-botao__novas tp-num');
  abre.append(icone('balao'), nome, novas, el('kbd', 'tp-num', 'Y'));

  const veu = el('div', 'tp-resenha-veu');
  const g = el('aside', 'tp-gaveta tp-resenha');
  g.id = 'tp-resenha';
  g.setAttribute('aria-labelledby', 'tp-resenha-titulo');
  const topo = el('header', 'tp-resenha__topo');
  const titulo = el('h2', 'tp-disp tp-resenha__titulo'); titulo.id = 'tp-resenha-titulo';
  titulo.append(el('span', 'tp-ital', tr('Resenha')));
  const canais = el('nav', 'tp-resenha__canais'); canais.setAttribute('role', 'tablist'); canais.setAttribute('aria-label', tr('Canais'));
  const abas = {};
  for (const [id, rotulo] of [['amigos', 'AMIGOS'], ['cla', 'CLÃ'], ['salas', 'SALAS']]) {
    const b = botao('tp-resenha__canal');
    b.setAttribute('role', 'tab'); b.dataset.canal = id;
    b.append(el('span', '', tr(rotulo)), el('span', 'tp-num tp-resenha__conta-canal'));
    b.onclick = () => { S.canal = id; desenhar(); };
    abas[id] = b; canais.append(b);
  }
  const sair = escX('tp-resenha__sair'); sair.setAttribute('aria-label', tr('Fechar a resenha'));
  topo.append(titulo, canais, sair);
  const corpo = el('div', 'tp-resenha__corpo');
  const lista = el('div', 'tp-resenha__lista');
  const conversa = el('section', 'tp-resenha__conversa');
  corpo.append(lista, conversa);
  g.append(topo, corpo);
  menu.append(abre, veu, g);

  /* O contador do botão é o mesmo da aba COMUNIDADE: quem calcula é a comunidade. */
  const fonte = document.getElementById('hub-social-unread');
  const espelha = () => {
    const n = parseInt(fonte?.textContent || '', 10) || 0;
    novas.textContent = n ? String(n) : '';
    novas.toggleAttribute('data-vazio', !n);
    abre.setAttribute('aria-label', n ? comTr('Abrir a resenha, {n} novidades', { n }) : tr('Abrir a resenha'));
  };
  espelha();
  if (fonte) new MutationObserver(espelha).observe(fonte, { childList: true, characterData: true, subtree: true });

  const aberta = () => g.hasAttribute('data-aberta');
  function abrir() {
    if (aberta()) return;
    g.setAttribute('data-aberta', ''); veu.setAttribute('data-aberto', '');
    abre.setAttribute('aria-expanded', 'true');
    desenhar();
    abas[S.canal].focus({ preventScroll: true });
    carregar().then(desenhar);
  }
  function fechar(devolveFoco = true) {
    if (!aberta()) return;
    g.removeAttribute('data-aberta'); veu.removeAttribute('data-aberto');
    abre.setAttribute('aria-expanded', 'false');
    if (devolveFoco) abre.focus({ preventScroll: true });
  }
  abre.onclick = () => (aberta() ? fechar() : abrir());
  sair.onclick = () => fechar();
  veu.onclick = () => fechar();
  avisos.add(() => { if (aberta()) carregar().then(desenhar); });
  new MutationObserver(() => { if (menu.classList.contains('hidden')) fechar(false); }).observe(menu, { attributes: true, attributeFilter: ['class'] });
  const editavel = (t) => t?.closest?.('input,textarea,select,[contenteditable="true"]');
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && aberta()) { e.preventDefault(); e.stopPropagation(); fechar(); return; }
    if (e.code !== 'KeyY' || e.repeat || e.ctrlKey || e.metaKey || e.altKey || editavel(e.target)) return;
    if (!menu.checkVisibility?.() || !document.getElementById('mp-modal')?.classList.contains('hidden')) return;
    const splash = document.getElementById('boot-splash');
    if (splash && !splash.classList.contains('gone')) return;
    e.preventDefault();
    if (aberta()) fechar(); else abrir();
  }, true);

  function vazio(titulo, texto, acao) {
    const v = el('div', 'tp-resenha__vazio'); v.setAttribute('data-vazio-estado', '');
    v.append(el('strong', '', titulo));
    if (texto) v.append(el('p', '', texto));
    if (acao) v.append(acao);
    return v;
  }
  const entrar = () => {
    const b = botao('tp-resenha__acao', tr('ENTRAR NA CONTA'));
    b.onclick = () => { fechar(false); document.getElementById('hub-account-login')?.click(); };
    return b;
  };
  const abrirComunidade = (detalhe) => {
    fechar(false);
    document.querySelector('[data-hub-tab="comunidade"]')?.click();
    if (detalhe) document.dispatchEvent(new CustomEvent('cs-community-open', { detail: detalhe }));
  };

  function desenhar() {
    const logado = !!S.auth?.profile;
    for (const [id, b] of Object.entries(abas)) {
      b.setAttribute('aria-selected', String(S.canal === id)); b.tabIndex = S.canal === id ? 0 : -1;
      const n = id === 'amigos' ? S.inbox?.unread_count | 0 : id === 'salas' ? (S.social?.invites || []).filter((i) => i.direction === 'incoming').length : 0;
      b.querySelector('.tp-resenha__conta-canal').textContent = n ? String(n) : '';
    }
    desenharLista(logado);
    desenharConversa(logado);
  }

  function desenharLista(logado) {
    lista.replaceChildren();
    if (S.canal === 'amigos') {
      const busca = el('label', 'tp-resenha__busca');
      const campo = el('input'); campo.type = 'search'; campo.placeholder = tr('Buscar na turma'); campo.value = S.busca;
      campo.setAttribute('aria-label', tr('Buscar na turma'));
      busca.append(campo);
      const itens = el('div', 'tp-resenha__itens');
      campo.oninput = () => { S.busca = campo.value; preencherItens(itens, logado); };
      if (logado) lista.append(busca);
      lista.append(itens);
      preencherItens(itens, logado);
    } else {
      lista.append(el('p', 'tp-resenha__nota', tr(S.canal === 'cla' ? 'O clã ainda não tem sala de conversa.' : 'Convites para a sala de alguém da turma.')));
    }
    const chame = el('div', 'tp-resenha__chame');
    chame.append(el('strong', '', tr('Chame quem não joga ainda')));
    const copia = botao('tp-resenha__acao', tr('COPIAR LINK DO JOGO'));
    copia.onclick = async () => {
      try { await navigator.clipboard.writeText(linkCompartilhavel('/', 'resenha')); rotulaPor(copia, tr('LINK COPIADO')); }
      catch { rotulaPor(copia, tr('NÃO DEU PRA COPIAR')); }
    };
    chame.append(copia);
    lista.append(chame);
  }

  function preencherItens(itens, logado) {
    itens.replaceChildren();
    const q = S.busca.trim().toLowerCase();
    const fs = amigos().filter((f) => !q || f.nick.toLowerCase().includes(q))
      .map((f) => ({ f, p: presenca(f.profile?.presence), n: naoLidas(f.id) }))
      .sort((a, b) => b.n - a.n || ORDEM[a.p.estado] - ORDEM[b.p.estado] || a.f.nick.localeCompare(b.f.nick));
    for (const { f, p, n } of fs) {
      const b = botao('tp-resenha__conv');
      b.dataset.conversa = ''; b.dataset.id = f.id; b.dataset.estado = p.estado;
      if (S.alvo?.id === f.id) b.setAttribute('aria-current', 'true');
      const r = rosto(f.nick, f.profile?.avatar_url);
      if (p.estado !== 'off') r.append(el('i', 'tp-resenha__ponto'));
      const txt = el('span', 'tp-resenha__conv-txt');
      txt.append(el('b', '', f.nick), el('small', '', p.texto));
      b.append(r, txt);
      if (n) b.append(el('span', 'tp-resenha__novas tp-num', String(n)));
      b.onclick = () => abrirConversa(f);
      itens.append(b);
    }
    if (!S.erro && logado && !amigos().length) itens.append(vazio(tr('Turma vazia'), tr('Adicione amigos pela Comunidade.')));
  }

  function desenharConversa(logado) {
    conversa.replaceChildren();
    conversa.removeAttribute('aria-label');
    if (S.auth === undefined) { conversa.append(vazio(tr('Carregando a turma…'))); return; }
    if (S.erro && S.erro.message !== 'session_expired') { conversa.append(vazio(tr('A resenha não respondeu.'), tr('Tente de novo em instantes.'))); return; }
    if (!logado) { conversa.append(vazio(tr('Entre para conversar com a turma'), tr('A resenha é entre amigos com conta. Jogar continua liberado sem conta.'), entrar())); return; }
    if (S.canal === 'cla') {
      const b = botao('tp-resenha__acao', tr('VER CLÃS'));
      b.onclick = () => { location.href = '/clans'; };
      conversa.append(vazio(tr('Conversa do clã ainda não abriu'), tr('Por enquanto o clã se encontra na sala da partida.'), b));
      return;
    }
    if (S.canal === 'salas') { desenharSalas(); return; }
    if (!S.social?.messages_enabled) { conversa.append(vazio(tr('Mensagens em preparação'), tr('As conversas ainda não abriram neste servidor.'))); return; }
    if (!S.alvo) {
      const b = botao('tp-resenha__acao', tr('ABRIR COMUNIDADE'));
      b.onclick = () => abrirComunidade({ tab: 'friends' });
      conversa.append(amigos().length ? vazio(tr('Escolha alguém da turma'), tr('A conversa aparece aqui.'))
        : vazio(tr('Sua turma está começando'), tr('Busque um jogador na Comunidade e mande um pedido.'), b));
      return;
    }
    const f = S.alvo, p = presenca(f.profile?.presence);
    conversa.setAttribute('aria-label', comTr('Conversa com {nick}', { nick: f.nick }));
    const cab = el('div', 'tp-resenha__cab');
    const quem = el('span', 'tp-resenha__quem');
    const perfil = botao('tp-resenha__perfil', f.nick);
    perfil.onclick = () => abrirComunidade({ tab: 'profile', perfil: f.id });
    quem.append(perfil, el('small', '', p.texto));
    const chamar = botao('tp-resenha__acao tp-resenha__chamar', tr('CHAMAR PRA SALA'));
    const aviso = el('p', 'tp-resenha__aviso'); aviso.setAttribute('role', 'status');
    chamar.onclick = async () => {
      chamar.disabled = true;
      try { await socialApi('/api/social', { action: 'invite', target: f.id }); aviso.textContent = tr('Convite enviado.'); }
      catch (e) { aviso.textContent = erroTexto(e); }
      finally { chamar.disabled = false; }
    };
    const mais = botao('tp-resenha__mais', '⋯'); mais.setAttribute('aria-label', tr('Ver perfil, bloquear ou denunciar'));
    mais.onclick = () => abrirComunidade({ tab: 'profile', perfil: f.id });
    cab.append(rosto(f.nick, f.profile?.avatar_url, 'tp-rosto--p'), quem, chamar, mais);
    const fio = el('div', 'tp-resenha__fio'); fio.setAttribute('aria-live', 'polite');
    const eu = S.auth.profile.id;
    let ultimoDia = '';
    for (const m of S.conversa?.messages || []) {
      const d = dia(m.created_at);
      if (d !== ultimoDia) { fio.append(el('span', 'tp-resenha__dia tp-num', d)); ultimoDia = d; }
      const b = el('div', 'tp-msg'); b.dataset.de = m.sender_id === eu ? 'eu' : 'outro';
      b.append(el('span', '', m.body), el('time', 'tp-num', hora(m.created_at)));
      fio.append(b);
    }
    if (S.conversa && !S.conversa.messages?.length) fio.append(el('span', 'tp-resenha__dia', tr('A primeira mensagem começa a conversa.')));
    if (!S.conversa) fio.append(el('span', 'tp-resenha__dia', tr('Carregando a conversa…')));
    const rapidas = el('div', 'tp-resenha__rapidas');
    const form = el('form', 'tp-resenha__form');
    const caixa = el('label', 'tp-resenha__caixa');
    const texto = el('input'); texto.id = 'tp-resenha-texto'; texto.maxLength = LIMITE; texto.autocomplete = 'off';
    texto.placeholder = comTr('Escreva pro {nick}…', { nick: f.nick }); texto.setAttribute('aria-label', tr('Mensagem'));
    texto.value = S.rascunho;
    const conta = el('span', 'tp-resenha__conta tp-num');
    const atualiza = () => { S.rascunho = texto.value; conta.textContent = `${texto.value.length}/${LIMITE}`; };
    texto.oninput = atualiza; atualiza();
    for (const r of RAPIDAS) {
      const b = botao('tp-resenha__rapida', tr(r));
      b.onclick = () => { texto.value = tr(r); atualiza(); texto.focus(); };
      rapidas.append(b);
    }
    caixa.append(texto, conta);
    const enviar = botao('tp-resenha__enviar', tr('ENVIAR')); enviar.id = 'tp-resenha-enviar'; enviar.type = 'submit';
    enviar.disabled = S.enviando;
    form.append(caixa, enviar);
    form.onsubmit = async (e) => {
      e.preventDefault();
      const corpoMsg = texto.value.trim();
      if (!corpoMsg || S.enviando) return;
      S.enviando = true; enviar.disabled = true;
      try {
        await socialApi('/api/social', { action: 'message_send', target: f.id, body: corpoMsg, client_id: crypto.randomUUID() });
        S.rascunho = '';
        await lerConversa(f);
      } catch (err) { aviso.textContent = erroTexto(err); }
      finally { S.enviando = false; if (S.alvo?.id === f.id) { desenhar(); document.getElementById('tp-resenha-texto')?.focus(); } }
    };
    const regras = el('p', 'tp-resenha__regras');
    const a = el('a', '', tr('ver regras')); a.href = '/regras-de-uso'; a.target = '_blank'; a.rel = 'noopener';
    regras.append(`${tr('Conversa entre amigos, dentro das regras da resenha')} · `, a);
    conversa.append(cab, aviso, fio, rapidas, form, regras);
    fio.scrollTop = fio.scrollHeight;
  }

  function desenharSalas() {
    const convites = S.social?.invites || [];
    if (!convites.length) { conversa.append(vazio(tr('Nenhum convite de sala agora'), tr('Quando alguém da turma te chamar, o convite aparece aqui.'))); return; }
    const fio = el('div', 'tp-resenha__fio');
    for (const inv of convites) {
      const c = el('div', 'tp-resenha__convite'); c.dataset.convite = inv.id;
      const sala = `${String(inv.node || '').toUpperCase()}-${inv.code}`;
      const falha = (e) => { c.querySelector('.tp-resenha__aviso')?.remove(); c.append(el('p', 'tp-resenha__aviso', erroTexto(e))); };
      if (inv.direction === 'incoming') {
        c.append(el('span', 'tp-rotulo', tr('Convite de sala')), el('strong', '', comTr('{nick} te chamou pra sala {sala}', { nick: inv.nick, sala })));
        const linha = el('span', 'tp-resenha__convite-acoes');
        const ok = botao('tp-resenha__acao tp-resenha__acao--forte', tr('ENTRAR'));
        ok.onclick = async () => {
          ok.disabled = true;
          try { const r = await socialApi('/api/social', { action: 'invite_accept', id: inv.id }); if (r?.join) location.assign(r.join); }
          catch (e) { falha(e); ok.disabled = false; }
        };
        const nao = botao('tp-resenha__acao', tr('AGORA NÃO'));
        nao.onclick = async () => {
          nao.disabled = true;
          try { await socialApi('/api/social', { action: 'invite_decline', id: inv.id }); await carregar(); desenhar(); }
          catch (e) { falha(e); nao.disabled = false; }
        };
        linha.append(ok, nao);
        c.append(linha);
      } else {
        c.append(el('span', 'tp-rotulo', tr('Convite enviado')), el('strong', '', comTr('Esperando {nick} na sala {sala}', { nick: inv.nick, sala })));
      }
      if (inv.expires_at) c.append(el('small', 'tp-num', comTr('vence às {hora}', { hora: hora(inv.expires_at) })));
      fio.append(c);
    }
    conversa.append(fio);
  }

  async function lerConversa(f) {
    const r = await socialApi(`/api/social?action=conversation&target=${encodeURIComponent(f.id)}`);
    if (S.alvo?.id !== f.id) return;
    S.conversa = r;
    const ler = (r.messages || []).filter((m) => m.recipient_id === S.auth?.profile?.id && !m.read_at).map((m) => m.id);
    if (!ler.length) return;
    socialApi('/api/social', { action: 'message_read', target: f.id, ids: ler }).then(() => {
      const c = (S.inbox?.conversations || []).find((x) => x.target_id === f.id);
      if (c && S.inbox) { S.inbox.unread_count = Math.max(0, (S.inbox.unread_count | 0) - (c.unread_count | 0)); c.unread_count = 0; }
      if (S.alvo?.id === f.id && aberta()) desenhar();
    }).catch(() => {});
  }
  async function abrirConversa(f) {
    S.alvo = f; S.conversa = null; S.rascunho = '';
    desenhar();
    try { await lerConversa(f); } catch { S.conversa = { messages: [] }; }
    if (S.alvo?.id !== f.id) return;
    desenhar();
    document.getElementById('tp-resenha-texto')?.focus({ preventScroll: true });
  }
}

function ligarConvidar() {
  const m = document.getElementById('mp-modal');
  const card = m?.querySelector('.mp-modal-card');
  if (!card || card.classList.contains('tp-convidar')) return;
  const $ = (id) => document.getElementById(id);
  const [titulo, codigo, lote, copiarCodigo, copiarLink, compartilhar, zap, entrarSala] =
    ['mp-modal-title', 'mp-modal-convite', 'mp-modal-lot', 'mp-modal-copiar-codigo', 'mp-modal-copiar-link', 'mp-modal-compartilhar', 'mp-modal-zap', 'mp-modal-entrar'].map($);
  const nota = card.querySelector('.mp-modal-nota');
  if (!titulo || !codigo || !lote || !copiarLink || !zap || !entrarSala) return;
  card.classList.add('tp-convidar');
  m.setAttribute('aria-labelledby', 'tp-convidar-titulo mp-modal-title');

  const topo = el('header', 'tp-convidar__topo');
  const cabeca = el('div', 'tp-convidar__cabeca');
  const grande = el('div', 'tp-disp tp-convidar__titulo'); grande.id = 'tp-convidar-titulo';
  grande.append(el('span', 'tp-ital', tr('Chama a turma')));
  titulo.className = 'tp-convidar__rotulo';
  cabeca.append(titulo, grande);
  const fechar = escX('tp-convidar__fechar'); fechar.id = 'tp-convidar-fechar';
  fechar.setAttribute('aria-label', tr('Fechar o aviso; a sala continua criada'));
  fechar.onclick = () => dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  topo.append(cabeca, fechar);

  const party = el('div', 'tp-convidar__party');
  const vagas = el('ol', 'tp-convidar__vagas'); vagas.setAttribute('aria-label', tr('Party'));
  const voce = el('li', 'tp-convidar__vaga'); voce.dataset.real = '';
  const foto = el('img'); foto.alt = ''; foto.decoding = 'async';
  voce.append(foto, el('span', '', tr('Você')));
  vagas.append(voce);
  const sala = el('div', 'tp-convidar__sala');
  lote.className = 'tp-convidar__lote tp-num';
  sala.append(lote, el('p', '', tr('Convide pelo link. Quem abrir entra direto na sua sala.')));
  if (nota) { nota.className = 'tp-convidar__nota'; sala.append(nota); }
  party.append(vagas, sala);

  const esq = el('div', 'tp-convidar__col');
  const linkCaixa = el('div', 'tp-convidar__link tp-num');
  const linkBase = el('span', 'tp-convidar__link-base'), linkCod = el('b');
  linkCaixa.append(linkBase, linkCod);
  copiarLink.className = 'tp-convidar__copiar';
  copiarLink.textContent = tr('COPIAR LINK');
  const linhaLink = el('div', 'tp-convidar__linha-link');
  linhaLink.append(linkCaixa, copiarLink);
  zap.className = 'tp-convidar__share'; zap.dataset.rede = 'zap';
  zap.replaceChildren(icone('zap'), el('span', '', tr('WHATSAPP')));
  const discord = botao('tp-convidar__share'); discord.id = 'tp-convidar-discord'; discord.dataset.rede = 'discord';
  discord.append(icone('discord'), el('span', '', tr('DISCORD')));
  const telegram = el('a', 'tp-convidar__share'); telegram.id = 'tp-convidar-telegram'; telegram.dataset.rede = 'telegram';
  telegram.target = '_blank'; telegram.rel = 'noopener';
  telegram.append(icone('telegram'), el('span', '', tr('TELEGRAM')));
  const redes = el('div', 'tp-convidar__redes');
  redes.append(zap, discord, telegram);
  if (compartilhar) { compartilhar.className = 'tp-convidar__share'; compartilhar.dataset.rede = 'mais'; compartilhar.textContent = tr('COMPARTILHAR'); redes.append(compartilhar); }
  const celular = el('div', 'tp-convidar__celular');
  const qrLugar = el('div', 'tp-convidar__qr');
  const celTxt = el('div', 'tp-convidar__celular-txt');
  codigo.className = 'tp-convidar__codigo tp-num';
  const linhaCod = el('span', 'tp-convidar__linha-cod');
  linhaCod.append(el('span', '', tr('ou código')), codigo);
  if (copiarCodigo) { copiarCodigo.className = 'tp-convidar__mini'; copiarCodigo.textContent = tr('COPIAR CÓDIGO'); linhaCod.append(copiarCodigo); }
  celTxt.append(el('strong', '', tr('Amigo no celular?')), el('p', '', tr('Aponta a câmera: abre direto na sua sala, sem instalar nada.')), linhaCod);
  celular.append(qrLugar, celTxt);
  esq.append(el('span', 'tp-rotulo', tr('Link de convite')), linhaLink, redes, celular);

  const dir = el('div', 'tp-convidar__col tp-convidar__col--amigos');
  const rotAmigos = el('span', 'tp-rotulo');
  const listaAmigos = el('div', 'tp-convidar__amigos');
  const recebeu = el('form', 'tp-convidar__recebeu');
  const campo = el('input'); campo.id = 'tp-convidar-codigo'; campo.placeholder = 'BR-XXXX'; campo.maxLength = 12; campo.autocomplete = 'off';
  campo.setAttribute('aria-label', tr('Código da sala'));
  const ir = botao('tp-convidar__mini', tr('ENTRAR')); ir.type = 'submit'; ir.id = 'tp-convidar-ir';
  recebeu.append(el('strong', '', tr('Recebeu um código?')), campo, ir);
  recebeu.onsubmit = (e) => {
    e.preventDefault();
    const txt = campo.value.trim().toUpperCase();
    if (!txt) { campo.focus(); return; }
    fechar.click();
    window.__mpConvite?.(txt);
  };
  dir.append(rotAmigos, listaAmigos, recebeu);

  const grade = el('div', 'tp-convidar__grade');
  grade.append(esq, dir);
  entrarSala.className = 'tp-convidar__entrar';
  entrarSala.textContent = tr('ENTRAR NA SALA ▸');
  const pe = el('footer', 'tp-convidar__pe');
  pe.append(entrarSala);
  card.replaceChildren(topo, party, grade, pe);

  function amigosOnline() {
    listaAmigos.replaceChildren();
    const on = amigos().filter((f) => f.profile?.presence?.online);
    rotAmigos.textContent = S.auth?.profile ? comTr('Amigos online · {n}', { n: on.length }) : tr('Amigos online');
    const vazio = (t) => { const p = el('p', 'tp-convidar__vazio', t); p.setAttribute('data-vazio-estado', ''); listaAmigos.append(p); };
    if (S.auth === undefined) return vazio(tr('Carregando a turma…'));
    if (!S.auth?.profile) return vazio(tr('Entre na conta para chamar a turma daqui. O link funciona pra qualquer um.'));
    if (!on.length) return vazio(tr('Ninguém da turma online agora. Manda o link no zap.'));
    for (const f of on) {
      const p = presenca(f.profile.presence);
      const linha = el('div', 'tp-convidar__amigo'); linha.dataset.amigo = f.id;
      const txt = el('span', 'tp-convidar__amigo-txt');
      txt.append(el('b', '', f.nick), el('small', '', p.texto));
      linha.append(rosto(f.nick, f.profile?.avatar_url, 'tp-rosto--p'), txt);
      if (S.convidados.has(f.id)) linha.append(el('span', 'tp-convidar__enviado', tr('ENVIADO')));
      else if (p.estado === 'on') {
        const b = botao('tp-convidar__chamar', tr('CHAMAR'));
        const aviso = el('small', 'tp-convidar__aviso'); aviso.setAttribute('role', 'status');
        b.onclick = async () => {
          b.disabled = true;
          try { await socialApi('/api/social', { action: 'invite', target: f.id }); S.convidados.add(f.id); amigosOnline(); }
          catch (e) { aviso.textContent = erroTexto(e); b.disabled = false; }
        };
        txt.append(aviso);
        linha.append(b);
      }
      listaAmigos.append(linha);
    }
  }
  avisos.add(() => { if (!m.classList.contains('hidden')) carregar().then(amigosOnline); });

  /* main.js escreve "1/10 na sala · NOME" sem tradução; aqui o número e o nome são reaproveitados. */
  const LOTE = /^(\d+)\/(\d+) na sala · (.*)$/;
  function preencher() {
    const conv = codigo.textContent.trim();
    const l = lote.textContent.match(LOTE);
    if (l) lote.textContent = comTr('{n}/{max} na sala · {nome}', { n: l[1], max: l[2], nome: l[3] });
    const link = linkDeConvite(conv);
    linkBase.textContent = `${new URL(link).host}/sala/`;
    linkCod.textContent = conv;
    linkCaixa.title = link;
    const publico = linkDeConvite(conv, origemPublica());
    const chamada = tr('Bora uma treta no CORO SOLTO? Entra na minha sala.');
    telegram.href = `https://t.me/share/url?url=${encodeURIComponent(publico)}&text=${encodeURIComponent(chamada)}`;
    discord.onclick = async () => {
      try { await navigator.clipboard.writeText(`${chamada} ${publico}`); rotulaPor(discord, tr('COPIADO: COLE NO DISCORD')); }
      catch { rotulaPor(discord, tr('NÃO DEU PRA COPIAR')); }
    };
    const svg = qrSvg(publico, comTr('QR code do convite da sala {sala}', { sala: conv }));
    qrLugar.replaceChildren(...(svg ? [svg] : []));
    celular.classList.toggle('tp-convidar__celular--sem-qr', !svg);
    let id = '';
    try { id = localStorage.getItem('csbr-home-character') || ''; } catch { /* sem storage, vale o brasão */ }
    const brasao = $('hub-character-crest')?.src || '';
    foto.onerror = () => { foto.onerror = null; if (brasao) foto.src = brasao; };
    foto.src = /^[a-z0-9_-]+$/.test(id) ? `/img/chars-hero/${id}.webp` : brasao;
    amigosOnline();
    if (S.auth === undefined || (S.auth?.profile && !S.social)) carregar().then(amigosOnline);
  }
  new MutationObserver(() => { if (!m.classList.contains('hidden')) preencher(); }).observe(m, { attributes: true, attributeFilter: ['class'] });
  if (!m.classList.contains('hidden')) preencher();
}
