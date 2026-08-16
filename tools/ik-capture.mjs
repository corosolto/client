// Local gameplay capture: drives public/iktest.html frame-by-frame in headless
// Chrome (swiftshader) and screenshots each frame, so we can SEE the support-hand
// IK hold a weapon in motion without deploying. Frames -> ffmpeg (separate step).
//
// Usage: node tools/ik-capture.mjs [baseURL] [outDir]
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = process.argv[2] || 'http://localhost:8123';
const OUT = process.argv[3] || '/tmp/ikframes';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

rmSync(OUT, { recursive:true, force:true });
mkdirSync(OUT, { recursive:true });

const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--enable-webgl'],
});
const page = await browser.newPage({ viewport: { width: 960, height: 620 }, deviceScaleFactor: 1 });
page.on('console', m => { const t=m.text(); if (/error|fail|Uncaught/i.test(t)) console.log('  [page]', t); });
page.on('pageerror', e => console.log('  [pageerror]', e.message));

await page.goto(`${BASE}/iktest.html?driven=1&debug=0&char=mst&w=ak`, { waitUntil:'networkidle' });
await page.waitForFunction('window.HARNESS && window.HARNESS.ready === true', { timeout: 30000 });
console.log('ready:', JSON.stringify(await page.evaluate('window.HARNESS.info()')));

async function pass(label, weapon, anim, frames, yawFrom, yawTo){
  await page.evaluate(([w,a]) => { window.HARNESS.setWeapon(w); window.HARNESS.setAnim(a); }, [weapon, anim]);
  const info = await page.evaluate('window.HARNESS.info()');
  for (let i=0;i<frames;i++){
    const y = yawFrom + (yawTo-yawFrom)*(i/(frames-1));
    await page.evaluate((yy)=>{ window.HARNESS.setYaw(yy); window.HARNESS.step(1/30); }, y);
    await page.screenshot({ path: `${OUT}/${label}_${String(i).padStart(3,'0')}.png` });
  }
  console.log(`  captured ${label} (${weapon}/${anim}) frames=${frames}`, JSON.stringify(info));
}

// idle holds, varied weapon lengths (pistol = one-handed control: no support IK)
await pass('a_pistol', 'pistol', 'idle', 12, -0.5, 0.5);
await pass('b_mp5',    'mp5',    'idle', 12, -0.5, 0.5);
await pass('c_ak',     'ak',     'idle', 12, -0.5, 0.5);
await pass('d_awp',    'awp',    'idle', 12, -0.5, 0.5);
await pass('e_lmg',    'lmg',    'idle', 12, -0.5, 0.5);
// the real test: does the hold survive walking?
await pass('f_ak_walk','ak',     'walk', 24,  0.35, 0.35);

await browser.close();
console.log('DONE ->', OUT);
