#!/usr/bin/env node
/* home-selects-browser.mjs — AS OPÇÕES DA PARTIDA NA HOME SÃO SELECTS QUE ABREM
   ===================================================================================
   Pedido do dono (13/10): "todos os itens de seleção de mapa (e opções de partida) têm que
   ser um select que abre, no estilo do seletor de rounds". Antes: MATA-MATA e CAPTURA eram
   dois cartões, ROUNDS girava a cada clique, ARMAS/SEU TIME/INIMIGOS eram listas de outra
   cara e o mapa só trocava pelas setas ou pelo modal.

     HS1 seis selects na ordem MAPA, MODO, ARMAS, SEU TIME, INIMIGOS, ROUNDS, cada um um
         botão `aria-haspopup=listbox`; os cartões antigos não aparecem no hub
     HS2 cada um ABRE uma lista (role=listbox) inteira dentro da tela e fecha com Esc
     HS3 escolher na lista muda o estado de verdade: nome do mapa no cartaz e `?map=`, modo
         no badge, armas/bots/rounds no save (`awpbr_settings`) e o rótulo do próprio select
     HS4 abrir um fecha o outro; clique fora fecha

   USO
     BASE=http://localhost:<serve.mjs> tools/eval/with-browser-lock.sh node tools/eval/home-selects-browser.mjs
     VIEWPORT=390x844 (celular) · OUT=<pasta> grava uma figura por select aberto
     --mutante=lista-fora  empurra a lista para fora da tela (HS2 tem de reprovar)
     --mutante=sem-efeito  engole o clique da opção (HS3 tem de reprovar)
     --mutante=sem-tr      serve o main.js com os rótulos sem tr() (HS5 tem de reprovar)
     --mutante=tab-aberta  serve o main.js sem o fechamento no focusout (HS6 tem de reprovar) */
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE;
if (!BASE) { console.error('defina BASE'); process.exit(2); }
const OUT = process.env.OUT || '';
const [W, H] = (process.env.VIEWPORT || '1536x1024').split('x').map(Number);
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (OUT) mkdirSync(OUT, { recursive: true });
const root = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
const playwright = await import(pathToFileURL(`${root}/playwright/index.js`).href);
const chromium = playwright.chromium || playwright.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});
const falhas = [];
const cobra = (ok, msg) => { console.log(`  ${ok ? 'ok  ' : 'FALHA'} ${msg}`); if (!ok) falhas.push(msg); };
const ORDEM = ['mapa', 'modo', 'armas', 'time', 'inimigos', 'rounds'];
const ROTULOS = ['MAPA', 'MODO', 'ARMAS', 'SEU TIME', 'INIMIGOS', 'ROUNDS'];
const ROTULOS_EN = ['MAP', 'MODE', 'WEAPONS', 'YOUR TEAM', 'ENEMIES', 'ROUNDS'];
// Mutante de fonte: serve o main.js com as trocas pedidas, sem tocar no arquivo.
const mutarMain = (page, trocas) => page.route(/\/js\/main\.js/, async (route) => {
  const resp = await route.fetch();
  let body = await resp.text();
  for (const [de, para] of trocas) { if (!body.includes(de)) throw new Error(`mutante não achou: ${de}`); body = body.replace(de, para); }
  await route.fulfill({ response: resp, body });
});
const entrar = async (page) => {
  const splash = page.locator('#boot-splash');
  if (await splash.isVisible().catch(() => false)) {
    await page.waitForFunction(() => {
      const novo = document.getElementById('tp-splash-jogar');
      const legado = document.getElementById('splash-enter');
      return (novo && !novo.disabled) || (legado && !legado.classList.contains('hidden'));
    }, null, { timeout: 120000 });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => {
      const atual = document.getElementById('boot-splash');
      return !atual || atual.classList.contains('gone') || !atual.checkVisibility();
    }, null, { timeout: 30000 });
  } else {
    await page.waitForFunction(() => window.__CS_MAIN_READY__ === true, null, { timeout: 120000 });
  }
  await page.waitForSelector('#hub-ui:not([hidden])', { timeout: 120000 });
};

try {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.route(/corosolto\.com\.br/, (r) => r.abort());
  await page.addInitScript(() => {
    sessionStorage.setItem('cs_login_prompt_seen', '1');
    localStorage.setItem('awpbr_nick', 'RUBAO'); localStorage.setItem('cs_lang', 'pt');
    localStorage.setItem('awpbr_settings', JSON.stringify({ map: 'praca_poderes', mapPinned: true, wpnMode: 'all', allyBots: 3, enemyBots: 4, rounds: 5, ctfRounds: 3 }));
  });
  if (MUT === 'tab-aberta') await mutarMain(page, [["box.addEventListener('focusout', sair); lista.addEventListener('focusout', sair);", '']]);
  await page.goto(`${BASE}/?ui=legacy&secao=jogar&partida=singleplayer`, { waitUntil: 'domcontentloaded' });
  await entrar(page);
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
  if (MUT === 'lista-fora') await page.addStyleTag({ content: '.hub-sel-list{bottom:auto!important;top:-4000px!important}' });
  if (MUT === 'sem-efeito') await page.evaluate(() => document.addEventListener('click', (e) => { if (e.target.closest?.('.hub-sel-opt')) e.stopPropagation(); }, true));

  // HS1
  const sels = await page.evaluate(() => [...document.querySelectorAll('#hub-sels > .hub-sel')].map((b) => ({
    id: b.id.replace('hub-sel-', ''), rotulo: b.querySelector('small')?.textContent,
    popup: b.querySelector('button')?.getAttribute('aria-haspopup'),
    visivel: b.getBoundingClientRect().width > 0,
  })));
  const chipsVisiveis = await page.evaluate(() => { const c = document.querySelector('#menu-setup .hub-match-chips'); return !!c && c.getBoundingClientRect().height > 0; });
  cobra(JSON.stringify(sels.map((s) => s.id)) === JSON.stringify(ORDEM) && sels.every((s, i) => s.rotulo === ROTULOS[i] && s.popup === 'listbox' && s.visivel) && !chipsVisiveis,
    `HS1 seis selects visíveis na ordem e cartões antigos escondidos (${JSON.stringify(sels.map((s) => s.rotulo))}, chips ${chipsVisiveis})`);

  // HS2 + figuras
  for (const id of ORDEM) {
    await page.click(`#hub-sel-${id} .hub-sel-btn`);
    await page.waitForTimeout(250);
    const r = await page.evaluate((id) => {
      const l = document.getElementById(`hub-sel-${id}-lista`);
      if (!l || l.hidden) return null;
      const b = l.getBoundingClientRect();
      return { role: l.getAttribute('role'), n: l.children.length, top: b.top, left: b.left, right: b.right, bottom: b.bottom };
    }, id);
    const dentro = r && r.top >= 0 && r.left >= 0 && r.right <= W && r.bottom <= H;
    cobra(!!r && r.role === 'listbox' && r.n > 1 && dentro, `HS2 ${id} abre lista dentro da tela (${JSON.stringify(r)})`);
    if (OUT) await page.screenshot({ path: `${OUT}/select-${id}-${W}x${H}.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    const fechou = await page.evaluate((id) => document.getElementById(`hub-sel-${id}-lista`)?.hidden !== false, id);
    cobra(fechou, `HS2 ${id} fecha com Esc`);
  }

  // HS3
  const escolhe = async (id, v) => {
    await page.click(`#hub-sel-${id} .hub-sel-btn`);
    await page.waitForTimeout(200);
    await page.click(`#hub-sel-${id}-lista .hub-sel-opt[data-v="${v}"]`).catch(() => {});
    await page.waitForTimeout(400);
    return page.evaluate((id) => ({
      rotulo: document.querySelector(`#hub-sel-${id} strong`)?.textContent,
      mapa: document.getElementById('map-name')?.textContent, url: location.search,
      modo: document.getElementById('map-mode')?.dataset.mode,
      s: JSON.parse(localStorage.getItem('awpbr_settings') || '{}'),
    }), id);
  };
  let e = await escolhe('mapa', 'amazonia');
  cobra(/Amaz/.test(e.mapa) && /map=amazonia/.test(e.url) && /Amaz/.test(e.rotulo) && e.s.map === 'amazonia', `HS3 mapa → Amazônia (${e.mapa}, ${e.url}, ${e.rotulo})`);
  e = await escolhe('modo', 'arena');
  cobra(e.modo === 'arena' && e.rotulo === 'VIRA-CASACA', `HS3 modo → Vira-Casaca (${e.modo}, ${e.rotulo})`);
  e = await escolhe('modo', 'rounds');
  cobra(e.modo === 'rounds' && e.rotulo === 'MATA-MATA', `HS3 modo → mata-mata (${e.modo}, ${e.rotulo})`);
  e = await escolhe('armas', 'awp');
  cobra(e.s.wpnMode === 'awp' && /AWP/.test(e.rotulo), `HS3 armas → só AWP (${e.s.wpnMode}, ${e.rotulo})`);
  e = await escolhe('time', '0');
  cobra(e.s.allyBots === 0 && e.rotulo === 'SOLO', `HS3 seu time → solo (${e.s.allyBots}, ${e.rotulo})`);
  e = await escolhe('inimigos', '8');
  cobra(e.s.enemyBots === 8 && e.rotulo === '8 BOTS', `HS3 inimigos → 8 (${e.s.enemyBots}, ${e.rotulo})`);
  e = await escolhe('rounds', '9');
  cobra(e.s.rounds === 9 && e.rotulo === '9', `HS3 rounds → 9 (${e.s.rounds}, ${e.rotulo})`);

  // HS4
  await page.click('#hub-sel-armas .hub-sel-btn'); await page.waitForTimeout(150);
  // no celular a lista da ARMAS cobre o botão de ROUNDS (folha fixa): o clique vai direto no elemento
  await page.$eval('#hub-sel-rounds .hub-sel-btn', (b) => b.click()); await page.waitForTimeout(150);
  const abertos = await page.evaluate(() => [...document.querySelectorAll('.hub-sel-list')].filter((l) => !l.hidden).length);
  await page.mouse.click(Math.round(W / 2), 20); await page.waitForTimeout(150);
  const depois = await page.evaluate(() => [...document.querySelectorAll('.hub-sel-list')].filter((l) => !l.hidden).length);
  cobra(abertos === 1 && depois === 0, `HS4 uma lista aberta por vez (${abertos}) e clique fora fecha (${depois})`);
  if (OUT) await page.screenshot({ path: `${OUT}/home-${W}x${H}.png` });

  // HS6: Shift+Tab até o foco sair da lista fecha a lista
  // o clique fora do HS4 pode cair no botão de conta e abrir o diálogo no celular
  await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
  await page.$eval('#hub-sel-armas .hub-sel-btn', (b) => b.click()); await page.waitForTimeout(200);
  let saiu = false;
  for (let k = 0; k < 20 && !saiu; k++) {
    await page.keyboard.press('Shift+Tab'); await page.waitForTimeout(60);
    saiu = await page.evaluate(() => { const a = document.activeElement; return !a?.closest?.('#hub-sel-armas, #hub-sel-armas-lista'); });
  }
  const aberta = await page.evaluate(() => document.getElementById('hub-sel-armas-lista')?.hidden === false);
  cobra(saiu && !aberta, `HS6 foco sai pelo teclado e a lista fecha (saiu ${saiu}, aberta ${aberta})`);

  // HS5: em inglês os rótulos e as opções de modo saem traduzidos
  const en = await browser.newPage({ viewport: { width: W, height: H } });
  await en.route(/corosolto\.com\.br/, (r) => r.abort());
  if (MUT === 'sem-tr') await mutarMain(en, [["`<small>${tr(rotulo)}</small>", "`<small>${rotulo}</small>"], ["t: tr('MATA-MATA')", "t: 'MATA-MATA'"]]);
  await en.addInitScript(() => {
    sessionStorage.setItem('cs_login_prompt_seen', '1');
    localStorage.setItem('awpbr_nick', 'RUBAO');
    localStorage.setItem('cs_lang', 'en');
  });
  await en.goto(`${BASE}/?ui=legacy&secao=jogar&partida=singleplayer`, { waitUntil: 'domcontentloaded' });
  await entrar(en);
  await en.waitForTimeout(800);
  await en.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
  const rotEn = await en.evaluate(() => [...document.querySelectorAll('#hub-sels > .hub-sel small')].map((x) => x.textContent));
  await en.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
  await en.click('#hub-sel-modo .hub-sel-btn'); await en.waitForTimeout(200);
  const modosEn = await en.evaluate(() => [...document.querySelectorAll('#hub-sel-modo-lista .hub-sel-opt')].map((x) => x.textContent));
  cobra(JSON.stringify(rotEn) === JSON.stringify(ROTULOS_EN) && JSON.stringify(modosEn) === '["DEATHMATCH","CAPTURE","TURNCOAT"]',
    `HS5 em inglês: rótulos ${JSON.stringify(rotEn)}, modos ${JSON.stringify(modosEn)}`);
  await en.close();
} finally {
  await browser.close();
}
console.log(`home-selects-browser: ${falhas.length ? `FAIL (${falhas.length})` : 'PASS'}${MUT ? ` (mutante ${MUT})` : ''}`);
process.exitCode = falhas.length ? 1 : 0;
