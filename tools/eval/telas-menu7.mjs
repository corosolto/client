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
const LANG = process.env.LANG_UI || 'pt';
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const MOBILE = process.env.MOBILE === '1';
const want = (id) => !ONLY || ONLY.has(id);

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const W = +(process.env.W || 1536), H = +(process.env.H || 1024);
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message.slice(0, 200)));
await page.addInitScript(() => localStorage.setItem('awpbr_nick', 'ZÉ DO AWP'));

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

/* 07 CONFIGURAÇÕES — pelo item do menu, para pegar o estado real de abas */
if (want('07')) {
  await page.click('.cs-item[data-act="config"]');
  await page.waitForSelector('#settings-panel:not(.hidden)', { timeout: 10000 });
  await page.waitForTimeout(500);
  await shot('07_config');
  await page.click('#settings-back').catch(() => {});
  await page.waitForTimeout(400);
}

/* abre o setup (PASSO 1) */
await page.click('.cs-item[data-act="sp"]');
await page.waitForTimeout(700);

/* 04 ESCOLHA DO MAPA — o cartaz do mapa dentro do setup abre a tela cheia */
if (want('04')) {
  await page.click('#map-thumb').catch(async () => { await page.click('.map-thumb'); });
  await page.waitForSelector('#map-screen:not(.hidden)', { timeout: 10000 });
  await page.waitForTimeout(900);
  await shot('04_mapa');
  await page.click('#ms-back');
  await page.waitForTimeout(600);
  await page.click('.cs-item[data-act="sp"]').catch(() => {});
  await page.waitForTimeout(500);
}

/* 02 ESCOLHA DA FACÇÃO */
if (want('02') || want('03')) {
  await page.click('#btn-jogar');
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
    await shot('03_personagem');
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
