#!/usr/bin/env node
/* Régua da loja e do armário Treta Pop (telas 07, 09 e 23 de design/treta-pop-2026-10-14) medida no Chrome.
     BASE=http://127.0.0.1:9426 node tools/eval/ui-v3-loja.mjs [--mutantes]
   Conta e carteira são de fixture (rota /api/treta interceptada); manifesto e pôsteres são os reais.
   Capturas em OUT (padrão tools/eval/out/ui-v3-loja). Um navegador por vez. */
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { TRETA_SKINS, TRETA_DEFAULT_REWARDS } from '../../public/js/treta-catalog.js';
import { TRETA_ITEMS_ENABLED } from '../../public/js/treta-features.js';

const BASE = process.env.BASE || 'http://127.0.0.1:9426';
const OUT = process.env.OUT || 'tools/eval/out/ui-v3-loja';
const VIEWPORTS = [[1536, 1024], [1920, 1080], [1280, 720], [844, 390]];
const MANIFESTO = JSON.parse(readFileSync(new URL('../../public/models/skins/manifest.json', import.meta.url), 'utf8'));
const APROVADAS = TRETA_SKINS.filter((s) => MANIFESTO.skins[s.id]?.approved === true);
/* Preços e raridades fora do padrão provam que a tela lê o servidor e não o catálogo local. */
const PRECO = { janja: 650, 'lula-cyborg': 1200, 'zero-um-mandrake': 400 };
const RARIDADE = { 'lula-cyborg': 'epico', janja: 'raro' };
const SALDO = 1240, GANHO_HOJE = 70, AMIGOS = 2;
const SLOTS = ['visual', ...(TRETA_ITEMS_ENABLED ? ['oculos'] : [])];
const PT_MINHAS = ['LOJA DA', 'ARMÁRIO', 'GANHAR MAIS', 'NO SEU ARMÁRIO', 'VISUAIS', 'EQUIPAR', 'EQUIPADO', 'Partidas hoje', 'Chame sua turma', 'Sem compra de moeda', 'COPIAR CONVITE', 'MEUS', 'VER EM 3D', 'só cosmético'];
const EN_MINHAS = ['SHOP', 'LOCKER', 'EARN MORE', 'IN YOUR LOCKER', 'OUTFITS', 'EQUIP', 'Matches today', 'Bring your crew', 'No currency', 'COPY INVITE', 'MINE', 'VIEW IN 3D', 'cosmetic only'];

const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio', '--use-angle=metal'],
});

const MUTANTES = {
  'risco-dobrado': [(u) => u.pathname === '/css/tp/loja.css', (t) => t.replace('.tp-loja__abas .tp-aba[aria-selected="true"]{color:var(--tp-tinta-1)}', '.tp-loja__abas .tp-aba[aria-selected="true"]{color:var(--tp-tinta-1);box-shadow:inset 0 -2px 0 #f3b958}')],
  'modal-sozinho': [(u) => u.pathname === '/js/treta-store.js', (t) => t.replace("if(document.documentElement.dataset.ui==='v3'){stored('cs_treta_intro','v1');return;}", '')],
  'titulo-sem-anton': [(u) => u.pathname === '/css/tp/loja.css', (t) => t.replace('.tp-loja__titulo{font-family:var(--tp-display)', '.tp-loja__titulo{font-family:var(--tp-ui)')],
  'raridade-inventada': [(u) => u.pathname === '/js/tp/loja.js', (t) => t.replace("RARIDADES.has(s.raridade)?s.raridade:''", "RARIDADES.has(s.raridade)?s.raridade:'comum'")],
  'preco-local': [(u) => u.pathname === '/js/treta-store.js', (t) => t.replace('price:item(s.id)?.price ?? null', 'price:s.price')],
  'dois-primarios': [(u) => u.pathname === '/js/tp/loja.js', (t) => t.replace("'tp-btn tp-loja__ganhar'", "'tp-btn tp-btn--primario tp-loja__ganhar'")],
  'slot-inventado': [(u) => u.pathname === '/js/tp/loja.js', (t) => t.replace("const SLOTS=['visual'", "const SLOTS=['visual','fuzil'")],
  'grade-larga': [(u) => u.pathname === '/css/tp/loja.css', (t) => t.replace('.tp-loja__grade{display:grid;', '.tp-loja__grade{display:grid;min-width:1700px;')],
  'alvo-pequeno': [(u) => u.pathname === '/css/tp/loja.css', (t) => t.replace('@media (pointer:coarse){', '@media (pointer:none){')],
  'en-vaza': [(u) => u.pathname === '/js/i18n.js', (t) => t.replace("'GANHAR MAIS': 'EARN MORE',", '')],
  'sem-flag': [(u) => u.pathname === '/js/main.js', (t) => t.replace("if (document.documentElement.dataset.ui === 'v3') {\n  import('./splash-v3.js')", "if (true) {\n  import('./splash-v3.js')")],
  'meta-fixa': [(u) => u.pathname === '/js/tp/loja.js', (t) => t.replace('d.ganhoHoje/d.tetoDiario', '0.5')],
  'quest-sem-icone': [(u) => u.pathname === '/js/tp/loja.js', (t) => t.replace('${QUEST_ICONES[c.dataset.quest]||QUEST_ICONE_GERAL}', "''")],
  'icone-igual': [(u) => u.pathname === '/js/tp/loja.js', (t) => t.replace('QUEST_ICONES[c.dataset.quest]||', '')],
  'visita-so-no-evento': [(u) => u.pathname === '/js/treta-store.js', (t) => t.replace("  if(estadoDaUrl(location.href)?.secao==='loja')storeVisit();", '')],
};

const aplicados = new Set();
async function preparar(page, mutante) {
  if (!mutante) return;
  const [teste, troca] = MUTANTES[mutante];
  await page.route((u) => teste(u), async (r) => {
    const res = await r.fetch();
    const antes = await res.text();
    const depois = troca(antes);
    if (depois !== antes) aplicados.add(mutante);
    await r.fulfill({ response: res, body: depois });
  });
}

function fixture(page, conta) {
  const estado = () => ({
    authenticated: true, acquisition: 'quests', topUpsEnabled: false, accountId: 'fixture-account',
    wallet: { balance: SALDO, referral_code: '00000000-0000-4000-8000-000000000001' }, inventory: conta.inventario, ledger: [],
    quests: { email: 1, referral: AMIGOS, singleplayer: 3, multiplayer: 4, dailyMatchEarned: GANHO_HOJE },
    campaign: { ...TRETA_DEFAULT_REWARDS, starts_at: new Date(Date.now() - 864e5).toISOString(), ends_at: new Date(Date.now() + 864e5).toISOString() },
    catalog: TRETA_SKINS.map((s) => ({ id: s.id, character_id: s.character, price: PRECO[s.id] ?? 800, available: true,
      model_path: MANIFESTO.skins[s.id]?.model, ...(RARIDADE[s.id] ? { rarity: RARIDADE[s.id] } : {}) })),
  });
  return page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    let dados = null; try { dados = route.request().postDataJSON(); } catch { /* GET */ }
    if (url.pathname === '/api/treta') {
      if (dados?.action === 'analytics') {
        conta.analytics.push(dados);
        return route.fulfill({ json: { ok: true, stored: true } });
      }
      if (dados?.action === 'equip') {
        conta.equipou.push(dados.skinId);
        conta.inventario = conta.inventario.map((s) => ({ ...s, equipped: s.skin_id === dados.skinId }));
      }
      return route.fulfill({ json: estado() });
    }
    if (url.pathname === '/api/social-auth') return route.fulfill({ json: { authenticated: true, accountId: 'fixture-account', profile: { nick: 'TESTE UI', id: 'fixture-profile' }, providers: [], email: false } });
    return route.fulfill({ json: { profile: { avatar_url: '/img/chars/barbudo.webp', socials: ['fixture'] }, rooms: [], entries: [], online: 0 } });
  });
}

async function abrir({ w = 1536, h = 1024, flag = true, lang = 'pt', mutante = '', intro = true, toque = false } = {}) {
  const conta = { inventario: [{ skin_id: 'janja', equipped: true }, { skin_id: 'lula-cyborg', equipped: false }], equipou: [], analytics: [] };
  const page = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: toque, isMobile: toque });
  const erros = [];
  page.on('pageerror', (e) => { if (!/eval-vite\/deps/.test(e.message)) erros.push(e.message.slice(0, 160)); });
  await page.addInitScript(([l, i]) => {
    localStorage.setItem('awpbr_settings', JSON.stringify({ menuMusic: false, vol: 0, speech: false }));
    localStorage.setItem('cs_lang', l); localStorage.setItem('awpbr_nick', 'TESTE UI');
    if (i) localStorage.setItem('cs_treta_intro', 'v1');
    localStorage.setItem('cs_privacy', JSON.stringify({ version: 'corosolto-analytics-v1', analytics: true, updatedAt: new Date().toISOString() }));
  }, [lang, intro]);
  await preparar(page, mutante);
  await fixture(page, conta);
  await page.goto(`${BASE}/loja?${flag ? 'ui=v3&' : ''}lang=${lang}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  if (flag && mutante !== 'sem-flag') {
    await page.waitForFunction(() => document.getElementById('tp-splash-jogar') && !document.getElementById('tp-splash-jogar').disabled, null, { timeout: 90000 });
    await page.keyboard.press('Enter');
  } else {
    await page.locator('#splash-enter:not(.hidden)').waitFor({ timeout: 90000 });
    await page.locator('#boot-splash').click({ force: true });
  }
  await page.locator('#boot-splash').waitFor({ state: 'detached', timeout: 30000 }).catch(() => {});
  await page.locator('#hub-ui:not([hidden])').waitFor({ timeout: 90000 });
  if (!(await page.locator('#hub-shop:not([hidden])').count())) await page.locator('button[data-hub-tab="loja"]').click();
  await page.locator('#hub-shop:not([hidden])').waitFor({ timeout: 30000 });
  await page.waitForFunction(() => /1[.,]240/.test(document.getElementById('treta-balance-value')?.textContent || ''), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(900);
  return { page, conta, erros };
}

const visivel = (sel) => `[...document.querySelectorAll(${JSON.stringify(sel)})].filter((e)=>e.checkVisibility())`;

/* O defeito de hoje: LOJA no topo e a aba da loja sublinhadas juntas. Na tela inteira só pode haver um
   sublinhado (borda, sombra interna ou risco de até 6 px); o indicador da loja é o .tp-abas__risco, alinhado à aba. */
async function abas(page) {
  return page.evaluate(() => {
    const vis = (e) => e.checkVisibility();
    /* só as abas DA LOJA: os hub-tabs têm sombra inset transparente/lima e não são daqui */
    const todas = [...document.querySelectorAll('.tp-loja [role=tab]')].filter(vis);
    const sublinhadas = todas.filter((t) => {
      const cs = getComputedStyle(t);
      const borda = parseFloat(cs.borderBottomWidth) > 0 && !/rgba\(\d+, \d+, \d+, 0\)|transparent/.test(cs.borderBottomColor);
      return borda || /inset.*\s-\d|-\d+px[^,]*inset/.test(cs.boxShadow);
    }).map((t) => t.textContent.trim());
    const tabs = [...document.querySelectorAll('.tp-loja [role=tab]')].filter(vis);
    const riscos = [...document.querySelectorAll('.tp-loja .tp-abas__risco')].filter(vis);
    const sel = tabs.filter((t) => t.getAttribute('aria-selected') === 'true');
    const r = riscos[0]?.getBoundingClientRect(), s = sel[0]?.getBoundingClientRect();
    return { n: tabs.length, sublinhados: sublinhadas.length, quais: sublinhadas,
      selecionadas: sel.map((t) => t.textContent.trim()), riscos: riscos.length,
      dx: r && s ? Math.abs(r.left - s.left) : 99, dw: r && s ? Math.abs(r.width - s.width) : 99 };
  });
}

async function secaoV3(mutante, add) {
  const { page, conta, erros } = await abrir({ mutante });
  const a0 = await abas(page);
  if (!mutante) { mkdirSync(OUT, { recursive: true }); await page.screenshot({ path: `${OUT}/loja-1536x1024.png` }); }
  const cabeca = await page.evaluate(() => {
    const t = document.querySelector('.tp-loja__titulo'), destaque = t?.querySelector('em');
    const v = document.querySelector('.tp-loja__saldo');
    return { fonte: t ? getComputedStyle(t).fontFamily : '', cor: destaque ? getComputedStyle(destaque).color : '', palavra: destaque?.textContent || '',
      saldo: v?.textContent || '', saldoFonte: v ? getComputedStyle(v).fontFamily : '', saldoCor: v ? getComputedStyle(v).color : '' };
  });
  const cartoes = await page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => e.checkVisibility()).map((c) => ({
    id: c.dataset.skin, tp: c.classList.contains('tp-card'), rar: c.dataset.raridade || '', rotRar: c.querySelector('.tp-loja__rar')?.textContent || '',
    preco: c.querySelector('.tp-loja__preco')?.textContent || '', meu: c.querySelector('.tp-loja__meu')?.textContent || '' })), '.tp-loja__painel[data-painel=loja] .tp-loja__cartao');
  const timers = await page.evaluate(() => document.querySelectorAll('#hub-shop .tp-chip--timer,#hub-shop [data-timer]').length);
  const primLoja = await page.evaluate(`${visivel('#hub-shop .tp-btn--primario')}.length`);
  const meta = await page.evaluate(() => [...document.querySelectorAll('.tp-loja__meta')].filter((e) => e.checkVisibility()).map((m) => ({
    txt: m.querySelector('.tp-num')?.textContent || '', p: parseFloat(getComputedStyle(m.querySelector('.tp-barra') || m).getPropertyValue('--p')) })));

  /* LJ1: só o risco marca a aba, e ele anda junto quando a aba troca. */
  await page.locator('#hub-shop [role=tab][data-tp-aba=armario]').click().catch(() => {});
  await page.waitForTimeout(500);
  const a1 = await abas(page);
  /* na loja o risco é o FUNDO da aba ativa (segmento), não um sublinhado: nenhum tab sublinha sozinho */
  const okAba = (a) => a.n >= 2 && a.sublinhados === 0 && a.riscos === 1 && a.selecionadas.length === 1 && a.dx <= 2 && a.dw <= 2;
  add('LJ1', okAba(a0) && okAba(a1) && a1.selecionadas[0] !== a0.selecionadas[0],
    `loja: ${a0.n} abas, ${a0.sublinhados} sublinhados na tela [${a0.quais.join(', ')}], ${a0.riscos} indicador a ${a0.dx.toFixed(0)}px/${a0.dw.toFixed(0)}px da aba ${a0.selecionadas.join('+') || '?'}; armário: ${a1.sublinhados} sublinhados [${a1.quais.join(', ')}], indicador a ${a1.dx.toFixed(0)}px da aba ${a1.selecionadas.join('+') || '?'}`);

  if (!mutante) await page.screenshot({ path: `${OUT}/armario-1536x1024.png` });
  const arm = await page.evaluate(() => {
    const p = document.querySelector('.tp-loja__painel[data-painel=armario]');
    const slots = [...(p?.querySelectorAll('[data-slot]') || [])].filter((e) => e.checkVisibility());
    const itens = [...(p?.querySelectorAll('.tp-loja__item') || [])].filter((e) => e.checkVisibility());
    return { slots: slots.map((s) => s.dataset.slot), visual: slots.find((s) => s.dataset.slot === 'visual')?.textContent || '',
      contagem: p?.querySelector('.tp-loja__contagem')?.textContent || '', itens: itens.length };
  });
  const primArm = await page.evaluate(`${visivel('#hub-shop .tp-btn--primario')}.length`);
  await page.locator('.tp-loja__painel[data-painel=armario] [data-filtro=meus]').click().catch(() => {});
  await page.waitForTimeout(300);
  const meus = await page.evaluate(() => [...document.querySelectorAll('.tp-loja__painel[data-painel=armario] .tp-loja__item')].filter((e) => e.checkVisibility()).map((e) => e.dataset.skin));
  await page.locator('.tp-loja__painel[data-painel=armario] .tp-loja__item[data-skin="lula-cyborg"]').click().catch(() => {});
  await page.waitForTimeout(200);
  await page.locator('.tp-loja__painel[data-painel=armario] .tp-btn--primario').click().catch(() => {});
  await page.waitForTimeout(1200);
  const slotDepois = await page.evaluate(() => document.querySelector('.tp-loja__painel[data-painel=armario] [data-slot=visual]')?.textContent || '');
  if (!mutante) await page.screenshot({ path: `${OUT}/armario-equipado-1536x1024.png` });
  await page.locator('#hub-shop [role=tab][data-tp-aba=ganhar]').click().catch(() => {});
  await page.waitForTimeout(500);
  const primQuests = await page.evaluate(`${visivel('#hub-shop .tp-btn--primario')}.length`);
  const questsIcones = await page.evaluate(() => [...document.querySelectorAll('#treta-quests [data-quest]')].filter((e) => e.checkVisibility()).map((c) => ({
    id: c.dataset.quest, icone: c.querySelector(':scope > .tp-loja-quest-icone svg')?.innerHTML || '',
    oculto: c.querySelector(':scope > .tp-loja-quest-icone svg')?.getAttribute('aria-hidden') !== 'true',
    duplicado: c.querySelectorAll(':scope > .tp-loja-quest-icone').length > 1,
  })));
  const a2 = await abas(page);
  if (!mutante) await page.screenshot({ path: `${OUT}/ganhar-1536x1024.png` });
  await page.close();

  const amb = cabeca.cor.replace(/\s/g, '') === 'rgb(243,185,88)', ambSaldo = cabeca.saldoCor.replace(/\s/g, '') === 'rgb(243,185,88)';
  add('LJ3', /Anton/.test(cabeca.fonte) && amb && /TRETA/i.test(cabeca.palavra) && /JetBrains/.test(cabeca.saldoFonte) && ambSaldo && /1\.240/.test(cabeca.saldo),
    `título ${cabeca.fonte.split(',')[0] || 'ausente'} com "${cabeca.palavra}" em ${cabeca.cor || '?'}; saldo "${cabeca.saldo}" em ${cabeca.saldoFonte.split(',')[0] || '?'} ${cabeca.saldoCor || ''}`);

  const semTp = cartoes.filter((c) => !c.tp).length;
  const rarErrada = cartoes.filter((c) => (RARIDADE[c.id] || '') !== c.rar || (!RARIDADE[c.id] && c.rotRar) || (RARIDADE[c.id] && !c.rotRar));
  add('LJ4', cartoes.length === APROVADAS.length && !semTp && !rarErrada.length && !timers,
    `${cartoes.length}/${APROVADAS.length} cartões, ${semTp} sem .tp-card, raridade fora do servidor: [${rarErrada.map((c) => `${c.id}=${c.rar || 'nenhuma'}`).join(', ')}], ${timers} timers`);

  const fmt = (v) => `T$ ${new Intl.NumberFormat('pt-BR').format(v)}`;
  const meuIds = new Set(conta.inventario.map((s) => s.skin_id));
  const precoErrado = cartoes.filter((c) => meuIds.has(c.id) ? (!c.meu || c.preco) : c.preco.trim() !== fmt(PRECO[c.id] ?? 800));
  add('LJ5', cartoes.length && !precoErrado.length,
    precoErrado.length ? `preço que não é o do servidor: ${precoErrado.map((c) => `${c.id} "${c.preco || c.meu}" (quer ${meuIds.has(c.id) ? 'NO SEU ARMÁRIO' : fmt(PRECO[c.id] ?? 800)})`).join(', ')}` : `${cartoes.length} preços batem com o servidor; os do armário dizem que já são seus`);

  add('LJ7', primLoja <= 1 && primArm === 1 && primQuests <= 1, `primários lima: loja ${primLoja}, armário ${primArm} (quer 1), ganhar ${primQuests}`);

  const nomeEquipada = (id) => TRETA_SKINS.find((s) => s.id === id)?.name || id;
  const okSlots = JSON.stringify(arm.slots) === JSON.stringify(SLOTS);
  const okCont = new RegExp(`\\b2\\b.*\\b${APROVADAS.length}\\b`).test(arm.contagem);
  const okMeus = meus.length === 2 && meus.every((id) => meuIds.has(id));
  const okEquip = conta.equipou.at(-1) === 'lula-cyborg' && slotDepois.includes(nomeEquipada('lula-cyborg'));
  add('LJ8', okSlots && arm.visual.includes(nomeEquipada('janja')) && okCont && arm.itens === APROVADAS.length && okMeus && okEquip,
    `slots [${arm.slots.join(', ')}] (quer [${SLOTS.join(', ')}]), visual "${arm.visual.trim()}", contagem "${arm.contagem}", ${arm.itens} itens, MEUS [${meus.join(', ')}], equipar → ${conta.equipou.join(',') || 'nada'} / slot "${slotDepois.trim()}"`);
  add('LJ14', questsIcones.length >= 4 && questsIcones.every((q) => q.icone && !q.oculto && !q.duplicado)
    && new Set(questsIcones.map((q) => q.icone)).size === questsIcones.length,
    `${questsIcones.length} quests, ${questsIcones.filter((q) => q.icone).length} com ícone, ${new Set(questsIcones.map((q) => q.icone)).size} distintos (um por quest), ${questsIcones.filter((q) => q.duplicado || q.oculto).length} mal montado(s)`);
  const visitas = conta.analytics.filter((evento) => evento.event === 'visit');
  add('LJ15', visitas.length === 1, `abertura direta por /loja registrou ${visitas.length} visita(s), esperado 1`);
  const okMeta = meta.length === 2 && meta[0].txt.includes(`${GANHO_HOJE}`) && meta[0].txt.includes(`${TRETA_DEFAULT_REWARDS.daily_match_cap}`)
    && Math.abs(meta[0].p - GANHO_HOJE / TRETA_DEFAULT_REWARDS.daily_match_cap) < 0.01
    && meta[1].txt.includes(`${AMIGOS}`) && Math.abs(meta[1].p - AMIGOS / TRETA_DEFAULT_REWARDS.referral_cap) < 0.01;
  add('LJ12', okMeta, `metas: ${meta.map((m) => `"${m.txt}" p=${Number.isFinite(m.p) ? m.p.toFixed(2) : '?'}`).join('; ') || 'nenhuma'} (quer ${GANHO_HOJE}/${TRETA_DEFAULT_REWARDS.daily_match_cap} e ${AMIGOS}/${TRETA_DEFAULT_REWARDS.referral_cap})`);
  add('LJ13', !erros.length && a2.selecionadas.length === 1, erros.length ? `erro na página: ${erros[0]}` : `sem erro de página; aba ganhar ${a2.selecionadas.join('+')}`);
}

async function secaoModal(mutante, add) {
  const { page } = await abrir({ mutante, intro: false });
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('cs-pos-partida', { detail: { treta: false } })));
  await page.waitForTimeout(1500);
  const aberto = await page.evaluate(() => !!document.getElementById('treta-info')?.open);
  await page.close();
  add('LJ2', !aberto, aberto ? 'o modal de T$ abriu sozinho depois da primeira partida' : 'primeira visita: o modal de T$ só abre por clique');
}

async function secaoIdioma(mutante, add) {
  const textos = {};
  for (const lang of ['pt', 'en']) {
    const { page } = await abrir({ lang, mutante });
    let t = await page.evaluate(() => document.querySelector('.tp-loja')?.innerText || '');
    if (lang === 'en' && !mutante) await page.screenshot({ path: `${OUT}/loja-en-1536x1024.png` });
    await page.locator('#hub-shop [role=tab][data-tp-aba=armario]').click().catch(() => {});
    await page.waitForTimeout(400);
    t += '\n' + await page.evaluate(() => document.querySelector('.tp-loja')?.innerText || '');
    if (lang === 'en' && !mutante) await page.screenshot({ path: `${OUT}/armario-en-1536x1024.png` });
    textos[lang] = t;
    await page.close();
  }
  const vazaEn = PT_MINHAS.filter((s) => textos.en.includes(s));
  const vazaPt = EN_MINHAS.filter((s) => new RegExp(`\\b${s}\\b`).test(textos.pt));
  add('LJ10', textos.pt.trim() && textos.en.trim() && !vazaEn.length && !vazaPt.length,
    !textos.pt.trim() ? 'loja v3 sem texto para medir' : vazaEn.length || vazaPt.length ? `idioma misturado: EN mostra [${vazaEn.join(', ')}], PT mostra [${vazaPt.join(', ')}]` : 'PT e EN sem string do outro idioma');
}

async function secaoTelas(mutante, add) {
  const falhas = [];
  for (const [w, h] of VIEWPORTS) {
    const toque = w === 844;
    const { page } = await abrir({ w, h, mutante, toque });
    for (const aba of ['loja', 'armario']) {
      if (aba === 'armario') { await page.locator('#hub-shop [role=tab][data-tp-aba=armario]').click().catch(() => {}); await page.waitForTimeout(400); }
      const g = await page.evaluate((painel) => {
        const raiz = document.querySelector(`.tp-loja__painel[data-painel=${painel}]`);
        if (!raiz || !raiz.checkVisibility()) return null;
        const shop = document.getElementById('hub-shop');
        const rodape = document.querySelector('.hub-footer');
        const fundo = Math.min(innerHeight, shop.getBoundingClientRect().bottom, rodape?.checkVisibility() ? rodape.getBoundingClientRect().top : innerHeight);
        const cards = [...raiz.querySelectorAll('.tp-loja__cartao,.tp-loja__item')].filter((e) => e.checkVisibility()).map((e) => e.getBoundingClientRect());
        const cruza = cards.some((a, i) => cards.some((b, j) => j > i && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1));
        const alvos = [...document.querySelectorAll('.tp-loja button,.tp-loja [role=tab]')].filter((e) => e.checkVisibility())
          .map((e) => { const b = e.getBoundingClientRect(); return { t: (e.textContent.trim() || e.getAttribute('aria-label') || e.className).slice(0, 24), w: b.width, h: b.height }; })
          .filter((b) => b.w < 44 || b.h < 44);
        return { vaza: shop.scrollWidth > shop.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth + 1, cruza,
          primeiro: cards[0] ? cards[0].bottom <= fundo + 1 && cards[0].top >= shop.getBoundingClientRect().top - 1 : false, alvos, coarse: matchMedia('(pointer: coarse)').matches };
      }, aba);
      if (!mutante) await page.screenshot({ path: `${OUT}/${aba}-${w}x${h}.png` });
      const nome = `${w}×${h} ${aba}`;
      if (!g) { falhas.push(`${nome}: painel ausente`); continue; }
      if (g.vaza) falhas.push(`${nome}: rolagem horizontal`);
      if (g.cruza) falhas.push(`${nome}: cartões sobrepostos`);
      if (!g.primeiro) falhas.push(`${nome}: primeiro cartão fora da tela`);
      if (toque && g.alvos.length) falhas.push(`${nome}: alvo de toque < 44 px: ${g.alvos.slice(0, 3).map((a) => `${a.t} ${a.w.toFixed(0)}×${a.h.toFixed(0)}`).join(', ')}`);
    }
    await page.close();
  }
  add('LJ9', !falhas.length, falhas.length ? falhas.join('; ') : `${VIEWPORTS.map(([w, h]) => `${w}×${h}`).join(', ')}: sem rolagem lateral, cartões sem sobrepor, primeiro cartão na tela, toque ≥ 44 px no celular`);
}

async function secaoLegado(mutante, add) {
  const out = [];
  for (const [w, h] of [[1536, 1024], [844, 390]]) {
    const { page } = await abrir({ w, h, flag: false, mutante, toque: w === 844 });
    if (!mutante) await page.screenshot({ path: `${OUT}/antes-sem-flag-${w}x${h}.png` });
    out.push(await page.evaluate(() => ({
      tp: document.querySelectorAll('#hub-shop .tp-loja,#hub-shop [class*="tp-"]').length,
      abas: !!document.querySelector('.treta-views')?.checkVisibility(),
      fonte: getComputedStyle(document.getElementById('treta-view-title')).fontFamily,
    })));
    await page.close();
  }
  const ruim = out.filter((o) => o.tp || !o.abas || !/Bebas/.test(o.fonte));
  add('LJ11', !ruim.length, ruim.length ? `sem a flag a loja mudou: ${ruim.map((o) => `${o.tp} nós tp-, abas antigas ${o.abas ? 'visíveis' : 'sumiram'}, título ${o.fonte.split(',')[0]}`).join('; ')}` : 'sem a flag a loja é a de hoje (1536 e 844)');
}

const SECOES = { v3: [secaoV3, ['LJ1', 'LJ3', 'LJ4', 'LJ5', 'LJ7', 'LJ8', 'LJ12', 'LJ13', 'LJ14', 'LJ15']], modal: [secaoModal, ['LJ2']], idioma: [secaoIdioma, ['LJ10']],
  telas: [secaoTelas, ['LJ9']], legado: [secaoLegado, ['LJ11']] };

async function medir(mutante = '', alvo = '') {
  const r = [];
  const add = (id, ok, msg) => r.push({ id, ok: !!ok, msg });
  for (const [fn, ids] of Object.values(SECOES)) if (!alvo || ids.includes(alvo)) await fn(mutante, add);
  return r;
}

const MUT = [['risco-dobrado', 'LJ1'], ['modal-sozinho', 'LJ2'], ['titulo-sem-anton', 'LJ3'], ['raridade-inventada', 'LJ4'], ['preco-local', 'LJ5'],
  ['dois-primarios', 'LJ7'], ['slot-inventado', 'LJ8'], ['grade-larga', 'LJ9'], ['alvo-pequeno', 'LJ9'], ['en-vaza', 'LJ10'], ['sem-flag', 'LJ11'], ['meta-fixa', 'LJ12'],
  ['quest-sem-icone', 'LJ14'], ['icone-igual', 'LJ14'], ['visita-so-no-evento', 'LJ15']];
let sair = 0;
if (process.argv.includes('--mutantes')) {
  for (const [mut, alvo] of MUT.filter(([m]) => !process.env.SO || process.env.SO === m)) {
    let c;
    try { c = (await medir(mut, alvo)).find((x) => x.id === alvo); } catch (e) { c = { ok: false, msg: `quebrou a página: ${e.message.split('\n')[0]}` }; }
    if (!aplicados.has(mut)) c = { ok: true, msg: 'o mutante não aplicou: o texto servido saiu igual' };
    if (c.ok) sair = 1;
    console.log(`${c.ok ? 'CEGO  ' : 'MORDE '} ${alvo} (${mut})  ${c.msg}`);
  }
} else {
  const r = await medir('', process.env.SO_CLAUSULA || '');
  for (const c of r) console.log(`${c.ok ? 'VERDE   ' : 'VERMELHO'} ${c.id}  ${c.msg}`);
  sair = r.every((c) => c.ok) ? 0 : 1;
  console.log(`\nloja v3: ${r.filter((c) => c.ok).length}/${r.length}  (capturas em ${OUT})`);
}
await browser.close();
process.exit(sair);
