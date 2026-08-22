/* char-walk-shot.mjs — contact sheet do personagem ANDANDO, para OLHAR.
   A régua não substitui o olho (mesma regra do ref-measure.py). O pose-inflate.mjs dá o
   número do "balão"; este script dá a imagem, em 6 instantes do ciclo, sem montar mp4.
   Precisa de um servidor estático em public/ (padrão http://localhost:8123).
   uso: node tools/eval/char-walk-shot.mjs <char> <saida.png> [clipe] [arma] */
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { chromium } from 'playwright';

const CHAR = process.argv[2] || 'mst';
const OUT = process.argv[3] || `/tmp/walk-${CHAR}.png`;
const STATE = process.argv[4] || 'walk';
const WEAPON = process.argv[5] || 'ak';
const BASE = process.env.BASE || 'http://localhost:8123';
const VIEW = process.env.VIEW || 'tq';
const EXTRA = process.env.EXTRA ? `&${process.env.EXTRA.replace(/^&/, '')}` : '';
const PASSOS = 6, DT = 1 / 30;
// `death` dura 1,77 s na fonte e o runtime toca a 1,8×. A amostragem antiga acabava
// em 0,8 s e, por construção, nunca mostrava o corpo no chão. Os demais estados
// conservam a cadência histórica; morte atravessa 1,4 s e prova o quadro terminal.
const ENTRE = STATE === 'death' ? 7 : 4;
const DIR = `/tmp/walkshot-${CHAR}`;

rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new'],
});
const page = await browser.newPage({ viewport: { width: 420, height: 560 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(`${BASE}/mounttest.html?char=${encodeURIComponent(CHAR)}&w=${encodeURIComponent(WEAPON)}&play=${STATE}&view=${VIEW}&orbit=0&manual=1${EXTRA}`, {
  waitUntil: 'domcontentloaded',
  timeout: 60000,
});
await page.waitForFunction(() => window.MOUNT_READY, null, { timeout: 60000 });
for (let i = 0; i < PASSOS; i++) {
  for (let k = 0; k < ENTRE; k++) await page.evaluate((dt) => window.STEP && window.STEP(dt), DT);
  await page.evaluate(() => window.RENDER && window.RENDER());
  await page.screenshot({ path: `${DIR}/f${i}.png` });
}
await browser.close();
execSync(`ffmpeg -y -loglevel error -i ${DIR}/f%d.png -filter_complex "tile=${PASSOS}x1" "${OUT}"`);
console.log('contact sheet ->', OUT);
