// Capture every animation state of a char via botview, driving ctrl explicitly
// (death/shoot/crouch/jump need their own triggers, not the built-in walk settle).
// Usage: ANIMDIR=models/anims/mixamo node tools/eval/mixamo-capture.mjs <char> [outDir]
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const [CHAR = 'mst', OUT = '/tmp/mixamo-check'] = process.argv.slice(2);
const ANIMDIR = process.env.ANIMDIR || 'models/anims/mixamo';
const BASE = process.env.BASE || 'http://localhost:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('pageerror', e => console.error('[pageerror]', e.message.slice(0, 200)));

// per-state driver: returns [setup body, frames to advance after setup]
const DRIVERS = {
  idle:       ['', 70],
  walk:       ['', 40, 1, 1.2],
  run:        ['', 40, 1, 3.3],
  shoot:      ['c.shoot()', 10],
  death:      ['c.die()', 65],
  crouch:     ['c.setCrouch(true)', 70],
  crouchwalk: ['c.setCrouch(true)', 40, 1, 0.8],
  jump:       ['c.jump()', 18],
};

for (const [state, [setup, frames, moving = 0, speed = 0]] of Object.entries(DRIVERS)) {
  await page.goto(`${BASE}/botview.html?char=${CHAR}&w=ak&animdir=${ANIMDIR}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.BVIEW && window.BVIEW.ready, null, { timeout: 60000 });
  await page.evaluate(([setup, frames, moving, speed]) => {
    const c = window.BVIEW.ctrl;
    if (setup) eval(setup);
    for (let i = 0; i < frames; i++) c.update(1 / 30, moving, true, speed);
    window.BVIEW.view(1.25, 1.35, 1.9, 0, 1.0, 0.35);
  }, [setup, frames, moving, speed]);
  await page.screenshot({ path: `${OUT}/${state}-${CHAR}.png` });
  await page.evaluate(([moving, speed]) => {
    const c = window.BVIEW.ctrl;
    for (let i = 0; i < 8; i++) c.update(1 / 30, moving, true, speed);
    window.BVIEW.view(2.2, 1.3, 0.6, 0, 1.0, 0.2);
  }, [moving, speed]);
  await page.screenshot({ path: `${OUT}/${state}-${CHAR}-side.png` });
  console.log('ok', state, CHAR);
}
await browser.close();
