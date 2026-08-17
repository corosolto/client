/* Captura das SETE telas de menu (01-07) no mesmo enquadramento 3:2 (1536×1024) das
   referências em `references/telas/`, para comparação lado lado.

   Por que mais um script e não o g2ui-verify.mjs: aquele é anterior ao #boot-splash e
   trava no primeiro clique (o splash intercepta ponteiro até o primeiro gesto). E o
   telas-capture.mjs só cobre 08/09, que só existem dentro de uma partida viva.

   Uso: BASE=http://localhost:4321 node tools/eval/telas-menu7.mjs
        OUT=/tmp/telas7 BASE=... node tools/eval/telas-menu7.mjs
        ONLY=01,06 ...  captura só as telas listadas */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.env.OUT || '/tmp/telas7';
/* 127.0.0.1 evita cair num servidor IPv6 de outro projeto que também use :4321. */
const BASE = process.env.BASE || 'http://127.0.0.1:4321';
const LANG = process.env.LANG_UI || process.env.UI_LANG || 'pt';
const UI_LANG = LANG;
const SMOKE = process.env.SMOKE === '1';
if (!['pt', 'en'].includes(UI_LANG)) throw new Error(`UI_LANG inválido: ${UI_LANG}`);
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const MOBILE = process.env.MOBILE === '1';
const want = (id) => !ONLY || ONLY.has(id);

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: [
    '--headless=new', '--mute-audio',
    ...(process.env.GL === 'swiftshader' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []),
  ],
});
const W = +(process.env.W || 1536), H = +(process.env.H || 1024);
const page = await browser.newPage({ viewport: { width: W, height: H } });
const pageErrors = [];
page.on('pageerror', (e) => { pageErrors.push(e.message); console.error('[pageerror]', e.message.slice(0, 200)); });
await page.addInitScript((lang) => {
  localStorage.setItem('awpbr_nick', 'ZÉ DO AWP');
  localStorage.setItem('cs_lang', lang);
}, UI_LANG);

const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot', name);
};

/* ---------- 01..04 + 07: fluxo de menu ---------- */
/* debug=1 libera o menu em viewport móvel; o ensaio do fallback precisa do boot normal. */
await page.goto(`${BASE}/?${MOBILE ? '' : 'debug=1&'}lang=${LANG}`, { waitUntil: 'domcontentloaded' });
/* O clique antes de `_splash.ready` é ignorado de propósito pelo jogo. Esperar o convite
   visível mede o estado real e evita o falso timeout que deixava a splash presa. */
await page.waitForSelector('#splash-enter:not(.hidden)', { timeout: 120000 });
/* A splash pode sair entre o estado pronto e a actionability do Playwright (o gesto de
   teclado do próprio runner também a libera). Nesse caso, a próxima espera é a prova. */
await page.click('#boot-splash', { timeout: 5000 }).catch(() => {});
if (MOBILE) {
  await page.waitForSelector('#mobile-warning:not(.hidden)', { timeout: 60000 });
  await page.waitForTimeout(400);
  await shot('00_mobile');
  await browser.close();
  process.exit(0);
}
await page.waitForSelector('#main-menu:not(.hidden)', { timeout: 60000 });
await page.waitForTimeout(2500);
if (want('01')) await shot('01_menu');

if (SMOKE) {
  await page.click('.cs-item[data-act="ranking"]');
  await page.waitForSelector('#ranking-panel:not(.hidden)', { timeout: 10000 });
  await page.click('#ranking-back');
  await page.waitForSelector('#main-menu:not(.hidden)', { timeout: 10000 });
  console.log('smoke ranking abriu e voltou');
}

/* 07 CONFIGURAÇÕES — pelo item do menu, para pegar o estado real de abas */
if (want('07')) {
  await page.click('.cs-item[data-act="config"]');
  await page.waitForSelector('#settings-panel:not(.hidden)', { timeout: 10000 });
  await page.waitForTimeout(500);
  await shot('07_config');
  await page.click('#settings-back').catch(() => {});
  await page.waitForTimeout(400);
}

/* PASSO 1: escolhe o modo; o catálogo completo de mapas é o PASSO 2 padrão. */
await page.click('.cs-item[data-act="jogar"]');
await page.waitForSelector('#cs-modos:not([hidden])', { timeout: 5000 });
await page.click('.cs-item[data-act="sp"]');
await page.waitForSelector('#map-screen:not(.hidden)', { timeout: 10000 });
await page.waitForTimeout(700);

/* 04 ESCOLHA DO MAPA — os seis mapas já aparecem após escolher o modo. */
if (want('04')) {
  await page.waitForTimeout(900);
  const faixa = await page.evaluate(() => {
    const strip = document.getElementById('ms-strip')?.getBoundingClientRect();
    const cards = [...document.querySelectorAll('#ms-strip .ms-thumb')].map((el) => {
      const r = el.getBoundingClientRect();
      return { id: el.dataset.id, left: r.left, right: r.right, width: r.width };
    });
    return { strip: strip && { left: strip.left, right: strip.right, width: strip.width }, cards };
  });
  const fora = faixa.cards.filter((c) => c.left < faixa.strip.left - 1 || c.right > faixa.strip.right + 1 || c.width <= 0);
  console.log(`map-strip ${Math.round(faixa.strip.width)}px · cards ${faixa.cards.map((c) => Math.round(c.width)).join('/')}px`);
  if (fora.length) throw new Error(`cards cortados na faixa: ${fora.map((c) => c.id).join(', ')}`);
  await shot('04_mapa');
}
await page.click('#ms-continue');

/* 02 ESCOLHA DA FACÇÃO */
if (want('02') || want('03') || want('00B')) {
  await page.waitForSelector('#team-select:not(.hidden)', { timeout: 15000 });
  await page.waitForTimeout(900);
  if (want('02')) await shot('02_faccao');

  /* 03 ESCOLHA DO PERSONAGEM — o fluxo vigente é lado -> personagem -> adversário.
     A versão antiga do arnês ainda clicava #btn-team-p/#btn-team-b, IDs removidos quando
     a seleção passou a vir do registro de facções; ela não capturava mais o jogo real. */
  if (want('03')) {
    await page.click('.team-card[data-ready="1"]:not([aria-disabled="true"])');
    await page.waitForSelector('#char-select:not(.hidden)', { timeout: 20000 });
    await page.waitForTimeout(2500);
    if (want('03')) await shot('03_personagem');
    await page.click('#char-confirm');
    await page.waitForSelector('#team-select[data-step="enemy"]:not(.hidden)', { timeout: 10000 });
    const passo4 = await page.locator('#team-step').textContent();
    const dica4 = await page.locator('#team-hint').textContent();
    const esperado = UI_LANG === 'en' ? 'STEP 4 · THE OPPONENT' : 'PASSO 4 · O ADVERSÁRIO';
    if (passo4?.trim() !== esperado || !dica4?.trim()) throw new Error(`passo 4 inválido: ${passo4} · ${dica4}`);
    console.log(`team-step ${passo4.trim()} · ${dica4.trim()}`);
    if (want('00B') || SMOKE) {
      await page.click('#btn-team-b');
      if (want('00B')) {
        const loadingHold = await page.addStyleTag({ content: '#load-overlay.hidden{display:flex!important}' });
        await page.waitForSelector('#load-overlay', { state: 'visible', timeout: 10000 });
        await page.waitForTimeout(120);
        await shot('00B_loading');
        await loadingHold.evaluate((node) => node.remove());
      }
    }
    if (SMOKE) {
      await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 240000 });
      await page.waitForSelector('#hud:not(.hidden)', { timeout: 10000 });
      await shot('smoke_hud');
      console.log('smoke menu → ranking → facção → personagem → adversário → HUD vivo');
    }
  }
}

/* ---------- 05 HUD + 06 PAUSA: exigem partida viva ---------- */
if (want('05') || want('06')) {
  await page.goto(`${BASE}/?debug=1&lang=${LANG}&auto=P,mst&map=praca_poderes`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 240000 });
  await page.waitForTimeout(2000);
  if (want('05')) await shot('05_hud');
  if (want('06')) {
    /* Caminho de produção: setPaused aciona guarda de clique + onPauseChange + chrome. */
    await page.evaluate(() => window.__game.setPaused(true));
    await page.waitForTimeout(500);
    await shot('06_pausa');
  }
}

await browser.close();
if (pageErrors.length) throw new Error(`${pageErrors.length} pageerror: ${pageErrors.join(' · ')}`);
