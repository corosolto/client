#!/usr/bin/env node
/* Régua da frente social Treta Pop (telas 12, 15, 24 e 25 de design/treta-pop-2026-10-14) medida no Chrome.
     BASE=http://127.0.0.1:9428 node tools/eval/ui-v3-social.mjs [--mutantes]
   A API social é fixture da régua (FIXTURE abaixo): a tela só pode mostrar o que ela devolve.
   Capturas em OUT (padrão tools/eval/out/ui-v3-social). Um navegador por vez (with-browser-lock.sh). */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'http://127.0.0.1:9428';
const OUT = process.env.OUT || 'tools/eval/out/ui-v3-social';
const VIEWPORTS = [[1536, 1024], [1920, 1080], [1280, 720], [844, 390]];
/* Tela 12: gaveta de 780 px colada à direita (12-chat.html:34). Tela 15: cartão de 1120 px (15-convidar.html:28). */
const GAVETA_W = 780, CARTAO_W = 1120;
/* Tela 24/25 no celular deitado; alvo de toque mínimo do briefing (pointer: coarse). */
const TOQUE = 44;
const LIMA = 'rgb(180, 217, 46)';
const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});

const EU = { id: '00000000-0000-4000-8000-0000000000e0', nick: 'ZeDaAWP' };
const id = (n) => `00000000-0000-4000-8000-00000000000${n}`;
function FIXTURE() {
  const agora = Date.now(), iso = (ms) => new Date(agora - ms).toISOString();
  const amigos = [
    { id: id(1), nick: 'PunkDoPiscinao', state: 'accepted', direction: 'outgoing', profile: { url: '/u/punk', presence: { online: true, game: null, last_active_at: iso(0) } } },
    { id: id(2), nick: 'ClubberDaLaje', state: 'accepted', direction: 'incoming', profile: { url: '/u/clubber', presence: { online: true, game: { mode: 'ctf', map: 'Escadão' }, last_active_at: iso(0) } } },
    { id: id(3), nick: 'TrapDoCorrego', state: 'accepted', direction: 'outgoing', profile: { url: '/u/trap', presence: { online: false, game: null, last_active_at: iso(3 * 3600e3) } } },
    { id: id(4), nick: 'PedidoNaFila', state: 'pending', direction: 'incoming', profile: null },
  ];
  return {
    social: {
      profile: { id: EU.id, handle: 'zeawp', url: '/u/zeawp', settings: { profile: 'public', presence: 'friends', activity: 'friends', share_character: false }, bio: '', socials: [] },
      friends: amigos, notifications: [], feed: [], blocks: [], messages_enabled: true,
      invites: [{ id: 'conv-1', nick: 'ClubberDaLaje', node: 'br', code: '9QX2', expires_at: new Date(agora + 600e3).toISOString(), direction: 'incoming' }],
    },
    inbox: { unread_count: 2, conversations: [{ target_id: id(1), nick: 'PunkDoPiscinao', unread_count: 2, last_message: { body: 'mentira que tu fez 24 com a AWP', created_at: iso(60e3) } }] },
    conversa: {
      peer: { id: id(1), nick: 'PunkDoPiscinao', url: '/u/punk' }, has_more: false,
      messages: [
        { id: 'm1', sender_id: id(1), recipient_id: EU.id, body: 'viu meu abate de faca no Escadão? kkkk', created_at: iso(300e3), read_at: null },
        { id: 'm2', sender_id: EU.id, recipient_id: id(1), body: 'vi, foi sujo demais', created_at: iso(240e3), read_at: iso(200e3) },
        { id: 'm3', sender_id: id(1), recipient_id: EU.id, body: 'mentira que tu fez 24 com a AWP', created_at: iso(60e3), read_at: null },
      ],
    },
  };
}

/* Mutantes reescrevem o que o servidor entrega; cada um prova que aplicou. */
async function preparar(page, mutante, { conta = true, registro = [] } = {}) {
  const fx = FIXTURE();
  await page.route((u) => u.pathname === '/api/social' || u.pathname === '/api/social-auth', async (r) => {
    const req = r.request(), u = new URL(req.url());
    const corpo = req.postData() ? JSON.parse(req.postData()) : null;
    registro.push({ caminho: u.pathname + u.search, corpo });
    const json = (o, status = 200) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(o) });
    if (u.pathname === '/api/social-auth') return json(u.searchParams.get('action') === 'providers' ? { providers: [] } : conta ? { authenticated: true, profile: EU } : { authenticated: false });
    if (!conta) return json({ error: 'session_expired' }, 401);
    if (corpo) return json({ ok: true });
    const a = u.searchParams.get('action');
    if (!a) return json(fx.social);
    if (a === 'inbox') return json(fx.inbox);
    if (a === 'conversation') return json(fx.conversa);
    return json({ error: 'not_found' }, 404);
  });
  const reescreve = (teste, troca) => page.route(teste, async (r) => {
    const res = await r.fetch().catch(() => r.fetch());
    const antes = await res.text();
    const depois = troca(antes);
    if (depois === antes) throw new Error(`mutante ${mutante} não aplicou em ${r.request().url()}`);
    await r.fulfill({ response: res, body: depois });
  });
  const css = /\/css\/tp\/social\.css/, js = /\/js\/tp\/social\.js/;
  if (mutante === 'vaza-flag') await reescreve(/\/js\/main\.js/, (t) => t.replace("if (document.documentElement.dataset.ui === 'v3') {\n  import('./splash-v3.js')", "if (true) {\n  import('./splash-v3.js')"));
  if (mutante === 'botao-sobre') await reescreve(css, (t) => t.replace('--tp-resenha-chao:12px', '--tp-resenha-chao:500px'));
  if (mutante === 'sem-y') await reescreve(js, (t) => t.replace("e.code !== 'KeyY'", "e.code !== 'KeyZ'"));
  if (mutante === 'gaveta-estreita') await reescreve(css, (t) => t.replace('.tp-resenha{width:100vw', '.tp-resenha{width:min(780px,100vw)'));
  if (mutante === 'inventa') await reescreve(js, (t) => t.replace(".filter((f) => f.state === 'accepted')", '.filter((f) => f)'));
  if (mutante === 'bolha-trocada') await reescreve(css, (t) => t.replace('.tp-msg[data-de="eu"]{align-self:flex-end', '.tp-msg[data-de="eu"]{align-self:flex-start'));
  if (mutante === 'zero-visivel') await reescreve(css, (t) => t.replace('.tp-resenha-botao__novas[data-vazio]{display:none}', ''));
  if (mutante === 'dois-lima') await reescreve(css, (t) => t.replace('.tp-convidar__entrar{height:52px;padding:0 28px;border-radius:10px;border:2px solid var(--tp-lima);background:none;', '.tp-convidar__entrar{height:52px;padding:0 28px;border-radius:10px;border:2px solid var(--tp-lima);background:var(--tp-lima);'));
  if (mutante === 'qr-torto') await reescreve(js, (t) => t.replace('qrSvg(publico,', "qrSvg(publico.replace('corosolto','errado'),"));
  if (mutante === 'cartao-fixo') await reescreve(css, (t) => t.replace('width:min(1120px,calc(100vw - 32px))', 'width:1400px'));
  if (mutante === 'pwa-por-cima') await reescreve(css, (t) => t.replace(':root[data-ui="v3"] #main-menu:has(.tp-resenha[data-aberta]) .pwa-install{visibility:hidden}', ':root[data-ui="v3"] #main-menu:has(.tp-resenha[data-aberta]) .pwa-install{visibility:visible!important;display:block!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:auto!important}'));
  if (mutante === 'toque-30') await reescreve(css, (t) => t.replace('@media (pointer:coarse){', '@media (pointer:fine) and (pointer:coarse){'));
  if (mutante === 'en-vaza') await reescreve(/\/js\/i18n\.js/, (t) => t.replace("'Chama a turma': 'Call the crew',", ''));
  if (mutante === 'offline-junto') await reescreve(js, (t) => t.replace('.filter((f) => f.profile?.presence?.online)', '.filter((f) => f)'));
  if (mutante === 'codigo-perdido') await reescreve(js, (t) => t.replace('window.__mpConvite?.(txt)', "window.__mpConvite?.('')"));
  if (mutante === 'em-breve') await reescreve(js, (t) => t.replace('  vagas.append(voce);', "  vagas.append(voce);\n  for (let i = 0; i < 3; i++) vagas.append(el('li', 'tp-convidar__vaga', 'Em breve'));"));
  return registro;
}

async function lobby(opcoes = {}) {
  const { w = 1536, h = 1024, lang = 'pt', flag = true, mutante = '', conta = true, toque = false, reduzido = false } = opcoes;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, ...(toque ? { hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : {}), ...(reduzido ? { reducedMotion: 'reduce' } : {}) });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  const page = await ctx.newPage();
  page.setDefaultTimeout(6000);
  const registro = await preparar(page, mutante, { conta });
  await page.goto(`${BASE}/?${flag ? '' : 'ui=legacy&'}lang=${lang}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important;pointer-events:none!important}' });
  if (flag) await page.waitForFunction(() => !document.getElementById('tp-splash-jogar')?.disabled, null, { timeout: 60000 }).catch(() => {});
  else await page.waitForFunction(() => !document.getElementById('splash-enter')?.classList.contains('hidden'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => { const s = document.getElementById('boot-splash'); return !s || s.classList.contains('gone'); }, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);
  return { page, ctx, registro };
}
const abrirModal = (page) => page.evaluate(() => window.__mpModalSala?.({ convite: 'BR-7K3M', players: 1, max: 10, name: 'SALA DO ZE' }));
const caixa = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e || !e.checkVisibility()) return null; const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; }, sel);
/* Interativos visíveis dentro de `raiz` que saem da janela ou do próprio contêiner. */
const foraDaTela = (page, raiz) => page.evaluate((r) => {
  const R = document.querySelector(r); if (!R) return ['contêiner ausente'];
  const out = [];
  for (const e of R.querySelectorAll('a,button,input,select,textarea,[role=tab]')) {
    if (!e.checkVisibility()) continue;
    const b = e.getBoundingClientRect(); if (!b.width || !b.height) continue;
    if (b.left < -0.5 || b.top < -0.5 || b.right > innerWidth + 0.5 || b.bottom > innerHeight + 0.5) out.push(`${(e.id || e.className || e.tagName).toString().split(' ')[0]} em ${b.left.toFixed(0)},${b.top.toFixed(0)}-${b.right.toFixed(0)},${b.bottom.toFixed(0)}`);
  }
  if (R.scrollWidth > R.clientWidth + 1) out.push(`rolagem horizontal ${R.scrollWidth}>${R.clientWidth}`);
  return out;
}, raiz);

/* A · ?ui=legacy: lobby e modal anteriores, sem nada da Treta Pop. */
async function semFlag(mutante, cap) {
  const { page, ctx } = await lobby({ flag: false, mutante });
  if (cap) await page.screenshot({ path: `${OUT}/antes-lobby-1536x1024.png` });
  await abrirModal(page); await page.waitForTimeout(800);
  if (cap) await page.screenshot({ path: `${OUT}/antes-convidar-1536x1024.png` });
  const r = await page.evaluate(() => ({
    botao: !!document.getElementById('tp-resenha-botao'), gaveta: !!document.getElementById('tp-resenha'),
    cartao: document.querySelector('.mp-modal-card')?.className || '',
    filhos: [...document.querySelectorAll('.mp-modal-card > *')].map((e) => e.id || e.className).join(','),
  }));
  await ctx.close();
  const LEGADO = 'mp-modal-kicker,mp-modal-title,mp-modal-convite,mp-modal-lot,mp-modal-copy,mp-modal-entrar,mp-modal-nota';
  const ok = !r.botao && !r.gaveta && !/tp-/.test(r.cartao) && r.filhos === LEGADO;
  return [{ id: 'SO1', ok, msg: ok ? '?ui=legacy: sem botão Resenha, sem gaveta, modal da sala com a marcação anterior' : `rollback vaza: botão ${r.botao}, gaveta ${r.gaveta}, cartão "${r.cartao}", filhos ${r.filhos}` }];
}

/* B · 4 telas: botão no lobby, gaveta e cartão de convite cabem. */
async function telas(mutante, cap) {
  const sobre = [], geo = [], cabe = [];
  for (const [w, h] of VIEWPORTS) {
    const { page, ctx } = await lobby({ w, h, mutante });
    const tag = `${w}x${h}`;
    await page.waitForTimeout(500);
    if (cap) await page.screenshot({ path: `${OUT}/lobby-${tag}.png` });
    const b = await page.evaluate(() => {
      const bt = document.getElementById('tp-resenha-botao');
      if (!bt?.checkVisibility()) return null;
      const r = bt.getBoundingClientRect();
      const cruza = [];
      for (const e of document.querySelectorAll('#main-menu a, #main-menu button, #main-menu input, #main-menu select, #main-menu [role=tab]')) {
        if (e === bt || bt.contains(e) || e.closest('#tp-resenha') || !e.checkVisibility()) continue;
        const o = e.getBoundingClientRect();
        if (!o.width || !o.height) continue;
        if (o.left < r.right - 1 && r.left < o.right - 1 && o.top < r.bottom - 1 && r.top < o.bottom - 1) cruza.push((e.id || e.className || e.tagName).toString().split(' ')[0]);
      }
      const topo = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { l: r.left, t: r.top, r: r.right, b: r.bottom, cruza, coberto: !(topo && (topo === bt || bt.contains(topo))), novas: bt.querySelector('.tp-resenha-botao__novas')?.textContent || '', hub: document.getElementById('hub-social-unread')?.textContent || '' };
    });
    if (!b) sobre.push(`${tag}: botão Resenha ausente`);
    else {
      if (b.l < 0 || b.t < 0 || b.r > w || b.b > h) sobre.push(`${tag}: botão fora da tela`);
      if (b.cruza.length) sobre.push(`${tag}: botão cobre ${b.cruza.join(', ')}`);
      if (b.coberto) sobre.push(`${tag}: algo cobre o botão`);
      if ((b.novas || '0') !== (b.hub || '0')) sobre.push(`${tag}: contador ${b.novas || 'vazio'} e a comunidade diz ${b.hub || 'vazio'}`);
    }
    await page.click('#tp-resenha-botao').catch(() => {});
    await page.waitForTimeout(900);
    const g = await caixa(page, '#tp-resenha');
    const querW = Math.min(GAVETA_W, w) === GAVETA_W && w > 900 ? GAVETA_W : w;
    if (!g) geo.push(`${tag}: gaveta não abre`);
    else if (Math.abs(g.r - w) > 1 || Math.abs(g.t) > 1 || Math.abs(g.h - h) > 1 || Math.abs(g.w - querW) > 1) geo.push(`${tag}: gaveta ${g.w.toFixed(0)}×${g.h.toFixed(0)} em x=${g.l.toFixed(0)} (quer ${querW}×${h} colada à direita)`);
    const fg = await foraDaTela(page, '#tp-resenha');
    if (fg.length) cabe.push(`${tag} gaveta: ${fg.slice(0, 3).join('; ')}`);
    if (cap) await page.screenshot({ path: `${OUT}/gaveta-${tag}.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await abrirModal(page); await page.waitForTimeout(1200);
    const c = await caixa(page, '#mp-modal .mp-modal-card');
    const querC = Math.min(CARTAO_W, w - 32);
    if (!c) cabe.push(`${tag}: cartão de convite ausente`);
    else if (w >= 1200 && Math.abs(c.w - querC) > 2) cabe.push(`${tag}: cartão com ${c.w.toFixed(0)} px (quer ${querC})`);
    const fm = await foraDaTela(page, '#mp-modal .mp-modal-card');
    if (fm.length) cabe.push(`${tag} convite: ${fm.slice(0, 3).join('; ')}`);
    if (cap) await page.screenshot({ path: `${OUT}/convidar-${tag}.png` });
    await ctx.close();
  }
  return [
    { id: 'SO2', ok: !sobre.length, msg: sobre.length ? sobre.join('; ') : '4 telas: botão Resenha visível, livre, sem cobrir nada clicável, contador igual ao da comunidade' },
    { id: 'SO4', ok: !geo.length, msg: geo.length ? geo.join('; ') : `gaveta de ${GAVETA_W} px colada à direita no desktop e tela cheia no celular` },
    { id: 'SO10', ok: !cabe.length, msg: cabe.length ? cabe.join('; ') : `4 telas: gaveta e cartão (${CARTAO_W} px no desktop) sem nada fora da tela e sem rolagem lateral` },
  ];
}

/* C · fluxo no desktop do dono, com conta e turma da fixture. */
async function fluxo(mutante, cap) {
  const { page, ctx, registro } = await lobby({ mutante });
  const r = [];
  await page.keyboard.press('y');
  await page.waitForTimeout(900);
  const abriu = await page.evaluate(() => document.getElementById('tp-resenha')?.hasAttribute('data-aberta') && document.getElementById('tp-resenha').contains(document.activeElement));
  await page.waitForFunction(() => document.querySelectorAll('#tp-resenha [data-conversa]').length > 0, null, { timeout: 8000 }).catch(() => {});
  await page.focus('#tp-resenha .tp-resenha__busca input').catch(() => {});
  await page.keyboard.press('y');
  await page.waitForTimeout(300);
  const digita = await page.evaluate(() => ({ aberta: document.getElementById('tp-resenha')?.hasAttribute('data-aberta'), valor: document.querySelector('#tp-resenha .tp-resenha__busca input')?.value }));
  await page.keyboard.press('Backspace');
  const lista = await page.evaluate(() => [...document.querySelectorAll('#tp-resenha [data-conversa]')].map((b) => ({ id: b.dataset.id, nome: b.querySelector('b')?.textContent, sub: b.querySelector('small')?.textContent, novas: b.querySelector('.tp-resenha__novas')?.textContent || '' })));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const fechou = await page.evaluate(() => !document.getElementById('tp-resenha')?.hasAttribute('data-aberta') && document.activeElement?.id === 'tp-resenha-botao');
  r.push({ id: 'SO3', ok: abriu && digita.aberta && digita.valor === 'y' && fechou,
    msg: !abriu ? 'Y no lobby não abre a gaveta com o foco dentro' : !(digita.aberta && digita.valor === 'y') ? `Y digitado no campo ${digita.aberta ? 'não chega ao campo' : 'fecha a gaveta'}` : !fechou ? 'ESC não fecha nem devolve o foco ao botão' : 'Y abre com foco dentro, Y no campo é texto, ESC fecha e devolve o foco' });

  /* SO5: 3 amigos aceitos (o pedido pendente não entra), presença da fixture, não lidas do inbox. */
  const QUER = [['PunkDoPiscinao', 'Online', '2'], ['ClubberDaLaje', 'Em partida · Escadão', ''], ['TrapDoCorrego', 'visto há 3 h', '']];
  const erros = [];
  if (lista.length !== QUER.length) erros.push(`${lista.length} conversas (fixture tem ${QUER.length} amigos aceitos): ${lista.map((x) => x.nome).join(', ')}`);
  QUER.forEach(([nome, sub, novas], i) => { const x = lista[i]; if (x && (x.nome !== nome || x.sub !== sub || x.novas !== novas)) erros.push(`linha ${i + 1}: ${x.nome} "${x.sub}" ${x.novas || '-'} (quer ${nome} "${sub}" ${novas || '-'})`); });
  await page.keyboard.press('y'); await page.waitForTimeout(700);
  await page.click('#tp-resenha [data-canal="salas"]').catch(() => {}); await page.waitForTimeout(400);
  const salas = await page.evaluate(() => document.querySelector('#tp-resenha .tp-resenha__conversa')?.innerText || '');
  if (!/ClubberDaLaje/.test(salas) || !/BR-9QX2/.test(salas)) erros.push(`SALAS não mostra o convite da fixture: "${salas.slice(0, 80)}"`);
  await page.click('#tp-resenha [data-canal="cla"]').catch(() => {}); await page.waitForTimeout(400);
  const cla = await page.evaluate(() => !!document.querySelector('#tp-resenha .tp-resenha__conversa [data-vazio-estado]'));
  if (!cla) erros.push('CLÃ sem estado vazio (não há backend de chat do clã)');
  r.push({ id: 'SO5', ok: !erros.length, msg: erros.length ? erros.join('; ') : 'AMIGOS = 3 aceitos com presença e não lidas da API; SALAS = convite real; CLÃ = estado vazio' });

  /* SO6: conversa da fixture, bolha própria em lima à direita, envio com o texto digitado. */
  await page.click('#tp-resenha [data-canal="amigos"]').catch(() => {}); await page.waitForTimeout(300);
  await page.click(`#tp-resenha [data-conversa][data-id="${id(1)}"]`).catch(() => {});
  await page.waitForFunction(() => document.querySelectorAll('#tp-resenha .tp-msg').length > 0, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  if (cap) await page.screenshot({ path: `${OUT}/gaveta-conversa-1536x1024.png` });
  const fio = await page.evaluate((lima) => {
    const col = document.querySelector('#tp-resenha .tp-resenha__fio')?.getBoundingClientRect();
    const bolhas = [...document.querySelectorAll('#tp-resenha .tp-msg')].map((m) => { const b = m.getBoundingClientRect(); return { de: m.dataset.de, dir: col ? col.right - b.right : -1, esq: col ? b.left - col.left : -1, lima: getComputedStyle(m).backgroundColor === lima }; });
    const limaBtn = [...document.querySelectorAll('#tp-resenha button')].filter((b) => b.checkVisibility() && getComputedStyle(b).backgroundColor === lima).map((b) => b.id || b.className);
    const t = document.getElementById('tp-resenha-texto');
    return { bolhas, limaBtn, max: t?.maxLength };
  }, LIMA);
  await page.fill('#tp-resenha-texto', 'bora').catch(() => {});
  const conta = await page.evaluate(() => document.querySelector('#tp-resenha .tp-resenha__conta')?.textContent);
  await page.click('#tp-resenha-enviar').catch(() => {});
  await page.waitForTimeout(800);
  const envio = registro.find((x) => x.corpo?.action === 'message_send');
  const errFio = [];
  if (fio.bolhas.length !== 3) errFio.push(`${fio.bolhas.length} bolhas (fixture tem 3)`);
  for (const b of fio.bolhas) {
    if (b.de === 'eu' && (b.dir > 22 || !b.lima)) errFio.push(`bolha própria ${b.lima ? '' : 'sem lima '}a ${b.dir.toFixed(0)} px da direita`);
    if (b.de === 'outro' && (b.esq > 22 || b.lima)) errFio.push(`bolha recebida a ${b.esq.toFixed(0)} px da esquerda${b.lima ? ' em lima' : ''}`);
  }
  if (fio.limaBtn.length !== 1) errFio.push(`${fio.limaBtn.length} botões lima na gaveta (${fio.limaBtn.join(', ')}); a tela pede um`);
  if (fio.max !== 200 || conta !== '4/200') errFio.push(`campo com limite ${fio.max} e contador "${conta}" (quer 200 e 4/200)`);
  if (!envio || envio.corpo.body !== 'bora' || envio.corpo.target !== id(1) || !envio.corpo.client_id) errFio.push(`envio: ${JSON.stringify(envio?.corpo || null)}`);
  r.push({ id: 'SO6', ok: !errFio.length, msg: errFio.length ? errFio.join('; ') : 'conversa da API: 3 bolhas, a sua em lima à direita, ENVIAR único lima, 4/200, envio com alvo e client_id' });
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);

  /* SO8, SO9, SO13, SO15: cartão de convite. */
  await abrirModal(page);
  await page.waitForFunction(() => document.querySelectorAll('#mp-modal [data-amigo]').length > 0, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(600);
  if (cap) await page.screenshot({ path: `${OUT}/convidar-conta-1536x1024.png` });
  const m = await page.evaluate(async (lima) => {
    const card = document.querySelector('#mp-modal .mp-modal-card');
    const { linkDeConvite } = await import('/js/nos.js');
    const { origemPublica } = await import('/js/compartilhar.js');
    const local = linkDeConvite('BR-7K3M'), publico = linkDeConvite('BR-7K3M', origemPublica());
    const limas = [...card.querySelectorAll('*')].filter((e) => e.checkVisibility() && getComputedStyle(e).backgroundColor === lima).map((e) => e.id || e.className);
    let qr = '';
    const svg = card.querySelector('.tp-convidar__qr svg');
    if (svg && 'BarcodeDetector' in window) {
      const img = new Image(); img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
      await img.decode();
      const c = document.createElement('canvas'); c.width = c.height = 420; c.getContext('2d').drawImage(img, 0, 0, 420, 420);
      qr = (await new BarcodeDetector({ formats: ['qr_code'] }).detect(c))[0]?.rawValue || 'ilegível';
    }
    return {
      v3: card.classList.contains('tp-convidar'), vagas: card.querySelectorAll('.tp-convidar__vaga').length, reais: card.querySelectorAll('.tp-convidar__vaga[data-real]').length,
      mensagem: card.querySelector('.tp-convidar__sala p:not(.tp-convidar__lote)')?.textContent || '',
      link: card.querySelector('.tp-convidar__link')?.textContent || '', local, publico,
      zap: document.getElementById('mp-modal-zap')?.href || '', tele: document.getElementById('tp-convidar-telegram')?.href || '',
      discord: !!document.getElementById('tp-convidar-discord')?.checkVisibility(), limas,
      blur: getComputedStyle(document.getElementById('mp-modal')).backdropFilter, qr, bd: 'BarcodeDetector' in window,
      amigos: [...card.querySelectorAll('[data-amigo]')].map((a) => ({ id: a.dataset.amigo, botao: a.querySelector('button')?.textContent || a.querySelector('.tp-convidar__enviado')?.textContent || '' })),
    };
  }, LIMA);
  const e8 = [];
  if (!m.v3) e8.push('cartão sem a camada Treta Pop');
  if (m.vagas !== 1 || m.reais !== 1) e8.push(`${m.vagas} cartões de party e ${m.reais} reais (quer só o seu cartão)`);
  if (m.mensagem !== 'Convide pelo link. Quem abrir entra direto na sua sala.') e8.push(`instrução da sala: "${m.mensagem}"`);
  if (m.link !== new URL(m.local).host + '/sala/BR-7K3M') e8.push(`caixa do link mostra "${m.link}"`);
  if (!m.zap.includes(encodeURIComponent(m.local))) e8.push('WhatsApp sem o link da sala');
  if (!m.tele.startsWith('https://t.me/share/url?url=') || !m.tele.includes(encodeURIComponent(m.publico))) e8.push(`Telegram: ${m.tele || 'ausente'}`);
  if (!m.discord) e8.push('Discord ausente');
  if (m.limas.length !== 1) e8.push(`${m.limas.length} blocos lima no cartão (${m.limas.join(', ')}); a tela pede um`);
  if (m.blur !== 'none') e8.push(`fundo do modal com ${m.blur} sobre o canvas`);
  r.push({ id: 'SO8', ok: !e8.length, msg: e8.length ? e8.join('; ') : 'só o seu cartão, instrução real do convite, link /sala/, WhatsApp, Discord e Telegram, um lima, sem blur' });
  r.push({ id: 'SO9', ok: m.bd && m.qr === m.publico, msg: !m.bd ? 'Chrome sem BarcodeDetector: QR não medido' : m.qr === m.publico ? `QR lido pelo Chrome = ${m.qr}` : `QR lido "${m.qr || 'nenhum'}", quer ${m.publico}` });

  const e13 = [];
  const ids = m.amigos.map((a) => a.id).sort().join(',');
  if (ids !== [id(1), id(2)].sort().join(',')) e13.push(`amigos online listados: ${m.amigos.map((a) => a.id.slice(-1)).join(',') || 'nenhum'} (fixture: 1 e 2 online, 3 offline)`);
  await page.click(`#mp-modal [data-amigo="${id(1)}"] button`).catch(() => e13.push('sem CHAMAR para quem está online fora de partida'));
  await page.waitForTimeout(600);
  const convite = registro.find((x) => x.corpo?.action === 'invite');
  const depois = await page.evaluate((i) => document.querySelector(`#mp-modal [data-amigo="${i}"]`)?.innerText || '', id(1));
  if (convite?.corpo?.target !== id(1)) e13.push(`CHAMAR não pediu convite à API: ${JSON.stringify(convite?.corpo || null)}`);
  if (!/ENVIADO/.test(depois)) e13.push(`depois de chamar: "${depois}"`);
  if (/AVISAR/i.test(await page.evaluate(() => document.querySelector('#mp-modal')?.innerText || ''))) e13.push('AVISAR QUANDO SAIR sem backend');
  r.push({ id: 'SO13', ok: !e13.length, msg: e13.length ? e13.join('; ') : 'só amigos com presença online; CHAMAR pede convite à API e vira ENVIADO' });

  await page.evaluate(() => { window.__tpCodigo = []; window.__mpConvite = (t) => window.__tpCodigo.push(t); });
  await page.fill('#tp-convidar-codigo', ' br-9qx2 ').catch(() => {});
  await page.click('#tp-convidar-ir').catch(() => {});
  await page.waitForTimeout(500);
  const cod = await page.evaluate(() => ({ chamadas: window.__tpCodigo || [], fechado: document.getElementById('mp-modal').classList.contains('hidden') }));
  r.push({ id: 'SO15', ok: cod.chamadas.join() === 'BR-9QX2' && cod.fechado, msg: cod.chamadas.join() === 'BR-9QX2' && cod.fechado ? 'código digitado vai para a entrada por convite do jogo e o aviso fecha' : `entrada por código: ${JSON.stringify(cod)}` });
  await ctx.close();
  return r;
}

/* D · sem conta: estado vazio, nada inventado. */
async function semConta(mutante, cap) {
  const { page, ctx } = await lobby({ mutante, conta: false });
  const novasVis = await page.evaluate(() => document.querySelector('#tp-resenha-botao .tp-resenha-botao__novas')?.checkVisibility() ?? false);
  await page.click('#tp-resenha-botao').catch(() => {});
  await page.waitForTimeout(1500);
  if (cap) await page.screenshot({ path: `${OUT}/gaveta-sem-conta-1536x1024.png` });
  const g = await page.evaluate(() => ({ linhas: document.querySelectorAll('#tp-resenha [data-conversa]').length, vazio: !!document.querySelector('#tp-resenha .tp-resenha__conversa [data-vazio-estado] button'), texto: document.getElementById('tp-resenha')?.innerText || '' }));
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await abrirModal(page); await page.waitForTimeout(1500);
  if (cap) await page.screenshot({ path: `${OUT}/convidar-sem-conta-1536x1024.png` });
  const mod = await page.evaluate(() => ({ amigos: document.querySelectorAll('#mp-modal [data-amigo]').length, vazio: !!document.querySelector('#mp-modal .tp-convidar__amigos [data-vazio-estado]') }));
  await ctx.close();
  const DEMO = /PunkDoPisc|Cria do Pisc|ClubberDaLaje|TrapDoC|ReggaeDaPraia|n[ií]vel \d|Sargento|T\$ 100/i;
  const e = [];
  if (novasVis) e.push('contador zerado aparece no botão');
  if (g.linhas) e.push(`${g.linhas} conversas sem conta`);
  if (!g.vazio) e.push('gaveta sem estado vazio com ação de entrar');
  if (DEMO.test(g.texto)) e.push(`dado de demonstração do pacote na tela: ${g.texto.match(DEMO)[0]}`);
  if (mod.amigos || !mod.vazio) e.push(`convite sem conta: ${mod.amigos} amigos, estado vazio ${mod.vazio}`);
  return [{ id: 'SO7', ok: !e.length, msg: e.length ? e.join('; ') : 'sem conta: contador some, zero conversas, estado vazio com ENTRAR, nenhum dado do pacote' }];
}

/* E · celular deitado: alvo de toque. */
async function toque(mutante, cap) {
  const { page, ctx } = await lobby({ w: 844, h: 390, toque: true, mutante });
  const pequenos = [];
  const mede = async (raiz, nome) => {
    const p = await page.evaluate(({ r, min }) => [...document.querySelectorAll(`${r} a, ${r} button, ${r} input, ${r} [role=tab]`)]
      .filter((e) => e.checkVisibility() && !e.closest('p'))
      .map((e) => ({ n: (e.id || e.textContent.trim() || e.className).toString().slice(0, 20), b: e.getBoundingClientRect() }))
      .flatMap(({ n, b }) => {
        const out = [];
        if (b.width && (b.height < min - 0.5 || b.width < min - 0.5)) out.push(`${n} ${b.width.toFixed(0)}×${b.height.toFixed(0)}`);
        const e = b.width ? document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2) : null;
        if (e && !document.querySelector(r).contains(e)) out.push(`${n} coberto por ${(e.id || e.className || e.tagName).toString().split(' ')[0]}`);
        return out;
      }), { r: raiz, min: TOQUE });
    pequenos.push(...p.map((x) => `${nome}: ${x}`));
  };
  await mede('#main-menu > #tp-resenha-botao', 'botão');
  await page.tap('#tp-resenha-botao').catch(() => {});
  await page.waitForFunction(() => document.querySelectorAll('#tp-resenha [data-conversa]').length > 0, null, { timeout: 8000 }).catch(() => {});
  await page.tap(`#tp-resenha [data-conversa][data-id="${id(1)}"]`).catch(() => {});
  await page.waitForFunction(() => document.querySelectorAll('#tp-resenha .tp-msg').length > 0, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.evaluate(() => document.activeElement?.blur());
  if (cap) await page.screenshot({ path: `${OUT}/m-gaveta-844x390.png` });
  await mede('#tp-resenha', 'gaveta');
  await page.tap('#tp-resenha .tp-resenha__sair').catch(() => {});
  await page.waitForTimeout(400);
  await abrirModal(page);
  await page.waitForFunction(() => document.querySelectorAll('#mp-modal [data-amigo]').length > 0, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
  if (cap) await page.screenshot({ path: `${OUT}/m-convidar-844x390.png` });
  await mede('#mp-modal .mp-modal-card', 'convite');
  await ctx.close();
  return [{ id: 'SO11', ok: !pequenos.length, msg: pequenos.length ? `alvo de toque abaixo de ${TOQUE} px ou coberto: ${pequenos.slice(0, 5).join('; ')}` : `844×390 com toque: todo alvo do botão, da gaveta e do convite ≥ ${TOQUE} px e sem nada por cima` }];
}

/* F · PT e EN: nenhuma string do outro idioma (mensagens e nicks são conteúdo de jogador). */
async function idioma(mutante, cap) {
  const textos = {};
  for (const lang of ['pt', 'en']) {
    const { page, ctx } = await lobby({ lang, mutante });
    await page.click('#tp-resenha-botao').catch(() => {});
    await page.waitForFunction(() => document.querySelectorAll('#tp-resenha [data-conversa]').length > 0, null, { timeout: 8000 }).catch(() => {});
    await page.click(`#tp-resenha [data-conversa][data-id="${id(1)}"]`).catch(() => {});
    await page.waitForFunction(() => document.querySelectorAll('#tp-resenha .tp-msg').length > 0, null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(400);
    if (cap && lang === 'en') await page.screenshot({ path: `${OUT}/gaveta-conversa-en-1536x1024.png` });
    const limpa = (sel) => page.evaluate((s) => { const r = document.querySelector(s)?.cloneNode(true); if (!r) return ''; r.querySelectorAll('.tp-msg, .tp-resenha__conv b, .tp-resenha__perfil').forEach((e) => e.remove()); document.body.append(r); r.style.cssText = 'position:fixed;left:-99999px;visibility:visible'; r.setAttribute('data-aberta', ''); const t = r.innerText; r.remove(); return t; }, sel);
    let t = await limpa('#tp-resenha');
    for (const canal of ['salas', 'cla']) { await page.click(`#tp-resenha [data-canal="${canal}"]`).catch(() => {}); await page.waitForTimeout(300); t += '\n' + await limpa('#tp-resenha .tp-resenha__conversa'); }
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    await abrirModal(page);
    await page.waitForFunction(() => document.querySelectorAll('#mp-modal [data-amigo]').length > 0, null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(400);
    if (cap && lang === 'en') await page.screenshot({ path: `${OUT}/convidar-en-1536x1024.png` });
    /* texto por elemento: o DOM montado por JS cola "CREATEDChama a turmaESC" e o \b não vê a frase */
    t += '\n' + await page.evaluate(() => { const c = document.querySelector('#mp-modal .mp-modal-card')?.cloneNode(true); if (!c) return ''; c.querySelectorAll('[data-amigo] b, .tp-convidar__link').forEach((e) => e.remove()); const texto = (n) => [...n.childNodes].map((f) => (f.nodeType === 3 ? f.textContent : texto(f))).join(' '); return texto(c).replace('SALA DO ZE', ''); });
    textos[lang] = t;
    await ctx.close();
  }
  const PT = /\b(AMIGOS|SALAS|CLÃ|Resenha|ENVIAR|Chama a turma|Link de convite|COPIAR|Amigo no celular|Recebeu um código|ENTRAR|Você|Buscar|Escreva|Chame quem|Em partida|visto há|HOJE|Amigos online|CHAMAR|ENVIADO|regras|na sala|Convite de sala|sala)\b/;
  const EN = /\b(FRIENDS|ROOMS|CLAN|Chat|SEND|Call the crew|Invite link|COPY|Friend on mobile|Got a code|JOIN|You|Search|Write|In a match|seen|TODAY|Friends online|CALL|SENT|rules|in the room|Room invite)\b/;
  const vazaEn = (textos.en.match(PT) || [])[0], vazaPt = (textos.pt.match(EN) || [])[0];
  return [{ id: 'SO12', ok: textos.pt && textos.en && !vazaEn && !vazaPt, msg: vazaEn || vazaPt ? `idioma misturado: "${vazaEn || vazaPt}" ${vazaEn ? 'em EN' : 'em PT'}` : 'gaveta (3 canais) e convite: PT e EN sem string do outro idioma' }];
}

const GRUPOS = { semFlag, telas, fluxo, semConta, toque, idioma };
const MUT = [
  ['vaza-flag', 'SO1', 'semFlag'], ['botao-sobre', 'SO2', 'telas'], ['sem-y', 'SO3', 'fluxo'], ['gaveta-estreita', 'SO4', 'telas'],
  ['inventa', 'SO5', 'fluxo'], ['bolha-trocada', 'SO6', 'fluxo'], ['zero-visivel', 'SO7', 'semConta'], ['dois-lima', 'SO8', 'fluxo'],
  ['qr-torto', 'SO9', 'fluxo'], ['cartao-fixo', 'SO10', 'telas'], ['toque-30', 'SO11', 'toque'], ['pwa-por-cima', 'SO11', 'toque'], ['en-vaza', 'SO12', 'idioma'],
  ['offline-junto', 'SO13', 'fluxo'], ['codigo-perdido', 'SO15', 'fluxo'], ['em-breve', 'SO8', 'fluxo'],
];
mkdirSync(OUT, { recursive: true });
let sair = 0;
if (process.argv.includes('--mutantes')) {
  for (const [mut, alvo, grupo] of MUT.filter(([m]) => !process.env.SO || process.env.SO === m)) {
    let c;
    try { c = (await GRUPOS[grupo](mut, false)).find((x) => x.id === alvo); }
    catch (e) { c = { ok: true, msg: `erro: ${e.message.split('\n')[0]}` }; }
    if (c.ok) sair = 1;
    console.log(`${c.ok ? 'CEGO  ' : 'MORDE '} ${alvo} (${mut})  ${c.msg}`);
  }
} else {
  const r = [];
  for (const [nome, g] of Object.entries(GRUPOS)) {
    if (process.env.GRUPO && process.env.GRUPO !== nome) continue;
    try { r.push(...await g('', true)); }
    catch (e) { r.push({ id: `SO0`, ok: false, msg: `grupo ${nome} quebrou: ${e.message.split('\n')[0]}` }); }
  }
  r.sort((a, b) => parseInt(a.id.slice(2), 10) - parseInt(b.id.slice(2), 10));
  for (const c of r) console.log(`${c.ok ? 'VERDE   ' : 'VERMELHO'} ${c.id}  ${c.msg}`);
  sair = r.every((c) => c.ok) ? 0 : 1;
  console.log(`\nsocial v3: ${r.filter((c) => c.ok).length}/${r.length}  (capturas em ${OUT})`);
}
await browser.close();
process.exit(sair);
