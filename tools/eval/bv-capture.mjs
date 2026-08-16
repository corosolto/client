// botview capture helper: settles a pose via the page's own ctrl.update (inclui o IK da
// mão L) e fotografa de ângulos definidos. Uso: node tools/eval/bv-capture.mjs <outPrefix> <char> <w> <anim>
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const [OUT = '/tmp/fase1/bv', CHAR = 'mst', W = 'ak', ANIM = 'walk'] = process.argv.slice(2);
const BASE = process.env.BASE || 'http://localhost:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('pageerror', e => console.error('[pageerror]', e.message.slice(0, 300)));
await page.goto(`${BASE}/botview.html?char=${CHAR}&w=${W}&anim=${ANIM}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.BVIEW && window.BVIEW.ready, null, { timeout: 60000 });
// avança mais um pouco a pose (walk contínuo) e fotografa frente/perfil em close nas mãos
await page.evaluate(() => { for (let i = 0; i < 12; i++) window.BVIEW.ctrl.update(1 / 30, 1, true, 1.2); });
await page.evaluate(() => window.BVIEW.view(1.25, 1.35, 1.9, 0, 1.0, 0.35));
await page.screenshot({ path: `${OUT}-${CHAR}-${ANIM}-front.png` });
await page.evaluate(() => { for (let i = 0; i < 10; i++) window.BVIEW.ctrl.update(1 / 30, 1, true, 1.2); });
await page.evaluate(() => window.BVIEW.view(2.2, 1.3, 0.6, 0, 1.0, 0.2));
await page.screenshot({ path: `${OUT}-${CHAR}-${ANIM}-side.png` });
console.log('DONE ->', OUT, CHAR, ANIM);
await browser.close();
