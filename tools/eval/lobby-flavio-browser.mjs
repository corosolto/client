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
   Os anúncios de abertura (Javaporco, Operação Flávio e o passe) entram como já vistos: são outra régua.
   Capturas em OUT (padrão tools/eval/out/lobby-flavio). Um navegador por vez (with-browser-lock.sh). */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { MUT, TELAS, TOQUE, escapeFailures, idiomaVerdict, inspectLobbyDOM, inspectModalDOM, jogarVerdict, lobbyFailures, modalFailures, telaVerdicts } from './lobby-flavio-common.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:9428';
/* desktop do dono, Full HD, notebook 1536×864 e 1280×720, celular deitado (Android grande e iPhone) */
const OUT = process.env.OUT || 'tools/eval/out/lobby-flavio';
const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const launchBrowser = () => chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});
const closeBrowser = async (instance) => {
  let timer;
  try {
    await Promise.race([
      instance.close(),
      new Promise((resolve) => { timer = setTimeout(resolve, 5000); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};
let browser = await launchBrowser();


async function lobby({ w = 1536, h = 960, toque = false, lang = 'pt', mutante = '' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, ...(toque ? { hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : {}) });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  await page.addInitScript(() => {
    localStorage.setItem('csbr-mode-ann-seen', JSON.stringify(['operacao_flavio']));
    localStorage.setItem('cs-javaporcos-cidade-anuncio-v1', '1');
    localStorage.setItem('cs-passe-anuncio', 'sessao-da-treta-s1/1');
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
  await Promise.all(TELAS.map(async ([w, h, toque]) => {
    const tag = `${w}x${h}`;
    const { page, ctx } = await lobby({ w, h, toque, mutante });
    if (cap) await page.screenshot({ path: `${OUT}/lobby-${tag}.png` });
    const c = await page.evaluate(inspectLobbyDOM);
    const l = lobbyFailures(c, tag, w, h, toque);
    e1.push(...l.e1); e6.push(...l.e6);
    if (!(await abrirCard(page, toque))) { e2.push(`${tag}: o card não abre a história`); await ctx.close(); return; }
    await page.waitForFunction(() => document.querySelector('dialog[data-historia] .cs-modes-bg')?.complete, null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(500);
    if (cap) await page.screenshot({ path: `${OUT}/historia-${tag}.png` });
    const m = await page.evaluate(inspectModalDOM);
    e2.push(...modalFailures(m, tag));
    for (const tecla of ['Tab', 'Tab', 'Tab', 'Shift+Tab']) {
      await page.keyboard.press(tecla);
      if (!(await page.evaluate(() => { const a = document.activeElement; return !!a?.closest('dialog[data-historia]') || a === document.body; }))) { e2.push(`${tag}: ${tecla} levou o foco para fora do diálogo`); break; }
    }
    await page.keyboard.press('y'); await page.waitForTimeout(300);
    const gaveta = await page.evaluate(() => document.getElementById('tp-resenha')?.hasAttribute('data-aberta'));
    await page.keyboard.press('Escape'); await page.waitForTimeout(600);
    const s = await page.evaluate(() => ({ aberto: !!document.querySelector('dialog[open]'), foco: document.activeElement?.id || document.activeElement?.tagName }));
    e3.push(...escapeFailures(gaveta, s, tag));
    await ctx.close();
  }));
  return telaVerdicts(e1, e2, e3, e6);
}
/* B · JOGAR começa a partida da escolta. */
async function jogar(mutante, cap) {
  const { page, ctx } = await lobby({ mutante });
  let c;
  if (!(await abrirCard(page, false))) c = jogarVerdict(false, {});
  else {
    await page.click('dialog[data-historia] [data-jogar]');
    const ok = await page.waitForFunction(() => window.__game?._mapId, null, { timeout: 120000 }).then(() => true, () => false);
    const r = await page.evaluate(() => ({ mapa: window.__game?._mapId, modal: !!document.querySelector('dialog[open]') }));
    if (cap) await page.screenshot({ path: `${OUT}/jogar-1536x960.png` });
    c = jogarVerdict(ok, r);
  }
  await ctx.close();
  return [c];
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
  return [idiomaVerdict(rotulo, t, abriu)];
}

const GRUPOS = { telas, jogar, idioma };
mkdirSync(OUT, { recursive: true });
let sair = 0;
if (process.argv.includes('--mutantes')) {
  const mutantes = Object.entries(MUT).filter(([m]) => !process.env.LFB || process.env.LFB === m);
  for (const [indice, [mut, [, , alvo, grupo]]] of mutantes.entries()) {
    // Um Chromium por mutante evita esgotar o route.fetch após dezenas de contexts.
    if (indice) { await closeBrowser(browser); browser = await launchBrowser(); }
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
await closeBrowser(browser);
process.exit(sair);
