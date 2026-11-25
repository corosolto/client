#!/usr/bin/env node
/* personagem-escolhido-browser.mjs — O PERSONAGEM ESCOLHIDO VALE NO SP E NO MP
   ===================================================================================
   Ponta a ponta da regra de docs/adr/0007-personagem-escolhido.md, com nó local:
     PB1 link `?personagem=dama` (Dama só joga na ESQUERDA) e entrada pela DIREITA da sala:
         o jogo AVISA que ela não joga ali e oferece IR PARA A ESQUERDA (sem trocar calado)
     PB2 o botão da oferta leva para a ESQUERDA e o nó troca o corpo para Dama
     PB3 SAIR PRO MENU e voltar ao SP: a confirmação e a partida são da Dama, não do corpo
         que a sala emprestou
     PB4 JOGO RÁPIDO (lado automático) com um personagem dos dois lados (`punk`) chega como ele
   Antes da regra: PB1 sem aviso, PB3 com o corpo da sala.

   Manual, fora do check:fast (precisa de nó; ver o cabeçalho do mapa-sp-pos-mp-browser.mjs).
   USO
     BASE=http://localhost:<serve.mjs> NO=localhost:<nó> \
       tools/eval/with-browser-lock.sh node tools/eval/personagem-escolhido-browser.mjs
     OUT=<pasta> grava figuras; VIEWPORT=390x844 roda no tamanho de celular */
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE, NO = process.env.NO;
if (!BASE || !NO) { console.error('defina BASE e NO'); process.exit(2); }
const OUT = process.env.OUT || '';
const [W, H] = (process.env.VIEWPORT || '1536x1024').split('x').map(Number);
if (OUT) mkdirSync(OUT, { recursive: true });

const playwright = await import('playwright')
const chromium = playwright.chromium || playwright.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});
const falhas = [];
const cobra = (ok, msg) => { console.log(`  ${ok ? 'ok  ' : 'FALHA'} ${msg}`); if (!ok) falhas.push(msg); };
const foto = async (page, nome) => { if (OUT) await page.screenshot({ path: `${OUT}/${nome}-${W}x${H}.png` }); };

async function abrirHub(page, personagem) {
  await page.route(/corosolto\.com\.br/, (r) => r.abort());
  await page.addInitScript(() => { localStorage.setItem('awpbr_nick', 'RUBAO'); localStorage.setItem('cs_lang', 'pt'); });
  await page.goto(`${BASE}/?mp=${NO}&personagem=${personagem}&secao=jogar&partida=singleplayer`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#splash-enter:not(.hidden)', { timeout: 180000 });
  await page.keyboard.press('Space');
  await page.waitForSelector('#hub-ui:not([hidden])', { timeout: 120000 });
  await page.click('#hub-mp');
  await page.waitForFunction(() => document.getElementById('mp-estado')?.dataset.s === 'on', null, { timeout: 60000 });
}
const estado = (page) => page.evaluate(() => {
  const g = window.__game;
  const aviso = document.querySelector('#mp-identity-pause .mp-identity-aviso');
  return { online: !!g?.online, char: g?.playerCharId || null, team: g?.playerTeam || null,
    aviso: aviso && !aviso.hidden ? aviso.textContent : null, oferta: !document.getElementById('mp-personagem-acoes')?.hidden };
});

try {
  console.log('PB1-PB3 · Dama (só ESQUERDA) entrando pela DIREITA');
  {
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    await abrirHub(page, 'dama');
    await page.waitForSelector('.mp-entrar[data-lado="B"]:not([disabled])', { timeout: 60000 });
    await page.click('.mp-entrar[data-lado="B"]');
    await page.waitForFunction(() => window.__game?.online && window.__game.playerTeam === 'B', null, { timeout: 240000 });
    await page.waitForTimeout(1500);
    await foto(page, 'pb1-toast');
    let s = await estado(page);
    cobra(s.char !== 'dama' && /não joga na DIREITA/.test(s.aviso || '') && s.oferta, `PB1 aviso e oferta na DIREITA (${JSON.stringify(s)})`);
    await page.evaluate(() => window.__game.setPaused(true));
    await page.waitForSelector('#mp-personagem-ir', { state: 'visible', timeout: 20000 });
    await foto(page, 'pb1-pausa');
    await page.click('#mp-personagem-ir');
    await page.waitForFunction(() => window.__game?.online && window.__game.playerTeam === 'E' && window.__game.playerCharId === 'dama', null, { timeout: 60000 }).catch(() => {});
    s = await estado(page);
    cobra(s.team === 'E' && s.char === 'dama' && !s.aviso, `PB2 foi para a ESQUERDA como Dama (${JSON.stringify(s)})`);
    await foto(page, 'pb2-esquerda');
    await page.evaluate(() => window.__game.setPaused(true));
    await page.click('#btn-quit'); await page.waitForTimeout(400); await page.click('#btn-quit');
    await page.waitForFunction(() => !window.__game, null, { timeout: 30000 });
    await page.waitForTimeout(800);
    await page.click('#hub-sp'); await page.waitForTimeout(400);
    await page.click('#btn-jogar');
    await page.waitForSelector('#hub-quick:not([hidden])', { timeout: 20000 });
    await page.waitForTimeout(500);
    const voce = await page.evaluate(() => {
      const t = document.getElementById('hub-quick-summary')?.innerText.split('\n').map((x) => x.trim()).filter(Boolean) || [];
      return t[t.indexOf('VOCÊ') + 1] || null;
    });
    await foto(page, 'pb3-confirmacao-sp');
    await page.click('#hub-quick-confirm');
    await page.waitForFunction(() => window.__game && !window.__game.online && window.__game.playerCharId, null, { timeout: 240000 });
    s = await estado(page);
    cobra(/Dama/.test(voce || '') && s.char === 'dama', `PB3 SP depois da sala é da Dama (confirmação "${voce}", partida ${s.char})`);
    await page.close();
  }
  console.log('PB4 · Punk (dois lados) pelo JOGO RÁPIDO');
  {
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    await abrirHub(page, 'punk');
    await page.click('#mp-quick');
    await page.waitForFunction(() => window.__game?.online && window.__game.playerCharId === 'punk', null, { timeout: 240000 }).catch(() => {});
    const s = await estado(page);
    cobra(s.char === 'punk' && !s.aviso, `PB4 chegou como Punk no lado ${s.team} (${JSON.stringify(s)})`);
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(`personagem-escolhido-browser: ${falhas.length ? `FAIL (${falhas.length})` : 'PASS'}`);
process.exitCode = falhas.length ? 1 : 0;
