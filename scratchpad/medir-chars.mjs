import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const BASE = process.env.BASE || 'http://127.0.0.1:8124';
const TAG = process.env.TAG || '?';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--headless=new','--mute-audio'] });
const p = await b.newPage({ viewport:{width:1400,height:800} });
await p.addInitScript(() => {
  window.__lt = { total: 0, n: 0, maior: 0 };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) {
    window.__lt.total += e.duration; window.__lt.n++;
    window.__lt.maior = Math.max(window.__lt.maior, e.duration);
  }}).observe({ type: 'longtask', buffered: true }); } catch {}
  localStorage.setItem('awpbr_nick', 'MEDIDOR');
});
await p.goto(`${BASE}/?debug=1`, { waitUntil:'domcontentloaded' });
await p.click('#boot-splash').catch(()=>{});
await p.waitForSelector('#main-menu:not(.hidden)', { timeout:60000 });
await p.waitForTimeout(2000);
await p.evaluate(() => { window.__lt = { total:0, n:0, maior:0 }; });
const t0 = Date.now();
await p.evaluate(() => document.getElementById('btn-jogar')?.click());
await p.waitForTimeout(700);
await p.evaluate(() => document.getElementById('btn-team-e')?.click());
await p.waitForTimeout(700);
await p.waitForSelector('#char-select:not(.hidden)', { timeout:60000 }).catch(()=>{});
await p.waitForTimeout(12000);
const lt = await p.evaluate(() => window.__lt);
const itens = await p.evaluate(() => document.querySelectorAll('#char-list > *').length);
console.log(`${TAG}\tlongtask=${lt.total.toFixed(0)}ms n=${lt.n} maior=${lt.maior.toFixed(0)}ms itens=${itens} parede=${((Date.now()-t0)/1000).toFixed(1)}s`);
await b.close();
