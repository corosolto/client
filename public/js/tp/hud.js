/* Treta Pop · 05 HUD, 13 HUD com chat, placar (Tab), 21 HUD por toque. Carregado por tp/ligar.js só com ?ui=v3. */
import { tr, frase } from '../i18n.js';

const DICAS_S = 15;
const PING_MS = 4000;
const RETRATOS = 5;
const ID_SEGURO = /^[\w-]+$/;
const PLAYER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SVG_HS = '<svg class="tp-hs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" role="img" aria-label="Headshot">'
  + '<circle cx="12" cy="12" r="8"/><path d="M12 2v6M12 16v6M2 12h6M16 12h6"/></svg>';

const SVG_BOT = '<svg class="tp-bot" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" role="img" aria-label="Bot">'
  + '<rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01"/></svg>';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const VAZIO = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
function arte(img, fontes) {
  const token = String((Number(img.dataset.arteToken) || 0) + 1);
  img.dataset.arteToken = token;
  img.onerror = null;
  img.removeAttribute('src');
  img.src = VAZIO;
  let i = 0;
  const proxima = () => {
    if (img.dataset.arteToken !== token) return;
    const fonte = fontes[i++];
    if (!fonte) { img.onerror = null; img.src = VAZIO; return; }
    img.onerror = proxima;
    img.src = fonte;
  };
  proxima();
}
const artePersonagem = (img, id) => arte(img, id
  ? [`/img/chars-hero/${id}.webp`, `/img/chars/${id}.webp`, `/img/chars/avatars/${id}.webp`]
  : []);
const avatarCache = new Map();
const comoDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error || new Error('avatar inválido'));
  reader.readAsDataURL(blob);
});
function avatarUrl(pid) {
  if (!PLAYER_ID.test(pid || '')) return Promise.resolve(VAZIO);
  const acerto = avatarCache.get(pid);
  if (acerto) return acerto;
  const pendente = fetch(`/api/social-avatar?id=${encodeURIComponent(pid)}`, { credentials: 'same-origin' })
    .then((res) => {
      if (!res.ok) throw new Error(`http ${res.status}`);
      return res.blob();
    })
    .then(comoDataUrl)
    .catch(() => { avatarCache.delete(pid); return VAZIO; });
  avatarCache.set(pid, pendente);
  return pendente;
}
function arteJogador(img, pid) {
  const token = String((Number(img.dataset.arteToken) || 0) + 1);
  img.dataset.arteToken = token;
  img.onerror = null;
  img.src = VAZIO;
  avatarUrl(pid).then((src) => {
    if (img.dataset.arteToken === token) img.src = src;
  });
}
const livre = (t) => !(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable || t.closest?.('[data-entrada-propria]')));

let jogo = null;
let inicioAoVivo = null;
let altSegurado = false;
let ping = null;
let tutorial = null;
const mudos = new Set();

export function ligar() {
  if (new URLSearchParams(location.search).get('debug') === '1') document.documentElement.setAttribute('data-tp-debug', '');
  const hud = $('hud');
  if (!hud) return;
  montarHud(hud);
  observarKillfeed();
  observarPlacar();
  observarRadio();
  montarChat();
  observarToque();
  addEventListener('keydown', (e) => { if (e.code === 'KeyF' && !e.repeat && livre(e.target)) marcarPing(); });
  addEventListener('keydown', (e) => { if (e.key === 'Alt') altSegurado = true; });
  addEventListener('keyup', (e) => { if (e.key === 'Alt') altSegurado = false; });
  addEventListener('blur', () => { altSegurado = false; });
  addEventListener('mousedown', (e) => { if (e.button === 1 && livre(e.target)) { e.preventDefault(); marcarPing(); } });
  setInterval(tique, 250);
}

/* ---------- 05 · estrutura ---------- */
function montarHud(hud) {
  const radar = $('radar');
  if (radar) {
    radar.width = radar.height = 200;
    radar.dataset.fonte = "800 12px 'Barlow Semi Condensed', sans-serif";
  }
  const topo = $('hud-top');
  if (topo) {
    const fila = (lado) => { const f = el('div', 'tp-hud-retratos'); f.dataset.lado = lado; return f; };
    topo.prepend(fila('E'));
    topo.append(fila('B'));
  }
  const esq = $('hud-bottom-left');
  if (esq) {
    const seq = el('div');
    seq.className = 'tp-hud-seq';
    for (const id of ['kill-counter', 'kill-streak']) { const n = $(id); if (n) seq.append(n); }
    const vitais = el('div', 'tp-hud-vitais');
    const linha = $('hp-row'), barra = $('hp-bar');
    if (linha) { linha.append(el('span', 'tp-hud-vida-rotulo', tr('VIDA'))); vitais.append(linha); }
    if (barra) vitais.append(barra);
    esq.prepend(seq, vitais);
  }
  /* Slots acima do painel da arma, numa coluna só: um nunca invade o outro. */
  const painel = $('hud-bottom-right'), slots = $('weapon-hud');
  if (painel) {
    const coluna = el('div', 'tp-hud-arma');
    if (slots) coluna.append(slots);
    const nome = $('weapon-name');
    if (nome) {
      const linha = el('div', 'tp-hud-arma-topo');
      const recarga = el('span', 'tp-hud-recarga');
      recarga.append(document.createTextNode(' · '), el('kbd', null, 'R'), document.createTextNode(` ${tr('RECARREGAR')}`));
      painel.prepend(linha);
      linha.append(nome, recarga);
    }
    painel.after(coluna);
    coluna.append(painel);
  }
  const acoes = $('hud-actions');
  if (acoes) acoes.prepend(el('span', 'tp-hud-cam'));
  /* Teclas lidas do game.js (_input) e do ping deste módulo. */
  const dicas = el('div', 'tp-hud-dicas');
  dicas.title = tr('Guia inicial: três ações, comandos completos com ALT');
  const dica = (teclas, txt, passo = null) => {
    const s = el('span');
    if (passo != null) s.dataset.tutorial = String(passo);
    s.append(el('kbd', null, teclas));
    s.append(document.createTextNode(` ${tr(txt)}`));
    dicas.append(s);
    return s;
  };
  dica('WASD', 'Mover', 0);
  dica('MOUSE 1', 'Atirar', 1);
  dica('R', 'Recarregar', 2);
  dica('E', 'pegar');
  dica('B', 'comprar');
  dica(',/.', 'munição');

  dica('N', 'câmera');
  dica('F', 'ping');
  dica('Z/X/V', 'rádio');
  dica('Y/U', 'chat').dataset.chat = '';
  dica('M', 'time');
  dica('TAB', 'placar');
  dica('ALT', 'órbita');
  hud.append(dicas);
}

const CAMERA = { first: '1ª PESSOA', third: '3ª PESSOA', shoulder: 'OMBRO' };
function atualizarCamera(g) {
  const chip = document.querySelector('#hud-actions .tp-hud-cam');
  if (!chip) return;
  const txt = `${tr(CAMERA[g.camView] || CAMERA.first)} · N`;
  if (chip.textContent !== txt) chip.textContent = txt;
}

function atualizarAbates() {
  const n = Number($('kill-count')?.textContent) || 0;
  const rotulo = document.querySelector('#kill-counter .kc-label');
  const txt = frase('abatesRotulo', n);
  if (rotulo && rotulo.textContent !== txt) rotulo.textContent = txt;
}

/* A barra é a primeira a sair: se encostar num painel, some antes de qualquer painel encolher. */
const cruza = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
function barraApertada(dicas) {
  const r = dicas.getBoundingClientRect();
  if (!r.width) return false;
  return ['hud-bottom-left', 'hud-bottom-right', 'weapon-hud', 'pickup-hint'].some((id) => {
    const e = $(id);
    return e && e.offsetParent && cruza(r, e.getBoundingClientRect());
  });
}

function atualizarTutorial(g, barra) {
  if (!barra || g.state !== 'live') return false;
  const p = g.player;
  if (!tutorial) tutorial = {
    x: p.pos.x, z: p.pos.z, passo: 0,
    tiro: p.nextShotAt || 0, recarga: p.reloadUntil || 0,
  };
  if (tutorial.passo === 0 && Math.hypot(p.pos.x - tutorial.x, p.pos.z - tutorial.z) >= 1) tutorial.passo = 1;
  if (tutorial.passo === 1 && (p.nextShotAt || 0) > tutorial.tiro) {
    tutorial.passo = 2;
    tutorial.recarga = p.reloadUntil || 0;
  }
  if (tutorial.passo === 2 && (p.reloadUntil || 0) > tutorial.recarga) tutorial.passo = 3;
  for (const item of barra.children) {
    const passo = item.dataset.tutorial;
    item.hidden = !altSegurado && (passo == null || Number(passo) !== tutorial.passo);
  }
  return tutorial.passo >= 3;
}

function tique() {
  const g = window.__game;
  if (g !== jogo) {
    jogo = g;
    inicioAoVivo = null;
    tutorial = null;
    mudos.clear();
    apagarPing();
    for (const f of document.querySelectorAll('.tp-hud-retratos')) f.replaceChildren();
  }
  if (!g || !g.combatants) return;
  if (inicioAoVivo == null && g.state === 'live') inicioAoVivo = g.time;
  atualizarRetratos(g);
  const barra = document.querySelector('.tp-hud-dicas');
  const completo = atualizarTutorial(g, barra);
  const expirou = inicioAoVivo != null && g.time - inicioAoVivo > DICAS_S;
  const sumiu = !altSegurado && (completo || expirou);
  for (const d of document.querySelectorAll('.tp-hud-dicas,.tp-toque-mira-dica')) d.toggleAttribute('data-sumiu', sumiu);
  if (barra && !sumiu) barra.toggleAttribute('data-aperto', barraApertada(barra));
  atualizarCamera(g);
  atualizarAbates();
  const chat = document.querySelector('.tp-hud-dicas [data-chat]');
  if (chat) chat.hidden = !altSegurado || !!$('hud-atalho-chat')?.hidden;
  const arma = g.player?.weapon;
  const slot = arma === 'knife' ? 'knife' : arma && arma === g.player.primary ? 'primary' : arma ? 'secondary' : '';
  for (const b of document.querySelectorAll('#touch-ui .touch-wep')) b.toggleAttribute('data-tp-ativa', b.dataset.wep === slot);
}

function atualizarRetratos(g) {
  for (const fila of document.querySelectorAll('#hud-top .tp-hud-retratos')) {
    const lado = fila.dataset.lado;
    const time = g.combatants.filter((c) => c.team === lado).sort((a, b) => (b.isPlayer ? 1 : 0) - (a.isPlayer ? 1 : 0)).slice(0, RETRATOS);
    while (fila.children.length > time.length) fila.lastChild.remove();
    time.forEach((c, i) => {
      let img = fila.children[i];
      if (!img) { img = el('img', 'tp-hud-retrato'); img.width = 34; img.height = 34; img.decoding = 'async'; fila.append(img); }
      const pid = (c.isPlayer || c._netBot === false) && PLAYER_ID.test(c._playerId || '') ? c._playerId : '';
      const id = c.def?.id && ID_SEGURO.test(c.def.id) ? c.def.id : '';
      const identidade = pid ? `p:${pid}` : `c:${id}`;
      if (img.dataset.identidade !== identidade) {
        img.dataset.identidade = identidade;
        if (pid) arteJogador(img, pid);
        else artePersonagem(img, id);
      }
      img.toggleAttribute('data-morto', !c.alive);
      img.toggleAttribute('data-eu', !!c.isPlayer);
      const alt = `${c.isPlayer ? tr('VOCÊ') : c.name}, ${tr(c.alive ? 'vivo' : 'morto')}`;
      if (img.alt !== alt) img.alt = alt;
    });
  }
}

/* ---------- killfeed: headshot vira a mira lima do pacote ---------- */
function observarKillfeed() {
  const feed = $('killfeed');
  if (!feed) return;
  new MutationObserver((ms) => {
    for (const m of ms) for (const row of m.addedNodes) {
      if (!(row instanceof HTMLElement)) continue;
      const caveira = row.querySelector('.kf-skull');
      if (caveira) caveira.outerHTML = SVG_HS;
      for (const n of row.querySelectorAll('.kf-n')) {
        if (!n.textContent.startsWith('[BOT] ')) continue;
        n.textContent = n.textContent.slice(6);
        n.insertAdjacentHTML('afterbegin', SVG_BOT);
      }
    }
  }).observe(feed, { childList: true });
}

/* ---------- placar (Tab): avatar e HS% só onde o cliente tem o dado ---------- */
function observarPlacar() {
  const cols = $('sb-cols');
  if (!cols) return;
  new MutationObserver(() => {
    const g = window.__game;
    for (const cab of cols.querySelectorAll('.sb-chead')) {
      if (cab.querySelector('.tp-sb-hs')) continue;
      const pts = [...cab.children].find((s) => s.textContent === 'SCORE');
      pts?.after(el('span', 'tp-sb-hs', 'HS%'));
    }
    for (const th of cols.querySelectorAll('thead tr')) {
      if (th.querySelector('.tp-sb-hs')) continue;
      const pts = [...th.children].find((s) => s.textContent === 'SCORE');
      pts?.after(el('th', 'tp-sb-hs', 'HS%'));
    }
    for (const tr_ of cols.querySelectorAll('tbody tr')) {
      if (tr_.querySelector('.tp-sb-hs')) continue;
      const nome = tr_.firstElementChild;
      const id = tr_.dataset.av;
      const jogador = tr_.dataset.avKind === 'player';
      const idValido = jogador ? PLAYER_ID.test(id || '') : ID_SEGURO.test(id || '');
      if (nome && idValido) {
        const av = el('img', 'tp-sb-av');
        av.alt = ''; av.width = 28; av.height = 28; av.decoding = 'async';
        if (jogador) arteJogador(av, id);
        else artePersonagem(av, id);
        nome.prepend(av);
      }
      const hsTd = el('td', 'tp-sb-hs');
      if (tr_.classList.contains('me') && g?.player) {
        const k = g.player.kills | 0, hs = g.player.headshots | 0;
        hsTd.textContent = k ? `${Math.round((100 * hs) / k)}%` : '—';
      }
      tr_.querySelector('.sb-points')?.after(hsTd);
    }
  }).observe(cols, { childList: true });
}

/* ---------- rádio e ping no mesmo log, com etiqueta própria ---------- */
const RADIO = /^(.*) \((?:RÁDIO|RADIO)\): (.*)$/;
function linhaComEtiqueta(alvo, tipo, quem, texto) {
  alvo.replaceChildren(el('span', `tp-tag tp-tag--${tipo}`, tipo === 'ping' ? 'PING' : tr('RÁDIO')));
  if (quem) alvo.append(el('span', 'tp-quem', tipo === 'radio' ? `${quem}:` : quem));
  alvo.append(document.createTextNode(texto));
}
function espelharNoChat(tipo, quem, texto) {
  const log = $('chat-log'), sec = $('chat-sala');
  if (!log || !sec || sec.hidden) return;
  const li = el('li', 'tp-chat-radio');
  li.setAttribute('role', 'note');
  linhaComEtiqueta(li, tipo, quem, texto);
  log.append(li);
  const sobra = log.querySelectorAll('.tp-chat-radio');
  for (let i = 0; i < sobra.length - 20; i++) sobra[i].remove();
  log.scrollTop = log.scrollHeight;
}
function observarRadio() {
  const log = $('radio-log');
  if (!log) return;
  new MutationObserver((ms) => {
    for (const m of ms) for (const n of m.addedNodes) {
      if (!(n instanceof HTMLElement) || n.dataset.tp) continue;
      n.dataset.tp = '1';
      const r = RADIO.exec(n.textContent || '');
      if (!r) continue;
      linhaComEtiqueta(n, 'radio', r[1], r[2]);
      espelharNoChat('radio', r[1], r[2]);
    }
  }).observe(log, { childList: true });
}

/* ---------- ping: marca no mundo o que está na mira; local, o servidor não repassa ---------- */
function marcarPing() {
  const g = window.__game;
  if (!g || g.state !== 'live' || g.paused || g._entradaTravada || !g.player?.alive || !g.camera || !g.ray) return;
  const cam = g.camera, V = cam.position.constructor;
  const o = cam.position.clone(), d = cam.getWorldDirection(new V());
  g.ray.set(o, d); g.ray.far = 120;
  const hit = g.ray.intersectObjects(g.world?.occluders || [], false)[0];
  let lim = hit ? hit.distance : 60, alvo = null;
  for (const c of g.combatants) {
    if (!c.alive || c.isPlayer || c.team === g.playerTeam) continue;
    const px = c.pos.x - o.x, py = c.pos.y + 1.1 - o.y, pz = c.pos.z - o.z;
    const t = px * d.x + py * d.y + pz * d.z;
    if (t <= 0 || t > lim) continue;
    const lx = px - d.x * t, ly = py - d.y * t, lz = pz - d.z * t;
    if (lx * lx + ly * ly + lz * lz < 1) { lim = t; alvo = c; }
  }
  const ponto = alvo ? new V(alvo.pos.x, alvo.pos.y + 1.1, alvo.pos.z) : o.clone().addScaledVector(d, Math.min(lim, 60));
  apagarPing();
  const m = el('div', 'tp-hud-ping');
  m.dataset.tipo = alvo ? 'inimigo' : 'ponto';
  m.append(el('span', 'tp-hud-ping__fala', tr(alvo ? 'Ó O CARA ALI!' : 'OLHA AQUI')), el('i', 'tp-hud-ping__losango'), el('span', 'tp-hud-ping__dist'));
  m.setAttribute('aria-hidden', 'true');
  $('hud').append(m);
  ping = { m, ponto, ate: performance.now() + PING_MS, g };
  try { g.sfx?.uiClick?.(); } catch { /* sem contexto de áudio */ }
  const texto = tr(alvo ? 'Você marcou um inimigo' : 'Você marcou um ponto');
  const linha = el('div', 'radio-line tp-ping-linha');
  linha.dataset.tp = '1';
  linhaComEtiqueta(linha, 'ping', '', texto);
  const log = $('radio-log');
  if (log) {
    log.append(linha);
    setTimeout(() => linha.remove(), 4200);
    while (log.children.length > 3) log.firstChild.remove();
  }
  espelharNoChat('ping', '', texto);
  requestAnimationFrame(seguirPing);
}
function seguirPing() {
  if (!ping) return;
  const { m, ponto, ate, g } = ping;
  if (performance.now() > ate || window.__game !== g) { apagarPing(); return; }
  const v = ponto.clone().project(g.camera);
  m.style.visibility = v.z > 1 ? 'hidden' : '';
  m.style.transform = `translate(${((v.x * 0.5 + 0.5) * innerWidth).toFixed(1)}px,${((-v.y * 0.5 + 0.5) * innerHeight).toFixed(1)}px) translate(-50%,-50%)`;
  const dist = `${Math.round(g.player.pos.distanceTo ? g.player.pos.distanceTo(ponto) : 0)} m`;
  const alvo = m.lastChild;
  if (alvo.textContent !== dist) alvo.textContent = dist;
  requestAnimationFrame(seguirPing);
}
function apagarPing() { ping?.m.remove(); ping = null; }

/* ---------- 13 · chat da sala: abas, TAB troca o canal, silenciar no menu do nome ---------- */
function montarChat() {
  const sec = $('chat-sala'), cab = $('chat-cabecalho'), log = $('chat-log'), entrada = $('chat-entrada'), acoes = $('chat-acoes');
  if (!sec || !cab || !log || !entrada || !acoes) return;
  sec.style.setProperty('--tp-tag-sala', JSON.stringify(frase('chatCanal', 'sala')));
  const titulo = $('chat-titulo');
  if (titulo) titulo.textContent = tr('CHAT DA SALA');
  const abas = el('div', 'tp-chat-abas');
  abas.setAttribute('role', 'tablist');
  abas.setAttribute('aria-label', tr('Filtrar mensagens'));
  for (const [f, rotulo] of [['todos', tr('TODOS')], ['time', frase('chatCanal', 'time')], ['radio', tr('RÁDIO')]]) {
    const b = el('button', 'tp-chat-aba', rotulo);
    b.type = 'button'; b.dataset.filtro = f;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(f === 'todos'));
    b.addEventListener('click', () => {
      sec.dataset.tpFiltro = f;
      for (const o of abas.children) o.setAttribute('aria-selected', String(o === b));
    });
    abas.append(b);
  }
  titulo ? titulo.after(abas) : cab.prepend(abas);
  const rodape = el('div', 'tp-chat-rodape');
  for (const [k, t] of [['ENTER', 'envia'], ['TAB', 'time / sala'], ['ESC', 'fecha']]) {
    const s = el('span');
    s.append(el('kbd', null, k), document.createTextNode(` ${tr(t)}`));
    rodape.append(s);
  }
  $('chat-form')?.after(rodape);

  entrada.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || e.shiftKey) return;
    e.preventDefault();
    e.stopPropagation();
    $('chat-canal')?.click();
  });

  let ultimaLinha = null;
  const guardar = (e) => { const li = e.target?.closest?.('.chat-linha'); if (li) ultimaLinha = li; };
  log.addEventListener('click', guardar, true);
  log.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') guardar(e); }, true);
  const silenciar = el('button', null, tr('Silenciar nesta partida'));
  silenciar.type = 'button';
  silenciar.id = 'tp-chat-silenciar';
  silenciar.addEventListener('click', () => {
    const h = ultimaLinha?.dataset.h;
    if (h) { mudos.add(h); marcarMudos(); }
    $('chat-acoes-cancelar')?.click();
    entrada.focus();
    const aviso = $('chat-aviso');
    if (aviso && h) aviso.textContent = `${$('chat-acoes-quem')?.textContent || `#${h}`} ${tr('silenciado nesta partida')}`;
  });
  const bloquear = $('chat-bloquear');
  if (bloquear) acoes.insertBefore(silenciar, bloquear);
  new MutationObserver(marcarMudos).observe(log, { childList: true });
}
function marcarMudos() {
  for (const li of document.querySelectorAll('#chat-log .chat-linha')) li.toggleAttribute('data-tp-mudo', mudos.has(li.dataset.h));
}

/* ---------- 21 · HUD por toque: o game.js cria o #touch-ui a cada partida ---------- */
function observarToque() {
  const decorar = () => { const r = $('touch-ui'); if (r && !r.dataset.tp) montarToque(r); };
  new MutationObserver(decorar).observe(document.body, { childList: true });
  decorar();
}
function montarToque(raiz) {
  raiz.dataset.tp = '1';
  const rotular = (sel, txt) => { const b = raiz.querySelector(sel); if (b) b.prepend(el('span', 'tp-toque-rotulo', txt)); };
  rotular('.touch-ads', tr('MIRA'));
  rotular('.touch-reload', 'R');
  rotular('.touch-crouch', tr('AGACHA'));
  const botao = (cls, txt, rotulo, inicio, fim) => {
    const b = el('button', `tp-toque ${cls}`, txt);
    b.type = 'button';
    b.setAttribute('aria-label', rotulo);
    let dedo = null;
    const solta = () => { dedo = null; const g = window.__game; if (g) fim?.(g); };
    raiz.addEventListener('touchreset', solta);
    b.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const g = window.__game;
      if (dedo !== null || !g?._acceptInput?.()) return;
      dedo = e.changedTouches[0].identifier; inicio(g);
    }, { passive: false });
    const h = (e) => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === dedo) solta(); };
    b.addEventListener('touchend', h); b.addEventListener('touchcancel', h);
    raiz.append(b);
    return b;
  };
  const atira = raiz.querySelector('.touch-fire');
  if (atira) {
    atira.classList.add('tp-toque', 'tp-toque-atira');
    atira.textContent = tr('ATIRA');
    atira.setAttribute('aria-label', tr('Atirar'));
  }
  botao('tp-toque-pula', tr('PULA'), tr('Pular'), (g) => { g.keys.Space = true; }, (g) => { g.keys.Space = false; });
  botao('tp-toque-camera', '', tr('Alternar câmera'), (g) => g._toggleCamView());
  raiz.querySelector('.tp-toque-camera').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="4"/></svg>';
  botao('tp-toque-ping', 'PING', 'Ping', () => marcarPing());
  botao('tp-toque-placar', '', tr('Placar'), (g) => g._showScoreboard?.(!!g.el?.scoreboard?.classList.contains('hidden')));
  raiz.querySelector('.tp-toque-placar').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  raiz.append(el('span', 'tp-toque-mira-dica', tr('ARRASTE AQUI PRA MIRAR')));
}
