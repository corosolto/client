import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const OUT = process.env.OUT || 'scratchpad/shots';
const BASE = process.env.BASE || 'http://127.0.0.1:4323';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
for (const lang of ['pt', 'en']) {
  const page = await browser.newPage({ viewport: { width: 1536, height: 864 } });
  page.on('pageerror', e => console.error('[pageerror]', lang, e.message.slice(0, 200)));
  await page.addInitScript(() => localStorage.setItem('awpbr_nick', 'ZÉ DO AWP'));
  await page.goto(`${BASE}/?debug=1&lang=${lang}`, { waitUntil: 'domcontentloaded' });
  await page.click('#boot-splash').catch(() => {});
  await page.waitForSelector('#main-menu:not(.hidden)', { timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('map-thumb')?.click());
  await page.waitForSelector('#map-screen:not(.hidden)', { timeout: 10000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/map_${lang}.png` });
  // aba COMUNIDADE, que é a do print do dono
  await page.click('.ms-tab[data-cat="COMUNIDADE"]');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/map_${lang}_comunidade.png` });
  console.log('shot', lang);
  await page.close();
}
await browser.close();
