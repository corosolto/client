// Weapon-orientation capture: screenshots each weapon GLB in weapontest.html (side view, +Z
// reference) and montages them into a contact sheet, so inverted barrels are fixed by eye.
// Usage: node tools/eval/weapon-capture.mjs [outSheet] [id1,id2,...]
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUTSHEET = process.argv[2] || '/tmp/weapon-sheet.png';
const BASE = process.env.BASE || 'http://localhost:8123';
const DIR = '/tmp/wt';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

// discover weapon ids from the page itself
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new'],
});
const ids = process.argv[3] ? process.argv[3].split(',') : null;
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const page = await browser.newPage({ viewport: { width: 460, height: 300 } });
page.on('pageerror', e => console.error('[pageerror]', e.message));

let list = ids;
if (!list) {
  await page.goto(`${BASE}/weapontest.html?w=ak`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.WT_READY, null, { timeout: 60000 });
  list = await page.evaluate(async () => {
    const m = await import('./js/weapons.js');
    return m.WEAPON_IDS;
  });
}
console.log('weapons:', list.join(' '));
const hints = {};
for (const id of list) {
  await page.goto(`${BASE}/weapontest.html?w=${encodeURIComponent(id)}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.WT_READY, null, { timeout: 60000 });
  hints[id] = await page.evaluate(() => window.WT_HINT || null);
  await page.waitForTimeout(60);
  await page.screenshot({ path: `${DIR}/${id}.png` });
}
for (const id of list) { const h = hints[id]; console.log(`${h && h.ok ? 'OK      ' : 'INVERT? '} ${id}  tip(+Z)=${h && h.rTip} tail(-Z)=${h && h.rTail}  muzzleAt=${h && h.muzzleAt}`); }
await browser.close();
const cols = Math.ceil(Math.sqrt(list.length));
execSync(`montage ${list.map(i => `${DIR}/${i}.png`).join(' ')} -tile ${cols}x -geometry +3+3 -background '#111' -fill white -label '%f' "${OUTSHEET}"`, { stdio: 'inherit' });
console.log('sheet ->', OUTSHEET);
