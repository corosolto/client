// Captura 3:2 do VENTO (RC4, plans/23) no fy_campomorro — t0/t1 com a câmera
// presa: o diff de pixels prova que o mato se move (e onde). Enquadramento na
// cerca norte, onde o lote de grama do RC4 está plantado.
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/tmp/rc4-vento';
const BASE = process.env.BASE || 'http://localhost:8141';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const SHOTS = [
  // [rótulo, [x,y,z], yaw, pitch]
  ['cerca', [-13.2, -0.08, -7.6], 0.85, -0.25],  // tufo do canto NO do campo, em pé no chão
  ['campo', [-8, -0.08, 6], -0.5, -0.10],
];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`${BASE}/?debug=1&auto=P,mst&map=fy_campomorro${process.env.POST === 'output' ? '&post=output' : ''}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 90000 });
await page.addStyleTag({ content: '#hud,.screen,#crash-overlay{display:none!important}' });
for (const [label, pos, yaw, pitch] of SHOTS) {
  const pin = await page.evaluateHandle(([p, yw, pt]) => {
    const g = window.__game, pl = g.player;
    pl.hp = 1e9;
    if (g.vm && g.vm.root) g.vm.root.visible = false;
    return setInterval(() => {
      pl.pos.set(p[0], p[1], p[2]);
      if (pl.vel) pl.vel.set(0, 0, 0);
      pl.yaw = yw; pl.pitch = pt;
      pl.hp = 1e9; if (pl.alive === false) pl.alive = true;
      if (g.vm && g.vm.models) for (const k in g.vm.models) g.vm.models[k].visible = false;
    }, 40);
  }, [pos, yaw, pitch]);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${label}-t0.png` });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${label}-t1.png` });
  await page.evaluate((id) => clearInterval(id), pin);
  console.log('  shot', label);
}
await browser.close();
console.log('frames ->', OUT);
