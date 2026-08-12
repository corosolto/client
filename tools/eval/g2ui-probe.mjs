// probe: carrega a página e despeja console + estado do boot por 40s
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const URLQ = process.argv[2] || '/?debug=1&auto=P,mst&map=praca_poderes';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
page.on('console', m => console.log('[console]', m.type(), m.text().slice(0, 300)));
page.on('pageerror', e => console.log('[pageerror]', e.message.slice(0, 500)));
page.on('requestfailed', r => console.log('[reqfail]', r.url().slice(0, 120), r.failure()?.errorText));
await page.goto(`${BASE}${URLQ}`, { waitUntil: 'load' });
for (let i = 0; i < 8; i++) {
  await page.waitForTimeout(5000);
  const st = await page.evaluate(() => ({
    game: !!window.__game, state: window.__game?.state,
    crash: document.getElementById('crash-overlay')?.textContent?.slice(0, 300) || null,
  }));
  console.log('t+' + (i + 1) * 5 + 's', JSON.stringify(st));
  if (st.state === 'live') break;
}
await browser.close();
