/* ui-antes.mjs — fotografa as telas do fluxo de menu como elas estão HOJE.
   Serve de "antes" para o redesenho; o g2ui-verify não passa do gate de clique da splash.
   Uso: BASE=http://localhost:4399 node tools/eval/ui-antes.mjs   (saída em /tmp/ui-antes) */
import { mkdirSync } from 'node:fs';
import { abreChrome } from './lib/browser.mjs';

const OUT = process.env.OUT || '/tmp/ui-antes';
const BASE = process.env.BASE || 'http://localhost:4399';
mkdirSync(OUT, { recursive: true });

const browser = await abreChrome();
const W = +(process.env.W || 1536), H = +(process.env.H || 1024);
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('  [erro de página]', e.message));

const tiro = async (nome) => { await page.waitForTimeout(900); await page.screenshot({ path: `${OUT}/${nome}.png` }); console.log('  ->', nome); };

// nick vem do localStorage no boot; semear aqui destrava o JOGAR sem abrir o painel de setup
await page.addInitScript(() => localStorage.setItem('awpbr_nick', 'CORO_TESTE'));
await page.goto(`${BASE}/?debug=1`, { waitUntil: 'load' });
await page.waitForTimeout(3000);
await tiro('00-splash');

// atravessa o gate da splash
await page.mouse.click(760, 500);
await page.waitForSelector('#main-menu:not(.hidden)', { timeout: 30000 });
await page.waitForTimeout(2500);
await tiro('01-menu');


// cartaz do mapa abre a tela cheia de mapa
const thumb = await page.$('#map-thumb');
if (thumb) { await page.$eval('#map-thumb', el => el.click()); await page.waitForTimeout(1200); await tiro('02-mapa'); const back = await page.$('#ms-back'); if (back) { await page.$eval('#ms-back', el => el.click()); await page.waitForTimeout(800); } }

// JOGAR -> facção -> personagem
const jogar = await page.$('#btn-jogar');
if (jogar) {
  await page.$eval('#btn-jogar', el => el.click());
  await page.waitForTimeout(1500);
  await tiro('03-faccao');
  const teamE = await page.$('#btn-team-e');
  if (teamE) {
    await page.$eval('#btn-team-e', el => el.click()); await page.waitForTimeout(1200);
    await tiro('04-faccao-inimiga');
    const teamB = await page.$('#btn-team-b');
    if (teamB) { await page.$eval('#btn-team-b', el => el.click()); await page.waitForTimeout(2500); await tiro('05-personagem'); }
  }
}
await browser.close();
console.log('pronto:', OUT);
