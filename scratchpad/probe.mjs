import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args:['--headless=new','--use-angle=swiftshader','--enable-unsafe-swiftshader','--mute-audio'] });
const p = await b.newPage({ viewport:{width:1536,height:864} });
await p.goto('http://localhost:4323/?debug=1', { waitUntil:'domcontentloaded' });
await p.click('#boot-splash').catch(()=>{});
await p.waitForSelector('#main-menu:not(.hidden)', {timeout:30000});
await p.evaluate(()=>document.getElementById('map-thumb')?.click());
await p.waitForSelector('#map-screen:not(.hidden)');
await p.waitForTimeout(800);
console.log(await p.evaluate(()=>{
  const el=document.elementFromPoint(768,858);
  const path=[]; let n=el; while(n&&n!==document.body){path.push(n.tagName+(n.id?'#'+n.id:'')+(n.className&&typeof n.className==='string'?'.'+n.className.split(' ').join('.'):'')); n=n.parentElement;}
  return path.join(' < ');
}));
await b.close();
