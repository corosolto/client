export const TELAS = [[1536, 960], [1920, 1080], [1536, 864], [1280, 720], [932, 430, true], [844, 390, true]];
export const TOQUE = 44;
export const MUT = {
  'card-resenha': [/\/js\/tp\/flavio\.js/, (t) => t.replace("card.id = 'tp-lobby-flavio';", "card.id = 'tp-resenha-botao';").replace("no('strong', 'tp-disp', tr('OPERAÇÃO FLÁVIO'))", "no('strong', 'tp-disp', tr('Resenha'))"), 'LFB1', 'telas'],
  'card-depois': [/\/js\/tp\/lobby\.js/, (t) => t.replace('esq.appendChild(invasao);', 'esq.insertBefore(invasao, esq.firstChild);'), 'LFB1', 'telas'],
  'quests-esquerda': [/\/js\/tp\/lobby\.js/, (t) => t.replace("if (getComputedStyle(dir).display !== 'none') dir.append(...blocos);", 'if (false) dir.append(...blocos);'), 'LFB6', 'telas'],
  'modal-sem-imagem': [/\/js\/mode-announcements\.js/, (t) => t.replace('bg.src = imagem;', "bg.src = '';"), 'LFB2', 'telas'],
  'modal-transborda': [/\/js\/mode-announcements\.js/, (t) => t.replace('@media (max-height:520px){.cs-modes-dialog--historia', '@media (max-height:1px){.cs-modes-dialog--historia'), 'LFB2', 'telas'],
  'esc-sem-foco': [/\/js\/mode-announcements\.js/, (t) => t.replace('else if (c.foco?.isConnected) c.foco.focus({ preventScroll: true });', ''), 'LFB3', 'telas'],
  'jogar-mapa-errado': [/\/js\/tp\/flavio\.js/, (t) => t.replace('modos.irMapa(MAPA_FLAVIO);', "modos.irMapa('piscina_treta');"), 'LFB4', 'jogar'],
  'en-vaza': [/\/js\/i18n\.js/, (t) => t.replace("'OPERAÇÃO FLÁVIO': 'OPERATION FLÁVIO', ", ''), 'LFB5', 'idioma'],
};

export function inspectLobbyDOM() {
  const card = document.getElementById('tp-lobby-flavio'), invasao = document.getElementById('tp-lobby-invasao');
  const resenha = !!document.getElementById('tp-resenha-botao') || [...document.querySelectorAll('#main-menu button, #main-menu a')].some((e) => !e.closest('#tp-resenha') && e.checkVisibility() && /^\s*resenha\b/i.test(e.textContent));
  const vis = (e) => !!e?.checkVisibility();
  const caixa = (e) => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
  const cruzam = (a, o) => o.l < a.r - 1 && a.l < o.r - 1 && o.t < a.b - 1 && a.t < o.b - 1;
  const dir = document.querySelector('.tp-lobby-dir'), quests = document.getElementById('tp-lobby-quests'), skins = document.getElementById('tp-lobby-skins');
  const partida = [...document.querySelectorAll('#menu-setup .pane-match > *')].filter(vis).map(caixa).filter((b) => b.b > b.t);
  const amigos = document.getElementById('tp-lobby-online-amigos');
  const colunas = { dirVisivel: vis(dir), questsVisivel: vis(quests), questsNaDir: !!quests && !!dir?.contains(quests), skinsNaDir: !!skins && !!dir?.contains(skins), depoisDosAmigos: [quests, skins].filter(Boolean).every((e) => !!(amigos?.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING)), naPartida: [quests, skins].filter(vis).filter((e) => partida.some((x) => cruzam(caixa(e), x))).map((e) => e.id) };
  if (!vis(card)) return { resenha, card: null, colunas };
  const r = caixa(card), cruza = [];
  for (const e of document.querySelectorAll('#main-menu a, #main-menu button, #main-menu input, #main-menu select, #main-menu [role=tab], #hub-ui a, #hub-ui button')) {
    if (e === card || card.contains(e) || e.closest('#tp-resenha') || !vis(e)) continue;
    const o = caixa(e); if (o.r - o.l <= 0 || o.b - o.t <= 0) continue; if (cruzam(r, o)) cruza.push((e.id || e.getAttribute('aria-label') || e.className || e.tagName).toString().split(' ')[0]);
  }
  const topo = document.elementFromPoint((r.l + r.r) / 2, (r.t + r.b) / 2), img = card.querySelector('img'), inv = vis(invasao) ? caixa(invasao) : null;
  return { resenha, colunas, card: { ...r, h: r.b - r.t, cruza, coberto: !(topo && card.contains(topo)), arte: img?.complete && img.naturalWidth, rotulo: card.textContent, invasao: !!inv, acima: !!inv && r.b <= inv.t + 1 && !!(card.compareDocumentPosition(invasao) & Node.DOCUMENT_POSITION_FOLLOWING) } };
}

export function inspectModalDOM() {
  const d = document.querySelector('dialog[data-historia]'), x = d.querySelector('.cs-modes-painel'), img = d.querySelector('.cs-modes-bg');
  const fora = [...d.querySelectorAll('button, h1, p, li')].filter((e) => { const b = e.getBoundingClientRect(); return b.width && (b.left < -.5 || b.top < -.5 || b.right > innerWidth + .5 || b.bottom > innerHeight + .5); }).map((e) => e.textContent.slice(0, 24));
  return { img: img.complete ? img.naturalWidth : 0, src: img.getAttribute('src'), rola: [x.scrollHeight, x.clientHeight], fora, foco: d.contains(document.activeElement) ? document.activeElement.textContent : null };
}

export function lobbyFailures(c, tag, w, h, touch, toque = TOQUE) {
  const e1 = [], e6 = [];
  if (c.resenha) e1.push(`${tag}: botão Resenha no lobby`);
  if (!c.card) e1.push(`${tag}: painel da Operação Flávio ausente`);
  else {
    const k = c.card;
    if (!k.invasao) e1.push(`${tag}: invasão fora da tela (sem referência de ordem)`);
    else if (!k.acima) e1.push(`${tag}: painel do Flávio não está acima da invasão (topo ${k.t.toFixed(0)}, base ${k.b.toFixed(0)})`);
    if (k.l < 0 || k.t < 0 || k.r > w || k.b > h) e1.push(`${tag}: painel fora da tela`);
    if (k.cruza.length) e1.push(`${tag}: painel cobre ${k.cruza.join(', ')}`);
    if (k.coberto) e1.push(`${tag}: algo cobre o painel`);
    if (!(k.arte >= 1280)) e1.push(`${tag}: arte do painel não carregou (${k.arte || 0} px)`);
    if (!/OPERAÇÃO FLÁVIO/.test(k.rotulo)) e1.push(`${tag}: painel diz "${k.rotulo}"`);
    if (touch && k.h < toque - .5) e1.push(`${tag}: painel com ${k.h.toFixed(0)} px de altura no toque`);
  }
  const col = c.colunas;
  if (col.dirVisivel) {
    if (!col.questsNaDir || !col.skinsNaDir) e6.push(`${tag}: coluna da direita à vista sem ${[!col.questsNaDir && 'Quests', !col.skinsNaDir && 'skins'].filter(Boolean).join(' e ')}`);
    else if (!col.depoisDosAmigos) e6.push(`${tag}: Quests/skins antes de Amigos online`);
    if (col.naPartida.length) e6.push(`${tag}: ${col.naPartida.join(', ')} dentro do painel da partida`);
  } else if (h > 500 && !col.questsVisivel) e6.push(`${tag}: sem a coluna da direita, Quests sumiu`);
  return { e1, e6 };
}

export function modalFailures(m, tag) {
  const e2 = [];
  if (m.img < 1280) e2.push(`${tag}: imagem da história com ${m.img} px (src "${m.src}")`);
  if (m.rola[0] > m.rola[1] + 1) e2.push(`${tag}: história rola (${m.rola[0]} > ${m.rola[1]} px)`);
  if (m.fora.length) e2.push(`${tag}: fora da tela: ${m.fora.join(' | ')}`);
  if (!m.foco) e2.push(`${tag}: foco fora do diálogo ao abrir`);
  return e2;
}

export function escapeFailures(gaveta, s, tag) {
  const e3 = [];
  if (gaveta) e3.push(`${tag}: Y abriu a gaveta por baixo da história`);
  if (s.aberto || s.foco !== 'tp-lobby-flavio') e3.push(`${tag}: Escape deixou ${s.aberto ? 'o diálogo aberto' : `o foco em ${s.foco}`}`);
  return e3;
}

export function telaVerdicts(e1, e2, e3, e6, telasCount = TELAS.length) {
  return [
    { id: 'LFB1', ok: !e1.length, msg: e1.join('; ') || `${telasCount} telas: sem Resenha; painel do Flávio acima da invasão, livre, à vista, arte carregada` },
    { id: 'LFB2', ok: !e2.length, msg: e2.join('; ') || `${telasCount} telas: história abre com a arte carregada, sem rolar nem sair da tela, foco preso no diálogo` },
    { id: 'LFB3', ok: !e3.length, msg: e3.join('; ') || `${telasCount} telas: Escape fecha e devolve o foco ao painel; Y não abre a gaveta por baixo` },
    { id: 'LFB6', ok: !e6.length, msg: e6.join('; ') || `${telasCount} telas: Quests e skins embaixo de Amigos online fora da partida; sem a coluna, Quests na esquerda` },
  ];
}

export function jogarVerdict(ok, r) {
  let msg = '';
  if (!ok) msg = 'JOGAR não começou partida em 120 s';
  else if (r.mapa !== 'operacao_flavio') msg = `JOGAR começou ${r.mapa}`;
  else if (r.modal) msg = 'história continua aberta por cima da partida';
  return { id: 'LFB4', ok: !msg, msg: msg || 'JOGAR fecha a história e começa a partida no operacao_flavio' };
}

export function idiomaVerdict(rotulo, t, abriu) {
  const vaza = (rotulo + '\n' + t).match(/OPERAÇÃO|HISTÓRIA|comitiva|Escolha o Zero Um|Três rotas|Paródia|FECHAR|JOGAR/)?.[0];
  const ok = abriu && /OPERATION FLÁVIO/.test(rotulo) && /OPERATION FLÁVIO/.test(t) && !vaza;
  return { id: 'LFB5', ok, msg: ok ? 'EN: card e história sem frase em português' : `EN: ${abriu ? '' : 'história não abriu; '}card "${rotulo}"${vaza ? `; vaza "${vaza}"` : ''}` };
}
