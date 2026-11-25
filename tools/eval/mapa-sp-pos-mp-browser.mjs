#!/usr/bin/env node
/* mapa-sp-pos-mp-browser.mjs — O SP DEPOIS DE UMA SALA ABRE O MAPA QUE O JOGADOR ESCOLHEU
   ===================================================================================
   Ponta a ponta do relato de 13/10 (escolheu Amazônia no SP, abriu Três Poderes):
     1. abre o hub com `?map=amazonia` no singleplayer;
     2. vai ao MULTIPLAYER e entra pelo JOGO RÁPIDO num nó LOCAL (a sala sorteia o mapa dela);
     3. sai pelo SAIR PRO MENU, volta ao SINGLEPLAYER, JOGAR, confirma;
     4. cobra que a confirmação e a partida aberta sejam Amazônia.
   Antes do conserto: abre o mapa da sala (RED). Depois: Amazônia (GREEN).

   Precisa de um nó de verdade, que é outro repositório: manual, fora do check:fast (a parte
   de fonte é o mapa-sp-pos-mp-check.mjs). Os nós de produção ficam BLOQUEADOS por rota, para
   o JOGO RÁPIDO não sair do nó local.

   USO
     BASE=http://localhost:<porta do serve.mjs> NO=localhost:<porta do nó> \
       tools/eval/with-browser-lock.sh node tools/eval/mapa-sp-pos-mp-browser.mjs
     OUT=<pasta>  grava as figuras (desktop 1536x1024 e 390x844) da confirmação depois do MP
     VIEWPORT=390x844  roda o fluxo inteiro nesse tamanho

   Nó local: a imagem do backend monta `<raiz do cliente>/server` = `game/` do backend e
   `<raiz>/api/_lib` = `api/_lib` do backend; `PORT=<p> REGIAO=br node server/index.js`. */
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE;
const NO = process.env.NO;
if (!BASE || !NO) { console.error('defina BASE e NO (ver cabeçalho)'); process.exit(2); }
const OUT = process.env.OUT || '';
const [W, H] = (process.env.VIEWPORT || '1536x1024').split('x').map(Number);
const ESCOLHIDO = 'amazonia';


const playwright = await import('playwright')
const chromium = playwright.chromium || playwright.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});
if (OUT) mkdirSync(OUT, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.route(/corosolto\.com\.br/, (r) => r.abort());
  await page.addInitScript(() => { localStorage.setItem('awpbr_nick', 'RUBAO'); localStorage.setItem('cs_lang', 'pt'); });
  await page.goto(`${BASE}/?mp=${NO}&map=${ESCOLHIDO}&secao=jogar&partida=singleplayer`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#splash-enter:not(.hidden)', { timeout: 180000 });
  await page.keyboard.press('Space');
  await page.waitForSelector('#hub-ui:not([hidden])', { timeout: 120000 });

  await page.click('#hub-mp');
  await page.waitForFunction(() => document.getElementById('mp-estado')?.dataset.s === 'on', null, { timeout: 60000 });
  await page.click('#mp-quick');
  await page.waitForFunction(() => window.__game?.online && window.__game._mapId, null, { timeout: 240000 });
  const mapaSala = await page.evaluate(() => window.__game._mapId);
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__game.setPaused(true));
  await page.waitForSelector('#btn-quit', { state: 'visible', timeout: 20000 });
  await page.click('#btn-quit'); await page.waitForTimeout(400); await page.click('#btn-quit');
  await page.waitForFunction(() => !window.__game, null, { timeout: 30000 });
  await page.waitForTimeout(800);

  await page.click('#hub-sp'); await page.waitForTimeout(400);
  const cartaz = await page.evaluate(() => document.getElementById('map-thumb')?.alt || null);
  await page.click('#btn-jogar');
  await page.waitForSelector('#hub-quick:not([hidden])', { timeout: 20000 });
  await page.waitForTimeout(600);
  const confirmacao = await page.evaluate(() => {
    const t = document.getElementById('hub-quick-summary')?.innerText.split('\n').map((s) => s.trim()).filter(Boolean) || [];
    return t[t.indexOf('MAPA') + 1] || null;
  });
  if (OUT) await page.screenshot({ path: `${OUT}/confirmacao-pos-mp-${W}x${H}.png` });
  await page.click('#hub-quick-confirm');
  await page.waitForFunction(() => window.__game && !window.__game.online && window.__game._mapId, null, { timeout: 240000 });
  const aberto = await page.evaluate(() => window.__game._mapId);

  const ok = aberto === ESCOLHIDO && /Amaz/.test(confirmacao || '');
  console.log(JSON.stringify({ escolhido: ESCOLHIDO, mapaSala, cartaz, confirmacao, aberto }));
  if (mapaSala === ESCOLHIDO) console.log('aviso: a sala sorteou o mesmo mapa; a prova é fraca nesta rodada, rode de novo');
  console.log(`mapa-sp-pos-mp-browser: ${ok ? 'PASS' : 'FAIL'} (escolhido ${ESCOLHIDO}, abriu ${aberto}, sala era ${mapaSala})`);
  process.exitCode = ok ? 0 : 1;
} finally {
  await browser.close();
}
