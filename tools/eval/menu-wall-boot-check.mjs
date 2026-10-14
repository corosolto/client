// O wallpaper da home não troca quando walls.json chega: uma arte e um download no boot do hub.
// Uso: BASE=http://localhost:9100 node tools/eval/menu-wall-boot-check.mjs [--mutante=slot-pela-classe]
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'http://localhost:4321';
const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const pw = await import(pathToFileURL(`${execSync('npm root -g').toString().trim()}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});
const falhas = [];
// cs_wallK 0 cobre o hub com #menu-setup.open; 20 cobre o índice além do fallback antigo de 18.
for (const semente of ['0', '20']) {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
  await context.addInitScript((k) => {
    if (!sessionStorage.getItem('menu-wall-boot')) { localStorage.setItem('cs_wallK', k); sessionStorage.setItem('menu-wall-boot', '1'); }
    const original = CSSStyleDeclaration.prototype.setProperty;
    window.__menuWalls = [];
    CSSStyleDeclaration.prototype.setProperty = function (nome, valor, ...resto) {
      if (nome === '--menu-wall') window.__menuWalls.push(valor);
      return original.call(this, nome, valor, ...resto);
    };
  }, semente);
  if (MUTANTE === 'slot-pela-classe') {
    await context.route(/\/js\/main\.js/, async (route) => {
      const resposta = await route.fetch();
      const corpo = (await resposta.text()).replace("if (_menuWallSlot) applySetupWall();", "if ($('menu-setup')?.classList.contains('open')) applySetupWall();");
      await route.fulfill({ response: resposta, body: corpo });
    });
  }
  const page = await context.newPage();
  const baixados = new Set();
  page.on('request', (r) => { const m = r.url().match(/\/img\/(?:walls-3x2\/)?(wall-\d+)\.webp/); if (m) baixados.add(m[1]); });
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.__CS_MAIN_READY__, null, { timeout: 180000 });
  await page.waitForFunction(() => window.__menuWalls.length > 0, null, { timeout: 30000 });
  await page.waitForTimeout(2500);
  const escritas = await page.evaluate(() => window.__menuWalls);
  const artes = [...new Set(escritas)];
  const home = baixados.size;
  const ok = artes.length === 1 && home <= 1;
  console.log(`${ok ? '✓' : '✗'} MW cs_wallK=${semente} · home=${artes.join(' → ')} · wall baixados=${[...baixados].join(',')}`);
  if (!ok) falhas.push(semente);
  await context.close();
}
await browser.close();
if (falhas.length) { console.error(`✗ MW1 · home trocou de wallpaper no boot (cs_wallK=${falhas.join(',')})`); process.exit(1); }
console.log('✓ MW1 · home mantém um wallpaper do primeiro quadro ao manifesto');
