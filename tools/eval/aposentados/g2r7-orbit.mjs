// G2-R7 — órbita de validação de uma GLB de viewmodel via public/vm-inspect.html.
// Uso: node tools/eval/aposentados/g2r7-orbit.mjs <src> <prefixo> [views]
// views default: right(1.6,0.3,0) left(-1.6,0.3,0) top(0,1.8,0.3) behind-right(0.9,0.6,-1.2)
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
const SRC = process.argv[2] || 'models/fpvm/arms_ak.glb';
const PREFIX = process.argv[3] || 'g2r7-orbit';
const VIEWS = (process.argv[4] || 'right:1.6,0.3,0|left:-1.6,0.3,0|top:0,1.8,0.3|fp:0.9,0.6,-1.2|front:0,0.2,1.8')
  .split('|').map((s) => { const [k, v] = s.split(':'); return [k, v]; });
const OUT = '/tmp/gauntlet'; mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(`${BASE}/vm-inspect.html?src=${SRC}`, { waitUntil: 'load' });
await page.waitForFunction(() => document.title === 'vm ready', null, { timeout: 60000 });
for (const [k, v] of VIEWS) {
  await page.evaluate((vv) => { const [x, y, z] = vv.split(',').map(Number); window.VIEW(x, y, z); }, v);
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${OUT}/${PREFIX}-${k}.png` });
  console.log('shot', k, v);
}
console.log('DONE');
await browser.close();
