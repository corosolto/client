// Tuning interativo do transform de um staticVm: aplica candidatos (pos/rot/scale) via
// page.evaluate e captura cada um — escolhe-se o melhor e hardcoda no game.js.
// Uso: node tools/eval/g2-tune.mjs <weapon> <outPrefix> "<json candidates>"
//   candidate: {name, pos:[x,y,z], rot:[x,y,z], scale}
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const [WEAPON, OUTP, CANDS] = process.argv.slice(2);
const cands = JSON.parse(CANDS);
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

mkdirSync('/tmp/gauntlet', { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 750 } });
page.on('pageerror', e => console.error('[pageerror]', e.message));
await page.goto(`${BASE}/?debug=1&auto=P,mst&map=piscina_treta`, { waitUntil: 'load' });
await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 60000 });
await page.waitForTimeout(1000);
await page.evaluate((wid) => {
  const g = window.__game;
  for (const b of g.bots) { b.pos.set(0, -60, 0); b.hp = 1e9; }   // sem bot cruzando a lente
  g.player.hp = 1e9;
  g._switchWeapon(wid); g.player.drawUntil = 0; g.player.pitch = 0;
}, WEAPON);
await page.waitForTimeout(400);

for (const c of cands) {
  await page.evaluate(({ wid, c }) => {
    const g = window.__game;
    g.player.drawUntil = 0; g.player.reloadUntil = 0; g.player.pitch = 0;   // frame estável (sem draw/reload entre rounds)
    const m = g.vm.staticVms[wid];
    if (!m) return;
    if (c.pos) m.position.set(...c.pos);
    if (c.rot) m.rotation.set(...c.rot);
    if (c.scale) m.scale.setScalar(c.scale);
  }, { wid: WEAPON, c });
  await page.screenshot({ path: `/tmp/gauntlet/${OUTP}-${c.name}.png` });   // shot imediato (draw/reload zeroados neste frame)
  const dbg = await page.evaluate(({ wid }) => {
    const g = window.__game, m = g.vm.staticVms[wid], r = g.vm.root;
    return { cloneRot: [m.rotation.x, m.rotation.y, m.rotation.z].map(v=>+v.toFixed(2)), clonePos: m.position.toArray().map(v=>+v.toFixed(2)),
      rootRot: [r.rotation.x, r.rotation.y, r.rotation.z].map(v=>+v.toFixed(2)), rootPos: r.position.toArray().map(v=>+v.toFixed(2)),
      drawF: +((g.player.drawUntil - g.time) / 0.28).toFixed(2), kick: +g.vm.kick.toFixed(2), adsF: +(g.vm.adsF || 0).toFixed(2),
      reloadDip: +g.vm.reloadDip.toFixed(2), pitch: +g.player.pitch.toFixed(2) };
  }, { wid: WEAPON });
  console.log('shot', c.name, JSON.stringify(dbg));
}
await browser.close();
