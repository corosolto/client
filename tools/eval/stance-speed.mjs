// Measure per-clip stance (plant) speeds via the iktest harness and print JSON.
// Usage: node tools/eval/stance-speed.mjs [char] [baseURL]
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const CHAR = process.argv[2] || 'mst';
const BASE = process.argv[3] || 'http://localhost:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
await page.goto(`${BASE}/iktest.html?char=${encodeURIComponent(CHAR)}${process.env.ANIMDIR ? '&animdir=' + process.env.ANIMDIR : ''}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.HARNESS && window.HARNESS.ready, null, { timeout: 60000 });

const out = {};
for (const name of ['walk', 'run', 'crouchwalk']) {
  out[name] = {
    stance: await page.evaluate(n => window.HARNESS.measureStanceSpeed(n), name),
    stride: await page.evaluate(n => window.HARNESS.measureStride(n), name),
  };
}
console.log(JSON.stringify(out, null, 2));
await browser.close();
