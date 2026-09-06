// Character-select screen capture: opens the real menu flow (JOGAR → team P → char row)
// and screenshots the pvSetChar 3D preview per character id. Used for FASE 2 before/after
// evidence (support-hand IK on the select screen).
// Usage: node tools/eval/select-capture.mjs [outDir] [char1,char2,...] [team]
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/tmp/selectframes';
const LIST = (process.argv[3] || 'esquerdomacho,mst').split(',');
const TEAM = process.argv[4] || 'E';
const BASE = process.env.BASE || 'http://localhost:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', e => console.error('[pageerror]', e.message));
await page.goto(`${BASE}/?debug=1`, { waitUntil: 'load' });
await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
await page.waitForSelector('#nick-input', { timeout: 30000 });
await page.fill('#nick-input', 'EVAL');
await page.click('#btn-jogar');
// 5 facções hoje (P/B/U/C/F) — o ternário antigo só sabia P e B, então capturar
// palhaço ou funkeiro clicava no time errado e a lista vinha vazia.
await page.click(`#btn-team-${TEAM.toLowerCase()}`);
await page.waitForSelector('#char-select:not(.hidden)', { timeout: 15000 });
// espera os GLBs carregarem e os thumbs trocarem
await page.waitForTimeout(5000);

for (const id of LIST) {
  const idx = await page.evaluate(async ([tid, tteam]) => {
    const { CHARACTERS } = await import('./js/characters.js');
    return CHARACTERS.filter(c => c.team === tteam).findIndex(c => c.id === tid);
  }, [id, TEAM]);
  if (idx < 0) { console.log('CHAR NOT FOUND', id); continue; }
  await page.evaluate((i) => document.querySelectorAll('.char-row')[i].click(), idx);
  // pvSetChar é async (preload) + settle do pose; turntable gira — ângulo ~fixo pelo wait
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/select-${id}.png` });
  const box = await page.locator('#char-preview').boundingBox();
  if (box) await page.screenshot({ path: `${OUT}/select-${id}-crop.png`, clip: box });
  console.log('shot', id, 'row', idx);
}
await browser.close();
console.log('DONE ->', OUT);
