
import { execSync } from 'node:child_process'; import { pathToFileURL } from 'node:url';
const g = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${g}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const nav = await chromium.launch();
const pag = await nav.newPage({ viewport: { width: 1280, height: 800 } });
await pag.addInitScript(() => performance.setResourceTimingBufferSize(9000));
const cdp = await pag.context().newCDPSession(pag);
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6*1024*1024/8, uploadThroughput: 750*1024/8 });
await pag.goto('http://127.0.0.1:8167/?debug=1', { waitUntil: 'commit', timeout: 300000 });
await pag.waitForSelector('#splash-enter:not(.hidden)', { timeout: 300000 });
const r = await pag.evaluate(() => {
  const e = performance.getEntriesByType('resource').filter(x => x.responseEnd > 0);
  const by = {};
  for (const x of e) {
    const t = /\.glb/.test(x.name) ? 'glb' : /\.js/.test(x.name) ? 'js' : /\.css/.test(x.name) ? 'css' :
      /\.(png|jpe?g|webp|avif)/.test(x.name) ? 'img' : /\.(mp3|ogg|wav|m4a)/.test(x.name) ? 'audio' : 'outro';
    by[t] = by[t] || { n: 0, mb: 0 };
    by[t].n++; by[t].mb += (x.encodedBodySize || x.transferSize || 0) / 1048576;
  }
  for (const k in by) by[k].mb = +by[k].mb.toFixed(2);
  const top = e.map(x => [x.name.split('/').pop().slice(0, 34), +((x.encodedBodySize||0)/1024).toFixed(0)])
    .sort((a,b) => b[1]-a[1]).slice(0, 10);
  return { by, top };
});
console.log(JSON.stringify(r, null, 1));
await nav.close();
