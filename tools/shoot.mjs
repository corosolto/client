// Screenshot headless do jogo. usage: node tools/shoot.mjs <url> <out.png> [waitMs]
import { chromium } from 'playwright';
const [,, url, out, waitMs='7000'] = process.argv;
const b = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox'] });
const p = await b.newPage({ viewport:{ width:1280, height:800 }, deviceScaleFactor:1 });
const errs=[];
p.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,160)); });
p.on('pageerror', e => errs.push('PAGEERR '+String(e).slice(0,160)));
await p.goto(url, { waitUntil:'load', timeout:30000 }).catch(e=>console.log('goto',e.message));
await p.waitForTimeout(+waitMs);
await p.screenshot({ path: out });
await b.close();
console.log('shot ->', out);
if (errs.length) console.log('CONSOLE ERRORS:\n  '+[...new Set(errs)].slice(0,8).join('\n  '));
