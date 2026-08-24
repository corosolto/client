// Prova do caso ENTRÁVEL (RC2 córrego): um bot parado DENTRO do canal, com a
// câmera olhando as pernas — a espuma de contato tem que ler no tornozelo.
// O bot é re-afixado por intervalo (a IA dele continuaria andando).
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/tmp/rc2-pernas';
const BASE = process.env.BASE || 'http://localhost:8141';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: process.env.GPU === '0' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio']
    : ['--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`${BASE}/?debug=1&auto=P,mst&map=corrego`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 90000 });
await page.addStyleTag({ content: '#hud,.screen,#crash-overlay{display:none!important}' });
const pin = await page.evaluateHandle(() => {
  const g = window.__game, pl = g.player, bot = g.bots[0];
  pl.hp = 1e9;
  if (g.vm && g.vm.root) g.vm.root.visible = false;
  return setInterval(() => {
    // bot parado no meio do canal (água a 14 cm); câmera do jogador olhando as pernas dele
    bot.pos.set(0.4, -1.75, 2); if (bot.vel) bot.vel.set(0, 0, 0);
    bot.hp = 1e9; if (bot.alive === false) bot.alive = true;
    pl.pos.set(0.2, -0.35, 6.5); if (pl.vel) pl.vel.set(0, 0, 0);
    pl.yaw = 0.06; pl.pitch = -0.28;   // de z=6,5 p/ z=2: olhando o canal (-z)
    pl.hp = 1e9; if (pl.alive === false) pl.alive = true;
    if (g.vm && g.vm.models) for (const k in g.vm.models) g.vm.models[k].visible = false;
  }, 120);
});
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/corrego-pernas-t0.png` });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/corrego-pernas-t1.png` });
const info = await page.evaluate(() => ({
  depthOn: window.__game.scene.userData.waters?.map((w) => w.material.uniforms.uDepthOn.value),
  botY: window.__game.bots[0].pos.y,
}));
console.log('  shot pernas-t0/t1', JSON.stringify(info));
await page.evaluate((id) => clearInterval(id), pin);
await browser.close();
console.log('frames ->', OUT);
