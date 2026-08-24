// Captura 3:2 da POEIRA (RC3, plans/23) no campomorro: motas cruzando a rua
// com fade suave no contato com o chão. t0/t1 para o diff de movimento.
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/tmp/rc3-poeira';
const BASE = process.env.BASE || 'http://localhost:8141';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: process.env.GPU === '0' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio']
    : ['--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`${BASE}/?debug=1&auto=P,mst&map=campomorro`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 90000 });
await page.addStyleTag({ content: '#hud,.screen,#crash-overlay{display:none!important}' });
// rua norte, olhando ao longo dela (as motas cruzam rente ao chão)
const pin = await page.evaluateHandle(() => {
  const g = window.__game, pl = g.player;
  pl.hp = 1e9;
  if (g.vm && g.vm.root) g.vm.root.visible = false;
  return setInterval(() => {
    pl.pos.set(-20, 0.4, -27.2); if (pl.vel) pl.vel.set(0, 0, 0);
    pl.yaw = -Math.PI / 2 + 0.25; pl.pitch = -0.12;
    pl.hp = 1e9; if (pl.alive === false) pl.alive = true;
    if (g.vm && g.vm.models) for (const k in g.vm.models) g.vm.models[k].visible = false;
  }, 40);
});
await page.waitForTimeout(3500);   // deixa o spawner encher a rua
await page.screenshot({ path: `${OUT}/poeira-t0.png` });
await page.waitForTimeout(1400);
await page.screenshot({ path: `${OUT}/poeira-t1.png` });
const info = await page.evaluate(() => {
  const g = window.__game, rd = g.renderer, s = (g.scene.userData.softs || []).find((x) => x.ambiente === 'poeira');
  return { softDepthOn: s ? s.uniforms.uDepthOn.value : null, cursor: s ? s.cursor : null,
    naSoftLayer: s ? s.points.layers.mask : null };
});
console.log('  shot poeira-t0/t1', JSON.stringify(info));
await page.evaluate((id) => clearInterval(id), pin);
await browser.close();
console.log('frames ->', OUT);
