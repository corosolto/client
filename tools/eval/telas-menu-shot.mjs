/* Prova de não-regressão das telas que NÃO foram redesenhadas nesta rodada (menu principal
   e pausa). O redesenho das telas 08/09 mexeu em `.btn`-adjacentes (#btn-menu, .btn-cta) e
   no `.screen` do #match-end; estas capturas mostram que menu e pausa continuam de pé.
   O g2ui-verify.mjs não serve aqui: ele é anterior ao #boot-splash e trava no primeiro
   clique (o splash intercepta ponteiro até o primeiro gesto). */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const OUT = process.env.OUT || '/tmp/telas';
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
page.on('pageerror', e => console.error('[pageerror]', e.message.slice(0, 200)));
await page.addInitScript(() => localStorage.setItem('awpbr_nick', 'ZÉ DO AWP'));

await page.goto(`${BASE}/?debug=1`, { waitUntil: 'domcontentloaded' });
// o splash intercepta ponteiro até o primeiro gesto
await page.click('#boot-splash').catch(() => {});
await page.waitForSelector('#main-menu:not(.hidden)', { timeout: 30000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/x01_menu.png` });
console.log('shot menu');

await page.goto(`${BASE}/?debug=1&auto=P,mst&map=praca_poderes`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 180000 });
await page.waitForTimeout(1200);
await page.evaluate(() => document.getElementById('pause-menu').classList.remove('hidden'));
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/x06_pausa.png` });
console.log('shot pausa');
await browser.close();
