// Captura rápida do viewmodel: uma sessão, várias armas, sem recarregar o mapa.
// Uso: node tools/eval/vmshot.mjs <outDir> [armas] [W,H]
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const OUT = process.argv[2] || '/root/shots/vm';
const LIST = (process.argv[3] || 'ak,awp,uzi,deagle,md97').split(',');
const [W, H] = (process.argv[4] || '1500,1000').split(',').map(Number);
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
mkdirSync(OUT, { recursive: true });
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const b = await chromium.launch({ executablePath: process.env.CHROME_BIN, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--headless=new','--mute-audio','--no-sandbox'] });
const p = await b.newPage({ viewport: { width: W, height: H } });
const errs = [];
p.on('pageerror', e => errs.push(e.message.split('\n')[0]));
p.on('console', m => { const t = m.text(); if (m.type()==='error' && !/404|Not Found/.test(t)) errs.push(t.slice(0,200)); });
await p.goto(`${BASE}/?debug=1&map=ferro_velho&auto=B,bozo`, { waitUntil:'domcontentloaded', timeout:180000 });
await p.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 900000 });
await p.waitForTimeout(4000);
for (const w of LIST) {
  await p.evaluate((wid) => { const g = window.__game; g.player.weapon = wid; g._switchWeapon && g._switchWeapon(wid); }, w);
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${OUT}/${w}.png`, timeout: 90000 });
  console.log('shot', w);
}
console.log('ERROS:', errs.length); errs.slice(0,10).forEach(e=>console.log(' ',e));
await b.close();
