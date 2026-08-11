/* Sonda de caixas das telas 08/09 — imprime o retângulo (fração de tela) e a tipografia
   dos elementos que estão sendo redesenhados contra references/telas/. Serve pra separar
   "o CSS não aplicou" de "aplicou e o desenho está errado". */
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
page.on('pageerror', e => console.error('[pageerror]', e.message.slice(0, 200)));
await page.addInitScript(() => localStorage.setItem('awpbr_nick', 'ZÉ DO AWP'));
await page.goto(`${BASE}/?debug=1&auto=P,mst&map=praca_poderes`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 180000 });
await page.waitForTimeout(1200);
await page.evaluate(() => {
  const g = window.__game;
  const k = [12, 8, 6, 5, 3, 1, 0], d = [3, 4, 4, 5, 6, 6, 7];
  const by = { P: 0, B: 0 };
  for (const c of g.combatants) { const i = Math.min(by[c.team]++, 6); c.kills = k[i]; c.deaths = d[i]; }
  g.roundNum = 4; g.roundsWon = { P: 2, B: 1 };
  g._resultadoDaRodada('PALHAÇOS LEVARAM O ROUND', 'ELIMINARAM O TIME INTEIRO');
});
await page.waitForTimeout(400);
const box = await page.evaluate(() => {
  const W = innerWidth, H = innerHeight;
  const f = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { x: +(r.x / W).toFixed(3), y: +(r.y / H).toFixed(3), w: +(r.width / W).toFixed(3), h: +(r.height / H).toFixed(3),
             fs: cs.fontSize, bg: cs.backgroundColor, color: cs.color }; };
  const q = (s) => f(document.querySelector(s));
  return { sb: q('#scoreboard'), h3: q('#scoreboard h3'), score: q('.sb-score'), heads: q('.sb-heads'),
           table: q('#scoreboard table'), tbody: q('#sb-body'), tr1: q('#sb-body tr'), foot: q('.sb-foot'),
           nRows: document.querySelectorAll('#sb-body tr').length };
});
console.log(JSON.stringify(box, null, 1));
await browser.close();
