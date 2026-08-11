// Recaptura 1 mapa teleportando o jogador pra posição de um bot que RODOU o mapa
// (spawn em corredor → nenhum yaw mostra o miolo). Uso: node tools/eval/g2ui-map-bot.mjs piscina_treta 12
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const OUT = '/tmp/gauntlet/g2ui-maps';
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const MAP = process.argv[2] || 'piscina_treta';
const ROAM = parseFloat(process.argv[3] || '12');
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
page.on('pageerror', e => console.error('[pageerror]', e.message));
await page.goto(`${BASE}/?debug=1&auto=P,mst&map=${MAP}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 180000 });
await page.addStyleTag({ content: '#hud{display:none!important}' });
await page.evaluate(() => {
  const g = window.__game;
  for (const b of g.bots) b.hp = 1e9;   // roam livre, sem morrer
  g.player.hp = 1e9;
  g.player.pos.set(0, -100, 0);         // jogador fora do mapa enquanto os bots rodam
  if (g.vmScene) g.vmScene.visible = false;
  if (g.drops) for (const d of g.drops) d.mesh.visible = false;
});
await page.waitForTimeout(ROAM * 1000);
// teleporta o jogador pra um bot VIVO no miolo do mapa e congela geral
await page.evaluate(() => {
  const g = window.__game;
  const b = g.bots.find(b => b.alive) || g.bots[0];
  g.player.pos.set(b.pos.x, b.pos.y, b.pos.z);
  for (const bb of g.bots) { bb.pos.set(0, -80, 0); bb.vel?.set?.(0, 0, 0); }
  g.player.pitch = 0.04;
});
await page.waitForTimeout(500);
for (const yaw of [-2.4, -1.8, -1.2, -0.6, 0, 0.6, 1.2, 1.8, 2.4]) {
  await page.evaluate((y) => {
    const g = window.__game;
    g.player.yaw = y; g.player.pitch = 0.04; g.player.vel?.set?.(0, 0, 0);
    if (g.vmScene) g.vmScene.visible = false;
  }, yaw);
  await page.waitForTimeout(220);
  await page.screenshot({ path: `${OUT}/${MAP}-b${yaw}.png` });
}
console.log('bot-shots ok', MAP);
await browser.close();
