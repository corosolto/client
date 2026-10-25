#!/usr/bin/env node
/* Régua do HUD Treta Pop (telas 05, 13 e 21 de design/treta-pop-2026-10-14) medida no Chrome, numa partida viva.
     BASE=http://127.0.0.1:9424 node tools/eval/ui-v3-hud.mjs [--mutantes]
   Capturas em OUT (padrão tools/eval/out/ui-v3-hud). Um navegador por vez: rode via with-browser-lock.sh. */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const BASE = process.env.BASE || 'http://127.0.0.1:9424';
const OUT = process.env.OUT || 'tools/eval/out/ui-v3-hud';
const PARTIDA = 'debug=1&auto=E,esquerdomacho&map=praca_poderes';
const VIEWPORTS = [[1536, 1024], [1920, 1080], [1280, 720]];
const TOQUES = [[844, 390], [780, 360]];
/* Valores do HUD com ?ui=legacy, lidos na base origin/feat/ui-treta-pop (32e7cdf14) a 1536×1024:
   a cláusula HU10 congela o que a tela legada tem que continuar sendo. */
const LEGADO = { scoreE: 'rgba(0, 0, 0, 0)', hpFonte: 'Rajdhani', atalhos: 'flex', radar: '132px' };
/* Fração dos pixels do viewmodel que um painel do HUD pode cobrir em 3:2. Medido no legado:
   o painel de munição anterior já cobre a ponta da arma; o teto é o dobro dele, não um número solto. */
const VM_TETO = Number(process.env.VM_TETO || 0.06);
const PT_VAZA = /\b(VIDA|ABATES|SEQUÊNCIA|RODADA|PLACAR|RÁDIO|CLIQUE|OLHA AQUI|marcou)\b/;
const EN_VAZA = /\b(HEALTH|KILLS|STREAK|ROUND|SCOREBOARD|RADIO|CLICK|LOOK HERE|marked)\b/;

const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const devices = pw.devices || pw.default?.devices;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});

/* O serve.mjs entrega o cliente do Vite e a barra do Astro em dev; no build eles não existem. */
const STUB_VITE = 'export const createHotContext=()=>({accept(){},dispose(){},prune(){},on(){},off(){},send(){},invalidate(){},data:{}});'
  + "export const updateStyle=(i,c)=>{let s=document.querySelector('style[data-vite-id=\"'+i+'\"]');if(!s){s=document.createElement('style');s.dataset.viteId=i;document.head.appendChild(s)}s.textContent=c};"
  + 'export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}';

async function preparar(page, mutante) {
  await page.route(/\/@vite\/client|dev-toolbar\/entrypoint/, (r) => r.fulfill({ contentType: 'text/javascript', body: STUB_VITE }));
  await page.addInitScript(() => {
    try { localStorage.setItem('awpbr_nick', 'ZE'); } catch { /* aba anônima */ }
    addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style');
      s.textContent = '#crash-overlay{display:none!important}';
      document.head.appendChild(s);
    });
  });
  const reescreve = (teste, troca) => page.route(teste, async (r) => {
    const res = await r.fetch();
    const antes = await res.text();
    const depois = troca(antes);
    if (depois === antes) throw new Error(`mutante ${mutante} não aplicou em ${r.request().url()}`);
    await r.fulfill({ response: res, body: depois });
  });
  const css = /\/css\/tp\/hud\.css/, js = /\/js\/tp\/hud\.js/;
  if (mutante === 'retrato-vivo') await reescreve(js, (t) => t.replace("toggleAttribute('data-morto', !c.alive)", "toggleAttribute('data-morto', false)"));
  if (mutante === 'placar-cinza') await reescreve(css, (t) => t.replace('#score-e{background:var(--tp-esq)', '#score-e{background:var(--tp-elevado)'));
  if (mutante === 'xp-falso') await reescreve(js, (t) => t.replace("seq.className = 'tp-hud-seq';", "seq.className = 'tp-hud-seq'; seq.insertAdjacentHTML('beforeend', '<b>+150 XP</b>');"));
  if (mutante === 'municao-proporcional') await reescreve(css, (t) => t.replace('#ammo-mag{font-variant-numeric:tabular-nums}', '#ammo-mag{font-variant-numeric:proportional-nums}'));
  if (mutante === 'sem-hs') await reescreve(js, (t) => t.replace("row.querySelector('.kf-skull')", "row.querySelector('.kf-nada')"));
  if (mutante === 'dica-eterna') await reescreve(js, (t) => t.replace('const DICAS_S = 60;', 'const DICAS_S = 6000;'));
  if (mutante === 'badge-solto') await reescreve(css, (t) => t.replace(':root[data-ui="v3"]:not([data-tp-debug]) #vm-debug-badge{display:none}', ''));
  if (mutante === 'dica-na-mira') await reescreve(css, (t) => t.replace('.tp-hud-dicas{position:absolute;left:50%;bottom:24px', '.tp-hud-dicas{position:absolute;left:50%;bottom:50%'));
  if (mutante === 'dica-sem-en') await reescreve(/\/js\/i18n\.js/, (t) => t.replace("'ABATES': 'KILLS',", ''));
  if (mutante === 'legado-vazado') await reescreve(/\/style\.css/, (t) => `${t}\n#hp-num{font-family:Arial}`);
  if (mutante === 'ping-mentiroso') await reescreve(css, (t) => t.replace(':root[data-ui="v3"] #scoreboard .sb-ping{display:none}', ''));
  if (mutante === 'hs-errado') await reescreve(js, (t) => t.replace('Math.round((100 * hs) / k)', 'Math.round((100 * k) / Math.max(1, hs))'));
  if (mutante === 'abas-mudas') await reescreve(js, (t) => t.replace('sec.dataset.tpFiltro = f;', ''));
  if (mutante === 'tab-foco') await reescreve(js, (t) => t.replace("if (e.key !== 'Tab' || e.shiftKey) return;", 'return;'));
  if (mutante === 'chat-eterno') await reescreve(css, (t) => t.replace('#chat-sala:not(.aberto) #chat-log>li:not(:nth-last-child(-n+3)){display:none}', ''));
  if (mutante === 'sem-silenciar') await reescreve(js, (t) => t.replace("acoes.insertBefore(silenciar, bloquear);", ''));
  if (mutante === 'pula-pequeno') await reescreve(css, (t) => t.replace('.tp-toque-pula{right:calc(40px + var(--sr));bottom:calc(128px + var(--sb));width:56px;height:56px}', '.tp-toque-pula{right:calc(40px + var(--sr));bottom:calc(128px + var(--sb));width:36px;height:36px}'));
  if (mutante === 'atira-mudo') await reescreve(js, (t) => t.replace('g.mouseDown0 = true;', ''));
  if (mutante === 'ping-surdo') await reescreve(js, (t) => t.replace("e.code === 'KeyF'", "e.code === 'KeyF9'"));
}

const aoVivo = async (page) => {
  await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 180000 });
  await page.waitForTimeout(2500);
};
const abrir = async (q, { w = 1536, h = 1024, toque = false, mutante = '' } = {}) => {
  const dispositivo = toque
    ? { ...devices['Pixel 5'], viewport: { width: w, height: h }, screen: { width: w, height: h }, deviceScaleFactor: 3 }
    : { viewport: { width: w, height: h } };
  const ctx = await browser.newContext(dispositivo);
  const page = await ctx.newPage();
  await preparar(page, mutante);
  await page.goto(`${BASE}/?${q}`, { waitUntil: 'commit', timeout: 120000 });
  await aoVivo(page);
  return { page, fechar: () => ctx.close() };
};

/* Caixas visíveis dos blocos do HUD, para checar encosto entre eles e com a mira. */
const caixas = () => {
  const vis = (e) => e && e.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && e.getBoundingClientRect().width > 0;
  const cx = (sel) => { const e = document.querySelector(sel); if (!vis(e)) return null; const b = e.getBoundingClientRect(); return { sel, l: b.left, t: b.top, r: b.right, b: b.bottom }; };
  return {
    vw: innerWidth, vh: innerHeight,
    blocos: ['#radar', '#hud-top', '#killfeed', '#hud-bottom-left', '#hud-bottom-right', '#weapon-hud', '.tp-hud-dicas', '#hud-actions', '#radio-log'].map(cx).filter(Boolean),
  };
};
const cruza = (a, b) => a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1;

async function medir(mutante = '', alvo = '') {
  const r = [];
  const add = (id, ok, msg) => r.push({ id, ok: !!ok, msg });
  mkdirSync(OUT, { recursive: true });
  const foto = (p, nome) => (mutante ? null : p.screenshot({ path: `${OUT}/${nome}.png` }));

  /* Num mutante só roda a parte da partida que mede a cláusula dele: o navegador é dividido entre as frentes. */
  const SECAO = { HU8: ['p05', 'telas'], HU9: ['idioma'], HU10: ['legado'], HU13: ['toque'] };
  const roda = (s) => !alvo || (SECAO[alvo] || ['p05']).includes(s);
  let g0 = { blocos: [], vw: 0, vh: 0 }, cobertura = { frac: 0, total: 0 };
  if (roda('p05')) {
  /* ---------- 05 · HUD em 3:2, PT ---------- */
  const { page: p, fechar } = await abrir(`ui=v3&${PARTIDA}&lang=pt`, { mutante });
  const topo = await p.evaluate(() => {
    const g = window.__game;
    const lados = {};
    for (const lado of ['E', 'B']) {
      const fila = document.querySelector(`#hud-top .tp-hud-retratos[data-lado="${lado}"]`);
      const imgs = fila ? [...fila.querySelectorAll('img.tp-hud-retrato')] : [];
      const quer = g.combatants.filter((c) => c.team === lado).length;
      lados[lado] = { n: imgs.length, quer: Math.min(5, quer) };
    }
    const css = (sel, k) => { const e = document.querySelector(sel); return e ? getComputedStyle(e)[k] : ''; };
    return { lados, bgE: css('#score-e', 'backgroundColor'), bgB: css('#score-b', 'backgroundColor'),
      tempoFonte: css('#round-time', 'fontFamily'), tempoNum: css('#round-time', 'fontVariantNumeric') };
  });
  /* mata um inimigo que esteja no retrato e espera a fila marcar */
  const morto = await p.evaluate(async () => {
    const g = window.__game;
    const alvo = g.combatants.find((c) => c.team !== g.playerTeam && c.alive && !c.isPlayer);
    if (!alvo) return { ok: false, msg: 'sem inimigo vivo' };
    /* morte como o motor faz (game.js _kill): sem empurrar respawnAt o loop revive o bot
       no tick seguinte (this.time >= respawnAt) e o morto some antes da medição. */
    const antes = alvo.respawnAt;
    alvo.alive = false; alvo.hp = 0; alvo.respawnAt = g.time + 10;
    await new Promise((res) => setTimeout(res, 700));
    const fila = document.querySelector(`#hud-top .tp-hud-retratos[data-lado="${alvo.team}"]`);
    const marcados = fila ? fila.querySelectorAll('img[data-morto]').length : 0;
    const mortos = g.combatants.filter((c) => c.team === alvo.team && !c.alive).slice(0, 5).length;
    alvo.alive = true; alvo.hp = 100; alvo.respawnAt = antes;
    return { ok: marcados === mortos && mortos > 0, msg: `${marcados} retrato(s) apagado(s) para ${mortos} morto(s) no time ${alvo.team}` };
  });
  const filaOk = ['E', 'B'].every((l) => topo.lados[l].n === topo.lados[l].quer && topo.lados[l].n > 0);
  add('HU1', filaOk && morto.ok, !filaOk ? `retratos ${['E', 'B'].map((l) => `${l}: ${topo.lados[l].n} de ${topo.lados[l].quer}`).join(', ')}` : morto.msg);
  const placarOk = topo.bgE === 'rgb(224, 50, 50)' && topo.bgB === 'rgb(47, 85, 224)' && /JetBrains Mono/.test(topo.tempoFonte) && /tabular-nums/.test(topo.tempoNum);
  add('HU2', placarOk, `placar: esquerda ${topo.bgE}, direita ${topo.bgB}, relógio ${topo.tempoFonte.split(',')[0]} ${topo.tempoNum} (quer #E03232, #2F55E0, JetBrains Mono tabular)`);

  const vitais = await p.evaluate(() => {
    const hp = document.getElementById('hp-num');
    const cs = hp ? getComputedStyle(hp) : null;
    const hud = document.getElementById('hud');
    const texto = hud.innerText;
    return { fonte: cs?.fontFamily || '', tam: parseFloat(cs?.fontSize || '0'), rotulo: document.querySelector('.tp-hud-vida-rotulo')?.textContent || '',
      falso: (texto.match(/\bXP\b|COLETE|ARMOR|\bN[ÍI]VEL\b/i) || [])[0] || '' };
  });
  /* Faixa da vida pela escala do prompt Treta Pop §2d: clamp(34px, 4vh, 44px). */
  add('HU3', /Anton/.test(vitais.fonte) && vitais.tam >= 34 && vitais.tam <= 44 && vitais.rotulo === 'VIDA' && !vitais.falso,
    vitais.falso ? `número sem dado no cliente aparece no HUD: "${vitais.falso}"` : `vida em ${vitais.fonte.split(',')[0]} ${vitais.tam}px, rótulo "${vitais.rotulo}"`);

  const mun = await p.evaluate(() => {
    const cs = (id) => getComputedStyle(document.getElementById(id));
    const b = (id) => document.getElementById(id).getBoundingClientRect();
    const painel = b('hud-bottom-right');
    return { mag: cs('ammo-mag').fontVariantNumeric, res: cs('ammo-reserve').fontVariantNumeric, fonte: cs('ammo-mag').fontFamily,
      nomeAcima: b('weapon-name').bottom <= b('ammo-mag').top + 1, dir: innerWidth - painel.right, baixo: innerHeight - painel.bottom };
  });
  add('HU4', /tabular-nums/.test(mun.mag) && /tabular-nums/.test(mun.res) && /JetBrains Mono/.test(mun.fonte) && mun.nomeAcima && Math.abs(mun.dir - 24) <= 4 && Math.abs(mun.baixo - 24) <= 4,
    `munição ${mun.fonte.split(',')[0]} ${mun.mag}/${mun.res}, nome ${mun.nomeAcima ? 'acima' : 'abaixo'} do número, painel a ${mun.dir.toFixed(0)}/${mun.baixo.toFixed(0)} px da borda (quer 24)`);

  const feed = await p.evaluate(async () => {
    const g = window.__game;
    const alvo = g.combatants.find((c) => c.team !== g.playerTeam && !c.isPlayer);
    g._feed(g.player, alvo, 'AK', true);
    await new Promise((res) => setTimeout(res, 200));
    const row = document.querySelector('#killfeed .kf-row');
    const hs = row?.querySelector('.tp-hs');
    return { hs: !!hs && hs.checkVisibility(), hsCor: hs ? getComputedStyle(hs).color : '', arma: !!row?.querySelector('.kf-weapon-2d,.kf-ic'),
      borda: row ? getComputedStyle(row).borderLeftColor : '', caveira: !!row?.querySelector('.kf-skull') };
  });
  add('HU5', feed.hs && feed.hsCor === 'rgb(180, 217, 46)' && feed.arma && feed.borda === 'rgb(180, 217, 46)' && !feed.caveira,
    `killfeed: headshot ${feed.hs ? `visível (${feed.hsCor})` : 'ausente'}${feed.caveira ? ', caveira antiga sobrou' : ''}, arma ${feed.arma ? 'sim' : 'não'}, borda do seu abate ${feed.borda}`);

  await foto(p, 'hud-05-1536x1024');
  g0 = await p.evaluate(caixas);
  const dicas0 = await p.evaluate(() => {
    const d = document.querySelector('.tp-hud-dicas');
    return { n: d ? d.querySelectorAll('kbd').length : 0, vis: !!d && d.checkVisibility({ opacityProperty: true }) };
  });
  /* VM: diferença entre o quadro com e sem a cena do viewmodel, no mesmo instante de jogo */
  const vm = await p.evaluate(() => { const g = window.__game; g._tpCongela = g.update; g.update = () => {}; return true; });
  const comVm = await p.screenshot();
  await p.evaluate(() => { const g = window.__game; g.vmScene.visible = false; g.renderer.render(g.scene, g.camera); });
  await p.waitForTimeout(150);
  const semVm = await p.screenshot();
  await p.evaluate(() => { const g = window.__game; g.vmScene.visible = true; g.update = g._tpCongela; });
  cobertura = await (async () => {
    const [a, b] = await Promise.all([sharp(comVm).raw().toBuffer({ resolveWithObject: true }), sharp(semVm).raw().toBuffer()]);
    const { data, info } = a; let vmPx = 0, coberto = 0;
    const paineis = g0.blocos.filter((c) => !['.tp-hud-dicas', '#radio-log'].includes(c.sel));
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      if (Math.abs(data[i] - b[i]) + Math.abs(data[i + 1] - b[i + 1]) + Math.abs(data[i + 2] - b[i + 2]) < 40) continue;
      if (paineis.some((c) => x >= c.l && x < c.r && y >= c.t && y < c.b)) { coberto++; continue; }
      vmPx++;
    }
    return { frac: vm && (vmPx + coberto) ? coberto / (vmPx + coberto) : 0, total: vmPx + coberto };
  })();
  await p.evaluate(() => { const g = window.__game; g.time += 61; });
  await p.waitForTimeout(1200);
  const dicas1 = await p.evaluate(() => { const d = document.querySelector('.tp-hud-dicas'); return !!d && d.checkVisibility({ opacityProperty: true }); });
  add('HU6', dicas0.n >= 3 && dicas0.vis && !dicas1, `dicas de tecla: ${dicas0.n} teclas, ${dicas0.vis ? 'visíveis' : 'escondidas'} no começo, ${dicas1 ? 'ainda visíveis' : 'somem'} depois de 1 min`);

  const badge = await p.evaluate(async () => {
    const b = document.getElementById('vm-debug-badge');
    const comDebug = !!b && b.checkVisibility();
    document.documentElement.removeAttribute('data-tp-debug');
    await new Promise((res) => setTimeout(res, 50));
    const sem = !!b && b.checkVisibility();
    document.documentElement.setAttribute('data-tp-debug', '');
    return { existe: !!b, comDebug, sem };
  });
  add('HU7', badge.existe && badge.comDebug && !badge.sem, !badge.existe ? 'sem overlay vm para medir' : `overlay "vm:" ${badge.comDebug ? 'aparece' : 'some'} com ?debug=1 e ${badge.sem ? 'aparece' : 'some'} sem`);

  /* ---------- placar (Tab) ---------- */
  const sb = await p.evaluate(async () => {
    const g = window.__game;
    g.player.kills = 4; g.player.headshots = 1;
    g._showScoreboard(true);
    await new Promise((res) => setTimeout(res, 300));
    const linhas = [...document.querySelectorAll('#sb-cols tbody tr')];
    const ping = [...document.querySelectorAll('#scoreboard .sb-ping')].filter((e) => e.checkVisibility()).length;
    const av = linhas.filter((tr) => !!tr.querySelector('img.tp-sb-av')?.getAttribute('src')).length;
    const eu = document.querySelector('#sb-cols tr.me .tp-sb-hs')?.textContent.trim() || '';
    const outros = [...document.querySelectorAll('#sb-cols tr:not(.me) .tp-sb-hs')].map((e) => e.textContent.trim()).filter((t) => /\d/.test(t)).length;
    const dano = /\bDANO\b|\bDMG\b/.test(document.getElementById('scoreboard').innerText);
    return { n: linhas.length, ping, av, eu, outros, dano };
  });
  await foto(p, 'placar-1536x1024');
  await p.evaluate(() => window.__game._showScoreboard(false));
  add('HU11', sb.n > 0 && !sb.ping && sb.av === sb.n && sb.eu === '25%' && !sb.outros && !sb.dano,
    sb.ping ? `placar mostra ${sb.ping} ping(s) inventado(s)` : `placar: ${sb.av}/${sb.n} avatares, seu HS% "${sb.eu}" (quer 25%), ${sb.outros} HS% de quem o cliente não mede${sb.dano ? ', coluna de dano sem dado' : ''}`);

  /* ---------- ping ---------- */
  const ping = await p.evaluate(async () => {
    const g = window.__game;
    dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF', key: 'f', bubbles: true }));
    dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyF', key: 'f', bubbles: true }));
    await new Promise((res) => setTimeout(res, 400));
    const m = document.querySelector('.tp-hud-ping');
    const fala = m?.querySelector('.tp-hud-ping__fala')?.textContent || '';
    const dist = m?.querySelector('.tp-hud-ping__dist')?.textContent || '';
    const log = [...document.querySelectorAll('#radio-log .tp-ping-linha')].length;
    return { vis: !!m && m.checkVisibility(), fala, dist, log, live: g.state };
  });
  await foto(p, 'ping-1536x1024');
  add('HU14', ping.vis && ping.fala && /^\d+ m$/.test(ping.dist) && ping.log > 0, `ping (F): marcador ${ping.vis ? 'visível' : 'ausente'}, fala "${ping.fala}", distância "${ping.dist}", ${ping.log} linha(s) no log`);

  /* ---------- 13 · chat de sala com o contrato do #686 ---------- */
  const chat = await p.evaluate(async () => {
    const mod = await import('/js/chat-painel.js');
    const { tr, frase } = await import('/js/i18n.js');
    const espera = (ms) => new Promise((res) => setTimeout(res, ms));
    const meta = { chat: { v: 1, eu: { h: 'K3F' }, pode: 1, canais: ['sala', 'time'], max: 160, epoca: 'QX9W2A7B', denuncia: ['ofensa', 'odio', 'assedio', 'spam', 'outro'] } };
    const net = { meta, espectador: false, yourEnt: 7, enviarChat: () => true, denunciarChat: () => true, drenarChat: () => [], onChat: null };
    const ctr = mod.montarChatSala({ net, obterJogo: () => window.__game, tr, frase, convite: 'ABCD' });
    window.__tpChat = ctr;
    const msg = (id, extra) => net.onChat({ type: 'chat', id, t: 1000 + id, ch: 'sala', aud: 'todos', h: `H${id}`, esp: 0, time: 'E', txt: `linha ${id}`, ...extra });
    msg(1, { nk: 'PunkDoPiscinao', ch: 'time', aud: 'time', txt: 'segura o B que eu vou pelo telhado' });
    msg(2, { nk: 'ET_Varginha', time: 'B', txt: 'chora na live kkkkk' });
    msg(3, { nk: 'SertanejoBR', time: 'B', txt: '1x0 é sorte, quero ver segurar' });
    msg(4, { h: 'K3F', ch: 'time', aud: 'time', txt: 'tô no bec, vem comigo' });
    window.__game._radioShow?.('z'); window.__game._radioPick?.(1); window.__game.radioOpen = null; window.__game._radioUi?.();
    await espera(300);
    const vis = (e) => e.checkVisibility({ opacityProperty: true });
    const fechadoVis = [...document.querySelectorAll('#chat-log > li')].filter(vis).length;
    const dur = parseFloat(getComputedStyle(document.querySelector('#chat-log .chat-linha')).animationDuration);
    ctr.abrir('sala');
    await espera(200);
    const abas = [...document.querySelectorAll('#chat-sala .tp-chat-abas [role="tab"]')];
    const radio = document.querySelectorAll('#chat-log .tp-chat-radio').length;
    abas.find((a) => a.dataset.filtro === 'time')?.click();
    await espera(100);
    const soTime = [...document.querySelectorAll('#chat-log > li')].filter(vis).every((li) => li.classList.contains('time'));
    const nTime = [...document.querySelectorAll('#chat-log > li')].filter(vis).length;
    abas.find((a) => a.dataset.filtro === 'todos')?.click();
    await espera(100);
    const canal0 = document.getElementById('chat-canal').textContent;
    const ent = document.getElementById('chat-entrada');
    ent.focus();
    ent.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', bubbles: true, cancelable: true }));
    await espera(50);
    const canal1 = document.getElementById('chat-canal').textContent;
    const foco = document.activeElement?.id;
    document.querySelector('#chat-log .chat-linha:not(.propria)')?.click();
    await espera(150);
    const acoes = document.getElementById('chat-acoes');
    const itens = acoes && !acoes.hidden ? [...acoes.querySelectorAll('button')].filter(vis).map((b) => b.id) : [];
    return { fechadoVis, dur, abas: abas.length, radio, soTime, nTime, canal0, canal1, foco, itens };
  });
  await foto(p, 'hud-13-chat-1536x1024');
  const silencio = await p.evaluate(async () => {
    document.getElementById('tp-chat-silenciar')?.click();
    await new Promise((res) => setTimeout(res, 150));
    const visH = [...document.querySelectorAll('#chat-log .chat-linha[data-h="H1"]')].filter((e) => e.checkVisibility()).length;
    window.__tpChat.fechar();
    return visH;
  });
  const chatOk = chat.fechadoVis <= 3 && chat.dur === 6 && chat.abas === 3 && chat.radio > 0 && chat.soTime && chat.nTime > 0
    && chat.canal0 !== chat.canal1 && chat.foco === 'chat-entrada' && ['tp-chat-silenciar', 'chat-bloquear', 'chat-denunciar'].every((i) => chat.itens.includes(i)) && silencio === 0;
  add('HU12', chatOk, `chat: fechado ${chat.fechadoVis} linha(s) por ${chat.dur}s (quer ≤3 por 6s), ${chat.abas} abas, ${chat.radio} rádio no log, aba TIME ${chat.soTime ? 'filtra' : 'não filtra'} (${chat.nTime}), TAB ${chat.canal0}→${chat.canal1} foco #${chat.foco}, menu [${chat.itens.join(' ')}], silenciado ${silencio ? 'ainda visível' : 'some'}`);
  await fechar();
  }

  if (roda('telas')) {
  /* ---------- encosto, mira e viewmodel nas telas desktop ---------- */
  const enc = [];
  const checaEncosto = (g, rot) => {
    const mira = { l: g.vw / 2 - 60, r: g.vw / 2 + 60, t: g.vh / 2 - 60, b: g.vh / 2 + 60 };
    for (let i = 0; i < g.blocos.length; i++) {
      const a = g.blocos[i];
      if (a.l < 0 || a.t < 0 || a.r > g.vw + 1 || a.b > g.vh + 1) enc.push(`${rot} ${a.sel} sai da tela`);
      if (cruza(a, mira)) enc.push(`${rot} ${a.sel} na mira`);
      for (const b of g.blocos.slice(i + 1)) if (cruza(a, b)) enc.push(`${rot} ${a.sel}×${b.sel}`);
    }
  };
  checaEncosto(g0, '1536×1024');
  for (const [w, h] of VIEWPORTS.slice(1)) {
    const { page, fechar: f } = await abrir(`ui=v3&${PARTIDA}&lang=pt`, { w, h, mutante });
    checaEncosto(await page.evaluate(caixas), `${w}×${h}`);
    await foto(page, `hud-05-${w}x${h}`);
    await f();
  }
  add('HU8', !enc.length && cobertura.frac <= VM_TETO && cobertura.total > 500,
    enc.length ? `encosto: ${enc.slice(0, 4).join('; ')}` : `${VIEWPORTS.length} telas sem encosto; painéis cobrem ${(cobertura.frac * 100).toFixed(1)}% do viewmodel (teto ${(VM_TETO * 100).toFixed(0)}%, ${cobertura.total} px medidos)`);
  }

  if (roda('idioma')) {
  /* ---------- idioma: EN sem PT e PT sem EN, com o aviso da mira (só aparece fora do debug) ---------- */
  const textos = {};
  for (const lang of ['pt', 'en']) {
    const { page, fechar: f } = await abrir(`ui=v3&${PARTIDA}&lang=${lang}`, { mutante });
    /* o aviso da mira não aparece com ?debug=1 (testMode); o quadro congela para mostrá-lo */
    textos[lang] = await page.evaluate(() => {
      const g = window.__game; g._tpCongela = g.update; g.update = () => {};
      document.getElementById('lock-hint')?.classList.remove('hidden');
      return [document.getElementById('hud').innerText, document.getElementById('scoreboard').innerText].join('\n');
    });
    await foto(page, `hud-05-trava-${lang}-1536x1024`);
    await f();
  }
  const vazaEn = (textos.en.match(PT_VAZA) || [])[0], vazaPt = (textos.pt.match(EN_VAZA) || [])[0];
  const temTrava = /CLICK TO LOCK THE CROSSHAIR/.test(textos.en) && /CLIQUE PARA ATIVAR A MIRA/.test(textos.pt);
  add('HU9', !vazaEn && !vazaPt && temTrava, vazaEn || vazaPt ? `idioma misturado: "${vazaEn || vazaPt}" ${vazaEn ? 'em EN' : 'em PT'}` : temTrava ? 'PT e EN sem string do outro idioma, aviso da mira traduzido' : 'aviso da mira sem tradução');
  }

  if (roda('legado')) {
  /* ---------- ?ui=legacy mantém a tela anterior ---------- */
  const { page: leg, fechar: fl } = await abrir(`ui=legacy&${PARTIDA}`, { mutante });
  const hoje = await leg.evaluate(() => ({
    tp: document.querySelectorAll('[class*="tp-hud"],[class*="tp-chat"],[class*="tp-toque"],.tp-sb-av').length,
    folha: [...document.styleSheets].some((s) => /\/css\/tp\/hud\.css/.test(s.href || '')),
    scoreE: getComputedStyle(document.getElementById('score-e')).backgroundColor,
    hpFonte: getComputedStyle(document.getElementById('hp-num')).fontFamily.split(',')[0].replace(/['"]/g, ''),
    atalhos: getComputedStyle(document.getElementById('hud-shortcuts')).display,
    radar: getComputedStyle(document.getElementById('radar')).width,
  }));
  await foto(leg, 'hoje-1536x1024');
  await fl();
  const difere = Object.entries(LEGADO).filter(([k, v]) => hoje[k] !== v).map(([k, v]) => `${k}=${hoje[k]} (hoje ${v})`);
  add('HU10', !hoje.tp && !hoje.folha && !difere.length, hoje.tp || hoje.folha ? `com ?ui=legacy aparecem ${hoje.tp} nós tp e a folha ${hoje.folha ? 'carrega' : 'não carrega'}` : difere.length ? `?ui=legacy mudou o HUD: ${difere.join(', ')}` : '?ui=legacy mantém o HUD anterior');
  }

  if (roda('toque')) {
  /* ---------- 21 · HUD por toque, enquadramento atual e Galaxy A25 ---------- */
  for (const [indice, [tw, th]] of TOQUES.entries()) {
    const { page: m, fechar: fm } = await abrir(`ui=v3&${PARTIDA}&lang=pt`, { w: tw, h: th, toque: true, mutante });
    const toque = await m.evaluate(async () => {
      const g = window.__game;
      const vis = (e) => e && e.checkVisibility() && e.getBoundingClientRect().width > 0;
      const alvos = { ATIRA: '.tp-toque-atira', MIRA: '.touch-ads', PULA: '.tp-toque-pula', R: '.touch-reload', AGACHA: '.touch-crouch', PING: '.tp-toque-ping',
        PLACAR: '.tp-toque-placar', PAUSA: '.touch-pause', ARMA: '.touch-wep' };
      const rects = {}, faltam = [], pequenos = [];
      for (const [nome, sel] of Object.entries(alvos)) {
        const e = document.querySelector(`#touch-ui ${sel}`);
        if (!vis(e)) { faltam.push(nome); continue; }
        const b = e.getBoundingClientRect();
        rects[nome] = { l: b.left, t: b.top, r: b.right, b: b.bottom };
        if (b.width < 44 || b.height < 44) pequenos.push(`${nome} ${b.width.toFixed(0)}×${b.height.toFixed(0)}`);
      }
      const nomes = Object.keys(rects), cruzam = [];
      for (let i = 0; i < nomes.length; i++) for (const n2 of nomes.slice(i + 1)) {
        const a = rects[nomes[i]], b = rects[n2];
        if (a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1) cruzam.push(`${nomes[i]}×${n2}`);
      }
      const olhar = document.querySelector('#touch-ui .touch-look')?.getBoundingClientRect();
      const joyR = vis(document.querySelector('#touch-ui .touch-joy-r'));
      const toca = (sel, tipo) => {
        const e = document.querySelector(`#touch-ui ${sel}`);
        if (!e) return;
        const b = e.getBoundingClientRect();
        const t = new Touch({ identifier: Date.now() % 1000, target: e, clientX: b.left + b.width / 2, clientY: b.top + b.height / 2 });
        e.dispatchEvent(new TouchEvent(tipo, { touches: tipo === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true }));
      };
      toca('.tp-toque-atira', 'touchstart');
      const atira = !!g.mouseDown0;
      toca('.tp-toque-atira', 'touchend');
      toca('.tp-toque-pula', 'touchstart');
      const pula = !!g.keys.Space;
      toca('.tp-toque-pula', 'touchend');
      return { faltam, pequenos, cruzam, olhar: olhar ? (innerWidth - olhar.left) / innerWidth : 0, joyR, atira, pula, solto: !g.keys.Space };
    });
    await foto(m, `hud-21-toque-${tw}x${th}`);
    await fm();
    const id = indice ? 'HU13b' : 'HU13';
    add(id, !toque.faltam.length && !toque.pequenos.length && !toque.cruzam.length && toque.olhar >= 0.45 && !toque.joyR && toque.atira && toque.pula && toque.solto,
      toque.faltam.length ? `${tw}×${th}: faltam no toque: ${toque.faltam.join(', ')}` : toque.pequenos.length ? `${tw}×${th}: alvo abaixo de 44 px: ${toque.pequenos.join(', ')}`
        : toque.cruzam.length ? `${tw}×${th}: botões encostam: ${toque.cruzam.join(', ')}` : `${tw}×${th}: 9 alvos ≥44 px sem encosto, arraste da mira em ${(toque.olhar * 100).toFixed(0)}% da tela${toque.joyR ? ', stick direito sobrando' : ''}, ATIRA ${toque.atira ? 'atira' : 'mudo'}, PULA ${toque.pula ? 'pula' : 'mudo'}`);
  }
  }
  return r;
}

const MUT = [['retrato-vivo', 'HU1'], ['placar-cinza', 'HU2'], ['xp-falso', 'HU3'], ['municao-proporcional', 'HU4'], ['sem-hs', 'HU5'],
  ['dica-eterna', 'HU6'], ['badge-solto', 'HU7'], ['dica-na-mira', 'HU8'], ['dica-sem-en', 'HU9'], ['legado-vazado', 'HU10'],
  ['ping-mentiroso', 'HU11'], ['hs-errado', 'HU11'], ['abas-mudas', 'HU12'], ['tab-foco', 'HU12'], ['chat-eterno', 'HU12'], ['sem-silenciar', 'HU12'],
  ['pula-pequeno', 'HU13'], ['atira-mudo', 'HU13'], ['ping-surdo', 'HU14']];
let sair = 0;
if (process.argv.includes('--mutantes')) {
  for (const [mut, alvo] of MUT.filter(([m]) => !process.env.SO || process.env.SO.split(',').includes(m))) {
    let c;
    try { c = (await medir(mut, alvo)).find((x) => x.id === alvo); } catch (e) { c = { ok: false, msg: `quebrou a medição: ${e.message.split('\n')[0]}` }; }
    if (c.ok) sair = 1;
    console.log(`${c.ok ? 'CEGO  ' : 'MORDE '} ${alvo} (${mut})  ${c.msg}`);
  }
} else {
  const r = await medir();
  for (const c of r.sort((a, b) => Number(a.id.slice(2)) - Number(b.id.slice(2)))) console.log(`${c.ok ? 'VERDE   ' : 'VERMELHO'} ${c.id}  ${c.msg}`);
  sair = r.every((c) => c.ok) ? 0 : 1;
  console.log(`\nhud v3: ${r.filter((c) => c.ok).length}/${r.length}  (capturas em ${OUT})`);
}
await browser.close();
process.exit(sair);
