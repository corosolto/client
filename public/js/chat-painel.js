/* CHAT DE SALA, a view (docs/chat-de-sala.md §8 e §10). Só textContent, rótulo e texto em
   <bdi dir="auto"> separados; o _feed do game.js não é modelo. Régua: eval:chat (CC5, CC6). */
import { ChatEstado, contarChars, rotuloDe, validarEnvio, CHAT_LIMITES } from './chat.js';

export function montarLinha(msg, { rotulo = '', propria = false, marcaTime = '' } = {}) {
  const li = document.createElement('li');
  li.className = `chat-linha${propria ? ' propria' : ''}${msg.hist ? ' hist' : ''}${msg.ch === 'time' ? ' time' : ''}`;
  li.dataset.id = String(msg.id);
  li.dataset.h = String(msg.h ?? '');
  li.tabIndex = -1;
  const quem = document.createElement('bdi');
  quem.className = 'chat-quem';
  quem.setAttribute('dir', 'auto');
  quem.textContent = rotulo;
  const txt = document.createElement('bdi');
  txt.className = 'chat-txt';
  txt.setAttribute('dir', 'auto');
  txt.textContent = String(msg.txt ?? '');
  if (marcaTime) {
    const tag = document.createElement('span');
    tag.className = 'chat-tag';
    tag.textContent = marcaTime;
    li.appendChild(tag);
  }
  li.appendChild(quem);
  li.appendChild(txt);
  return li;
}

// o mesmo tempo de vida de uma linha do killfeed (game.js, _feed: 4600 ms)
const AVISO_MS = 4600;
const PENDENTES_MAX = 8;
const FOCAVEIS = 'button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])';

const visivel = (el) => !!el && typeof el.getClientRects === 'function' && el.getClientRects().length > 0;
const esvaziar = (el) => { while (el.firstChild) el.removeChild(el.firstChild); };
// mesma regra do game.js: devolver o foco a um alvo destes faria entradaPropria() engolir W/A/S/D
const entradaPropria = (t) => !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable === true
  || !!(typeof t.closest === 'function' && t.closest('[data-entrada-propria]')));

export function montarChatSala({ net, obterJogo = () => null, tr = (s) => s, frase = (id) => id, convite = '', toque = false, storage } = {}) {
  const $ = (id) => document.getElementById(id);
  const sec = $('chat-sala');
  if (!sec || !net) return controladorInerte();
  const el = {
    log: $('chat-log'), form: $('chat-form'), entrada: $('chat-entrada'), contador: $('chat-contador'),
    canal: $('chat-canal'), ocultar: $('chat-ocultar'), naoLidas: $('chat-nao-lidas'), bloqueados: $('chat-bloqueados'),
    acoes: $('chat-acoes'), acoesQuem: $('chat-acoes-quem'), bloquear: $('chat-bloquear'), denunciar: $('chat-denunciar'),
    acoesCancelar: $('chat-acoes-cancelar'), motivos: $('chat-motivos'), motivosLista: $('chat-motivos-lista'),
    motivosCancelar: $('chat-motivos-cancelar'), lista: $('chat-lista-bloqueados'), listaUl: $('chat-lista-bloqueados-ul'),
    listaFechar: $('chat-lista-fechar'), aviso: $('chat-aviso'), bloquearTambem: $('chat-bloquear-tambem'),
    toque: $('chat-toque'), atalho: $('hud-atalho-chat'), botaoSala: $('hud-chat-sala'), botaoTime: $('hud-chat-time'), fechar: $('chat-fechar'),
  };
  let st = storage;
  if (st === undefined) { try { st = window.sessionStorage; } catch { st = null; } }
  const estado = new ChatEstado({ convite, meta: net.meta, storage: st });
  let aberto = false, oculto = false, naoLidas = 0, canal = 'sala', focoAntes = null, linhaAcoes = null, ultimaDenuncia = null, avisoT = null;
  const pendentes = new Map();
  // quando cada linha foi desenhada pela primeira vez: o redesenho retoma o fade de onde estava
  const vistas = new Map();
  const agora = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
  const jogo = () => { try { return obterJogo(); } catch { return null; } };
  const espectador = () => !!(net.espectador || net.yourEnt == null);
  const eu = () => estado.eu?.h || '';

  /* ---------- log ---------- */
  const linhas = () => [...el.log.querySelectorAll('.chat-linha')];
  function desenhar(msg, { noInicio = false, antesDe = null } = {}) {
    const li = montarLinha(msg, {
      rotulo: rotuloDe(msg, frase('chatAnonimo')),
      propria: !!eu() && msg.h === eu(),
      marcaTime: msg.ch === 'time' ? frase('chatCanal', 'time') : '',
    });
    li.setAttribute('aria-label', `${rotuloDe(msg, frase('chatAnonimo'))}: ${msg.txt}`);
    retomarIdade(li, String(msg.id));
    if (antesDe) el.log.insertBefore(li, antesDe);
    else if (noInicio) el.log.insertBefore(li, el.log.firstChild);
    else el.log.appendChild(li);
    return li;
  }
  function retomarIdade(li, chave) {
    if (!vistas.has(chave)) vistas.set(chave, agora());
    const idade = agora() - vistas.get(chave);
    if (idade > 0) li.style.animationDelay = `-${Math.round(idade)}ms`;
  }
  function podar() {
    const todas = linhas();
    for (let i = 0; i < todas.length - CHAT_LIMITES.logClienteMaxLinhas; i++) { vistas.delete(todas[i].dataset.id); todas[i].remove(); }
  }
  function divisor() {
    let d = el.log.querySelector('.chat-divisor');
    if (d) return d;
    d = document.createElement('li');
    d.className = 'chat-divisor';
    d.setAttribute('role', 'separator');
    d.textContent = tr('Mensagens anteriores');
    retomarIdade(d, 'divisor');
    el.log.insertBefore(d, el.log.firstChild);
    return d;
  }
  function rolar() {
    if (typeof el.log.scrollTo === 'function') el.log.scrollTo({ top: el.log.scrollHeight });
    else el.log.scrollTop = el.log.scrollHeight;
  }
  /* Troca de partida e bloqueio reconstroem o log: nada aqui é novidade para o leitor de tela
     (aria-live off até o próximo tique) e cada linha volta com a idade que já tinha. */
  function redesenhar() {
    el.log.setAttribute('aria-live', 'off');
    const ids = new Set(estado.linhas.map((l) => String(l.id)));
    for (const chave of [...vistas.keys()]) if (chave !== 'divisor' && !ids.has(chave)) vistas.delete(chave);
    esvaziar(el.log);
    const visiveis = estado.linhasVisiveis();
    const hist = visiveis.filter((l) => l.hist), vivas = visiveis.filter((l) => !l.hist);
    if (hist.length) { divisor(); for (const m of hist) desenhar(m); }
    for (const m of vivas) desenhar(m);
    rolar();
    setTimeout(() => el.log.setAttribute('aria-live', oculto ? 'off' : 'polite'), 0);
  }
  function receberHist(list) {
    el.log.setAttribute('aria-busy', 'true');
    const novas = [];
    for (const m of list) if (estado.receber(m, true) && !estado.estaBloqueado(m.h)) novas.push({ ...m, hist: true });
    if (novas.length) {
      const primeiraViva = el.log.querySelector('.chat-linha:not(.hist)');
      divisor();
      for (const m of novas) desenhar(m, { antesDe: primeiraViva });
    }
    el.log.setAttribute('aria-busy', 'false');
    podar();
    rolar();
  }
  function receber(m) {
    if (!m || typeof m.type !== 'string') return;
    if (m.type === 'chat') {
      if (m.cid && pendentes.has(m.cid)) pendentes.delete(m.cid);
      if (!estado.receber(m) || estado.estaBloqueado(m.h)) return;
      desenhar(m);
      podar();
      if (oculto) { naoLidas += 1; atualizarNaoLidas(); }
      rolar();
    } else if (m.type === 'chat_hist') {
      receberHist(Array.isArray(m.list) ? m.list : []);
    } else if (m.type === 'chat_nack') {
      const p = pendentes.get(m.cid);
      pendentes.delete(m.cid);
      if (p && !el.entrada.value) { el.entrada.value = p.txt; atualizarContador(); }
      aviso(frase('chatNack', m.motivo, m.espera));
    } else if (m.type === 'chat_denuncia') {
      aviso(frase('chatDenuncia', m.estado, m.motivo));
      if (m.estado === 'recebida' && ultimaDenuncia && ultimaDenuncia.id === m.id) oferecerBloqueio(ultimaDenuncia.h);
    }
  }

  /* ---------- avisos, contador, canal ---------- */
  function aviso(txt) {
    el.aviso.textContent = txt || '';
    clearTimeout(avisoT);
    /* O botão "Bloquear também?" é ação, não aviso: não morre com o timer (a corrida do
       CI lento: visível no assert, hidden no clique). Some no clique, ao fechar ou destruir. */
    if (txt) avisoT = setTimeout(() => { el.aviso.textContent = ''; }, AVISO_MS);
  }
  function oferecerBloqueio(h) {
    if (!h || h === eu() || estado.estaBloqueado(h)) return;
    el.bloquearTambem.hidden = false;
    el.bloquearTambem.onclick = () => {
      el.bloquearTambem.hidden = true;
      if (estado.bloquear(h)) { redesenhar(); aviso(frase('chatBloqueado', h)); }
    };
  }
  function atualizarContador() {
    const n = contarChars(el.entrada.value || '');
    el.contador.textContent = frase('chatContador', n, CHAT_LIMITES.maxChars);
    el.contador.classList.toggle('estourou', n > CHAT_LIMITES.maxChars);
  }
  function atualizarNaoLidas() {
    el.naoLidas.hidden = !(oculto && naoLidas > 0);
    el.naoLidas.textContent = frase('chatNaoLidas', naoLidas);
  }
  function atualizarCanal() {
    const canais = estado.canaisPara(espectador());
    if (!canais.includes(canal)) canal = canais[0] || 'sala';
    el.canal.textContent = frase('chatCanal', canal);
    el.canal.disabled = canais.length < 2;
    el.canal.setAttribute('aria-label', `${tr('Canal')}: ${frase('chatCanal', canal)}`);
    sec.classList.toggle('canal-time', canal === 'time');
  }
  function sincronizarVisibilidade() {
    const ativo = estado.ativo();
    sec.hidden = !ativo;
    if (el.toque) el.toque.hidden = !(ativo && toque);
    if (el.atalho) el.atalho.hidden = !ativo;
  }

  /* ---------- abrir, fechar, foco ---------- */
  function abrir(ch) {
    if (!estado.ativo()) return false;
    const canais = estado.canaisPara(espectador());
    if (canais.includes(ch)) canal = ch;
    else if (ch === 'time') aviso(frase('chatNack', 'sem_time'));
    atualizarCanal();
    if (!aberto) {
      aberto = true;
      focoAntes = document.activeElement;
      sec.classList.add('aberto');
      jogo()?.travarEntrada?.(true);
      ajustarViewport();
    }
    atualizarContador();
    el.entrada.focus();
    rolar();
    return true;
  }
  function fechar({ semJogo = false } = {}) {
    if (!aberto) return;
    aberto = false;
    sec.classList.remove('aberto');
    fecharAcoes({ semFoco: true });
    el.bloquearTambem.hidden = true;
    sec.style.removeProperty('top');
    sec.style.removeProperty('--chat-vv');
    if (!semJogo) jogo()?.travarEntrada?.(false);
    devolverFoco();
  }
  function devolverFoco() {
    const f = focoAntes;
    focoAntes = null;
    const ativo = document.activeElement;
    if (f && f !== document.body && f.isConnected && !sec.contains(f) && !entradaPropria(f) && typeof f.focus === 'function') f.focus();
    // foco preso numa linha do painel fechado, ou no #chat-toque, faz entradaPropria() engolir toda tecla do jogo
    else if (ativo && (sec.contains(ativo) || entradaPropria(ativo)) && typeof ativo.blur === 'function') ativo.blur();
    else if (typeof el.entrada.blur === 'function') el.entrada.blur();
  }
  function prender(e) {
    const foc = [...sec.querySelectorAll(FOCAVEIS)].filter(visivel);
    if (!foc.length) return;
    const primeiro = foc[0], ultimo = foc[foc.length - 1], ativo = document.activeElement;
    if (!sec.contains(ativo)) { e.preventDefault(); primeiro.focus(); return; }
    if (e.shiftKey && ativo === primeiro) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && ativo === ultimo) { e.preventDefault(); primeiro.focus(); }
  }
  function navegar(atual, dir) {
    const todas = linhas();
    if (!todas.length) return;
    let i = atual ? todas.indexOf(atual) + dir : (dir < 0 ? todas.length - 1 : 0);
    if (i >= todas.length) { el.entrada.focus(); return; }
    if (i < 0) i = 0;
    for (const l of todas) l.tabIndex = -1;
    todas[i].tabIndex = 0;
    todas[i].focus();
  }

  /* ---------- ações por linha ---------- */
  function abrirAcoes(li) {
    if (!li) return;
    if (li.classList.contains('propria')) { aviso(frase('chatPropria')); return; }
    linhaAcoes = li;
    el.acoesQuem.textContent = li.querySelector('.chat-quem')?.textContent || '';
    el.motivos.hidden = true;
    el.acoes.hidden = false;
    el.bloquear.focus();
  }
  function fecharAcoes({ semFoco = false } = {}) {
    const li = linhaAcoes;
    linhaAcoes = null;
    el.acoes.hidden = true;
    el.motivos.hidden = true;
    if (semFoco) return;
    if (li && li.isConnected) li.focus(); else el.entrada.focus();
  }
  function montarMotivos() {
    esvaziar(el.motivosLista);
    for (const m of estado.motivosDenuncia()) {
      const label = document.createElement('label');
      label.className = 'chat-motivo';
      const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = 'chat-motivo'; radio.value = m;
      const nome = document.createElement('span');
      nome.textContent = frase('chatMotivo', m);
      label.appendChild(radio);
      label.appendChild(nome);
      el.motivosLista.appendChild(label);
    }
  }
  function denunciar() {
    const motivo = el.motivos.querySelector('input[name="chat-motivo"]:checked')?.value;
    if (!motivo || !linhaAcoes) return;
    const id = Number(linhaAcoes.dataset.id), h = linhaAcoes.dataset.h;
    ultimaDenuncia = { id, h };
    aviso(net.denunciarChat(id, motivo) ? frase('chatDenunciaEnviada') : frase('chatIndisponivel'));
    fecharAcoes();
  }
  function montarListaBloqueados() {
    esvaziar(el.listaUl);
    for (const h of estado.bloqueados()) {
      const li = document.createElement('li');
      const quem = document.createElement('bdi');
      quem.setAttribute('dir', 'auto');
      quem.textContent = `#${h}`;
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = tr('DESBLOQUEAR');
      b.onclick = () => { if (estado.desbloquear(h)) { redesenhar(); montarListaBloqueados(); } };
      li.appendChild(quem);
      li.appendChild(b);
      el.listaUl.appendChild(li);
    }
    if (!estado.bloqueados().length) {
      const li = document.createElement('li');
      li.textContent = tr('Ninguém bloqueado');
      el.listaUl.appendChild(li);
    }
  }

  /* ---------- envio ---------- */
  function enviar() {
    const v = validarEnvio(canal, el.entrada.value, estado.canaisPara(espectador()));
    if (!v.ok) { aviso(frase('chatNack', v.motivo)); return; }
    const cid = estado.proximoCid();
    if (!net.enviarChat(canal, v.txt, cid)) { aviso(frase('chatIndisponivel')); return; }
    pendentes.set(cid, { txt: v.txt, ch: canal });
    if (pendentes.size > PENDENTES_MAX) pendentes.delete(pendentes.keys().next().value);
    el.entrada.value = '';
    atualizarContador();
    aviso('');
    fechar();
  }

  /* ---------- viewport de toque: o compositor sobe para o topo e some sob o teclado ---------- */
  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  function ajustarViewport() {
    if (!aberto || !toque || !vv) return;
    sec.style.top = `${Math.round(vv.offsetTop) + 8}px`;
    sec.style.setProperty('--chat-vv', `${Math.round(vv.height)}px`);
  }

  /* ---------- eventos ---------- */
  /* Em tela cheia sem Keyboard Lock (o toque não prende as teclas) o Chromium engole o keydown
     do primeiro Esc e só entrega o keyup: o keyup órfão fecha; o que veio com keydown (IME) não. */
  let escDesceu = false;
  const onKey = (e) => {
    if (e.key === 'Escape' && e.type === 'keydown') escDesceu = true;
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      if (!el.acoes.hidden || !el.motivos.hidden) fecharAcoes();
      else if (!el.lista.hidden) { el.lista.hidden = true; el.entrada.focus(); }
      else fechar();
      return;
    }
    if (e.key === 'Tab') { prender(e); return; }
    if (e.key === 'Enter' && e.target === el.entrada) { e.preventDefault(); enviar(); return; }
    const li = e.target && typeof e.target.closest === 'function' ? e.target.closest('.chat-linha') : null;
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && (li || e.target === el.entrada)) {
      e.preventDefault();
      navegar(li, e.key === 'ArrowUp' ? -1 : 1);
      return;
    }
    if (li && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); abrirAcoes(li); }
  };
  // no documento: o keyup do Esc que fechou cai fora da seção, porque o foco já voltou ao jogo
  const onDocKeyUp = (e) => {
    if (e.key !== 'Escape') return;
    const viu = escDesceu;
    escDesceu = false;
    if (!viu && aberto && sec.contains(e.target)) onKey(e);
  };
  const onLogClick = (e) => {
    if (!aberto) return;
    const li = e.target && typeof e.target.closest === 'function' ? e.target.closest('.chat-linha') : null;
    if (li) abrirAcoes(li);
  };
  const onSubmit = (e) => { e.preventDefault(); enviar(); };
  const onMotivos = (e) => { e.preventDefault(); denunciar(); };
  // pointerdown e não mousedown: o Safari do iOS não sintetiza mousedown para um toque no canvas
  const onDocPointerDown = (e) => {
    if (!aberto) return;
    const t = e.target;
    if (sec.contains(t) || (el.toque && (t === el.toque || el.toque.contains(t)))
      || (el.atalho && (t === el.atalho || el.atalho.contains(t)))) return;
    fechar();
  };
  // os botões da HUD (Y SALA/U TIME) abrem o compositor no canal do rótulo, como as teclas
  const onBotaoSala = () => abrir('sala');
  const onBotaoTime = () => abrir('time');
  const onToque = () => { if (aberto) fechar(); else abrir('sala'); };
  const onFechar = () => fechar();
  const onOcultar = () => {
    oculto = !oculto;
    el.ocultar.setAttribute('aria-pressed', String(oculto));
    el.log.setAttribute('aria-hidden', String(oculto));
    el.log.setAttribute('aria-live', oculto ? 'off' : 'polite');
    sec.classList.toggle('oculto', oculto);
    if (!oculto) { naoLidas = 0; rolar(); }
    atualizarNaoLidas();
  };
  const onBloqueados = () => {
    el.lista.hidden = !el.lista.hidden;
    if (!el.lista.hidden) { montarListaBloqueados(); el.listaFechar.focus(); }
  };
  const onBloquear = () => {
    const h = linhaAcoes?.dataset.h;
    if (h && estado.bloquear(h)) { fecharAcoes({ semFoco: true }); redesenhar(); aviso(frase('chatBloqueado', h)); el.entrada.focus(); }
    else { aviso(frase('chatBloqueioFalhou')); fecharAcoes(); }
  };
  const onDenunciar = () => {
    montarMotivos();
    el.acoes.hidden = true;
    el.motivos.hidden = false;
    el.motivos.querySelector('input')?.focus();
  };
  const onCanal = () => {
    const canais = estado.canaisPara(espectador());
    const i = canais.indexOf(canal);
    canal = canais[(i + 1) % canais.length] || 'sala';
    atualizarCanal();
    el.entrada.focus();
  };

  sec.addEventListener('keydown', onKey);
  el.log.addEventListener('click', onLogClick);
  el.form.addEventListener('submit', onSubmit);
  el.motivos.addEventListener('submit', onMotivos);
  el.entrada.addEventListener('input', atualizarContador);
  el.ocultar.addEventListener('click', onOcultar);
  el.bloqueados.addEventListener('click', onBloqueados);
  el.listaFechar.addEventListener('click', () => { el.lista.hidden = true; el.entrada.focus(); });
  el.bloquear.addEventListener('click', onBloquear);
  el.denunciar.addEventListener('click', onDenunciar);
  el.acoesCancelar.addEventListener('click', () => fecharAcoes());
  el.motivosCancelar.addEventListener('click', () => fecharAcoes());
  el.canal.addEventListener('click', onCanal);
  if (el.toque) el.toque.addEventListener('click', onToque);
  if (el.fechar) el.fechar.addEventListener('click', onFechar);
  if (el.botaoSala) el.botaoSala.addEventListener('click', onBotaoSala);
  if (el.botaoTime) el.botaoTime.addEventListener('click', onBotaoTime);
  document.addEventListener('pointerdown', onDocPointerDown);
  document.addEventListener('keyup', onDocKeyUp);
  if (vv) { vv.addEventListener('resize', ajustarViewport); vv.addEventListener('scroll', ajustarViewport); }

  net.onChat = receber;
  for (const m of net.drenarChat ? net.drenarChat() : []) receber(m);
  sincronizarVisibilidade();
  atualizarCanal();
  atualizarContador();
  atualizarNaoLidas();

  function destruir() {
    if (net.onChat === receber) net.onChat = null;
    fechar();
    estado.limpar();
    estado.aoMudarMeta(null);
    pendentes.clear();
    esvaziar(el.log);
    vistas.clear();
    el.entrada.value = '';
    aviso('');
    oculto = false; naoLidas = 0; ultimaDenuncia = null;
    sec.classList.remove('oculto', 'canal-time');
    el.log.setAttribute('aria-hidden', 'false');
    el.log.setAttribute('aria-live', 'polite');
    el.ocultar.setAttribute('aria-pressed', 'false');
    el.lista.hidden = true;
    el.bloquearTambem.hidden = true;
    sec.hidden = true;
    if (el.toque) el.toque.hidden = true;
    if (el.atalho) el.atalho.hidden = true;
    sec.removeEventListener('keydown', onKey);
    el.log.removeEventListener('click', onLogClick);
    el.form.removeEventListener('submit', onSubmit);
    el.motivos.removeEventListener('submit', onMotivos);
    el.entrada.removeEventListener('input', atualizarContador);
    el.ocultar.removeEventListener('click', onOcultar);
    el.bloqueados.removeEventListener('click', onBloqueados);
    el.bloquear.removeEventListener('click', onBloquear);
    el.denunciar.removeEventListener('click', onDenunciar);
    el.canal.removeEventListener('click', onCanal);
    if (el.toque) el.toque.removeEventListener('click', onToque);
    if (el.botaoSala) el.botaoSala.removeEventListener('click', onBotaoSala);
    if (el.botaoTime) el.botaoTime.removeEventListener('click', onBotaoTime);
    if (el.fechar) el.fechar.removeEventListener('click', onFechar);
    document.removeEventListener('pointerdown', onDocPointerDown);
    document.removeEventListener('keyup', onDocKeyUp);
    if (vv) { vv.removeEventListener('resize', ajustarViewport); vv.removeEventListener('scroll', ajustarViewport); }
  }

  return {
    estado,
    aberto: () => aberto,
    canal: () => canal,
    abrir,
    fechar: () => fechar(),
    aoMudarSlot() { atualizarCanal(); },
    aoMudarMeta(meta) {
      estado.aoMudarMeta(meta);
      sincronizarVisibilidade();
      if (!estado.ativo()) fechar();
      atualizarCanal();
      redesenhar();
    },
    aoTrocarJogo(novo) {
      if (novo) novo.onAbrirChat = (ch) => abrir(ch);
      fechar({ semJogo: true });
    },
    destruir,
  };
}

function controladorInerte() {
  const nada = () => {};
  return { estado: null, aberto: () => false, canal: () => 'sala', abrir: () => false, fechar: nada, aoMudarSlot: nada, aoMudarMeta: nada, aoTrocarJogo: nada, destruir: nada };
}
