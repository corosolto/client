#!/usr/bin/env node
/* Régua da tela Modo e mapa da Treta Pop (telas 03 e 19 de design/treta-pop-2026-10-14), medida no Chrome.
     BASE=http://127.0.0.1:9422 node tools/eval/ui-v3-modos.mjs [--mutantes]   (SO=<mutante> roda um só)
   Capturas em OUT (padrão tools/eval/out/ui-v3-modos). Um navegador por vez: rode via with-browser-lock.sh. */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'http://127.0.0.1:9422';
const OUT = process.env.OUT || 'tools/eval/out/ui-v3-modos';
const VIEWPORTS = [[1536, 1024], [1920, 1080], [1280, 720], [844, 390]];
/* Selo NOVO: mapa com data de entrada (mapcat.js MAP_DATA) a no máximo 30 dias de hoje. */
const NOVO_DIAS = 30;
const SALVO = { map: 'praca_poderes', mapPinned: true, wpnMode: 'all', allyBots: 3, enemyBots: 4, rounds: 5, ctfRounds: 3, difficulty: 'normal', pinnedChars: ['et', 'sertanejo'] };
/* Texto da tela em um idioma que não pode aparecer no outro. */
const SO_PT = /\b(ESCOLHA A TRETA|FAVORITOS|NOVOS|Buscar mapa|MAPA ALEATÓRIO|SALA PRIVADA|Salas públicas|INIMIGOS|SEU TIME|ARMAS|PISTOLAS|FACA|DE BOA|INSANO|ESCALAÇÃO|Escalação|EDITAR|JOGAR|você|CAPTURA|MATA-MATA|VIRA-CASACA|TODOS|OFICIAIS|COMUNIDADE)\b/;
const SO_EN = /\b(PICK YOUR FIGHT|FAVORITES|Search map|RANDOM MAP|PRIVATE ROOM|Public rooms|ENEMIES|YOUR TEAM|WEAPONS|PISTOLS|KNIFE|CHILL|INSANE|LINEUP|Lineup|EDIT|PLAY|you|CAPTURE|DEATHMATCH|TURNCOAT|ALL|OFFICIAL|COMMUNITY)\b/;

const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio', '--autoplay-policy=no-user-gesture-required'],
});

/* Mutantes reescrevem o arquivo servido; cada um prova que aplicou. */
const MUTANTES = {
  'sem-tela-cheia': [/\/css\/tp\/modos\.css/, (t) => t.replace('#hub-map-modal{padding:0', '#hub-map-modal{padding:12vh 20vw')],
  'modo-nao-aplica': [/\/js\/tp\/modos\.js/, (t) => t.replace("document.getElementById(m.botao)?.click();", ';')],
  'arena-nao-aplica': [/\/js\/tp\/modos\.js/, (t) => t.replace("document.getElementById(m.botao)?.click();", "if (m.id !== 'arena') document.getElementById(m.botao)?.click();")],
  'privada-nao-abre': [/\/js\/tp\/modos\.js/, (t) => t.replace("if (m.id === 'privada') $('hub-mp-private')?.click();", ';')],
  'mapa-fecha': [/\/js\/tp\/modos\.js/, (t) => t.replace('api().irMapa(id);', "api().irMapa(id); document.getElementById('hub-map-close')?.click();")],
  'busca-morta': [/\/js\/tp\/modos\.js/, (t) => t.replace('if (busca && !normal(m.nome).includes(busca)) return false;', '')],
  'favorito-volatil': [/\/js\/tp\/modos\.js/, (t) => t.replace('localStorage.setItem(CHAVE_FAV, JSON.stringify([...favs]));', ';')],
  'novo-inventado': [/\/js\/tp\/modos\.js/, (t) => t.replace('const NOVO_DIAS = 30;', 'const NOVO_DIAS = 3650;')],
  'aleatorio-repete': [/\/js\/tp\/modos\.js/, (t) => t.replace('const pool = vis.filter((m) => m.id !== atual);', 'const pool = vis.filter((m) => m.id === atual);')],
  'passo-mentiroso': [/\/js\/tp\/modos\.js/, (t) => t.replace('sel.value = String(v); sel.onchange?.();', ';')],
  'dois-primarios': [/\/js\/tp\/modos\.js/, (t) => t.replace("voltar.classList.add('tp-modos__voltar');", "voltar.classList.add('tp-modos__voltar', 'tp-btn', 'tp-btn--primario');")],
  'jogar-morto': [/\/js\/tp\/modos\.js/, (t) => t.replace("document.getElementById('hub-quick-confirm')?.click();", ';')],
  'filtros-no-celular': [/\/css\/tp\/modos\.css/, (t) => t.replace('  .tp-modos__filtros,.tp-modos__fav{display:none}', '  .tp-modos__fav{display:none}')],
  'alvo-pequeno': [/\/css\/tp\/modos\.css/, (t) => t.replace('--tp-modos-alvo:44px', '--tp-modos-alvo:30px')],
  'en-vaza': [/\/js\/i18n\.js/, (t) => t.replace("'MAPA ALEATÓRIO': 'RANDOM MAP',", '')],
  'gancho-sem-flag': [/\/js\/main\.js/, (t) => t.replace("if (document.documentElement.dataset.ui === 'v3') window.__tpModos = {", 'window.__tpModos = {')],
  'pino-cobre': [/\/css\/tp\/modos\.css/, (t) => t.replace('.hub-roster-pin{top:6px;bottom:auto', '.hub-roster-pin{top:auto;bottom:6px')],
  'escalacao-inventada': [/\/js\/tp\/modos\.js/, (t) => t.replace('const n = est.escalados.length;', 'const n = est.escalados.length + 2;')],
  'online-inventado': [/\/js\/tp\/modos\.js/, (t) => t.replace('const n = box && !box.hidden ? parseInt(box.textContent, 10) || 0 : 0;', 'const n = 42;')],
};
const ALVO = {
  'sem-tela-cheia': 'MO1', 'modo-nao-aplica': 'MO2', 'arena-nao-aplica': 'MO2', 'privada-nao-abre': 'MO2', 'mapa-fecha': 'MO3', 'busca-morta': 'MO4', 'favorito-volatil': 'MO5', 'novo-inventado': 'MO6',
  'aleatorio-repete': 'MO7', 'passo-mentiroso': 'MO8', 'dois-primarios': 'MO9', 'jogar-morto': 'MO10', 'escalacao-inventada': 'MO11',
  'online-inventado': 'MO12', 'filtros-no-celular': 'MO13', 'alvo-pequeno': 'MO14', 'en-vaza': 'MO15', 'gancho-sem-flag': 'MO16', 'pino-cobre': 'MO17',
};
const GRUPO = { MO13: 'telas', MO14: 'telas', MO15: 'idioma', MO16: 'semflag', MO17: 'escalacao' };

async function abrir({ w = 1536, h = 1024, lang = 'pt', flag = true, rota = '/jogar/mapas', mutante = '', salvo = SALVO }) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.route(/corosolto\.com\.br/, (r) => r.abort());
  if (mutante) {
    const [teste, troca] = MUTANTES[mutante];
    await page.route((u) => teste.test(u.pathname), async (r) => {
      const res = await r.fetch().catch(() => r.fetch());
      const antes = await res.text();
      const depois = troca(antes);
      if (depois === antes) throw new Error(`mutante ${mutante} não aplicou em ${r.request().url()}`);
      await r.fulfill({ response: res, body: depois });
    });
  }
  await page.addInitScript(([s, l]) => {
    if (sessionStorage.getItem('modos-regua')) return;
    sessionStorage.setItem('modos-regua', '1');
    sessionStorage.setItem('cs_login_prompt_seen', '1');
    localStorage.setItem('awpbr_nick', 'RUBAO'); localStorage.setItem('cs_lang', l);
    localStorage.setItem('awpbr_settings', JSON.stringify(s));
    localStorage.removeItem('tp-modos-favoritos');
  }, [salvo, lang]);
  await page.goto(`${BASE}${rota}?${flag ? '' : 'ui=legacy&'}lang=${lang}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  const splash = page.locator('#boot-splash');
  if (await splash.isVisible().catch(() => false)) {
    await page.waitForFunction(() => {
      const j = document.getElementById('tp-splash-jogar'), s = document.getElementById('splash-enter');
      return (j && !j.disabled) || (s && !s.classList.contains('hidden'));
    }, null, { timeout: 120000 });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => { const s = document.getElementById('boot-splash'); return !s || s.classList.contains('gone') || !s.checkVisibility(); }, null, { timeout: 30000 });
  } else {
    await page.waitForFunction(() => window.__CS_MAIN_READY__ === true, null, { timeout: 120000 });
  }
  await page.waitForTimeout(1500);
  const login = page.locator('#login-prompt[open]');
  if (await login.count()) await page.locator('#login-prompt-close').click();
  return page;
}
const imagensProntas = (page) => page.waitForFunction(() => [...document.querySelectorAll('.tp-modos__mapa img')].every((i) => i.complete), null, { timeout: 20000 }).catch(() => {});

async function interativo(mutante, add) {
  const p = await abrir({ mutante });
  const ev = (f, a) => p.evaluate(f, a);
  const estado = () => ev(() => window.__tpModos?.estado?.() || null);
  const raiz = await ev(() => {
    const m = document.getElementById('hub-map-modal'), r = m?.querySelector('.tp-modos');
    const b = m?.getBoundingClientRect();
    return { aberto: !!m && !m.hidden, tem: !!r?.checkVisibility(), caixa: b ? [b.left, b.top, b.right, b.bottom] : [], vw: innerWidth, vh: innerHeight,
      desfoque: m ? getComputedStyle(m).backdropFilter : '', titulo: r?.querySelector('.tp-modos__titulo')?.innerText || '' };
  });
  const cobre = raiz.caixa.length && raiz.caixa[0] <= 0 && raiz.caixa[1] <= 0 && raiz.caixa[2] >= raiz.vw && raiz.caixa[3] >= raiz.vh;
  const card = await ev(() => { const c = document.querySelector('#hub-map-modal .tp-modos'); const b = c?.getBoundingClientRect(); return b ? [b.left, b.top, b.right, b.bottom] : []; });
  const cheia = card.length && card[0] <= 1 && card[1] <= 1 && card[2] >= raiz.vw - 1 && card[3] >= raiz.vh - 1;
  add('MO1', raiz.aberto && raiz.tem && cobre && cheia && raiz.desfoque === 'none' && /ESCOLHA A TRETA/i.test(raiz.titulo),
    !raiz.tem ? '/jogar/mapas sem query não monta a tela Treta Pop' : !cheia ? `tela não ocupa a janela: ${card.map((v) => v.toFixed(0)).join(',')}` : raiz.desfoque !== 'none' ? `blur sobre o canvas: ${raiz.desfoque}` : `tela cheia, sem blur, título "${raiz.titulo.replace(/\s+/g, ' ')}"`);
  if (!raiz.tem) { await p.close(); return; }

  /* MO2: cada cartão muda o modo de verdade; Vira-Casaca é seleção de primeira classe. */
  const modos = async () => ev(() => [...document.querySelectorAll('.tp-modos__modo')].map((b) => [b.dataset.modo, b.getAttribute('aria-pressed')]));
  const m0 = await modos(), e0 = await estado();
  const temArena = await p.locator('.tp-modos__modo[data-modo="arena"]').count() === 1;
  if (temArena) await p.click('.tp-modos__modo[data-modo="arena"]');
  await p.waitForTimeout(300);
  const ea = await estado();
  await p.click('.tp-modos__modo[data-modo="ctf"]'); await p.waitForTimeout(300);
  const m1 = await modos(), e1 = await estado();
  await p.click('.tp-modos__modo[data-modo="rounds"]'); await p.waitForTimeout(300);
  const e2 = await estado();
  await p.click('.tp-modos__modo[data-modo="privada"]'); await p.waitForTimeout(400);
  const mp = await ev(() => ({ fechou: document.getElementById('hub-map-modal').hidden, net: document.getElementById('main-menu').dataset.hubNet, aba: document.getElementById('main-menu').dataset.hubMpTab }));
  await ev(() => { document.getElementById('hub-sp')?.click(); document.getElementById('hub-map-change')?.click(); }); await p.waitForTimeout(500);
  const marcado = (lista) => lista.filter(([, v]) => v === 'true').map(([k]) => k).join(',');
  add('MO2', m0.length >= 5 && marcado(m0) === e0.modo && temArena && ea.modo === 'arena' && e1.modo === 'ctf' && marcado(m1) === 'ctf' && e2.modo === 'rounds' && mp.fechou && mp.net === 'mp' && mp.aba === 'private',
    `${m0.length} cartões (${m0.map(([k]) => k).join(' ')}); VIRA-CASACA → ${ea.modo}; CAPTURA → ${e1.modo} (marcado ${marcado(m1)}); MATA-MATA → ${e2.modo}; SALA PRIVADA → ${mp.fechou ? '' : 'tela aberta, '}aba ${mp.net}/${mp.aba}`);

  /* MO3: um cartão por mapa do menu, arte carregada, seleção = mapa da partida, e escolher não fecha a tela. */
  await imagensProntas(p);
  const g0 = await ev(() => {
    const mapas = window.__tpModos.mapas();
    const cards = [...document.querySelectorAll('.tp-modos__mapa')];
    return { n: mapas.length, cards: cards.map((c) => c.dataset.id), semArte: cards.filter((c) => !(c.querySelector('img')?.naturalWidth > 0)).map((c) => c.dataset.id),
      marcado: cards.filter((c) => c.querySelector('.tp-modos__mapa-btn')?.getAttribute('aria-pressed') === 'true').map((c) => c.dataset.id) };
  });
  const mapaAntes = (await estado())?.mapa;
  const alvo = g0.cards.find((id) => id !== mapaAntes) || '';
  if (alvo) await p.click(`.tp-modos__mapa[data-id="${alvo}"] .tp-modos__mapa-btn`);
  await p.waitForTimeout(500);
  const g1 = await ev((id) => ({ mapa: window.__tpModos.estado().mapa, aberto: !document.getElementById('hub-map-modal').hidden,
    nome: document.querySelector('.tp-modos__nome')?.innerText || '', esperado: window.__tpModos.mapas().find((m) => m.id === id)?.nome || '',
    marcado: [...document.querySelectorAll('.tp-modos__mapa')].filter((c) => c.querySelector('.tp-modos__mapa-btn')?.getAttribute('aria-pressed') === 'true').map((c) => c.dataset.id) }), alvo);
  if (!g1.aberto) { await ev(() => document.getElementById('hub-map-change').click()); await p.waitForTimeout(500); }
  add('MO3', g0.n && g0.cards.length === g0.n && !g0.semArte.length && g0.marcado.join() === e0.mapa && g1.mapa === alvo && g1.aberto && g1.nome.toUpperCase() === g1.esperado.toUpperCase() && g1.marcado.join() === alvo,
    g0.cards.length !== g0.n ? `${g0.cards.length} cartões para ${g0.n} mapas` : g0.semArte.length ? `sem arte: ${g0.semArte.join(', ')}` : g0.marcado.join() !== e0.mapa ? `marcado ${g0.marcado.join()} com mapa ${e0.mapa}`
      : !g1.aberto ? 'escolher o mapa fechou a tela' : g1.mapa !== alvo ? `clique em ${alvo} deixou ${g1.mapa}` : `${g0.n} mapas com arte; ${alvo} escolhido, painel "${g1.nome}", tela segue aberta`);

  /* MO4: a busca recorta pelo nome, sem acento e sem caixa. */
  await p.fill('.tp-modos__busca', 'praca');
  await p.waitForTimeout(250);
  const b1 = await ev(() => {
    const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    return { vis: [...document.querySelectorAll('.tp-modos__mapa')].filter((c) => c.checkVisibility()).map((c) => c.dataset.id),
      quer: window.__tpModos.mapas().filter((m) => norm(m.nome).includes('praca')).map((m) => m.id) };
  });
  await p.fill('.tp-modos__busca', '');
  await p.waitForTimeout(250);
  const b2 = await ev(() => [...document.querySelectorAll('.tp-modos__mapa')].filter((c) => c.checkVisibility()).length);
  add('MO4', b1.quer.length && b1.vis.join() === b1.quer.join() && b2 === g0.n, `busca "praca": ${b1.vis.join(',') || 'nada'} (quer ${b1.quer.join(',')}); vazia volta a ${b2}/${g0.n}`);

  /* MO5: favorito é preferência do jogador, vale depois de fechar e abrir de novo, e o filtro mostra só eles. */
  const favs = g0.cards.slice(-2);
  for (const id of favs) await p.click(`.tp-modos__mapa[data-id="${id}"] .tp-modos__fav`);
  await p.click('#hub-map-close'); await p.waitForTimeout(300);
  await ev(() => document.getElementById('hub-map-change').click()); await p.waitForTimeout(500);
  await p.click('.tp-modos__filtro[data-filtro="favoritos"]'); await p.waitForTimeout(250);
  const f1 = await ev(() => ({ salvo: localStorage.getItem('tp-modos-favoritos') || '',
    vis: [...document.querySelectorAll('.tp-modos__mapa')].filter((c) => c.checkVisibility()).map((c) => c.dataset.id),
    marcados: [...document.querySelectorAll('.tp-modos__fav[aria-pressed="true"]')].map((b) => b.closest('.tp-modos__mapa').dataset.id) }));
  await p.click('.tp-modos__filtro[data-filtro="todos"]'); await p.waitForTimeout(250);
  add('MO5', favs.length === 2 && f1.vis.slice().sort().join() === favs.slice().sort().join() && favs.every((id) => f1.salvo.includes(id)),
    `favoritados ${favs.join(', ')}; depois de reabrir o filtro mostra ${f1.vis.join(', ') || 'nada'}; salvo ${f1.salvo || 'vazio'}`);

  /* MO6: NOVO só para mapa que entrou há no máximo 30 dias. */
  const n1 = await ev((dias) => {
    const hoje = Date.now();
    const recente = (d) => { const [dd, mm, aa] = (d || '').split('/').map(Number); return aa ? (hoje - Date.UTC(aa, mm - 1, dd)) / 864e5 <= dias : false; };
    return { quer: window.__tpModos.mapas().filter((m) => recente(m.data)).map((m) => m.id),
      selo: [...document.querySelectorAll('.tp-modos__mapa')].filter((c) => c.querySelector('[data-selo="novo"]')).map((c) => c.dataset.id) };
  }, NOVO_DIAS);
  await p.click('.tp-modos__filtro[data-filtro="novos"]'); await p.waitForTimeout(250);
  const n2 = await ev(() => ({ vis: [...document.querySelectorAll('.tp-modos__mapa')].filter((c) => c.checkVisibility()).map((c) => c.dataset.id),
    vazio: !!document.querySelector('.tp-modos__vazio')?.checkVisibility() }));
  await p.click('.tp-modos__filtro[data-filtro="todos"]'); await p.waitForTimeout(250);
  add('MO6', n1.selo.join() === n1.quer.join() && n2.vis.join() === n1.quer.join() && (n1.quer.length || n2.vazio),
    `selo NOVO em ${n1.selo.join(', ') || 'nenhum'} (quer ${n1.quer.join(', ') || 'nenhum'}); filtro NOVOS mostra ${n2.vis.join(', ') || (n2.vazio ? 'o estado vazio' : 'nada')}`);

  /* MO7: aleatório sorteia um mapa visível diferente do atual. */
  const sorteios = [];
  for (let k = 0; k < 3; k++) {
    const antes = (await estado()).mapa;
    await p.click('.tp-modos__aleatorio'); await p.waitForTimeout(350);
    sorteios.push([antes, (await estado()).mapa]);
  }
  add('MO7', sorteios.every(([a, d]) => a !== d && g0.cards.includes(d)), `sorteios: ${sorteios.map(([a, d]) => `${a}→${d}`).join(', ')}`);

  /* MO8: os passos e segmentos mudam o que a partida usa (e o que fica salvo), e o rótulo acompanha. */
  const salvo = () => ev(() => JSON.parse(localStorage.getItem('awpbr_settings') || '{}'));
  const valor = (k) => ev((kk) => document.querySelector(`[data-passo="${kk}"] .tp-modos__valor`)?.innerText || '', k);
  const erros = [];
  for (const [k, campo, salvoK, min, max] of [['aliados', 'aliados', 'allyBots', 0, 7], ['inimigos', 'inimigos', 'enemyBots', 1, 8], ['rounds', 'rounds', 'rounds', 1, 15]]) {
    const a = (await estado())[campo];
    const dir = a < max ? 'mais' : 'menos';
    await p.click(`[data-passo="${k}"] .tp-modos__${dir}`); await p.waitForTimeout(200);
    const b = (await estado())[campo], s = (await salvo())[salvoK], txt = await valor(k);
    if (b !== a + (dir === 'mais' ? 1 : -1) || s !== b || !txt.includes(String(b))) erros.push(`${k} ${a}→${b} salvo ${s} rótulo "${txt}"`);
    for (let i = 0; i < 16; i++) await p.click(`[data-passo="${k}"] .tp-modos__menos`, { force: true }).catch(() => {});
    const piso = (await estado())[campo];
    const travado = await ev((kk) => document.querySelector(`[data-passo="${kk}"] .tp-modos__menos`)?.disabled, k);
    if (piso !== min || !travado) erros.push(`${k}: piso ${piso} (quer ${min}), menos ${travado ? 'travado' : 'livre'}`);
  }
  for (const [seg, v, campo] of [['armas', 'awp', 'armas'], ['bots', 'hard', 'dificuldade'], ['armas', 'all', 'armas'], ['bots', 'normal', 'dificuldade']]) {
    await p.click(`[data-seg="${seg}"] button[data-v="${v}"]`); await p.waitForTimeout(200);
    const e = await estado(), marc = await ev((s) => [...document.querySelectorAll(`[data-seg="${s}"] button[aria-pressed="true"]`)].map((b) => b.dataset.v).join(), seg);
    if (e[campo] !== v || marc !== v) erros.push(`${seg}=${v}: partida ${e[campo]}, marcado ${marc}`);
  }
  add('MO8', !erros.length, erros.length ? erros.join('; ') : 'SEU TIME, INIMIGOS e ROUNDS mudam a partida e o salvo, travam no piso; ARMAS e BOTS também');

  /* MO9: um botão lima por tela. */
  const prim = await ev(() => [...document.querySelectorAll('#hub-map-modal .tp-btn--primario')].filter((b) => b.checkVisibility()).map((b) => b.innerText.trim()));
  add('MO9', prim.length === 1 && /JOGAR/i.test(prim[0]), `${prim.length} botão(ões) primário(s) visível(is): ${prim.join(' | ')}`);

  /* MO11: a escalação conta o que está travado de verdade. */
  const esc = await ev(() => { const e = document.querySelector('.tp-modos__escalacao'); return { txt: e?.innerText || '', av: e ? e.querySelectorAll('img').length : -1 }; });
  const nEsc = e0.escalados.length;
  add('MO11', esc.av === Math.min(3, nEsc) && (nEsc ? esc.txt.includes(String(nEsc)) : !/\d/.test(esc.txt)),
    `travados ${nEsc}; linha "${esc.txt.replace(/\s+/g, ' ')}" com ${esc.av} retrato(s)`);

  /* MO12: nenhum número sem fonte: contador do multiplayer só com o /api/online, nada de duração inventada. */
  const on = await ev(() => {
    const box = document.getElementById('mf-online'), n = box && !box.hidden ? parseInt(box.textContent, 10) || 0 : 0;
    const sub = document.querySelector('.tp-modos__modo[data-modo="mp"]')?.innerText || '';
    return { n, sub, texto: document.querySelector('#hub-map-modal .tp-modos')?.innerText || '' };
  });
  const digitos = (on.sub.match(/\d+/g) || []).join();
  const inventa = /\[N\]|\b\d+\s*min\b/i.test(on.texto);
  add('MO12', (on.n ? digitos === String(on.n) : !digitos) && !inventa,
    inventa ? 'texto com número sem fonte (min ou [N])' : `online medido ${on.n || 'ausente'}; cartão MULTIPLAYER mostra "${digitos || 'sem número'}"`);

  /* MO10: VOLTAR e ESC fecham; JOGAR lança o Vira-Casaca real, não só troca o cartão. */
  await p.click('#hub-map-close'); await p.waitForTimeout(300);
  const fechouVoltar = await ev(() => document.getElementById('hub-map-modal').hidden);
  await ev(() => document.getElementById('hub-map-change').click()); await p.waitForTimeout(400);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  const fechouEsc = await ev(() => document.getElementById('hub-map-modal').hidden);
  await ev(() => document.getElementById('hub-map-change').click()); await p.waitForTimeout(400);
  await p.click('.tp-modos__modo[data-modo="arena"]'); await p.waitForTimeout(250);
  await ev(() => { window.__modosJogou = 0; document.getElementById('hub-quick-confirm')?.addEventListener('click', () => { window.__modosJogou++; }, { capture: true }); });
  await p.click('.tp-modos__jogar');
  await p.waitForFunction(() => window.__game?.arena === true, null, { timeout: 120000 }).catch(() => {});
  await p.waitForTimeout(600);
  const jg = await ev(() => ({ fechou: document.getElementById('hub-map-modal').hidden, jogou: window.__modosJogou, arena: window.__game?.arena, rounds: window.__game?.roundsMax, tempo: document.getElementById('round-time')?.textContent || '' }));
  add('MO10', fechouVoltar && fechouEsc && jg.fechou && jg.jogou === 1 && jg.arena === true && jg.rounds === 1 && !/Infinity|NaN/.test(jg.tempo),
    `VOLTAR ${fechouVoltar ? 'fecha' : 'não fecha'}, ESC ${fechouEsc ? 'fecha' : 'não fecha'}, JOGAR ${jg.jogou ? `abre Vira-Casaca arena=${jg.arena} rounds=${jg.rounds} HUD=${jg.tempo || 'vazio'}` : 'não começa'}${jg.fechou ? '' : ' e a tela fica'}`);
  await p.close();
}

async function telas(mutante, add) {
  const falhas = [], toque = [];
  let alvosMedidos = 0;
  for (const [w, h] of VIEWPORTS) {
    const p = await abrir({ w, h, mutante });
    await imagensProntas(p);
    const g = await p.evaluate(() => {
      const cx = (el) => { if (!el || !el.checkVisibility()) return null; const b = el.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
      const r = document.querySelector('#hub-map-modal .tp-modos');
      const q = (s) => cx(r?.querySelector(s));
      const grade = q('.tp-modos__grade');
      const inteiros = [...(r?.querySelectorAll('.tp-modos__mapa') || [])].map(cx).filter((c) => c && grade && c.t >= grade.t - 1 && c.b <= grade.b + 1).length;
      const cortados = [...(r?.querySelectorAll('.tp-modos__modo .tp-disp, .tp-modos__nome') || [])].filter((e) => e.checkVisibility() && e.scrollWidth > e.clientWidth + 1).map((e) => e.innerText);
      const alvos = [...(r?.querySelectorAll('button, input') || [])].filter((e) => e.checkVisibility()).map((e) => ({ t: e.innerText || e.getAttribute('aria-label') || e.className, h: e.getBoundingClientRect().height, w: e.getBoundingClientRect().width }));
      const pn = r?.querySelector('.tp-modos__painel')?.getBoundingClientRect();
      const invadem = [...(r?.querySelectorAll('.tp-modos__acervo button, .tp-modos__acervo input, .tp-modos__modos button, .tp-modos__topo button') || [])].filter((e) => e.checkVisibility()).filter((e) => {
        const b = e.getBoundingClientRect();
        return b.left < -0.5 || b.right > innerWidth + 0.5 || (pn && b.right > pn.left + 0.5 && b.left < pn.right - 0.5 && b.bottom > pn.top + 0.5 && b.top < pn.bottom - 0.5);
      }).map((e) => (e.innerText || e.getAttribute('aria-label') || e.className).replace(/\s+/g, ' ').slice(0, 20));
      return { vw: innerWidth, vh: innerHeight, sw: document.documentElement.scrollWidth, invadem, jogar: q('.tp-modos__jogar'), painel: q('.tp-modos__painel'), acervo: q('.tp-modos__acervo'),
        modos: q('.tp-modos__modos'), topo: q('.tp-modos__topo'), inteiros, cortados, alvos };
    });
    const nome = `${w}x${h}`;
    if (!mutante) { mkdirSync(OUT, { recursive: true }); await p.screenshot({ path: `${OUT}/modos-${nome}.png` }); }
    await p.close();
    const dentro = (c) => c && c.l >= -0.5 && c.t >= -0.5 && c.r <= g.vw + 0.5 && c.b <= g.vh + 0.5;
    const cruza = (a, b) => a && b && a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5;
    if (!g.jogar) { falhas.push(`${nome}: sem JOGAR`); continue; }
    for (const k of ['jogar', 'painel', 'acervo', 'modos', 'topo']) if (!dentro(g[k])) falhas.push(`${nome}: ${k} fora da tela`);
    for (const [a, b] of [['painel', 'acervo'], ['modos', 'acervo'], ['modos', 'painel'], ['topo', 'modos']]) if (cruza(g[a], g[b])) falhas.push(`${nome}: ${a} encosta em ${b}`);
    if (g.sw > g.vw) falhas.push(`${nome}: rolagem lateral (${g.sw} > ${g.vw})`);
    if (g.inteiros < 4) falhas.push(`${nome}: só ${g.inteiros} mapas inteiros à vista`);
    if (g.cortados.length) falhas.push(`${nome}: texto cortado: ${g.cortados.join(', ')}`);
    if (g.invadem.length) falhas.push(`${nome}: controle fora da tela ou por baixo do painel: ${g.invadem.slice(0, 4).join(', ')}`);
    if (w === 844) alvosMedidos = g.alvos.length;
    if (w === 844) for (const a of g.alvos) if (a.h < 44 || a.w < 44) toque.push(`${String(a.t).replace(/\s+/g, ' ').slice(0, 24)} ${a.w.toFixed(0)}×${a.h.toFixed(0)}`);
  }
  add('MO13', !falhas.length, falhas.length ? falhas.join('; ') : `${VIEWPORTS.map(([w, h]) => `${w}×${h}`).join(', ')}: tudo na tela, sem sobreposição, 4+ mapas inteiros, nada cortado`);
  add('MO14', alvosMedidos >= 10 && !toque.length, alvosMedidos < 10 ? `só ${alvosMedidos} botões medidos em 844×390` : toque.length ? `alvo abaixo de 44 px em 844×390: ${toque.slice(0, 5).join('; ')}` : '844×390: todo botão com 44 px ou mais');
}

async function idioma(mutante, add) {
  const txt = {};
  for (const lang of ['pt', 'en']) {
    const p = await abrir({ lang, mutante });
    txt[lang] = await p.evaluate(() => {
      const r = document.querySelector('#hub-map-modal .tp-modos');
      if (!r) return '';
      /* nome de mapa é nome próprio e fica em português nos dois idiomas, como na tela de hoje */
      const nomes = [...r.querySelectorAll('.tp-modos__mapa-nome, .tp-modos__nome')];
      nomes.forEach((e) => { e.dataset.regua = e.textContent; e.textContent = ''; });
      const mapas = window.__tpModos?.mapas().map((m) => m.nome) || [];
      const rotulos = [...r.querySelectorAll('[aria-label],[placeholder]')].map((e) => `${e.getAttribute('aria-label') || ''} ${e.getAttribute('placeholder') || ''}`.replace(new RegExp(mapas.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') || '$^', 'g'), ''));
      const texto = `${r.innerText}\n${rotulos.join('\n')}`;
      nomes.forEach((e) => { e.textContent = e.dataset.regua; });
      return texto;
    });
    if (lang === 'en' && !mutante) await p.screenshot({ path: `${OUT}/modos-en-1536x1024.png` });
    await p.close();
  }
  const vazaEn = (txt.en.match(SO_PT) || [])[0], vazaPt = (txt.pt.match(SO_EN) || [])[0];
  add('MO15', txt.pt && txt.en && !vazaEn && !vazaPt, !txt.pt ? 'tela v3 sem texto' : vazaEn || vazaPt ? `idioma misturado: "${vazaEn || vazaPt}" ${vazaEn ? 'em EN' : 'em PT'}` : 'PT e EN sem string do outro idioma');
}

async function semFlag(mutante, add) {
  const r = {};
  for (const [w, h] of [[1536, 1024], [844, 390]]) {
    const p = await abrir({ w, h, flag: false, mutante });
    r[w] = await p.evaluate(() => ({ tp: !!document.querySelector('.tp-modos'), gancho: 'window' in globalThis && '__tpModos' in window,
      folha: [...document.styleSheets].some((s) => /\/css\/tp\//.test(s.href || '')),
      legado: [...document.querySelectorAll('#hub-map-grid > button')].filter((b) => b.checkVisibility()).length }));
    if (!mutante) await p.screenshot({ path: `${OUT}/hoje-${w}x${h}.png` });
    await p.close();
  }
  const ruim = Object.entries(r).filter(([, v]) => v.tp || v.gancho || v.folha || !v.legado);
  add('MO16', !ruim.length, ruim.length ? ruim.map(([w, v]) => `${w}: ${v.tp ? 'tela v3 montada' : v.gancho ? 'gancho __tpModos ligado' : v.folha ? 'folha tp carregada' : 'grade de hoje sumiu'}`).join('; ')
    : `?ui=legacy: grade anterior com ${r[1536].legado} mapas, nada da Treta Pop`);
}

/* MO17: no cartão da escalação o ＋ (ou ALIADO/INIMIGO) não cobre o nome do personagem. */
async function escalacao(mutante, add) {
  const falhas = [];
  for (const [w, h] of [[1536, 1024], [844, 390]]) {
    const p = await abrir({ w, h, mutante, rota: '/jogar/personagens', salvo: { ...SALVO, pinnedChars: [] } });
    await p.waitForSelector('#hub-roster-modal:not([hidden]) .hub-roster-pin', { timeout: 20000 }).catch(() => {});
    await p.click('#hub-roster-grid .hub-roster-pin').catch(() => {});
    await p.waitForTimeout(400);
    const g = await p.evaluate(() => [...document.querySelectorAll('#hub-roster-grid .hub-roster-cell')].filter((c) => c.checkVisibility()).map((c) => {
      const pin = c.querySelector('.hub-roster-pin'), nome = c.querySelector('button:not(.hub-roster-pin) span');
      if (!pin || !nome) return null;
      const a = pin.getBoundingClientRect(), b = nome.getBoundingClientRect();
      const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)), y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      return { nome: nome.innerText, pin: pin.innerText, cobre: x * y, alvo: Math.min(a.width, a.height), cortado: nome.scrollWidth > nome.clientWidth + 1 || nome.scrollHeight > nome.clientHeight + 1 };
    }).filter(Boolean));
    if (!mutante) await p.screenshot({ path: `${OUT}/escalacao-${w}x${h}.png` });
    await p.close();
    if (!g.length) falhas.push(`${w}×${h}: nenhum cartão com ＋`);
    for (const c of g) if (c.cobre > 0) falhas.push(`${w}×${h}: "${c.pin}" cobre ${c.cobre.toFixed(0)} px² de "${c.nome}"`);
    for (const c of g) if (c.cortado) { falhas.push(`${w}×${h}: nome "${c.nome}" cortado no cartão`); break; }
    if (w === 844) for (const c of g) if (c.alvo < 44) { falhas.push(`${w}×${h}: ＋ de "${c.nome}" com ${c.alvo.toFixed(0)} px`); break; }
  }
  add('MO17', !falhas.length, falhas.length ? falhas.slice(0, 4).join('; ') : 'o ＋ e o selo ALIADO ficam fora do nome, que aparece inteiro, em 1536×1024 e 844×390, com alvo de 44 px no celular');
}

async function medir(mutante = '', so = null) {
  const r = [];
  const add = (id, ok, msg) => r.push({ id, ok: !!ok, msg });
  const grupos = so ? [GRUPO[so] || 'interativo'] : ['interativo', 'telas', 'idioma', 'semflag', 'escalacao'];
  const fn = { interativo, telas, idioma, semflag: semFlag, escalacao };
  for (const g of grupos) await fn[g](mutante, add);
  return r;
}

mkdirSync(OUT, { recursive: true });
let sair = 0;
if (process.argv.includes('--mutantes')) {
  for (const [mut, alvo] of Object.entries(ALVO).filter(([m]) => !process.env.SO || process.env.SO === m)) {
    let c;
    try { c = (await medir(mut, alvo)).find((x) => x.id === alvo); } catch (e) { c = { ok: false, msg: `erro: ${e.message.split('\n')[0]}` }; }
    if (!c) c = { ok: false, msg: 'cláusula não medida (a tela nem montou)' };
    if (c.ok) sair = 1;
    console.log(`${c.ok ? 'CEGO  ' : 'MORDE '} ${alvo} (${mut})  ${c.msg}`);
  }
} else {
  const r = await medir();
  for (const c of r) console.log(`${c.ok ? 'VERDE   ' : 'VERMELHO'} ${c.id}  ${c.msg}`);
  sair = r.length >= 17 && r.every((c) => c.ok) ? 0 : 1;
  console.log(`\nmodos v3: ${r.filter((c) => c.ok).length}/17  (capturas em ${OUT})`);
}
await browser.close();
process.exit(sair);
