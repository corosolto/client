// First-person viewmodel capture: cycles the player's weapon in a live (debug) match
// and screenshots each viewmodel, so hand/grip alignment can be judged per weapon.
// Prints the objective gripError() metric (world distance hand effector → IK target)
// per weapon and fails loudly if any hand is off (> 0.01 m).
// Usage: node tools/eval/vm-capture.mjs [outDir] [weapon1,weapon2,...] [char] [scenarios]
//   scenarios: "1" adds reload mid-dip / draw / ADS / look-down shots for the 1st weapon.
//   env QS: extra query string appended to the URL (ex: QS='fpr=0,-0.03,-0.04&fpy=-1.6').
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/tmp/vmframes';
const LIST = (process.argv[3] || 'awp,ak,m4,mp5,shotgun,deagle,pistol,knife,mosin,lmg').split(',');
const CHAR = process.argv[4] || 'mst';
const SCEN = process.argv[5] === '1';
const BASE = process.env.BASE || 'http://localhost:8123';
const QS = process.env.QS ? `&${process.env.QS}` : '';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', e => console.error('[pageerror]', e.message));
await page.goto(`${BASE}/?debug=1&auto=P,${CHAR}${QS}`, { waitUntil: 'load' });
await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 60000 });
const hasArms = await page.evaluate(() => !!(window.__game.vm && window.__game.vm.arms));
console.log('char', CHAR, '| fpArms:', hasArms ? 'REAL' : 'FALLBACK(procedural)');

let fail = 0;
for (const id of LIST) {
  const ok = await page.evaluate((wid) => {
    const g = window.__game;
    if (g._switchWeapon) { g._switchWeapon(wid); g.player.drawUntil = 0; return true; }   // zera o draw p/ frame estável
    return false;
  }, id);
  await page.waitForTimeout(500);   // deixa o IK convergir e o frame assentar
  const err = await page.evaluate(() => {
    const g = window.__game;
    return g.vm.arms ? g.vm.arms.gripError() : null;
  });
  if (err) {
    const rBad = !(err.r <= 0.01), lBad = err.l !== null && !(err.l <= 0.01);   // NaN reprova
    if (rBad || lBad) fail++;
    console.log(`gripError ${id}: r=${err.r.toFixed(4)} l=${err.l === null ? '-' : err.l.toFixed(4)} ${rBad || lBad ? 'FAIL' : 'ok'}`);
  }
  // crop the bottom-right quadrant (viewmodel region)
  await page.screenshot({ path: `${OUT}/${id}.png`, clip: { x: 500, y: 300, width: 780, height: 500 } });
  console.log(ok ? 'shot' : 'NO MODEL', id);
}

if (SCEN) {
  const id = LIST[0];
  const shot = async (name, ms = 0) => {
    if (ms) await page.waitForTimeout(ms);
    await page.screenshot({ path: `${OUT}/scen-${name}.png` });
    console.log('shot scen-' + name);
  };
  // reload mid-dip
  await page.evaluate((wid) => { const g = window.__game; g._switchWeapon(wid); g.player.drawUntil = 0; }, id);
  await page.waitForTimeout(500);
  await page.evaluate(() => { const g = window.__game; g.player.ammo[g.player.weapon].mag = 1; g._startReload(); });
  await shot('reload', 500);
  await page.evaluate(() => { const g = window.__game; g.player.reloadUntil = 0; });
  // draw (frame no meio da subida, ~100ms após trocar) — timing natural, sem zerar drawUntil
  await page.evaluate(() => { const g = window.__game; g._switchWeapon('ak'); g._switchWeapon('awp'); });
  await shot('draw', 100);
  await page.waitForTimeout(500);
  // ADS (iron-sight, sem scope real) — usa ak; awp tem scope real (some a vm, correto)
  await page.evaluate(() => { const g = window.__game; g._switchWeapon('ak'); g.player.drawUntil = 0; });
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__game._scope(true));
  await shot('ads', 400);
  await page.evaluate(() => window.__game._scope(false, true));
  // look-down: corpo/braços não podem vazar cabeça/pescoço no quadro
  await page.evaluate(() => { window.__game.player.pitch = 1.15; });
  await shot('lookdown', 250);
  await page.evaluate(() => { window.__game.player.pitch = 0; });
}
console.log(fail ? `GRIPERROR FAIL (${fail})` : 'GRIPERROR OK');
console.log('DONE ->', OUT);
await browser.close();
process.exit(fail ? 2 : 0);
