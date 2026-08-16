// Verifica a IA de CTF dos bots: inicia um match ?ctf=1, amostra donos dos 3 pontos e
// a menor distância bot->ponto ao longo do tempo. Prova que bots BUSCAM (distância cai)
// e CAPTURAM (donos deixam de ser todos null). Uso: node tools/eval/ctf-verify.mjs [secs]
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const SECS = parseFloat(process.argv[2] || '45');
const BASE = process.env.BASE || 'http://localhost:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));

await page.goto(`${BASE}/?debug=1&auto=P,mst&ctf=1`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 60000 });
// tira o player da jogada (fica parado longe) pra medir só os bots
await page.evaluate(() => { const g = window.__game; if (g.player) { g.player.hp = 1e9; g.player.pos.set(0, 0, 0); } });

const samples = [];
const N = Math.round(SECS / 3);
for (let i = 0; i < N; i++) {
  await page.waitForTimeout(3000);
  const s = await page.evaluate(() => {
    const g = window.__game;
    if (!g.ctfPts) return null;
    const owners = g.ctfPts.map(p => p.owner);
    const prog = g.ctfPts.map(p => +(p.prog || 0).toFixed(2));
    // menor distância de QUALQUER bot vivo a QUALQUER ponto
    let minD = 1e9, seeking = 0;
    for (const b of g.bots) {
      if (!b.alive) continue;
      for (const p of g.ctfPts) {
        const d = Math.hypot(b.pos.x - p.x, b.pos.z - p.z);
        if (d < minD) minD = d;
      }
      if (b.ctfPt !== undefined && !b.target) seeking++;   // bot com objetivo de ponto, sem combate
    }
    return { owners, prog, minD: +minD.toFixed(1), seeking, bots: g.bots.filter(b => b.alive).length };
  });
  if (s) { samples.push(s); console.log(`t+${(i + 1) * 3}s`, JSON.stringify(s)); }
}
await browser.close();

const captured = samples.some(s => s.owners.some(o => o !== null));
const anySeeking = samples.some(s => s.seeking > 0);
const closed = samples.some(s => s.minD < 4.5);   // algum bot chegou dentro de um anel
console.log('\n=== RESULTADO ===');
console.log('bots com objetivo de ponto (seeking):', anySeeking);
console.log('algum bot alcançou um anel (<4.5m):', closed);
console.log('algum ponto capturado:', captured);
console.log('erros de console:', errs.length, errs.slice(0, 5));
process.exit(anySeeking && closed ? 0 : 1);
