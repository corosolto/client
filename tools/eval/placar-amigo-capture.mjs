import { execSync, spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const PORTA = '9150', BASE = `http://127.0.0.1:${PORTA}`;
const srv = spawn('node', ['tools/eval/serve.mjs', PORTA], { stdio: 'ignore' });
process.on('exit', () => srv.kill());
await new Promise(r => setTimeout(r, 800));
for (let i = 0; i < 60; i++) { try { const r = await fetch(`${BASE}/`); if (r.ok) break; } catch {} await new Promise(r => setTimeout(r, 1000)); }
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(`${BASE}/?debug=1&auto=P,mst&map=piscina_treta`, { waitUntil: 'domcontentloaded', timeout: 240000 });
await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 300000 });
// força o cenário do MP: online + um bot com pid do roster
await page.evaluate(() => {
  const g = window.__game;
  g.online = true;
  const alvo = g.combatants.find(c => !c.isPlayer);
  alvo._playerId = '11111111-2222-3333-4444-555555555555';
  g._showScoreboard(true);
});
await page.waitForSelector('button.sb-amigo', { timeout: 10000 });
const antes = (await page.$$eval('button.sb-amigo', bs => bs.map(b => b.textContent)))[0];
// clique via JS: o fim de round fecha o placar no meio e o click de ação trava em
// "stable"; o handler delegado é o mesmo.
await page.evaluate(() => document.querySelector('button.sb-amigo').click());
await page.waitForTimeout(1200);
await page.evaluate(() => { const g = window.__game; g.online = true; g._showScoreboard(true); });
await page.waitForTimeout(300);
const depois = (await page.$$eval('button.sb-amigo', bs => bs.map(b => b.textContent)))[0];
mkdirSync('tools/eval/asset-evidence/placar-amigo', { recursive: true });
writeFileSync('tools/eval/asset-evidence/placar-amigo/placar.png', await page.screenshot());
console.log(`botão: "${antes}" -> clique -> "${depois}"`);
await browser.close(); srv.kill(); process.exit(0);
