
import { execSync } from 'node:child_process'; import { pathToFileURL } from 'node:url';
const g = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${g}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const nav = await chromium.launch();
const pag = await nav.newPage({ viewport: { width: 1280, height: 800 } });
const cdp = await pag.context().newCDPSession(pag);
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', {
  offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8,
});
const t0 = Date.now();
await pag.goto('http://127.0.0.1:8167/?debug=1', { waitUntil: 'commit', timeout: 300000 });
await pag.waitForSelector('#splash-enter:not(.hidden)', { timeout: 300000 });
console.log(JSON.stringify({ splash_ms: Date.now() - t0 }));
await nav.close();
