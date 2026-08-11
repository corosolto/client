// G2-R6A: captura FRAME A FRAME durante troca de armas (caça à "faixa preta").
// Simula (1) _switchWeapon direto e (2) _grabPickup de um rifle do chão, gravando cada
// frame por ~0.9s. Uso: node tools/eval/g2r6-switch-capture.mjs <outDir>
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/tmp/gauntlet/g2r6-switch';
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
const page = await browser.newPage({ viewport: { width: 1512, height: 982 }, deviceScaleFactor: 2 });
let errors = 0;
page.on('console', m => { if (m.type() === 'error') { errors++; console.error('[console-err]', m.text()); } });
page.on('pageerror', e => { errors++; console.error('[pageerror]', e.message); });
await page.goto(`${BASE}/?debug=1&auto=P,mst&map=fy_pool_day`, { waitUntil: 'load' });
await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 90000 });
await page.waitForTimeout(1200);
await page.evaluate(() => {
  const g = window.__game;
  for (const b of g.bots) { b.pos.set(0, -60, 0); b.hp = 1e9; }
  g.player.hp = 1e9;
  g._switchWeapon('pistol'); g.player.drawUntil = 0;
});
await page.waitForTimeout(300);

// Congela o relógio do jogo? Não — queremos o draw animando. Captura frames em rajada.
async function burst(tag, fn, frames = 22, gapMs = 40) {
  await page.evaluate(fn);
  for (let i = 0; i < frames; i++) {
    await page.screenshot({ path: `${OUT}/${tag}-f${String(i).padStart(2, '0')}.png` });
    await page.waitForTimeout(gapMs);
  }
  console.log('burst', tag, 'done');
}

// 1) troca pistol -> ak (rifle com static VM)
await burst('sw-ak', () => { const g = window.__game; g._switchWeapon('ak'); });
// 2) troca ak -> m400 (classe awp)
await burst('sw-m400', () => { const g = window.__game; g._switchWeapon('m400'); });
// 3) pickup real do chão: dropa um g3 nos pés e pega
await burst('pk-g3', () => {
  const g = window.__game;
  g._switchWeapon('pistol'); g.player.drawUntil = 0;
  g._dropWeapon(g.player.pos.x + 0.4, g.player.pos.z + 0.4, 'g3');
});
console.log(errors ? `FALHOU: ${errors} erro(s) de console` : '0 erros de console');
await browser.close();
process.exit(errors ? 1 : 0);
