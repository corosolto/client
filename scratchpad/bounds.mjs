import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--headless=new','--mute-audio'] });
const p = await b.newPage({ viewport:{width:900,height:900} });
for (const mapa of process.argv.slice(2)) {
  await p.goto(`http://127.0.0.1:8123/?debug=1&auto=P,mst&map=${mapa}`, { waitUntil:'domcontentloaded', timeout:60000 });
  await p.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout:180000 });
  console.log(mapa, JSON.stringify(await p.evaluate(() => {
    const g = window.__game;
    const bb = g.world?.bounds;
    return { bounds: bb ? { min: bb.min ? [bb.min.x, bb.min.y, bb.min.z] : null, max: bb.max ? [bb.max.x, bb.max.y, bb.max.z] : null } : null,
             spawn: [Math.round(g.player.pos.x), Math.round(g.player.pos.y), Math.round(g.player.pos.z)] };
  })));
}
await b.close();
