// Walk-cycle video capture: loads mounttest.html?play=walk (real weapon:true path), steps the
// walk, screenshots a sequence, and assembles an mp4. Controlled evidence of locomotion quality
// (foot-plant, forward gun, curled fingers) without the in-game follow-cam losing the bot.
// Usage: node tools/eval/walk-video.mjs [char] [weapon] [outMp4] [state]
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const CHAR = process.argv[2] || 'mst';
const WEAPON = process.argv[3] || 'ak';
const OUTMP4 = process.argv[4] || `/tmp/walk-${CHAR}.mp4`;
const STATE = process.argv[5] || 'walk';
const BASE = process.env.BASE || 'http://localhost:8123';
const FRAMES = parseInt(process.env.FRAMES || '48', 10);
const VIEW = process.env.VIEW || 'tq';
const ORBIT = process.env.ORBIT || '0';
const DIR = `/tmp/walkvid-${CHAR}`;
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 640 } });
page.on('pageerror', e => console.error('[pageerror]', e.message));
await page.goto(`${BASE}/mounttest.html?char=${encodeURIComponent(CHAR)}&w=${encodeURIComponent(WEAPON)}&play=${STATE}&view=${VIEW}&orbit=${ORBIT}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.MOUNT_READY, null, { timeout: 60000 });
// step deterministically so the clip advances a fixed amount per frame regardless of headless fps
for (let i = 0; i < FRAMES; i++) {
  await page.evaluate(() => window.STEP && window.STEP(1 / 30));
  await page.screenshot({ path: `${DIR}/f${String(i).padStart(3, '0')}.png` });
}
await browser.close();
execSync(`ffmpeg -y -framerate 24 -i ${DIR}/f%03d.png -c:v libx264 -pix_fmt yuv420p -crf 20 "${OUTMP4}"`, { stdio: 'inherit' });
console.log('video ->', OUTMP4);
