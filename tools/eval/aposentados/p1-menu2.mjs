// P1 — segunda passada do menu: as telas que a primeira perdeu.
// POR QUE: page.click() do Playwright espera "actionability" e, enquanto o
// #load-overlay ainda cobre a tela, os 4 primeiros itens do menu davam timeout.
// Aqui o clique é disparado por .click() do DOM (não espera hit-test) e só depois
// de o overlay sumir de verdade.
// Uso: node tools/eval/p1-menu2.mjs <outDir>
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/root/shots/p1';
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
mkdirSync(OUT, { recursive: true });
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio', '--no-sandbox'],
});
const log = [], errs = [], f404 = [];
const W = 1600, H = 900;
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', e => errs.push('[pageerror] ' + e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 200)); });
page.on('response', r => { if (r.status() >= 400) f404.push(`${r.status()} ${r.url()}`); });
const shot = async (n) => {
  try { await page.screenshot({ path: `${OUT}/${n}.png`, timeout: 240000 }); log.push(`[ok] ${n}`); }
  catch (e) { log.push(`[FALHA] ${n}: ${e.message.split('\n')[0]}`); }
};

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForTimeout(9000);
await page.evaluate(() => document.body.click());
// espera o overlay de carga sumir (era ele que engolia os cliques)
try {
  await page.waitForFunction(() => {
    const o = document.getElementById('load-overlay');
    return !o || o.classList.contains('hidden') || getComputedStyle(o).display === 'none' || getComputedStyle(o).opacity === '0';
  }, null, { timeout: 120000 });
} catch (e) { log.push('[overlay] ' + e.message.split('\n')[0]); }
await page.waitForTimeout(4000);

for (const [act, name] of [['sp', 'menu-02-setup'], ['ctf', 'menu-07-ctf'], ['config', 'menu-04-config'], ['ranking', 'menu-06-ranking'], ['mapa', 'menu-10-mapa']]) {
  try {
    await page.evaluate((a) => {
      document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
      document.getElementById('main-menu')?.classList.remove('hidden');
      document.getElementById('menu-setup')?.classList.add('hidden');
      document.querySelector(`.cs-item[data-act="${a}"]`)?.click();
    }, act);
    await page.waitForTimeout(3000);
    await shot(name);
  } catch (e) { log.push(`[menu ${act}] ${e.message.split('\n')[0]}`); }
}

writeFileSync(`${OUT}/_menu2-log.txt`, log.join('\n'));
writeFileSync(`${OUT}/_menu2-errs.txt`, (errs.join('\n') || 'sem erros') + '\n--- HTTP >=400 ---\n' + (f404.join('\n') || 'nenhum'));
console.log(log.join('\n'));
console.log('--- ERROS ---\n' + (errs.join('\n') || 'sem erros'));
console.log('--- HTTP>=400 ---\n' + (f404.join('\n') || 'nenhum'));
await browser.close();
