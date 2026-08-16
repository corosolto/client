// Captura genérica: abre o jogo com params, espera o estado pedido, tira screenshots.
// Uso: node tools/eval/shot.mjs <out.png> [queryString] [W,H] [waitMs]
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const OUT = process.argv[2] || '/tmp/shot.png';
const Q = process.argv[3] || '';
const [VW, VH] = (process.argv[4] || '1600,900').split(',').map(Number);
const WAIT = parseInt(process.argv[5] || '4000', 10);
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });
page.on('pageerror', e => errs.push('[pageerror] ' + e.message));
try {
  await page.goto(`${BASE}/?${Q}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  if (/auto=/.test(Q)) {
    await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 240000 }).catch(e => errs.push('[wait-live] ' + e.message));
  }
  await page.waitForTimeout(WAIT);
  await page.screenshot({ path: OUT, timeout: 90000 });
  console.log('shot ->', OUT);
} catch (e) { errs.push('[fatal] ' + e.message); }
console.log('ERRORS:' + errs.length);
errs.slice(0, 25).forEach(e => console.log(e));
await browser.close();
