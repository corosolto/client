// First-person viewmodel verification: positions the player on open ground, levels the camera
// at the horizon (clean background), equips each weapon, and screenshots the FULL frame so the
// viewmodel barrel direction is judged exactly as the player sees it.
// Usage: node tools/eval/vm-verify.mjs [outDir] [id1,id2,...]
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/tmp/vmv';
const LIST = (process.argv[3] || 'ak,m92,g3,md97,rem700,mosin').split(',');
const BASE = process.env.BASE || 'http://localhost:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1000, height: 620 } });
page.on('pageerror', e => console.error('[pageerror]', e.message));
await page.goto(`${BASE}/?debug=1&auto=P,mst`, { waitUntil: 'load' });
await page.addStyleTag({ content: '#hud,.screen,astro-dev-toolbar{display:none!important}' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 60000 });

// keep the player at spawn; point the camera UP at the sky for a clean background
await page.evaluate(() => {
  const g = window.__game, p = g.player;
  p.hp = 1e9;
  if (p.vel) p.vel.set(0, 0, 0);
  p.pitch = -0.28; // look up -> viewmodel against the sky
});

for (const id of LIST) {
  const res = await page.evaluate((wid) => {
    const g = window.__game;
    if (g._switchWeapon) g._switchWeapon(wid);
    const vis = Object.keys(g.vm.models).filter(k => g.vm.models[k].visible);
    return { vis, weapon: g.player.weapon };
  }, id);
  await page.waitForTimeout(360);
  await page.screenshot({ path: `${OUT}/${id}.png` });
  console.log('shot', id, '| weapon:', res.weapon, '| visible:', res.vis.join(','));
}
await browser.close();
console.log('DONE ->', OUT);
