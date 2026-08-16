// Measure live gun direction + hand/feet geometry in botview for a given animdir.
// Uses matrixWorld elements directly (no THREE handle needed in page context).
// Usage: node tools/eval/mixamo-measure.mjs [animdir] [char]
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const [ANIMDIR = 'models/anims/mixamo', CHAR = 'mst'] = process.argv.slice(2);
const BASE = process.env.BASE || 'http://localhost:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 700, height: 500 } });
page.on('pageerror', e => console.error('[pageerror]', e.message.slice(0, 200)));
await page.goto(`${BASE}/botview.html?char=${CHAR}&w=ak&animdir=${ANIMDIR}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.BVIEW && window.BVIEW.ready, null, { timeout: 60000 });

const out = await page.evaluate(() => {
  const c = window.BVIEW.ctrl;
  const bones = {};
  let gun = null;
  c.group.traverse(o => {
    if (o.isBone) bones[o.name] = o;
    // the weapon sits under a Group mount on the RightHand; find a mesh-bearing group
    if (!o.isBone && o.children.some(k => k.isMesh) && o.parent && o.parent.isBone) gun = o.children.find(k => k.isMesh) ? o : gun;
  });
  const P = (o) => { const e = o.matrixWorld.elements; return [e[12], e[13], e[14]].map(v => +v.toFixed(3)); };
  const Z = (o) => { const e = o.matrixWorld.elements; return [e[8], e[9], e[10]].map(v => +v.toFixed(3)); };
  const res = {};
  const settle = (label, fn, frames, moving = 0, speed = 0) => {
    c.revive?.(); c.setCrouch(false);
    if (fn) eval(fn);
    for (let i = 0; i < frames; i++) c.update(1 / 30, moving, true, speed);
    c.group.updateMatrixWorld(true);
    res[label] = {
      gunDir: gun ? Z(gun) : null,
      RH: P(bones.RightHand), LH: bones.LeftHand ? P(bones.LeftHand) : null,
      Head: P(bones.Head), Hips: P(bones.Hips),
      LFoot: P(bones.LeftFoot), RFoot: P(bones.RightFoot),
    };
  };
  settle('idle', '', 70);
  settle('walk', '', 40, 1, 1.2);
  settle('shoot', 'c.shoot()', 9);
  settle('death', 'c.die()', 65);
  settle('crouch', 'c.setCrouch(true)', 70);
  return res;
});
for (const [k, v] of Object.entries(out)) console.log(k, JSON.stringify(v));
await browser.close();
