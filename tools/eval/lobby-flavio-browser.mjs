#!/usr/bin/env node
/* Régua do painel da Operação Flávio no lobby Treta Pop, medida no Chrome (a de node é lobby-flavio-check.mjs).
     BASE=http://127.0.0.1:9428 node tools/eval/lobby-flavio-browser.mjs [--mutantes]
   07/11: o card do Flávio com a história trocou o botão Resenha. 08/11 (dono): o Flávio vira o primeiro
   painel do lobby, acima da caça ao Javaporco; Quests e Novidades de skins descem para baixo de Amigos online.
     LFB1 6 telas: Resenha fora do lobby; o painel do Flávio à vista, ACIMA da invasão, sem cobrir nada
          clicável e com a arte carregada
     LFB2 o painel abre a história: imagem carregada, nada rola nem sai da tela, foco preso no diálogo
     LFB3 Escape fecha, devolve o foco ao painel, e o Y não abre a gaveta por baixo do diálogo
     LFB4 JOGAR começa a partida no operacao_flavio
     LFB5 ?lang=en: painel e história em inglês
     LFB6 6 telas: com a coluna da direita à vista, Quests e skins moram nela, depois de Amigos online, sem
          entrar no painel da partida; sem a coluna, Quests continua à vista na esquerda
   Os anúncios de abertura (Javaporco e Operação Flávio) entram como já vistos: são outra régua.
   Capturas em OUT (padrão tools/eval/out/lobby-flavio). Um navegador por vez (with-browser-lock.sh). */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'http://127.0.0.1:9428';
/* desktop do dono, Full HD, notebook 1536×864 e 1280×720, celular deitado (Android grande e iPhone) */
const TELAS = [[1536, 960], [1920, 1080], [1536, 864], [1280, 720], [932, 430, true], [844, 390, true]];
const OUT = process.env.OUT || 'tools/eval/out/lobby-flavio';
const TOQUE = 44;
const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});

const MUT = {
  'card-resenha': [/\/js\/tp\/flavio\.js/, (t) => t.replace("card.id = 'tp-lobby-flavio';", "card.id = 'tp-resenha-botao';").replace("no('strong', 'tp-disp', tr('OPERAÇÃO FLÁVIO'))", "no('strong', 'tp-disp', tr('Resenha'))"), 'LFB1', 'telas'],
  'card-depois': [/\/js\/tp\/lobby\.js/, (t) => t.replace('esq.appendChild(invasao);', 'esq.insertBefore(invasao, esq.firstChild);'), 'LFB1', 'telas'],
  'quests-esquerda': [/\/js\/tp\/lobby\.js/, (t) => t.replace("if (getComputedStyle(dir).display !== 'none') dir.append(...blocos);", 'if (false) dir.append(...blocos);'), 'LFB6', 'telas'],
  'modal-sem-imagem': [/\/js\/mode-announcements\.js/, (t) => t.replace('bg.src = imagem;', "bg.src = '';"), 'LFB2', 'telas'],
  'modal-transborda': [/\/js\/mode-announcements\.js/, (t) => t.replace('@media (max-height:520px){.cs-modes-dialog--historia', '@media (max-height:1px){.cs-modes-dialog--historia'), 'LFB2', 'telas'],
  'esc-sem-foco': [/\/js\/mode-announcements\.js/, (t) => t.replace('else if (c.foco?.isConnected) c.foco.focus({ preventScroll: true });', ''), 'LFB3', 'telas'],
  'jogar-mapa-errado': [/\/js\/tp\/flavio\.js/, (t) => t.replace('modos.irMapa(MAPA_FLAVIO);', "modos.irMapa('piscina_treta');"), 'LFB4', 'jogar'],
  'en-vaza': [/\/js\/i18n\.js/, (t) => t.replace("'OPERAÇÃO FLÁVIO': 'OPERATION FLÁVIO', ", ''), 'LFB5', 'idioma'],
};

async function lobby({ w = 1536, h = 960, toque = false, lang = 'pt', mutante = '' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, ...(toque ? { hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : {}) });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  await page.addInitScript(() => {
    localStorage.setItem('csbr-mode-ann-seen', JSON.stringify(['operacao_flavio']));
    localStorage.setItem('cs-javaporcos-cidade-anuncio-v1', '1');
  });
  if (mutante) {
    const [teste, troca] = MUT[mutante];
    await page.route(teste, async (r) => {
      const res = await r.fetch();
      const antes = await res.text(), depois = troca(antes);
      if (depois === antes) throw new Error(`mutante ${mutante} não aplicou em ${r.request().url()}`);
      await r.fulfill({ response: res, body: depois });
    });
  }
  await page.goto(`${BASE}/?lang=${lang}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important;pointer-events:none!important}' });
  await page.waitForFunction(() => !document.getElementById('tp-splash-jogar')?.disabled, null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => { const s = document.getElementById('boot-splash'); return !s || s.classList.contains('gone'); }, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);
  return { page, ctx };
}
/* Clique de verdade (mouse ou toque) no centro do card: se algo o cobre, o clique não chega.
   O botão não ganha foco no clique, como no Safari: quem devolve o foco é o código, não o <dialog>. */
async function abrirCard(page, toque) {
  const b = await page.locator('#tp-lobby-flavio').boundingBox().catch(() => null);
  if (!b) return false;
  await page.evaluate(() => {
    document.activeElement?.blur();
    document.getElementById('tp-lobby-flavio').addEventListener('mousedown', (e) => e.preventDefault(), { once: true });
  });
  if (toque) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  return page.waitForFunction(() => document.querySelector('dialog[data-historia="operacao_flavio"]')?.open, null, { timeout: 8000 }).then(() => true, () => false);
}

/* A · 6 telas: posição, história, saída e as colunas. */
async function telas(mutante, cap) {
  const e1 = [], e2 = [], e3 = [], e6 = [];
  for (const [w, h, toque] of TELAS) {
    const tag = `${w}x${h}`;
    const { page, ctx } = await lobby({ w, h, toque, mutante });
    if (cap) await page.screenshot({ path: `${OUT}/lobby-${tag}.png` });
    const c = await page.evaluate(() => {
      const card = document.getElementById('tp-lobby-flavio'), invasao = document.getElementById('tp-lobby-invasao');
      const resenha = !!document.getElementById('tp-resenha-botao') || [...document.querySelectorAll('#main-menu button, #main-menu a')]
        .some((e) => !e.closest('#tp-resenha') && e.checkVisibility() && /^\s*resenha\b/i.test(e.textContent));
      const vis = (e) => !!e?.checkVisibility();
      const caixa = (e) => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
      const cruzam = (a, o) => o.l < a.r - 1 && a.l < o.r - 1 && o.t < a.b - 1 && a.t < o.b - 1;
      /* colunas: Quests e skins na direita, depois de Amigos online, e nada dela dentro da partida */
      const dir = document.querySelector('.tp-lobby-dir'), quests = document.getElementById('tp-lobby-quests'), skins = document.getElementById('tp-lobby-skins');
      const partida = [...document.querySelectorAll('#menu-setup .pane-match > *')].filter(vis).map(caixa).filter((b) => b.b > b.t);
      const amigos = document.getElementById('tp-lobby-online-amigos');
      const colunas = {
        dirVisivel: vis(dir), questsVisivel: vis(quests), questsNaDir: !!quests && !!dir?.contains(quests), skinsNaDir: !!skins && !!dir?.contains(skins),
        depoisDosAmigos: [quests, skins].filter(Boolean).every((e) => !!(amigos?.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING)),
        naPartida: [quests, skins].filter(vis).filter((e) => partida.some((p) => cruzam(caixa(e), p))).map((e) => e.id),
      };
      if (!vis(card)) return { resenha, card: null, colunas };
      const r = caixa(card), cruza = [];
      for (const e of document.querySelectorAll('#main-menu a, #main-menu button, #main-menu input, #main-menu select, #main-menu [role=tab], #hub-ui a, #hub-ui button')) {
        if (e === card || card.contains(e) || e.closest('#tp-resenha') || !vis(e)) continue;
        const o = caixa(e);
        if (o.r - o.l <= 0 || o.b - o.t <= 0) continue;
        if (cruzam(r, o)) cruza.push((e.id || e.getAttribute('aria-label') || e.className || e.tagName).toString().split(' ')[0]);
      }
      const topo = document.elementFromPoint((r.l + r.r) / 2, (r.t + r.b) / 2);
      const img = card.querySelector('img'), inv = vis(invasao) ? caixa(invasao) : null;
      return { resenha, colunas, card: { ...r, h: r.b - r.t, cruza, coberto: !(topo && card.contains(topo)), arte: img?.complete && img.naturalWidth,
        rotulo: card.textContent, invasao: !!inv, acima: !!inv && r.b <= inv.t + 1 && !!(card.compareDocumentPosition(invasao) & Node.DOCUMENT_POSITION_FOLLOWING) } };
    });
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
      if (toque && k.h < TOQUE - 0.5) e1.push(`${tag}: painel com ${k.h.toFixed(0)} px de altura no toque`);
    }
    const col = c.colunas;
    if (col.dirVisivel) {
      if (!col.questsNaDir || !col.skinsNaDir) e6.push(`${tag}: coluna da direita à vista sem ${[!col.questsNaDir && 'Quests', !col.skinsNaDir && 'skins'].filter(Boolean).join(' e ')}`);
      else if (!col.depoisDosAmigos) e6.push(`${tag}: Quests/skins antes de Amigos online`);
      if (col.naPartida.length) e6.push(`${tag}: ${col.naPartida.join(', ')} dentro do painel da partida`);
    } else if (h > 500 && !col.questsVisivel) e6.push(`${tag}: sem a coluna da direita, Quests sumiu`);
    if (!(await abrirCard(page, toque))) { e2.push(`${tag}: o card não abre a história`); await ctx.close(); continue; }
    await page.waitForFunction(() => { const i = document.querySelector('dialog[data-historia] .cs-modes-bg'); return i?.complete; }, null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(500);
    if (cap) await page.screenshot({ path: `${OUT}/historia-${tag}.png` });
    const m = await page.evaluate(() => {
      const d = document.querySelector('dialog[data-historia]'), p = d.querySelector('.cs-modes-painel'), img = d.querySelector('.cs-modes-bg');
      const fora = [...d.querySelectorAll('button, h1, p, li')].filter((e) => { const b = e.getBoundingClientRect(); return b.width && (b.left < -0.5 || b.top < -0.5 || b.right > innerWidth + 0.5 || b.bottom > innerHeight + 0.5); }).map((e) => e.textContent.slice(0, 24));
      return { img: img.complete ? img.naturalWidth : 0, src: img.getAttribute('src'), rola: [p.scrollHeight, p.clientHeight], fora, foco: d.contains(document.activeElement) ? document.activeElement.textContent : null };
    });
    if (m.img < 1280) e2.push(`${tag}: imagem da história com ${m.img} px (src "${m.src}")`);
    if (m.rola[0] > m.rola[1] + 1) e2.push(`${tag}: história rola (${m.rola[0]} > ${m.rola[1]} px)`);
    if (m.fora.length) e2.push(`${tag}: fora da tela: ${m.fora.join(' | ')}`);
    if (!m.foco) e2.push(`${tag}: foco fora do diálogo ao abrir`);
    /* foco preso: Tab e Shift+Tab não saem do diálogo */
    for (const tecla of ['Tab', 'Tab', 'Tab', 'Shift+Tab']) {
      await page.keyboard.press(tecla);
      if (!(await page.evaluate(() => { const a = document.activeElement; return !!a?.closest('dialog[data-historia]') || a === document.body; }))) { e2.push(`${tag}: ${tecla} levou o foco para fora do diálogo`); break; }
    }
    await page.keyboard.press('y'); await page.waitForTimeout(300);
    const gaveta = await page.evaluate(() => document.getElementById('tp-resenha')?.hasAttribute('data-aberta'));
    await page.keyboard.press('Escape'); await page.waitForTimeout(600);
    const s = await page.evaluate(() => ({ aberto: !!document.querySelector('dialog[open]'), foco: document.activeElement?.id || document.activeElement?.tagName }));
    if (gaveta) e3.push(`${tag}: Y abriu a gaveta por baixo da história`);
    if (s.aberto || s.foco !== 'tp-lobby-flavio') e3.push(`${tag}: Escape deixou ${s.aberto ? 'o diálogo aberto' : `o foco em ${s.foco}`}`);
    await ctx.close();
  }
  return [
    { id: 'LFB1', ok: !e1.length, msg: e1.join('; ') || `${TELAS.length} telas: sem Resenha; painel do Flávio acima da invasão, livre, à vista, arte carregada` },
    { id: 'LFB2', ok: !e2.length, msg: e2.join('; ') || `${TELAS.length} telas: história abre com a arte carregada, sem rolar nem sair da tela, foco preso no diálogo` },
    { id: 'LFB3', ok: !e3.length, msg: e3.join('; ') || `${TELAS.length} telas: Escape fecha e devolve o foco ao painel; Y não abre a gaveta por baixo` },
    { id: 'LFB6', ok: !e6.length, msg: e6.join('; ') || `${TELAS.length} telas: Quests e skins embaixo de Amigos online fora da partida; sem a coluna, Quests na esquerda` },
  ];
}

/* B · JOGAR começa a partida da escolta. */
async function jogar(mutante, cap) {
  const { page, ctx } = await lobby({ mutante });
  let msg = '';
  if (!(await abrirCard(page, false))) msg = 'o card não abre a história';
  else {
    await page.click('dialog[data-historia] [data-jogar]');
    const ok = await page.waitForFunction(() => window.__game?._mapId, null, { timeout: 120000 }).then(() => true, () => false);
    const r = await page.evaluate(() => ({ mapa: window.__game?._mapId, modal: !!document.querySelector('dialog[open]') }));
    if (cap) await page.screenshot({ path: `${OUT}/jogar-1536x960.png` });
    if (!ok) msg = 'JOGAR não começou partida em 120 s';
    else if (r.mapa !== 'operacao_flavio') msg = `JOGAR começou ${r.mapa}`;
    else if (r.modal) msg = 'história continua aberta por cima da partida';
  }
  await ctx.close();
  return [{ id: 'LFB4', ok: !msg, msg: msg || 'JOGAR fecha a história e começa a partida no operacao_flavio' }];
}

/* C · inglês. */
async function idioma(mutante, cap) {
  const { page, ctx } = await lobby({ lang: 'en', mutante });
  const rotulo = await page.evaluate(() => document.getElementById('tp-lobby-flavio')?.textContent || '');
  const abriu = await abrirCard(page, false);
  if (cap && abriu) {
    await page.waitForFunction(() => document.querySelector('dialog[data-historia] .cs-modes-bg')?.complete, null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/historia-en-1536x960.png` });
  }
  const t = abriu ? await page.evaluate(() => document.querySelector('dialog[data-historia]').innerText) : '';
  await ctx.close();
  const PT = /OPERAÇÃO|HISTÓRIA|comitiva|Escolha o Zero Um|Três rotas|Paródia|FECHAR|JOGAR/;
  const vaza = (rotulo + '\n' + t).match(PT)?.[0];
  const ok = abriu && /OPERATION FLÁVIO/.test(rotulo) && /OPERATION FLÁVIO/.test(t) && !vaza;
  return [{ id: 'LFB5', ok, msg: ok ? 'EN: card e história sem frase em português' : `EN: ${abriu ? '' : 'história não abriu; '}card "${rotulo}"${vaza ? `; vaza "${vaza}"` : ''}` }];
}

const GRUPOS = { telas, jogar, idioma };
mkdirSync(OUT, { recursive: true });
let sair = 0;
if (process.argv.includes('--mutantes')) {
  for (const [mut, [, , alvo, grupo]] of Object.entries(MUT).filter(([m]) => !process.env.LFB || process.env.LFB === m)) {
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
    catch (e) { r.push({ id: 'LFB0', ok: false, msg: `grupo ${nome} quebrou: ${e.message.split('\n')[0]}` }); }
  }
  for (const c of r) console.log(`${c.ok ? 'VERDE   ' : 'VERMELHO'} ${c.id}  ${c.msg}`);
  sair = r.every((c) => c.ok) ? 0 : 1;
  console.log(`\nlobby-flavio (Chrome): ${r.filter((c) => c.ok).length}/${r.length}  (capturas em ${OUT})`);
}
await browser.close();
process.exit(sair);
