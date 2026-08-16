/* HUD sobre o PIOR FUNDO, não sobre o fundo médio.

   O scrim de canto do #hud saiu (pedido do dono: "o placar e as informações embaixo não
   precisam de background"). Quem segura o contraste agora é o contorno no glifo. Uma
   captura no praca_poderes não prova nada disso: o que motivou o scrim foi a AREIA DO PISCINÃO,
   RGB (214,196,164) — o fundo mais claro dos 4 mapas, anotado em style.css. Então a
   prova tem que ser tirada lá, com a câmera baixada pra encher a tela de areia.

   Uso: BASE=http://localhost:4321 node tools/eval/telas-hud-pior.mjs
        MAP=piscina_treta PITCH=0.5 ... */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.env.OUT || '/tmp/telas7/hud';
const BASE = process.env.BASE || 'http://localhost:4321';
const MAP = process.env.MAP || 'piscina_treta';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message.slice(0, 200)));
await page.addInitScript(() => localStorage.setItem('awpbr_nick', 'ZÉ DO AWP'));

await page.goto(`${BASE}/?debug=1&auto=P,mst&map=${MAP}`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 240000 });
await page.waitForTimeout(2500);

/* olha PRA BAIXO: enche o quadro de chão claro, que é o caso que o scrim cobria */
const pitch = +(process.env.PITCH || 0.62);
await page.evaluate((p) => { const g = window.__game; if (g && g.player) g.player.pitch = p; }, pitch);
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/05_hud_${MAP}_chao.png` });
console.log('shot', `05_hud_${MAP}_chao`);

/* e o enquadramento normal, pra comparar */
await page.evaluate(() => { const g = window.__game; if (g && g.player) g.player.pitch = 0; });
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/05_hud_${MAP}.png` });
console.log('shot', `05_hud_${MAP}`);

await browser.close();
