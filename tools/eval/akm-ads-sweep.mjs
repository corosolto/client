// Compara deslocamentos laterais do ADS autorado sem alterar o asset.
// Uso: BASE=http://127.0.0.1:4339 node tools/eval/akm-ads-sweep.mjs <outDir>
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const out = process.argv[2] || '/tmp/akm-ads-sweep';
const base = process.env.BASE || 'http://127.0.0.1:4339';
const candidates = [-0.45, -0.65, -0.85, -1.05, -1.25, -1.45];
const gRoot = execSync('npm root -g').toString().trim();
const playwright = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = playwright.chromium || playwright.default?.chromium;

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`${base}/?debug=1&auto=P,mst&map=fy_piscina_treta&hands=1&vmweapon=akm&triggerfix=8`, {
  waitUntil: 'commit', timeout: 90000,
});
await page.waitForFunction(() => !!window.__game, null, { timeout: 240000 });
await page.evaluate(() => {
  const game = window.__game;
  if (game.state === 'countdown') { game.stateUntil = 0; game.update(0.05); }
  game._switchWeapon('akm');
  game.player.drawUntil = 0;
  game.player.pitch = 0;
  game.player.yaw = 0;
  game._scope(true);
});
await page.waitForFunction(() => !!window.__game.vm.authored.entry('akm'), null, { timeout: 120000 });

for (const x of candidates) {
  await page.evaluate((candidate) => {
    const game = window.__game;
    const entry = game.vm.authored.entry('akm');
    entry.ads.position.x = candidate;
    game.vm.adsF = 1;
    game.vm.authored.setAim('akm', 1);
    for (let frame = 0; frame < 8; frame += 1) game.update(0.016);
  }, x);
  await page.screenshot({ path: `${out}/ads-x-${Math.abs(x).toFixed(2)}.png` });
}

await browser.close();
console.log(`DONE -> ${out}`);
