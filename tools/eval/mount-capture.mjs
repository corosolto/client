// Mount-direction capture: screenshots mounttest.html (real weapon:true code path) so the
// gun's barrel direction can be judged against the green +Z reference arrow.
// Usage: node tools/eval/mount-capture.mjs [char] [weapon] [out]
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const CHAR = process.argv[2] || 'mst';
const WEAPON = process.argv[3] || 'awp';
const OUT = process.argv[4] || `/tmp/mount-${CHAR}-${WEAPON}.png`;
const BASE = process.env.BASE || 'http://localhost:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new'],
});
const page = await browser.newPage({ viewport: { width: 700, height: 700 } });
page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
page.on('pageerror', e => console.error('[pageerror]', e.message));
const VIEW = process.env.VIEW || 'side';
await page.goto(`${BASE}/mounttest.html?char=${encodeURIComponent(CHAR)}&w=${encodeURIComponent(WEAPON)}&view=${VIEW}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.MOUNT_READY, null, { timeout: 60000 });
await page.waitForTimeout(200);
await page.screenshot({ path: OUT });
console.log('shot ->', OUT);
await browser.close();
