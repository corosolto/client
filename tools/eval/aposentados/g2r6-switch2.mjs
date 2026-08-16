// G2-R6A: rajada de frames durante troca de rifles + ADS (caça à faixa preta) — dsf=1
// pra velocidade (SwiftShader), aspect 1512×982 (3:2 do dono). Troca ak→m4→m400→svd
// com e sem ADS no meio. Uso: node tools/eval/aposentados/g2r6-switch2.mjs <outDir>
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/tmp/gauntlet/g2r6-sw2';
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1512, height: 982 }, deviceScaleFactor: 1 });
let errors = 0;
page.on('console', m => { if (m.type() === 'error') { errors++; console.error('[console-err]', m.text()); } });
page.on('pageerror', e => { errors++; console.error('[pageerror]', e.message); });
await page.goto(`${BASE}/?debug=1&auto=P,mst&map=piscina_treta`, { waitUntil: 'load' });
await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 90000 });
await page.waitForTimeout(1000);
await page.evaluate(() => {
  const g = window.__game;
  for (const b of g.bots) { b.pos.set(0, -60, 0); b.hp = 1e9; }
  g.player.hp = 1e9; g.player.pitch = 0;
  g._switchWeapon('pistol'); g.player.drawUntil = 0;
});
await page.waitForTimeout(300);
// roteiro: cada passo = [ação, ms de espera antes da captura]
const seq = [
  ['ak', 80], ['noop', 120], ['noop', 120], ['noop', 400],
  ['m4', 80], ['noop', 120], ['noop', 400],
  ['m400', 80], ['noop', 120], ['noop', 400],
  ['adsOn', 80], ['noop', 150], ['noop', 300], ['noop', 400],
  ['adsOff', 100], ['noop', 400],
  ['svd', 80], ['noop', 400],
  ['adsOn', 500], ['noop', 500],
  ['adsOff', 200], ['ak', 80], ['noop', 300],
];
let i = 0;
for (const [act, wait] of seq) {
  await page.evaluate((act) => {
    const g = window.__game;
    if (act === 'adsOn') g._scope(true, true);
    else if (act === 'adsOff') g._scope(false, true);
    else if (act !== 'noop') { g._switchWeapon(act); }
    g.player.pitch = 0;
  }, act);
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/f${String(i).padStart(2, '0')}-${act}.png` });
  i++;
}
console.log('frames', i);
console.log(errors ? `FALHOU: ${errors} erro(s) de console` : '0 erros de console');
await browser.close();
process.exit(errors ? 1 : 0);
