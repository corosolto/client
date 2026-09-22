
import { execSync } from 'node:child_process'; import { pathToFileURL } from 'node:url';
const g = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${g}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const nav = await chromium.launch();
const pag = await nav.newPage({ viewport: { width: 1280, height: 800 } });
await pag.addInitScript(() => performance.setResourceTimingBufferSize(9000));
const t0 = Date.now();
await pag.goto('http://127.0.0.1:8167/?debug=1', { waitUntil: 'load', timeout: 120000 });
await pag.waitForSelector('#splash-enter:not(.hidden)', { timeout: 120000 });
const tSplash = Date.now() - t0;
const r = await pag.evaluate(() => {
  const e = performance.getEntriesByType('resource');
  const glb = e.filter(x => /\.glb/.test(x.name));
  const bytes = glb.reduce((s, x) => s + (x.encodedBodySize || x.transferSize || 0), 0);
  return { glbs: glb.length, mb: +(bytes / 1048576).toFixed(2), reqs: e.length };
});
console.log(JSON.stringify({ splash_ms: tSplash, ...r }));
await nav.close();
