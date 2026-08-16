// Local in-engine capture of the Brasília map landmarks, so I can SEE the statue /
// congresso / palácio / catedral against the user's references BEFORE showing them.
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'http://localhost:8123';
const OUT = '/tmp/mapeval';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

rmSync(OUT,{recursive:true,force:true}); mkdirSync(OUT,{recursive:true});
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--enable-webgl'] });
const page = await browser.newPage({ viewport:{ width:1100, height:720 } });
page.on('pageerror', e=>console.log('  [pageerror]', e.message));
page.on('console', m=>{ const t=m.text(); if(/error|fail|Uncaught/i.test(t)) console.log('  [page]', t); });

await page.goto(`${BASE}/mapeval.html`, { waitUntil:'networkidle' });
await page.waitForFunction('window.MAPEVAL && window.MAPEVAL.ready===true', { timeout:30000 });

// [label, from, look]
const shots = [
  ['statue_front', [-7.5, 2.7, 22], [-11, 2.5, 22]],  // close-up front (statue faces +X)
  ['statue_side',  [-11, 2.7, 18],  [-11, 2.5, 22]],
  ['congresso',    [0, 18, 22],    [0, 11, 62]],       // pulled back: towers vs dome orientation
  ['palacio_base', [40, 1.2, 30],  [22, 2.5, 30]],      // ground-level side: floating gap?
  ['catedral',     [0, 7, -42],    [0, 7, -60]],        // glass
  ['props_area',   [0, 6, 4],      [-13, 1.5, -8]],     // tents/tires/stalls
  ['posters_outer', [42, 6, 0],    [23, 3.5, 0]],       // real poster art on the outer sides
  ['bus',          [2, 3.5, -22],  [8.5, 1.5, -12]],    // broken city bus mid-lane
  ['drinkstand',   [-8, 3.2, -23], [-14, 1.4, -17]],
  ['barricade',    [-14, 3, 16],   [-8, 1, 20]],
  ['overview',     [55, 40, 0],    [0, 4, 10]],
];
for (const [label, from, look] of shots){
  await page.evaluate(([f,l])=>window.MAPEVAL.view(f,l), [from, look]);
  await page.screenshot({ path:`${OUT}/${label}.png` });
  console.log('  shot', label);
}
await browser.close();
console.log('DONE ->', OUT);
